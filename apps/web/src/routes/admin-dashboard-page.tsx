import {
  CheckCircle,
  Lightning,
  LockKey,
  Trash,
  WarningCircle,
  Timer,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import type { AssignRewardRequest, RewardType } from "@songfest/shared";

import { AdminPartyNav } from "../components/admin-party-nav";
import { AvatarMark } from "../components/avatar-mark";
import { FormError } from "../components/form-error";
import { HostLiveScreen } from "../components/host-live-screen";
import { LoadingPage } from "../components/loading-page";
import { PartySettingsForm } from "../components/party-settings-form";
import { RewardAssignment } from "../components/reward-assignment";
import { RecordSummary } from "../components/record-summary";
import { RotationTrackCard } from "../components/rotation-track-card";
import {
  assignAdminReward,
  blockAdminParticipant,
  endAdminParty,
  forceAdminTrack,
  getAdminDashboard,
  removeAdminTrack,
  updateAdminPartySettings,
} from "../lib/api/admin";
import { getAdminParty } from "../lib/api/parties";
import { ApiError } from "../lib/api/client";
import { cancelAdminFlashTurn, triggerAdminFlashTurn } from "../lib/api/flash";
import { controlPartyPlayback, getAdminPlayback } from "../lib/api/playback";
import { getAdminPlaylists } from "../lib/api/playlists";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

const rewardShortLabels: Record<RewardType, string> = {
  EXTRA_TRACK: "Ajout +1",
  PRIORITY_TRACK: "Prioritaire",
  DOUBLE_TRACK: "Double titre",
  CHOOSE_NEXT_PLAYLIST: "Choix ambiance",
};

export function AdminDashboardPage() {
  const { partyId = "" } = useParams();
  const queryClient = useQueryClient();
  usePartyRealtime(partyId);

  const partyQuery = useQuery({
    queryKey: ["admin-party", partyId],
    queryFn: ({ signal }) => getAdminParty(partyId, signal),
    enabled: partyId !== "",
  });
  const dashboardQuery = useQuery({
    queryKey: ["admin-dashboard", partyId],
    queryFn: ({ signal }) => getAdminDashboard(partyId, signal),
    enabled: partyId !== "",
  });
  const playbackQuery = useQuery({
    queryKey: ["party-playback", partyId],
    queryFn: ({ signal }) => getAdminPlayback(partyId, signal),
    enabled: partyId !== "",
    refetchInterval: 15_000,
  });
  const playlistsQuery = useQuery({
    queryKey: ["admin-playlists", partyId],
    queryFn: ({ signal }) => getAdminPlaylists(partyId, signal),
    enabled: partyId !== "",
  });

  const refreshDashboard = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-dashboard", partyId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-party", partyId] }),
      queryClient.invalidateQueries({ queryKey: ["party-playback", partyId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-playlists", partyId] }),
    ]);
  };
  const settingsMutation = useMutation({
    mutationFn: (input: Parameters<typeof updateAdminPartySettings>[1]) =>
      updateAdminPartySettings(partyId, input),
    onSuccess: refreshDashboard,
  });
  const blockMutation = useMutation({
    mutationFn: (participantId: string) => blockAdminParticipant(partyId, participantId),
    onSuccess: refreshDashboard,
  });
  const rewardMutation = useMutation({
    mutationFn: (input: AssignRewardRequest) => assignAdminReward(input),
    onSuccess: refreshDashboard,
  });
  const removeMutation = useMutation({
    mutationFn: (trackId: string) => removeAdminTrack(partyId, trackId),
    onSuccess: refreshDashboard,
  });
  const forceMutation = useMutation({
    mutationFn: (trackId: string) => forceAdminTrack(partyId, trackId),
    onSuccess: refreshDashboard,
  });
  const runPlaybackControl = async (control: "start" | "pause" | "resume" | "skip") => {
    try {
      return await controlPartyPlayback(partyId, control);
    } catch (error: unknown) {
      if (
        control === "start" &&
        error instanceof ApiError &&
        error.code === "ACTIVE_PARTY_CONFLICT" &&
        window.confirm(`${error.message}\n\nClôturer cette ancienne soirée et lancer celle-ci ?`)
      ) {
        return controlPartyPlayback(partyId, "start", true);
      }
      throw error;
    }
  };
  const playbackMutation = useMutation({
    mutationFn: runPlaybackControl,
    onSuccess: refreshDashboard,
  });
  const endMutation = useMutation({
    mutationFn: () => endAdminParty(partyId),
    onSuccess: refreshDashboard,
  });
  const flashMutation = useMutation({
    mutationFn: (action: "trigger" | "cancel") =>
      action === "trigger" ? triggerAdminFlashTurn(partyId) : cancelAdminFlashTurn(partyId),
    onSuccess: refreshDashboard,
  });

  if (
    partyQuery.isPending ||
    dashboardQuery.isPending ||
    playbackQuery.isPending ||
    playlistsQuery.isPending
  ) {
    return <LoadingPage />;
  }

  const party = partyQuery.data?.party;
  const dashboard = dashboardQuery.data;
  const playback = playbackQuery.data;
  const playlists = playlistsQuery.data?.playlists;
  if (
    party === undefined ||
    dashboard === undefined ||
    playback === undefined ||
    playlists === undefined
  ) {
    const error =
      partyQuery.error ?? dashboardQuery.error ?? playbackQuery.error ?? playlistsQuery.error;
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Tableau de bord indisponible</p>
        <h1 className="screen-title">La soirée ne peut pas être pilotée.</h1>
        <FormError message={error instanceof Error ? error.message : undefined} />
      </main>
    );
  }

  const activePlaylist = playlists.find((playlist) => playlist.id === party.activePlaylistId);
  const nextTrack = dashboard.recentTracks.find((track) => track.id === dashboard.nextTrackId);
  const currentDashboardTrack = dashboard.recentTracks.find(
    (track) => track.id === playback.currentTrack?.id,
  );
  const pendingTracks = dashboard.recentTracks.filter((track) => track.status === "PENDING");
  const upNextTracks =
    nextTrack === undefined
      ? pendingTracks
      : [nextTrack, ...pendingTracks.filter((track) => track.id !== nextTrack.id)];
  const actionError =
    blockMutation.error ??
    rewardMutation.error ??
    removeMutation.error ??
    forceMutation.error ??
    flashMutation.error ??
    endMutation.error;

  const requestEnd = () => {
    if (
      window.confirm(
        "Clôturer la soirée ? Les sessions invitées seront révoquées et cette action est définitive.",
      )
    ) {
      endMutation.mutate();
    }
  };

  return (
    <main className="page-shell dashboard-shell">
      <AdminPartyNav partyId={partyId} partyName={party.name} />

      {party.status === "ENDED" && <RecordSummary party={party} dashboard={dashboard} />}

      {party.status !== "ENDED" && (
        <HostLiveScreen
          party={party}
          playback={playback}
          moodName={activePlaylist?.name}
          moodVisualKey={activePlaylist?.visualKey}
          currentVoteCount={
            currentDashboardTrack?.voteCount ?? playback.currentTrack?.voteCount ?? 0
          }
          upNext={upNextTracks}
          playbackPending={playbackMutation.isPending}
          errorMessage={
            playbackMutation.error instanceof Error ? playbackMutation.error.message : undefined
          }
          onStart={() => playbackMutation.mutate("start")}
          onTogglePlayback={() => playbackMutation.mutate(playback.isPlaying ? "pause" : "resume")}
          onSkip={() => playbackMutation.mutate("skip")}
        />
      )}

      <div className="host-live-secondary" id="host-actions">
        <section className="admin-flash-panel" aria-labelledby="admin-flash-title">
          <div className="admin-flash-icon" aria-hidden="true">
            <Lightning weight="fill" />
          </div>
          <div className="admin-flash-copy">
            <p className="eyebrow">Brand moment</p>
            <h2 id="admin-flash-title">Your turn</h2>
            {dashboard.flash.turn === null ? (
              <p>
                {dashboard.flash.enabled
                  ? dashboard.flash.nextFlashTurnAt === null
                    ? "Le prochain tirage se prépare."
                    : `Prochain tirage vers ${new Intl.DateTimeFormat("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      }).format(new Date(dashboard.flash.nextFlashTurnAt))}.`
                  : "Les tirages automatiques sont désactivés dans les réglages."}
              </p>
            ) : (
              <p>
                <strong>{dashboard.flash.turn.participant.nickname}</strong>{" "}
                {dashboard.flash.turn.status === "SUBMITTED"
                  ? `a choisi ${dashboard.flash.turn.track?.title ?? "un morceau"}.`
                  : "a été tiré au sort et choisit son morceau."}
              </p>
            )}
            <small>
              <Timer aria-hidden="true" />
              {dashboard.flash.intervalMinutes} min entre les tirages ·{" "}
              {dashboard.flash.selectionWindowSeconds} s pour répondre
            </small>
          </div>
          <div className="admin-flash-actions">
            {dashboard.flash.turn === null ? (
              <button
                type="button"
                className="secondary-button"
                disabled={party.status !== "ACTIVE" || flashMutation.isPending}
                onClick={() => flashMutation.mutate("trigger")}
              >
                <Lightning aria-hidden="true" />
                Tirer maintenant
              </button>
            ) : (
              <button
                type="button"
                className="secondary-button"
                disabled={flashMutation.isPending}
                onClick={() => flashMutation.mutate("cancel")}
              >
                Annuler ce tour
              </button>
            )}
          </div>
        </section>
        <FormError message={actionError instanceof Error ? actionError.message : undefined} />

        <section
          className="dashboard-section"
          id="host-people"
          aria-labelledby="participants-title"
        >
          <div className="section-heading">
            <div>
              <h2 id="participants-title">Participants</h2>
            </div>
          </div>
          {dashboard.participants.length === 0 ? (
            <p className="dashboard-empty">Personne n’a encore rejoint la soirée.</p>
          ) : (
            <div className="dashboard-participants">
              {dashboard.participants.map((participant) => (
                <article key={participant.id} className="dashboard-participant">
                  <AvatarMark seed={participant.nickname} label={participant.nickname} />
                  <div>
                    <h3>{participant.nickname}</h3>
                    <p>
                      {participant.contributionCount} proposition
                      {participant.contributionCount === 1 ? "" : "s"} ·{" "}
                      {participant.isActive ? "connecté" : "hors ligne"}
                    </p>
                    <div className="reward-badges">
                      {participant.rewards
                        .filter((reward) => reward.status === "AVAILABLE")
                        .map((reward) => (
                          <span key={reward.id}>
                            {rewardShortLabels[reward.type]} ×{reward.usesRemaining}
                          </span>
                        ))}
                    </div>
                  </div>
                  <div className="participant-actions">
                    <RewardAssignment
                      participantName={participant.nickname}
                      disabled={rewardMutation.isPending || participant.isBlocked}
                      onAssign={(type) =>
                        rewardMutation.mutate({
                          partyId,
                          participantId: participant.id,
                          type,
                          uses: 1,
                        })
                      }
                    />
                    <button
                      className="text-danger-button"
                      disabled={participant.isBlocked || blockMutation.isPending}
                      onClick={() => blockMutation.mutate(participant.id)}
                    >
                      <LockKey aria-hidden="true" />
                      {participant.isBlocked ? "Bloqué" : "Bloquer"}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="dashboard-section" id="host-rotation" aria-labelledby="proposals-title">
          <div className="section-heading">
            <div>
              <h2 id="proposals-title">Music control</h2>
            </div>
          </div>
          <div className="dashboard-track-list">
            {dashboard.recentTracks.length === 0 ? (
              <p className="dashboard-empty">
                Les propositions apparaîtront ici dès qu’un invité ajoute un morceau.
              </p>
            ) : (
              dashboard.recentTracks.map((track, index) => (
                <RotationTrackCard
                  key={track.id}
                  track={track}
                  position={index + 1}
                  label={`${track.playlistName} · ${track.status}`}
                  actions={
                    track.status === "PENDING" ? (
                      <>
                        <button
                          className="secondary-button"
                          disabled={forceMutation.isPending}
                          onClick={() => forceMutation.mutate(track.id)}
                        >
                          <CheckCircle aria-hidden="true" />
                          Forcer ensuite
                        </button>
                        <button
                          className="icon-button danger-button"
                          aria-label={`Supprimer ${track.title}`}
                          disabled={removeMutation.isPending}
                          onClick={() => removeMutation.mutate(track.id)}
                        >
                          <Trash aria-hidden="true" />
                        </button>
                      </>
                    ) : undefined
                  }
                />
              ))
            )}
          </div>
        </section>

        <section className="dashboard-section" aria-labelledby="settings-title">
          <div className="section-heading">
            <div>
              <h2 id="settings-title">Rules</h2>
            </div>
          </div>
          <PartySettingsForm
            settings={dashboard.settings}
            isPending={settingsMutation.isPending}
            {...(settingsMutation.error instanceof Error
              ? { errorMessage: settingsMutation.error.message }
              : {})}
            onSubmit={(input) => settingsMutation.mutate(input)}
          />
        </section>

        <section className="dashboard-danger-zone" aria-labelledby="danger-title">
          <WarningCircle aria-hidden="true" weight="fill" />
          <div>
            <h2 id="danger-title">Fin de la rotation ?</h2>
            <p>Les invités seront déconnectés et aucune nouvelle proposition ne sera acceptée.</p>
          </div>
          <button
            className="danger-action-button"
            disabled={party.status === "ENDED" || endMutation.isPending}
            onClick={requestEnd}
          >
            {party.status === "ENDED" ? "Soirée terminée" : "Clôturer"}
          </button>
        </section>
      </div>
    </main>
  );
}
