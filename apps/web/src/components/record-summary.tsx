import { MusicNotes } from "@phosphor-icons/react";

import type { AdminDashboard, PartySummary } from "@songfest/shared";

import { AvatarMark } from "./avatar-mark";
import { RecordStamp } from "./record-stamp";
import { RotReference } from "./rot-reference";

export function RecordSummary({
  party,
  dashboard,
}: {
  party: PartySummary;
  dashboard: AdminDashboard;
}) {
  const lastTrack = dashboard.recentTracks.find((track) =>
    ["PLAYED", "SKIPPED"].includes(track.status),
  );
  const mostWanted = [...dashboard.recentTracks].sort(
    (left, right) => right.voteCount - left.voteCount,
  )[0];

  return (
    <section className="record-summary" aria-labelledby="record-title">
      <div className="record-sleeve">
        <div>
          <RotReference code={party.code} />
          <h1 id="record-title">{party.name}</h1>
          <p>
            {new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }).format(new Date(party.createdAt))}
          </p>
        </div>
        <RecordStamp />
        <footer>
          <span>
            <strong>{dashboard.participants.length}</strong>
            People
          </span>
          <span>
            <strong>{dashboard.recentTracks.length}</strong>
            Recent tracks
          </span>
        </footer>
      </div>

      <div className="record-liner-notes">
        <p className="eyebrow">The night, recorded.</p>
        {mostWanted !== undefined && (
          <article className="record-last-track record-most-wanted">
            {mostWanted.coverUrl === null ? (
              <span className="rotation-track-cover cover-fallback" aria-hidden="true">
                <MusicNotes />
              </span>
            ) : (
              <img
                className="rotation-track-cover"
                src={mostWanted.coverUrl}
                alt={`Pochette de ${mostWanted.title}`}
              />
            )}
            <div>
              <small>Most wanted</small>
              <strong>{mostWanted.title}</strong>
              <span>
                {mostWanted.artistNames.join(", ")} · {mostWanted.voteCount} PRESS
              </span>
            </div>
          </article>
        )}
        {lastTrack !== undefined && (
          <article className="record-last-track">
            <span className="rotation-track-cover cover-fallback" aria-hidden="true">
              <MusicNotes />
            </span>
            <div>
              <small>Last track</small>
              <strong>{lastTrack.title}</strong>
              <span>{lastTrack.artistNames.join(", ")}</span>
            </div>
          </article>
        )}
        <div className="record-people">
          <small>The people</small>
          <div>
            {dashboard.participants.slice(0, 8).map((participant) => (
              <AvatarMark
                key={participant.id}
                seed={participant.nickname}
                label={participant.nickname}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
