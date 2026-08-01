import { Gift } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PlaylistSummary } from "@songfest/shared";

import { getParticipantRewards, redeemParticipantReward } from "../lib/api/admin";
import { FormError } from "./form-error";

export function PlaylistRewardPanel({
  partyId,
  playlists,
}: {
  partyId: string;
  playlists: PlaylistSummary[];
}) {
  const queryClient = useQueryClient();
  const rewardsQuery = useQuery({
    queryKey: ["participant-rewards"],
    queryFn: ({ signal }) => getParticipantRewards(signal),
  });
  const reward = rewardsQuery.data?.rewards.find(
    (candidate) =>
      candidate.type === "CHOOSE_NEXT_PLAYLIST" &&
      candidate.status === "AVAILABLE" &&
      candidate.usesRemaining > 0,
  );
  const mutation = useMutation({
    mutationFn: (playlistId: string) =>
      redeemParticipantReward({
        rewardId: reward?.id ?? "",
        playlistId,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["participant-rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["participant-playlists", partyId] }),
      ]);
    },
  });
  const availablePlaylists = playlists.filter((playlist) => !playlist.isActive && playlist.isOpen);

  if (reward === undefined) {
    return null;
  }

  return (
    <section className="playlist-reward-panel" aria-labelledby="playlist-reward-title">
      <Gift aria-hidden="true" weight="fill" />
      <div>
        <p className="eyebrow">Carte blanche</p>
        <h2 id="playlist-reward-title">Tu peux choisir la prochaine ambiance.</h2>
        <div>
          {availablePlaylists.length === 0 ? (
            <p className="reward-empty">Aucune autre ambiance n’est ouverte pour le moment.</p>
          ) : (
            availablePlaylists.map((playlist) => (
              <button
                type="button"
                className="secondary-button"
                key={playlist.id}
                disabled={mutation.isPending || playlists.some((item) => item.isScheduled)}
                onClick={() => mutation.mutate(playlist.id)}
              >
                {playlist.name}
              </button>
            ))
          )}
        </div>
        <FormError message={mutation.error instanceof Error ? mutation.error.message : undefined} />
      </div>
    </section>
  );
}
