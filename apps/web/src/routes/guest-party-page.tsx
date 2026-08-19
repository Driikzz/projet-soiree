import {
  CheckCircle,
  Clock,
  Disc,
  ListNumbers,
  MusicNotes,
  Plus,
  SignOut,
  UsersThree,
  X,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { ActiveTrackPreview } from "../components/active-track-preview";
import { AvatarMark } from "../components/avatar-mark";
import { FlashTurnPanel } from "../components/flash-turn-panel";
import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { NowPlayingCard } from "../components/now-playing-card";
import { PlaylistCard } from "../components/playlist-card";
import { PlaylistRewardPanel } from "../components/playlist-reward-panel";
import { RealtimeStatus } from "../components/realtime-status";
import { RotateBrand } from "../components/rotate-brand";
import { RotReference } from "../components/rot-reference";
import { ApiError } from "../lib/api/client";
import { getParticipantFlashState } from "../lib/api/flash";
import { getParticipantSession, getPartyPeople, leaveParty } from "../lib/api/parties";
import { getParticipantPlayback } from "../lib/api/playback";
import { addPlaylistVote, getParticipantPlaylists, removePlaylistVote } from "../lib/api/playlists";
import { getPlaylistTracks } from "../lib/api/tracks";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

export function GuestPartyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { partyId } = useParams();
  const [activeTab, setActiveTab] = useState<"live" | "rotation" | "people">("live");
  const guideStorageKey = `rotate_guest_guide_seen:${partyId ?? "unknown"}`;
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
  const peopleQuery = useQuery({
    queryKey: ["party-people", partyId],
    queryFn: ({ signal }) => getPartyPeople(partyId ?? "", signal),
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
      <header className="guest-header rotate-guest-header">
        <RotateBrand compact />
        <div className="guest-party-context">
          <RotReference code={session.party.code} live={session.party.status === "ACTIVE"} />
          <span>{session.party.name}</span>
        </div>
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

      <section className="guest-welcome rotate-live-heading" hidden={activeTab !== "live"}>
        <div>
          <p className="eyebrow">Live rotation</p>
          <h1>{session.party.name}</h1>
        </div>
        <div className="guest-you-chip">
          <AvatarMark seed={session.participant.nickname} label={session.participant.nickname} />
          <span>
            <small>You</small>
            {session.participant.nickname}
          </span>
        </div>
      </section>

      {showGuide && activeTab === "live" && (
        <section className="guest-guide" aria-labelledby="guest-guide-title">
          <div className="guest-guide-heading">
            <div>
              <p className="eyebrow">First press</p>
              <h2 id="guest-guide-title">Vote. Press. Listen.</h2>
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
                <strong>Vote</strong>
                <small>Soutiens les morceaux que tu veux entendre.</small>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <strong>Press</strong>
                <small>Dépense ta ressource limitée pour augmenter leur poids.</small>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <strong>Mood</strong>
                <small>Choisis l’ambiance qui prendra le relais.</small>
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
        <div className="guest-now-playing" hidden={activeTab !== "live"}>
          <NowPlayingCard playback={playbackQuery.data} partyId={session.party.id} />
        </div>
      )}

      <section
        className="guest-action-panel"
        aria-labelledby="guest-actions-title"
        hidden={activeTab !== "live"}
      >
        <div>
          <p className="eyebrow">Current mood</p>
          <h2 id="guest-actions-title">
            {activePlaylist === undefined ? "La soirée se prépare" : activePlaylist.name}
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
              Ajouter un morceau
            </button>
          ) : (
            <Link
              className="primary-link guest-main-action"
              to={`/party/${session.party.id}/playlists/${proposalPlaylist.id}#spotify-search-title`}
            >
              <Plus aria-hidden="true" weight="bold" />
              Ajouter un morceau
              <span>{proposalPlaylist.remainingTrackQuota} restants</span>
            </Link>
          )}
          <button
            type="button"
            className="guest-secondary-action"
            onClick={() => setActiveTab("rotation")}
          >
            Voir la rotation
          </button>
          <a className="guest-secondary-action" href="#guest-playlists-title">
            Changer d’ambiance
          </a>
        </div>
      </section>

      <FormError
        message={flashQuery.error instanceof Error ? flashQuery.error.message : undefined}
      />
      {flashQuery.data !== undefined && activeTab === "live" && (
        <FlashTurnPanel
          partyId={session.party.id}
          flash={flashQuery.data.flash}
          explicitContentAllowed={flashPlaylist?.explicitContentAllowed ?? false}
          existingTrackIds={new Set(flashTracks.map((track) => track.spotifyTrackId))}
        />
      )}

      <div className="guest-tab-panel" hidden={activeTab !== "rotation"}>
        {activePlaylist !== undefined ? (
          <ActiveTrackPreview
            partyId={session.party.id}
            playlistId={activePlaylist.id}
            playlistName={activePlaylist.name}
            tracks={activeTracks}
            flameBudget={
              activeTracksQuery.data?.flameBudget ?? {
                total: 5,
                used: 0,
                remaining: 5,
                maxPerTrack: 3,
              }
            }
            votesEnabled={activePlaylist.trackVotesEnabled}
          />
        ) : (
          <section className="tracks-empty-state">
            <MusicNotes aria-hidden="true" />
            <h2>La rotation se prépare.</h2>
            <p>Le host choisit encore la première ambiance.</p>
          </section>
        )}
      </div>

      <section
        className="guest-playlists"
        aria-labelledby="guest-playlists-title"
        hidden={activeTab !== "live"}
      >
        <div className="section-heading">
          <div>
            <p className="eyebrow">Mood shift</p>
            <h2 id="guest-playlists-title">Choisis la suite</h2>
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

      <section
        className="guest-people"
        aria-labelledby="guest-people-title"
        hidden={activeTab !== "people"}
      >
        <header className="guest-people-heading">
          <RotReference code={session.party.code} />
          <p className="eyebrow">People</p>
          <h2 id="guest-people-title">Dans la rotation</h2>
          <p>{peopleQuery.data?.participants.length ?? 0} personnes participent maintenant.</p>
        </header>
        <FormError
          message={peopleQuery.error instanceof Error ? peopleQuery.error.message : undefined}
        />
        <div className="people-list">
          {peopleQuery.data !== undefined && (
            <article className="people-row host-row">
              <span className="host-mark" aria-hidden="true">
                R.
              </span>
              <span>
                <strong>{peopleQuery.data.host.displayName}</strong>
                Host
              </span>
              <b>Host</b>
            </article>
          )}
          {peopleQuery.data?.participants.map((person) => (
            <article className={`people-row${person.isCurrent ? " is-you" : ""}`} key={person.id}>
              <AvatarMark seed={person.avatarSeed} label={person.nickname} />
              <span>
                <strong>{person.nickname}</strong>
                {person.contributionCount} morceau{person.contributionCount === 1 ? "" : "x"}
              </span>
              {person.isCurrent && <b>You</b>}
            </article>
          ))}
        </div>
      </section>

      <nav className="guest-mobile-nav" aria-label="Actions principales">
        <button
          type="button"
          aria-current={activeTab === "live" ? "page" : undefined}
          onClick={() => setActiveTab("live")}
        >
          <Disc aria-hidden="true" />
          Live
        </button>
        <button
          type="button"
          aria-current={activeTab === "rotation" ? "page" : undefined}
          onClick={() => setActiveTab("rotation")}
        >
          <ListNumbers aria-hidden="true" />
          Rotation
        </button>
        <button
          type="button"
          aria-current={activeTab === "people" ? "page" : undefined}
          onClick={() => setActiveTab("people")}
        >
          <UsersThree aria-hidden="true" />
          People
        </button>
      </nav>
      {proposalPlaylist !== undefined && (
        <Link
          className="guest-add-fab"
          to={`/party/${session.party.id}/playlists/${proposalPlaylist.id}#spotify-search-title`}
          aria-label="Ajouter un morceau"
        >
          <Plus aria-hidden="true" weight="bold" />
        </Link>
      )}
    </main>
  );
}
