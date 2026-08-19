import {
  CheckCircle,
  Clock,
  Disc,
  ListNumbers,
  MusicNotes,
  Plus,
  SignOut,
  UsersThree,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";

import { ActiveTrackPreview } from "../components/active-track-preview";
import { AvatarMark } from "../components/avatar-mark";
import { FlashTurnPanel } from "../components/flash-turn-panel";
import { FormError } from "../components/form-error";
import { GuestLiveScreen } from "../components/guest-live-screen";
import { LoadingPage } from "../components/loading-page";
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
import {
  addTrackVote,
  applyTrackVoteResult,
  getPlaylistTracks,
  removeTrackVote,
  type TrackListResponse,
} from "../lib/api/tracks";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

export function GuestPartyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { partyId } = useParams();
  const [activeTab, setActiveTab] = useState<"live" | "rotation" | "people">("live");
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
  const trackVoteMutation = useMutation({
    mutationFn: ({ trackId, hasVoted }: { trackId: string; hasVoted: boolean }) =>
      hasVoted ? removeTrackVote(trackId) : addTrackVote(trackId),
    onSuccess: ({ vote }) => {
      queryClient.setQueryData<TrackListResponse>(
        ["playlist-tracks", activePlaylist?.id],
        (current) => applyTrackVoteResult(current, vote),
      );
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
  const upNext = activeTracks
    .filter((track) => track.status === "PENDING")
    .sort(
      (left, right) =>
        right.voteScore - left.voteScore ||
        right.voteSupporterCount - left.voteSupporterCount ||
        new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime(),
    )
    .slice(0, 2);

  return (
    <main className={`guest-shell${activeTab === "live" ? " is-live-screen" : ""}`}>
      {activeTab === "live" && (
        <GuestLiveScreen
          partyCode={session.party.code}
          partyId={session.party.id}
          partyName={session.party.name}
          peopleCount={
            peopleQuery.data?.participants.length ?? session.party.activeParticipantCount
          }
          moodName={activePlaylist?.name}
          playback={playbackQuery.data}
          upNext={upNext}
          votePendingTrackId={trackVoteMutation.variables?.trackId}
          onVote={(track) =>
            trackVoteMutation.mutate({
              trackId: track.id,
              hasVoted: track.participantHasVoted,
            })
          }
          errorMessage={
            playbackQuery.error instanceof Error
              ? playbackQuery.error.message
              : trackVoteMutation.error instanceof Error
                ? trackVoteMutation.error.message
                : undefined
          }
        />
      )}

      <header className="guest-header rotate-guest-header" hidden={activeTab === "live"}>
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

      <FormError
        message={leaveMutation.error instanceof Error ? leaveMutation.error.message : undefined}
      />

      <FormError
        message={flashQuery.error instanceof Error ? flashQuery.error.message : undefined}
      />
      {flashQuery.data !== undefined &&
        flashQuery.data.flash.turn !== null &&
        activeTab === "live" && (
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
        hidden={activeTab !== "rotation"}
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
