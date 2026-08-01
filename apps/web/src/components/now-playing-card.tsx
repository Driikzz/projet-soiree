import { MusicNotes } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { PartyPlayback } from "@songfest/shared";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1_000));
  return `${Math.floor(totalSeconds / 60)}:${(totalSeconds % 60).toString().padStart(2, "0")}`;
};

const usePlaybackProgress = (playback: PartyPlayback) => {
  const [now, setNow] = useState(playback.serverTimestamp);

  useEffect(() => {
    if (!playback.isPlaying || playback.currentTrack === null) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [playback.currentTrack, playback.isPlaying]);

  const elapsed = playback.isPlaying ? Math.max(0, now - playback.serverTimestamp) : 0;
  return Math.min(playback.durationMs, playback.progressMs + elapsed);
};

export function NowPlayingCard({ playback }: { playback: PartyPlayback }) {
  const progressMs = usePlaybackProgress(playback);
  const progressPercent =
    playback.durationMs === 0 ? 0 : Math.min(100, (progressMs / playback.durationMs) * 100);

  if (playback.currentTrack === null) {
    return (
      <section className="now-playing-card playback-waiting" aria-labelledby="now-playing-title">
        <span className="party-mark small-mark">
          <MusicNotes aria-hidden="true" weight="duotone" />
        </span>
        <div>
          <p className="eyebrow">Lecture SongFest</p>
          <h2 id="now-playing-title">La musique arrive.</h2>
          <p>
            {playback.queuedTrack === null
              ? "L’organisateur prépare le prochain morceau."
              : `${playback.queuedTrack.title} est prêt à démarrer.`}
          </p>
        </div>
      </section>
    );
  }

  const track = playback.currentTrack;
  return (
    <section className="now-playing-card" aria-labelledby="now-playing-title">
      {track.coverUrl === null ? (
        <span className="now-playing-cover cover-fallback">
          <MusicNotes aria-hidden="true" />
        </span>
      ) : (
        <img
          className="now-playing-cover"
          src={track.coverUrl}
          alt={`Pochette de ${track.title}`}
        />
      )}
      <div className="now-playing-copy">
        <p className="eyebrow">{playback.isPlaying ? "En cours" : "En pause"}</p>
        <h2 id="now-playing-title">{track.title}</h2>
        <p>{track.artistNames.join(", ")}</p>
        {track.proposedBy !== null && <small>Proposé par {track.proposedBy.nickname}</small>}
        <div
          className="playback-progress"
          role="progressbar"
          aria-label={`Progression de ${track.title}`}
          aria-valuemin={0}
          aria-valuemax={playback.durationMs}
          aria-valuenow={Math.round(progressMs)}
          aria-valuetext={`${formatDuration(progressMs)} sur ${formatDuration(playback.durationMs)}`}
        >
          <span style={{ width: `${progressPercent}%` }} />
        </div>
        <div className="playback-times" aria-hidden="true">
          <span>{formatDuration(progressMs)}</span>
          <span>{formatDuration(playback.durationMs)}</span>
        </div>
      </div>
    </section>
  );
}
