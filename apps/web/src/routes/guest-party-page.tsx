import {
  ArrowFatUp,
  CheckCircle,
  Clock,
  ListHeart,
  MusicNotes,
  Plus,
  SignOut,
  Sparkle,
  X,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { ActiveTrackPreview } from "../components/active-track-preview";
import { FlashTurnPanel } from "../components/flash-turn-panel";
import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { NowPlayingCard } from "../components/now-playing-card";
import { PlaylistCard } from "../components/playlist-card";
import { PlaylistRewardPanel } from "../components/playlist-reward-panel";
import { RealtimeStatus } from "../components/realtime-status";
import { ApiError } from "../lib/api/client";
import { getParticipantFlashState } from "../lib/api/flash";
import { getParticipantSession, leaveParty } from "../lib/api/parties";
import { getParticipantPlayback } from "../lib/api/playback";
import { addPlaylistVote, getParticipantPlaylists, removePlaylistVote } from "../lib/api/playlists";
import { getPlaylistTracks } from "../lib/api/tracks";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

export function GuestPartyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { partyId } = useParams();
  const guideStorageKey = `songfest_guest_guide_seen:${partyId ?? "unknown"}`;
  const [showGuide, setShowGuide] = useState(
    () => window.localStorage.getItem(guideStorageKey) !== "true",
  );
  const realtimeStatus = usePartyRealtime(partyId ?? "");
  const sessionQuery = useQuery({
    queryKey: ["participant-session"],
    queryFn: ({ signal }) => getParticipantSession(signal),
    retry: false,
  });
  const playlistsQuery = useQuery({
    queryKey: ["participant-playlists", partyId],
    queryFn: ({ signal }) => getParticipantPlaylists(partyId ?? "", signal),
    enabled: partyId !== undefined,
    retry: false,
    refetchInterval: 15_000,
  });
  const playbackQuery = useQuery({
    queryKey: ["party-playback", partyId],
    queryFn: ({ signal }) => getParticipantPlayback(partyId ?? "", signal),
    enabled: partyId !== undefined,
    retry: false,
    refetchInterval: 15_000,
  });
  const flashQuery = useQuery({
    queryKey: ["party-flash", partyId],
    queryFn: ({ signal }) => getParticipantFlashState(partyId ?? "", signal),
    enabled: partyId !== undefined,
    retry: false,
    refetchInterval: 15_000,
  });
  const playlists = playlistsQuery.data?.playlists ?? [];
  const activePlaylist = playlists.find((playlist) => playlist.isActive);
  const activeTracksQuery = useQuery({
    queryKey: ["playlist-tracks", activePlaylist?.id],
    queryFn: ({ signal }) => getPlaylistTracks(activePlaylist?.id ?? "", signal),
    enabled: activePlaylist !== undefined,
    retry: false,
    refetchInterval: 15_000,
  });
  const flashPlaylistId = flashQuery.data?.flash.turn?.playlistId;
  const flashTracksQuery = useQuery({
    queryKey: ["playlist-tracks", flashPlaylistId],
    queryFn: ({ signal }) => getPlaylistTracks(flashPlaylistId ?? "", signal),
    enabled: flashPlaylistId !== undefined && flashPlaylistId !== activePlaylist?.id,
    retry: false,
  });
  const leaveMutation = useMutation({
    mutationFn: leaveParty,
    onSuccess: () => void navigate("/", { replace: true }),
  });
  const playlistVoteMutation = useMutation({
    mutationFn: ({
      playlistId,
      participantHasVoted,
    }: {
      playlistId: string;
      participantHasVoted: boolean;
    }) => (participantHasVoted ? removePlaylistVote(playlistId) : addPlaylistVote(playlistId)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["participant-playlists", partyId],
      });
    },
  });

  if (sessionQuery.isPending || playlistsQuery.isPending) {
    return <LoadingPage />;
  }

  if (
    sessionQuery.error instanceof ApiError &&
    sessionQuery.error.code === "AUTHENTICATION_REQUIRED"
  ) {
    return <Navigate to="/" replace />;
  }

  const session = sessionQuery.data;
  if (session === undefined || session.party.id !== partyId) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Session différente</p>
        <h1 className="screen-title">Reprends le QR code de ta soirée.</h1>
        <Link className="primary-link" to="/">
          Revenir à l’accueil
        </Link>
      </main>
    );
  }

  const playlistChange = playlistsQuery.data?.playlistChange;
  const scheduledPlaylist = playlists.find(
    (playlist) => playlist.id === playlistChange?.scheduledPlaylistId,
  );
  const remainingLockMinutes =
    playlistChange === undefined ? 0 : Math.ceil(playlistChange.remainingLockMs / 60_000);
  const proposalPlaylist = activePlaylist ?? playlists.find((playlist) => playlist.isOpen);
  const activeTracks = activeTracksQuery.data?.tracks ?? [];
  const flashTracks =
    flashPlaylistId === activePlaylist?.id ? activeTracks : (flashTracksQuery.data?.tracks ?? []);
  const flashPlaylist = playlists.find((playlist) => playlist.id === flashPlaylistId);
  const orderedPlaylists = [...playlists].sort(
    (left, right) => Number(right.isActive) - Number(left.isActive),
  );

  return (
    <main className="guest-shell">
      <header className="guest-header">
        <Link className="brand-link" to="/">
          SongFest
        </Link>
        <div className="guest-header-actions">
          <RealtimeStatus status={realtimeStatus} />
          <button
            className="icon-button"
            aria-label="Quitter la soirée"
            onClick={() => leaveMutation.mutate()}
            disabled={leaveMutation.isPending}
          >
            <SignOut aria-hidden="true" />
          </button>
        </div>
      </header>

      <section className="guest-welcome">
        <div>
          <p className="eyebrow">{session.party.name}</p>
          <h1>Salut {session.participant.nickname}, à toi de jouer.</h1>
        </div>
        <p>
          Propose des sons, vote pour les prochains titres et aide le groupe à choisir l’ambiance.
        </p>
      </section>

      {showGuide && (
        <section className="guest-guide" aria-labelledby="guest-guide-title">
          <div className="guest-guide-heading">
            <div>
              <p className="eyebrow">Le principe en 20 secondes</p>
              <h2 id="guest-guide-title">Trois gestes, une playlist collective</h2>
            </div>
            <button
              type="button"
              className="guide-close-button"
              aria-label="Masquer cette explication"
              onClick={() => {
                window.localStorage.setItem(guideStorageKey, "true");
                setShowGuide(false);
              }}
            >
              <X aria-hidden="true" />
            </button>
          </div>
          <ol>
            <li>
              <span>1</span>
              <div>
                <strong>Propose</strong>
                <small>Ajoute un morceau dans l’ambiance de ton choix.</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Vote</strong>
                <small>Fais remonter les morceaux que tu veux entendre.</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Change d’ambiance</strong>
                <small>Vote pour la playlist qui prendra le relais.</small>
              </div>
            </li>
          </ol>
        </section>
      )}

      <FormError
        message={leaveMutation.error instanceof Error ? leaveMutation.error.message : undefined}
      />
      <FormError
        message={playbackQuery.error instanceof Error ? playbackQuery.error.message : undefined}
      />
      {playbackQuery.data !== undefined && (
        <NowPlayingCard playback={playbackQuery.data} partyId={session.party.id} />
      )}

      <section className="guest-action-panel" aria-labelledby="guest-actions-title">
        <div>
          <p className="eyebrow">Que veux-tu faire maintenant ?</p>
          <h2 id="guest-actions-title">
            {activePlaylist === undefined
              ? "La soirée se prépare"
              : `${activePlaylist.name} est l’ambiance active`}
          </h2>
          {proposalPlaylist !== undefined && (
            <p>
              Il te reste <strong>{proposalPlaylist.remainingTrackQuota}</strong> ajout
              {proposalPlaylist.remainingTrackQuota === 1 ? "" : "s"} dans cette playlist.
            </p>
          )}
        </div>
        <div className="guest-primary-actions">
          {proposalPlaylist === undefined ? (
            <button className="primary-button" disabled>
              <Plus aria-hidden="true" />
              Proposer un son
            </button>
          ) : (
            <Link
              className="primary-link guest-main-action"
              to={`/party/${session.party.id}/playlists/${proposalPlaylist.id}#spotify-search-title`}
            >
              <Plus aria-hidden="true" weight="bold" />
              Proposer un son
              <span>{proposalPlaylist.remainingTrackQuota} restants</span>
            </Link>
          )}
          <a className="guest-secondary-action" href="#guest-track-votes">
            <ArrowFatUp aria-hidden="true" />
            Voter pour les sons
          </a>
          <a className="guest-secondary-action" href="#guest-playlists-title">
            <ListHeart aria-hidden="true" />
            Changer d’ambiance
          </a>
        </div>
      </section>

      <FormError
        message={flashQuery.error instanceof Error ? flashQuery.error.message : undefined}
      />
      {flashQuery.data !== undefined && (
        <FlashTurnPanel
          partyId={session.party.id}
          flash={flashQuery.data.flash}
          explicitContentAllowed={flashPlaylist?.explicitContentAllowed ?? false}
          existingTrackIds={new Set(flashTracks.map((track) => track.spotifyTrackId))}
        />
      )}

      {activePlaylist !== undefined && (
        <ActiveTrackPreview
          partyId={session.party.id}
          playlistId={activePlaylist.id}
          playlistName={activePlaylist.name}
          tracks={activeTracks}
          votesEnabled={activePlaylist.trackVotesEnabled}
        />
      )}

      <section className="guest-playlists" aria-labelledby="guest-playlists-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Les ambiances</p>
            <h2 id="guest-playlists-title">Explore ou vote pour la suite</h2>
            <p>
              Ouvre une carte pour ajouter des sons. Le bouton de vote sert uniquement à choisir la
              prochaine ambiance.
            </p>
          </div>
        </div>
        <FormError
          message={playlistsQuery.error instanceof Error ? playlistsQuery.error.message : undefined}
        />
        <FormError
          message={
            playlistVoteMutation.error instanceof Error
              ? playlistVoteMutation.error.message
              : undefined
          }
        />
        {scheduledPlaylist !== undefined ? (
          <div className="playlist-change-notice scheduled-change" role="status">
            <CheckCircle aria-hidden="true" weight="fill" />
            <span>
              <strong>{scheduledPlaylist.name} prendra le relais après ce morceau.</strong>
              L’ambiance actuelle ne sera pas coupée.
            </span>
          </div>
        ) : remainingLockMinutes > 0 ? (
          <div className="playlist-change-notice">
            <Clock aria-hidden="true" weight="fill" />
            <span>
              <strong>
                L’ambiance actuelle est encore verrouillée pendant {remainingLockMinutes} minute
                {remainingLockMinutes === 1 ? "" : "s"}.
              </strong>
              Tu peux déjà voter ; le changement attendra la fin du verrouillage.
            </span>
          </div>
        ) : playlistChange?.lockedByAdmin === true ? (
          <div className="playlist-change-notice">
            <Clock aria-hidden="true" weight="fill" />
            <span>L’organisateur a temporairement verrouillé les changements d’ambiance.</span>
          </div>
        ) : null}
        {playlistsQuery.isError ? null : playlists.length === 0 ? (
          <div className="tracks-empty-state">
            <MusicNotes aria-hidden="true" weight="duotone" />
            <h2>L’organisateur prépare les playlists.</h2>
            <p>Reviens dans un instant.</p>
          </div>
        ) : (
          <div className="playlist-grid">
            {orderedPlaylists.map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
                partyId={session.party.id}
                {...(playlistChange === undefined
                  ? {}
                  : { requiredVotes: playlistChange.requiredVotes })}
                canVote={
                  playlistChange?.votesEnabled === true &&
                  playlistChange.lockedByAdmin === false &&
                  playlistChange.scheduledPlaylistId === null
                }
                votePending={playlistVoteMutation.isPending}
                onVote={() =>
                  playlistVoteMutation.mutate({
                    playlistId: playlist.id,
                    participantHasVoted: playlist.participantHasVoted === true,
                  })
                }
              />
            ))}
          </div>
        )}
        <PlaylistRewardPanel partyId={session.party.id} playlists={playlists} />
      </section>

      <nav className="guest-mobile-nav" aria-label="Actions principales">
        {proposalPlaylist === undefined ? (
          <span aria-disabled="true">
            <Plus aria-hidden="true" />
            Proposer
          </span>
        ) : (
          <Link to={`/party/${session.party.id}/playlists/${proposalPlaylist.id}`}>
            <Plus aria-hidden="true" />
            Proposer
          </Link>
        )}
        <a href="#guest-track-votes">
          <ArrowFatUp aria-hidden="true" />
          Voter
        </a>
        <a href="#guest-playlists-title">
          <Sparkle aria-hidden="true" />
          Ambiances
        </a>
      </nav>
    </main>
  );
}
