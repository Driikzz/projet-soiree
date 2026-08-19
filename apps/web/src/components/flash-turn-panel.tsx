import { Lightning, MusicNotes, Timer, UserFocus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

import type { FlashState } from "@songfest/shared";

import { SpotifySearch } from "./spotify-search";
import { submitParticipantFlashTrack } from "../lib/api/flash";

const formatRemainingTime = (expiresAt: string, now: number) => {
  const remainingSeconds = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / 1_000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const formatNextTime = (value: string) =>
  new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));

interface FlashTurnPanelProps {
  partyId: string;
  flash: FlashState;
  explicitContentAllowed: boolean;
  existingTrackIds: ReadonlySet<string>;
}

export function FlashTurnPanel({
  partyId,
  flash,
  explicitContentAllowed,
  existingTrackIds,
}: FlashTurnPanelProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (flash.turn?.status !== "ACTIVE") {
      return;
    }

    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [flash.turn?.status]);

  if (!flash.enabled) {
    return null;
  }

  const turn = flash.turn;
  if (turn === null) {
    return (
      <aside className="flash-panel flash-panel-upcoming" aria-label="Prochain YOUR TURN">
        <span className="flash-icon" aria-hidden="true">
          <Lightning weight="fill" />
        </span>
        <div>
          <strong>Your turn</strong>
          <p>
            {flash.nextFlashTurnAt === null
              ? "Le prochain tirage se prépare."
              : `Prochain tirage vers ${formatNextTime(flash.nextFlashTurnAt)}.`}
          </p>
        </div>
      </aside>
    );
  }

  const isActive = turn.status === "ACTIVE";
  const hasExpiredLocally = isActive && new Date(turn.expiresAt).getTime() <= now;

  return (
    <section
      className={`flash-panel flash-panel-live${
        flash.isCurrentParticipant ? " flash-panel-yours" : ""
      }`}
      aria-labelledby="flash-title"
    >
      <div className="flash-panel-heading">
        <span className="flash-icon" aria-hidden="true">
          <Lightning weight="fill" />
        </span>
        <div>
          <p className="eyebrow">Your turn</p>
          <h2 id="flash-title">
            {turn.status === "SUBMITTED"
              ? `${turn.participant.nickname} a choisi son son`
              : flash.isCurrentParticipant
                ? "YOUR TURN."
                : `${turn.participant.nickname} is picking.`}
          </h2>
        </div>
        {isActive && (
          <span className="flash-countdown" aria-label="Temps restant">
            <Timer aria-hidden="true" />
            {hasExpiredLocally ? "Terminé" : formatRemainingTime(turn.expiresAt, now)}
          </span>
        )}
      </div>

      {turn.status === "SUBMITTED" && turn.track !== null ? (
        <article className="flash-selected-track" role="status">
          {turn.track.coverUrl === null ? (
            <span className="flash-track-cover cover-fallback" aria-hidden="true">
              <MusicNotes />
            </span>
          ) : (
            <img
              className="flash-track-cover"
              src={turn.track.coverUrl}
              alt={`Pochette de ${turn.track.title}`}
            />
          )}
          <div>
            <strong>{turn.track.title}</strong>
            <span>{turn.track.artistNames.join(", ")}</span>
            <small>Lecture Flash lancée immédiatement</small>
          </div>
        </article>
      ) : flash.isCurrentParticipant && !hasExpiredLocally ? (
        <>
          <p className="flash-explanation">
            The room is yours. Ton choix ne consomme pas ton quota et démarre immédiatement.
          </p>
          <SpotifySearch
            partyId={partyId}
            playlistId={turn.playlistId}
            remainingQuota={1}
            explicitContentAllowed={explicitContentAllowed}
            existingTrackIds={existingTrackIds}
            title="Pick one track"
            description="Les règles de durée, de doublon et de contenu explicite restent actives."
            successMessage={(trackTitle) => `${trackTitle} démarre pour YOUR TURN.`}
            addTrack={(spotifyTrackId) => submitParticipantFlashTrack(partyId, { spotifyTrackId })}
          />
        </>
      ) : (
        <p className="flash-waiting-copy">
          <UserFocus aria-hidden="true" />
          La playlist continue pendant son choix. Dès qu’il valide, son morceau démarre
          immédiatement. Si le délai expire, le tour est ignoré.
        </p>
      )}
    </section>
  );
}
