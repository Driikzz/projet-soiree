import { DotsThree, MusicNotes, Pause, Play, SkipForward, UsersThree } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type {
  PartyPlayback,
  PartySummary,
  PlaylistTrack,
  PlaylistVisualKey,
} from "@songfest/shared";

import { LiveIndicator } from "./live-indicator";
import { RotReference } from "./rot-reference";
import { RotationTrackCard } from "./rotation-track-card";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

const usePlaybackProgress = (playback: PartyPlayback) => {
  const [now, setNow] = useState(playback.serverTimestamp);

  useEffect(() => {
    if (!playback.isPlaying || playback.currentTrack === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [playback.currentTrack, playback.isPlaying]);

  const elapsed = playback.isPlaying ? Math.max(0, now - playback.serverTimestamp) : 0;
  return Math.min(playback.durationMs, playback.progressMs + elapsed);
};

interface HostLiveScreenProps {
  party: PartySummary;
  playback: PartyPlayback;
  moodName: string | undefined;
  moodVisualKey: PlaylistVisualKey | undefined;
  currentVoteCount: number;
  upNext: PlaylistTrack[];
  playbackPending: boolean;
  errorMessage: string | undefined;
  onStart: () => void;
  onTogglePlayback: () => void;
  onSkip: () => void;
}

export function HostLiveScreen({
  party,
  playback,
  moodName,
  moodVisualKey,
  currentVoteCount,
  upNext,
  playbackPending,
  errorMessage,
  onStart,
  onTogglePlayback,
  onSkip,
}: HostLiveScreenProps) {
  const progressMs = usePlaybackProgress(playback);
  const progressPercent =
    playback.durationMs === 0 ? 0 : Math.min(100, (progressMs / playback.durationMs) * 100);
  const currentTrack = playback.currentTrack;
  const displayedNextTracks = upNext.slice(0, 1);

  return (
    <section className="host-live-screen" aria-labelledby="host-live-title">
      {currentTrack?.coverUrl != null && (
        <img className="host-live-ambient" src={currentTrack.coverUrl} alt="" aria-hidden="true" />
      )}

      <header className="host-live-header">
        <RotReference code={party.code} />
        <div className="host-live-status">
          <LiveIndicator waiting={party.status !== "ACTIVE"} />
          <span className="host-live-people-count">
            <UsersThree aria-hidden="true" weight="bold" />
            {party.activeParticipantCount}
          </span>
        </div>
      </header>

      <div className="host-live-heading">
        <h1 id="host-live-title">
          En cours<span aria-hidden="true">.</span>
        </h1>
        <span className="host-live-side">Side A</span>
      </div>

      <div className="host-live-player">
        <div className="host-live-artwork-stage">
          <span
            className={`host-live-vinyl${playback.isPlaying ? " is-playing" : ""}`}
            aria-hidden="true"
          >
            <i />
          </span>
          <span className="host-live-sleeve">
            {currentTrack?.coverUrl == null ? (
              <span className="host-live-cover host-live-cover-fallback" aria-hidden="true">
                <MusicNotes weight="light" />
              </span>
            ) : (
              <img
                className="host-live-cover"
                src={currentTrack.coverUrl}
                alt={`Pochette de ${currentTrack.title}`}
              />
            )}
          </span>
        </div>

        <div className="host-live-track-copy">
          <p>{playback.isPlaying ? "Now playing" : currentTrack === null ? "Ready" : "Paused"}</p>
          <h2>{currentTrack?.title ?? "La rotation est prête."}</h2>
          <span>{currentTrack?.artistNames.join(", ") ?? party.name}</span>
        </div>

        <div
          className="host-live-progress"
          role="progressbar"
          aria-label="Progression du morceau"
          aria-valuemin={0}
          aria-valuemax={playback.durationMs}
          aria-valuenow={Math.round(progressMs)}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="host-live-times" aria-hidden="true">
          <span>{formatDuration(progressMs)}</span>
          <span>{formatDuration(playback.durationMs)}</span>
        </div>

        <div className="host-live-controls" aria-label="Contrôles de lecture">
          {party.status !== "ACTIVE" ? (
            <button
              type="button"
              className="host-live-start"
              disabled={party.status === "ENDED" || playbackPending}
              onClick={onStart}
            >
              <Play aria-hidden="true" weight="fill" />
              Lancer la soirée
            </button>
          ) : (
            <>
              <button
                type="button"
                className="host-live-control host-live-control-primary"
                aria-label={playback.isPlaying ? "Mettre en pause" : "Reprendre la lecture"}
                disabled={playbackPending}
                onClick={onTogglePlayback}
              >
                {playback.isPlaying ? (
                  <Pause aria-hidden="true" weight="fill" />
                ) : (
                  <Play aria-hidden="true" weight="fill" />
                )}
              </button>
              <button
                type="button"
                className="host-live-control"
                aria-label="Passer au morceau suivant"
                disabled={playbackPending}
                onClick={onSkip}
              >
                <SkipForward aria-hidden="true" weight="fill" />
              </button>
              <a
                className="host-live-control"
                href="#host-controls"
                aria-label="Ouvrir les actions de la soirée"
              >
                <DotsThree aria-hidden="true" weight="bold" />
              </a>
            </>
          )}
        </div>
      </div>

      <dl className="host-live-facts">
        <div>
          <dt>Votes</dt>
          <dd>
            <span className="host-live-vote-mark" aria-hidden="true" />
            <strong>{currentVoteCount}</strong>
            <small>reçus</small>
          </dd>
        </div>
        <div>
          <dt>Ambiance</dt>
          <dd>
            <span
              className={`host-live-mood-disc mood-${moodVisualKey ?? "free"}`}
              aria-hidden="true"
            />
            <strong>{moodName ?? "Libre"}</strong>
            <small>en cours</small>
          </dd>
        </div>
        <div>
          <dt>People</dt>
          <dd>
            <UsersThree aria-hidden="true" weight="fill" />
            <strong>{party.activeParticipantCount}</strong>
            <small>dans la soirée</small>
          </dd>
        </div>
      </dl>

      <section className="host-live-up-next" aria-labelledby="host-live-up-next-title">
        <header>
          <div>
            <h2 id="host-live-up-next-title">File d’attente</h2>
            <span>Side A</span>
          </div>
          <a href="#host-rotation">Voir tout</a>
        </header>
        {displayedNextTracks.length === 0 ? (
          <p className="host-live-empty">La prochaine face attend un morceau.</p>
        ) : (
          displayedNextTracks.map((track, index) => (
            <RotationTrackCard key={track.id} track={track} position={index + 1} compact />
          ))
        )}
      </section>

      {errorMessage !== undefined && (
        <p className="host-live-error" role="alert">
          {errorMessage}
        </p>
      )}
    </section>
  );
}
