import { Gift } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { ParticipantPlaylistTrack, Reward } from "@songfest/shared";

import { getParticipantRewards, redeemParticipantReward } from "../lib/api/admin";
import { FormError } from "./form-error";

const rewardLabels = {
  PRIORITY_TRACK: "Rendre un morceau prioritaire",
  DOUBLE_TRACK: "Jouer deux morceaux à la suite",
} as const;

interface TrackRewardPanelProps {
  partyId: string;
  playlistId: string;
  participantId: string;
  tracks: ParticipantPlaylistTrack[];
}

export function TrackRewardPanel({
  partyId,
  playlistId,
  participantId,
  tracks,
}: TrackRewardPanelProps) {
  const queryClient = useQueryClient();
  const [rewardId, setRewardId] = useState("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const rewardsQuery = useQuery({
    queryKey: ["participant-rewards"],
    queryFn: ({ signal }) => getParticipantRewards(signal),
  });
  const mutation = useMutation({
    mutationFn: redeemParticipantReward,
    onSuccess: async () => {
      setSelectedTrackIds([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participant-rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] }),
        queryClient.invalidateQueries({ queryKey: ["participant-playlists", partyId] }),
      ]);
    },
  });

  const usableRewards = (rewardsQuery.data?.rewards ?? []).filter(
    (
      reward,
    ): reward is Reward & {
      type: keyof typeof rewardLabels;
    } =>
      reward.status === "AVAILABLE" &&
      reward.usesRemaining > 0 &&
      (reward.type === "PRIORITY_TRACK" || reward.type === "DOUBLE_TRACK"),
  );
  const selectedReward = usableRewards.find((reward) => reward.id === rewardId) ?? usableRewards[0];
  const eligibleTracks = tracks.filter(
    (track) => track.status === "PENDING" && track.proposedBy?.id === participantId,
  );
  const requiredCount = selectedReward?.type === "DOUBLE_TRACK" ? 2 : 1;
  const canSubmit =
    selectedReward !== undefined &&
    selectedTrackIds.length === requiredCount &&
    !mutation.isPending;

  if (usableRewards.length === 0) {
    return null;
  }

  const toggleTrack = (trackId: string) => {
    setSelectedTrackIds((current) =>
      current.includes(trackId)
        ? current.filter((id) => id !== trackId)
        : current.length < requiredCount
          ? [...current, trackId]
          : current,
    );
  };

  return (
    <section className="track-reward-panel" aria-labelledby="track-rewards-title">
      <div>
        <Gift aria-hidden="true" weight="fill" />
        <div>
          <p className="eyebrow">Récompense</p>
          <h2 id="track-rewards-title">Donne un coup de pouce à tes morceaux.</h2>
        </div>
      </div>
      <label>
        Bonus à utiliser
        <select
          value={selectedReward?.id ?? ""}
          onChange={(event) => {
            setRewardId(event.target.value);
            setSelectedTrackIds([]);
          }}
        >
          {usableRewards.map((reward) => (
            <option value={reward.id} key={reward.id}>
              {rewardLabels[reward.type]} · {reward.usesRemaining} disponible
              {reward.usesRemaining === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <fieldset>
        <legend>
          Choisis {requiredCount === 2 ? "deux morceaux dans l’ordre de lecture" : "un morceau"}
        </legend>
        {eligibleTracks.length === 0 ? (
          <p className="reward-empty">
            Ajoute d’abord un morceau dans cette playlist pour utiliser ce bonus.
          </p>
        ) : (
          eligibleTracks.map((track) => (
            <label key={track.id}>
              <input
                type="checkbox"
                checked={selectedTrackIds.includes(track.id)}
                disabled={
                  !selectedTrackIds.includes(track.id) && selectedTrackIds.length >= requiredCount
                }
                onChange={() => toggleTrack(track.id)}
              />
              <span>
                {selectedTrackIds.includes(track.id)
                  ? `${selectedTrackIds.indexOf(track.id) + 1}. `
                  : ""}
                {track.title}
              </span>
            </label>
          ))
        )}
      </fieldset>
      <button
        className="primary-button"
        type="button"
        disabled={!canSubmit}
        onClick={() => {
          if (selectedReward !== undefined) {
            mutation.mutate({
              rewardId: selectedReward.id,
              trackIds: selectedTrackIds,
            });
          }
        }}
      >
        {mutation.isPending ? "Application…" : "Utiliser la récompense"}
      </button>
      <FormError message={mutation.error instanceof Error ? mutation.error.message : undefined} />
    </section>
  );
}
