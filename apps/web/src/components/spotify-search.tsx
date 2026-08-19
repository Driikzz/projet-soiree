import { MagnifyingGlass, MusicNotes, Plus } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { FormError } from "./form-error";
import { searchSpotify } from "../lib/api/spotify";
import { addPlaylistTrack } from "../lib/api/tracks";

const formatDuration = (durationMs: number) => {
  const totalSeconds = Math.floor(durationMs / 1_000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

interface SpotifySearchProps {
  partyId: string;
  playlistId: string;
  remainingQuota: number;
  explicitContentAllowed: boolean;
  existingTrackIds: ReadonlySet<string>;
  title?: string;
  description?: string;
  addTrack?: (spotifyTrackId: string) => Promise<{ track: { title: string } }>;
  onTrackAdded?: () => void | Promise<void>;
  successMessage?: (trackTitle: string) => string;
}

export function SpotifySearch({
  partyId,
  playlistId,
  remainingQuota,
  explicitContentAllowed,
  existingTrackIds,
  title = "What’s next?",
  description = "Recherche dans Spotify. Aucun compte n’est nécessaire pour proposer un titre.",
  addTrack,
  onTrackAdded,
  successMessage,
}: SpotifySearchProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [announcement, setAnnouncement] = useState<string>();
  const queryClient = useQueryClient();

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [query]);

  const searchQuery = useQuery({
    queryKey: ["spotify-search", partyId, debouncedQuery],
    queryFn: ({ signal }) => searchSpotify(partyId, debouncedQuery, signal),
    enabled: debouncedQuery.length >= 2,
    retry: false,
    staleTime: 60_000,
  });
  const addMutation = useMutation({
    mutationFn: (spotifyTrackId: string) =>
      addTrack === undefined
        ? addPlaylistTrack(playlistId, {
            spotifyTrackId,
          })
        : addTrack(spotifyTrackId),
    onSuccess: async ({ track }) => {
      setAnnouncement(successMessage?.(track.title) ?? `${track.title} — added to rotation.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["playlist-tracks", playlistId] }),
        queryClient.invalidateQueries({ queryKey: ["participant-playlists", partyId] }),
        queryClient.invalidateQueries({ queryKey: ["party-flash", partyId] }),
        onTrackAdded?.(),
      ]);
    },
  });

  return (
    <section className="spotify-search" aria-labelledby="spotify-search-title">
      <div className="section-heading">
        <h2 id="spotify-search-title">{title}</h2>
        <p>{description}</p>
      </div>
      <label className="search-field">
        <span className="sr-only">Rechercher un titre ou un artiste</span>
        <MagnifyingGlass aria-hidden="true" weight="bold" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Titre ou artiste"
          autoComplete="off"
        />
      </label>

      {query.trim().length > 0 && query.trim().length < 2 && (
        <p className="search-hint">Écris au moins deux caractères.</p>
      )}
      {searchQuery.isFetching && (
        <div className="search-loading" aria-live="polite">
          <span className="status-skeleton" aria-hidden="true" />
          Recherche dans Spotify…
        </div>
      )}
      <FormError
        message={searchQuery.error instanceof Error ? searchQuery.error.message : undefined}
      />
      <FormError
        message={addMutation.error instanceof Error ? addMutation.error.message : undefined}
      />
      {announcement !== undefined && (
        <p className="track-added-note" role="status">
          {announcement}
        </p>
      )}

      {searchQuery.data?.tracks.length === 0 && !searchQuery.isFetching && (
        <div className="search-empty">
          <MusicNotes aria-hidden="true" weight="duotone" />
          Aucun morceau trouvé. Essaie avec un autre titre ou artiste.
        </div>
      )}

      <div className="search-results" aria-live="polite">
        {searchQuery.data?.tracks.map((track) => {
          const isAlreadyAdded = existingTrackIds.has(track.spotifyTrackId);
          const explicitIsBlocked = track.isExplicit && !explicitContentAllowed;
          const cannotAdd = remainingQuota === 0 || isAlreadyAdded || explicitIsBlocked;
          const isAdding = addMutation.isPending && addMutation.variables === track.spotifyTrackId;
          const buttonLabel = isAlreadyAdded
            ? "Already in rotation"
            : explicitIsBlocked
              ? "Explicite interdit"
              : remainingQuota === 0
                ? "Quota atteint"
                : isAdding
                  ? "Ajout…"
                  : "Ajouter";

          return (
            <article className="search-track" key={track.spotifyTrackId}>
              {track.coverUrl === null ? (
                <span className="search-cover cover-fallback">
                  <MusicNotes aria-hidden="true" />
                </span>
              ) : (
                <img
                  className="search-cover"
                  src={track.coverUrl}
                  alt={`Pochette de ${track.title}`}
                  loading="lazy"
                />
              )}
              <div className="search-track-copy">
                <strong>{track.title}</strong>
                <span>{track.artistNames.join(", ")}</span>
                <small>
                  {formatDuration(track.durationMs)}
                  {track.isExplicit && <span className="explicit-label">E · Explicite</span>}
                </small>
              </div>
              <button
                className="icon-button"
                type="button"
                disabled={cannotAdd || addMutation.isPending}
                title={`${buttonLabel} : ${track.title}`}
                aria-label={`${buttonLabel} : ${track.title}`}
                onClick={() => {
                  setAnnouncement(undefined);
                  addMutation.reset();
                  addMutation.mutate(track.spotifyTrackId);
                }}
              >
                <Plus aria-hidden="true" weight="bold" />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
