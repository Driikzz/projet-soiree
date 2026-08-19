import { ArrowLeft, LockKey, MusicNotes, UsersThree } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";

import { LoadingPage } from "../components/loading-page";
import { FormError } from "../components/form-error";
import { PlaylistVisual } from "../components/playlist-visual";
import { RotationTrackCard } from "../components/rotation-track-card";
import { SpotifySearch } from "../components/spotify-search";
import { FlameBudgetSummary } from "../components/track-flame-control";
import { TrackRewardPanel } from "../components/track-reward-panel";
import { ApiError } from "../lib/api/client";
import { getParticipantPlaylists } from "../lib/api/playlists";
import { getParticipantSession } from "../lib/api/parties";
import { addTrackVote, getPlaylistTracks, removeTrackVote } from "../lib/api/tracks";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1_000);
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

const trackStatusLabels = {
  PENDING: "Proposé",
  SELECTED: "Sélectionné",
  QUEUED: "À suivre",
  PLAYING: "En cours",
  PLAYED: "Joué",
  SKIPPED: "Passé",
  REMOVED: "Retiré",
} as const;

export function PlaylistDetailPage() {
  const { partyId = "", playlistId = "" } = useParams();
  usePartyRealtime(partyId);
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["participant-session"],
    queryFn: ({ signal }) => getParticipantSession(signal),
    retry: false,
  });
  const playlistsQuery = useQuery({
    queryKey: ["participant-playlists", partyId],
    queryFn: ({ signal }) => getParticipantPlaylists(partyId, signal),
    retry: false,
    refetchInterval: 15_000,
  });
  const tracksQuery = useQuery({
    queryKey: ["playlist-tracks", playlistId],
    queryFn: ({ signal }) => getPlaylistTracks(playlistId, signal),
    enabled: playlistId !== "",
    retry: false,
    refetchInterval: 10_000,
  });
  const trackVoteMutation = useMutation({
    mutationFn: ({ trackId, action }: { trackId: string; action: "add" | "remove" }) =>
      action === "add" ? addTrackVote(trackId) : removeTrackVote(trackId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] });
    },
  });

  if (playlistsQuery.isPending || tracksQuery.isPending) {
    return <LoadingPage />;
  }

  if (
    playlistsQuery.error instanceof ApiError &&
    playlistsQuery.error.code === "AUTHENTICATION_REQUIRED"
  ) {
    return <Navigate to="/" replace />;
  }

  if (playlistsQuery.isError) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Connexion impossible</p>
        <h1 className="screen-title">La playlist ne peut pas être chargée.</h1>
        <FormError
          message={playlistsQuery.error instanceof Error ? playlistsQuery.error.message : undefined}
        />
      </main>
    );
  }

  const playlist = playlistsQuery.data?.playlists.find((item) => item.id === playlistId);
  if (playlist === undefined) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Playlist introuvable</p>
        <h1 className="screen-title">Cette ambiance n’est plus disponible.</h1>
        <Link className="primary-link" to={`/party/${partyId}`}>
          Revenir aux playlists
        </Link>
      </main>
    );
  }

  const participantTrackCount = playlist.participantTrackCount ?? 0;
  const remainingQuota = playlist.remainingTrackQuota ?? playlist.quotaPerParticipant;
  const extraTrackQuota = playlist.extraTrackQuota ?? 0;
  const totalQuota = playlist.quotaPerParticipant + extraTrackQuota;
  const tracks = tracksQuery.data?.tracks ?? [];
  const flameBudget = tracksQuery.data?.flameBudget ?? {
    total: 5,
    used: 0,
    remaining: 5,
    maxPerTrack: 3,
  };
  const existingTrackIds = new Set(tracks.map((track) => track.spotifyTrackId));
  const orderedTracks = [...tracks].sort(
    (left, right) =>
      Number(right.status === "PENDING") - Number(left.status === "PENDING") ||
      right.voteScore - left.voteScore ||
      right.voteSupporterCount - left.voteSupporterCount ||
      new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
  );

  return (
    <main className="playlist-detail-shell">
      <header className="guest-header">
        <Link className="back-link" to={`/party/${partyId}`}>
          <ArrowLeft aria-hidden="true" weight="bold" />
          Les ambiances
        </Link>
        <span className={`status-badge ${playlist.isActive ? "status-open" : ""}`}>
          {playlist.isActive ? "En cours" : playlist.isOpen ? "Disponible" : "Verrouillée"}
        </span>
      </header>

      <section className="playlist-detail-hero">
        <PlaylistVisual visualKey={playlist.visualKey} label={playlist.name} />
        <div>
          <p className="eyebrow">{playlist.isActive ? "Playlist active" : "Ambiance musicale"}</p>
          <h1 className="screen-title">{playlist.name}</h1>
          <p className="screen-copy">
            {playlist.description ?? "Une ambiance à construire ensemble."}
          </p>
        </div>
      </section>

      <section className="quota-banner" aria-label="Quota de morceaux">
        <div>
          <strong>
            Il te reste {remainingQuota} ajout{remainingQuota === 1 ? "" : "s"} dans cette playlist.
          </strong>
          <span>
            {participantTrackCount} utilisé{participantTrackCount === 1 ? "" : "s"} sur {totalQuota}
            {extraTrackQuota > 0 && ` · ${extraTrackQuota} bonus`}
          </span>
        </div>
        <span className="quota-number">
          {remainingQuota}/{totalQuota}
        </span>
      </section>

      {playlist.isActive && playlist.trackVotesEnabled && (
        <FlameBudgetSummary budget={flameBudget} />
      )}

      {!playlist.isOpen ? (
        <div className="locked-playlist-note">
          <LockKey aria-hidden="true" weight="fill" />
          <span>
            <strong>Cette playlist est verrouillée.</strong>
            Tu peux consulter les morceaux, mais pas en proposer pour le moment.
          </span>
        </div>
      ) : (
        <SpotifySearch
          partyId={partyId}
          playlistId={playlistId}
          remainingQuota={remainingQuota}
          explicitContentAllowed={playlist.explicitContentAllowed}
          existingTrackIds={existingTrackIds}
        />
      )}

      <FormError
        message={tracksQuery.error instanceof Error ? tracksQuery.error.message : undefined}
      />
      <FormError
        message={
          trackVoteMutation.error instanceof Error ? trackVoteMutation.error.message : undefined
        }
      />

      {sessionQuery.data !== undefined && tracks.length > 0 && (
        <TrackRewardPanel
          partyId={partyId}
          playlistId={playlistId}
          participantId={sessionQuery.data.participant.id}
          tracks={tracks}
        />
      )}

      {tracks.length === 0 ? (
        <section className="tracks-empty-state">
          <MusicNotes aria-hidden="true" weight="duotone" />
          <h2>Aucun morceau pour le moment.</h2>
          <p>Les propositions apparaîtront ici avec leur priorité et leurs contributeurs.</p>
          <span>
            <UsersThree aria-hidden="true" />
            {playlist.contributorCount} contributeur
            {playlist.contributorCount === 1 ? "" : "s"}
          </span>
        </section>
      ) : (
        <section className="playlist-tracks" aria-labelledby="playlist-tracks-title">
          <div className="section-heading">
            <h2 id="playlist-tracks-title">Les propositions</h2>
            <p>
              {tracks.length} morceau{tracks.length === 1 ? "" : "x"} dans cette ambiance.
            </p>
          </div>
          <div className="playlist-track-list rotation-detail-list">
            {orderedTracks.map((track, index) => (
              <RotationTrackCard
                key={track.id}
                track={track}
                position={index + 1}
                label={`${trackStatusLabels[track.status]} · ${formatDuration(track.durationMs)}`}
                flameBudget={flameBudget}
                disabled={
                  !playlist.isActive || !playlist.trackVotesEnabled || track.status !== "PENDING"
                }
                pending={trackVoteMutation.isPending}
                onAdd={() => trackVoteMutation.mutate({ trackId: track.id, action: "add" })}
                onRemove={() => trackVoteMutation.mutate({ trackId: track.id, action: "remove" })}
              />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
