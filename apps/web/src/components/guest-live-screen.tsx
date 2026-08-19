import { DotsThree, MusicNotes } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { ParticipantPlaylistTrack, PartyPlayback } from "@songfest/shared";

import { LiveIndicator } from "./live-indicator";
import { SkipVoteControl } from "./now-playing-card";
import { RotReference } from "./rot-reference";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

const usePlaybackProgress = (playback: PartyPlayback | undefined) => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (playback?.isPlaying !== true || playback.currentTrack === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [playback?.currentTrack, playback?.isPlaying]);

  if (playback === undefined) return 0;
  const elapsed = playback.isPlaying ? Math.max(0, now - playback.serverTimestamp) : 0;
  return Math.min(playback.durationMs, playback.progressMs + elapsed);
};

interface GuestLiveScreenProps {
  partyCode: string;
  partyId: string;
  partyName: string;
  peopleCount: number;
  moodName: string | undefined;
  playback: PartyPlayback | undefined;
  upNext: ParticipantPlaylistTrack[];
  votePendingTrackId: string | undefined;
  onVote: (track: ParticipantPlaylistTrack) => void;
  errorMessage: string | undefined;
}

export function GuestLiveScreen({
  partyCode,
  partyId,
  partyName,
  peopleCount,
  moodName,
  playback,
  upNext,
  votePendingTrackId,
  onVote,
  errorMessage,
}: GuestLiveScreenProps) {
  const [showTrackActions, setShowTrackActions] = useState(false);
  const progressMs = usePlaybackProgress(playback);
  const progressPercent =
    playback === undefined || playback.durationMs === 0
      ? 0
      : Math.min(100, (progressMs / playback.durationMs) * 100);
  const currentTrack = playback?.currentTrack;

  return (
    <div className="rotate-live-screen">
      <header className="rotate-live-catalogue">
        <RotReference code={partyCode} />
        <LiveIndicator />
      </header>

      <section className="rotate-live-party" aria-labelledby="rotate-live-party-name">
        <h1 id="rotate-live-party-name">{partyName}</h1>
        <p>
          {peopleCount} people <span aria-hidden="true">·</span>{" "}
          <strong>{moodName ?? "Rotation"}</strong>
        </p>
      </section>

      <section className="rotate-live-player" aria-labelledby="rotate-now-playing-title">
        <div className="rotate-live-artwork-stage">
          <span className="rotate-live-record" aria-hidden="true">
            <i />
          </span>
          <span className="rotate-live-sleeve">
            {currentTrack?.coverUrl == null ? (
              <span className="rotate-live-cover rotate-live-cover-fallback" aria-hidden="true">
                <MusicNotes weight="light" />
              </span>
            ) : (
              <img
                className="rotate-live-cover"
                src={currentTrack.coverUrl}
                alt={`Pochette de ${currentTrack.title}`}
              />
            )}
            <span className="rotate-live-sleeve-label" aria-hidden="true">
              <strong>ROTATE</strong>
              <small>Current press</small>
            </span>
          </span>
        </div>

        <div className="rotate-live-track-copy">
          <p className="rotate-live-label">
            {playback === undefined ? "Connecting" : playback.isPlaying ? "Now playing" : "Paused"}
          </p>
          <h2 id="rotate-now-playing-title">{currentTrack?.title ?? "La musique arrive."}</h2>
          <p>{currentTrack?.artistNames.join(", ") ?? "La rotation se prépare"}</p>
          {playback?.skipVote.isAvailable === true && (
            <button
              type="button"
              className="rotate-live-track-actions"
              aria-label="Actions du morceau en cours"
              aria-expanded={showTrackActions}
              onClick={() => setShowTrackActions((visible) => !visible)}
            >
              <DotsThree weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>

        <div
          className="rotate-live-progress"
          role="progressbar"
          aria-label="Progression du morceau"
          aria-valuemin={0}
          aria-valuemax={playback?.durationMs ?? 0}
          aria-valuenow={Math.round(progressMs)}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="rotate-live-times" aria-hidden="true">
          <span>{formatDuration(progressMs)}</span>
          <span>{formatDuration(playback?.durationMs ?? 0)}</span>
        </div>
        {showTrackActions && playback !== undefined && (
          <SkipVoteControl partyId={partyId} playback={playback} />
        )}
      </section>

      <section className="rotate-up-next" aria-labelledby="rotate-up-next-title">
        <h2 id="rotate-up-next-title">Up next</h2>
        {upNext.length === 0 ? (
          <p className="rotate-up-next-empty">La prochaine face attend ton morceau.</p>
        ) : (
          <ol>
            {upNext.map((track, index) => (
              <li key={track.id}>
                <span className="rotate-up-next-position">
                  {(index + 1).toString().padStart(2, "0")}
                </span>
                {track.coverUrl === null ? (
                  <span className="rotate-up-next-cover cover-fallback" aria-hidden="true">
                    <MusicNotes />
                  </span>
                ) : (
                  <img className="rotate-up-next-cover" src={track.coverUrl} alt="" />
                )}
                <span className="rotate-up-next-copy">
                  <strong>{track.title}</strong>
                  <small>{track.artistNames.join(", ")}</small>
                </span>
                <span className="rotate-up-next-score">
                  <strong>{track.voteScore}</strong>
                  <small>pts</small>
                </span>
                <button
                  type="button"
                  className={track.participantHasVoted ? "is-voted" : undefined}
                  aria-pressed={track.participantHasVoted}
                  disabled={votePendingTrackId === track.id}
                  onClick={() => onVote(track)}
                >
                  {track.participantHasVoted ? "✓ Voted" : "+ Vote"}
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      {errorMessage !== undefined && (
        <p className="rotate-live-error" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
