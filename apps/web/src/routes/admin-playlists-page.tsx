import {
  CheckCircle,
  LockKey,
  MusicNotesPlus,
  PencilSimple,
  Play,
  Trash,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useParams } from "react-router-dom";

import type {
  CreatePlaylistRequest,
  PlaylistSummary,
  UpdatePlaylistRequest,
} from "@songfest/shared";

import { AdminPartyNav } from "../components/admin-party-nav";
import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { PlaylistForm } from "../components/playlist-form";
import { PlaylistVisual } from "../components/playlist-visual";
import { getAdminParty } from "../lib/api/parties";
import {
  activateAdminPlaylist,
  createAdminPlaylist,
  deleteAdminPlaylist,
  getAdminPlaylists,
  updateAdminPlaylist,
} from "../lib/api/playlists";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

export function AdminPlaylistsPage() {
  const { partyId = "" } = useParams();
  usePartyRealtime(partyId);
  const queryClient = useQueryClient();
  const [formPlaylist, setFormPlaylist] = useState<PlaylistSummary | "create" | null>(null);
  const partyQuery = useQuery({
    queryKey: ["admin-party", partyId],
    queryFn: ({ signal }) => getAdminParty(partyId, signal),
    enabled: partyId !== "",
  });
  const playlistsQuery = useQuery({
    queryKey: ["admin-playlists", partyId],
    queryFn: ({ signal }) => getAdminPlaylists(partyId, signal),
    enabled: partyId !== "",
  });

  const refreshPlaylists = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin-playlists", partyId] }),
      queryClient.invalidateQueries({ queryKey: ["admin-party", partyId] }),
    ]);
  };

  const saveMutation = useMutation({
    mutationFn: (input: CreatePlaylistRequest) => {
      if (formPlaylist === null) {
        throw new Error("Le formulaire de playlist est fermé.");
      }

      return formPlaylist === "create"
        ? createAdminPlaylist(partyId, input)
        : updateAdminPlaylist(formPlaylist.id, input satisfies UpdatePlaylistRequest);
    },
    onSuccess: async () => {
      setFormPlaylist(null);
      await refreshPlaylists();
    },
  });
  const activateMutation = useMutation({
    mutationFn: activateAdminPlaylist,
    onSuccess: refreshPlaylists,
  });
  const toggleLockMutation = useMutation({
    mutationFn: ({ id, isOpen }: Pick<PlaylistSummary, "id" | "isOpen">) =>
      updateAdminPlaylist(id, { isOpen: !isOpen }),
    onSuccess: refreshPlaylists,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteAdminPlaylist,
    onSuccess: refreshPlaylists,
  });

  if (partyQuery.isPending || playlistsQuery.isPending) {
    return <LoadingPage />;
  }

  const party = partyQuery.data?.party;
  const playlists = playlistsQuery.data?.playlists;
  if (party === undefined || playlists === undefined) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Chargement impossible</p>
        <h1 className="screen-title">Les ambiances ne sont pas disponibles.</h1>
        <FormError
          message={
            partyQuery.error instanceof Error
              ? partyQuery.error.message
              : playlistsQuery.error instanceof Error
                ? playlistsQuery.error.message
                : undefined
          }
        />
      </main>
    );
  }

  const requestDelete = (playlist: PlaylistSummary) => {
    if (
      window.confirm(
        `Supprimer « ${playlist.name} » ? Cette action est possible uniquement si elle est vide.`,
      )
    ) {
      deleteMutation.mutate(playlist.id);
    }
  };

  const actionError = activateMutation.error ?? toggleLockMutation.error ?? deleteMutation.error;
  const hasActivePlaylist = playlists.some((playlist) => playlist.isActive);

  return (
    <main className="page-shell admin-playlists-shell">
      <AdminPartyNav partyId={partyId} partyName={party.name} />

      <section className="admin-page-heading">
        <div>
          <p className="eyebrow">Ambiances musicales</p>
          <h1 className="screen-title">Prépare le terrain de jeu.</h1>
          <p className="screen-copy">
            Chaque playlist a son propre quota, ses règles et son identité.
          </p>
        </div>
        <button className="primary-button" onClick={() => setFormPlaylist("create")}>
          <MusicNotesPlus aria-hidden="true" weight="bold" />
          Nouvelle playlist
        </button>
      </section>

      {formPlaylist !== null && (
        <PlaylistForm
          key={formPlaylist === "create" ? "create" : formPlaylist.id}
          {...(formPlaylist === "create" ? {} : { initialPlaylist: formPlaylist })}
          isPending={saveMutation.isPending}
          errorMessage={
            saveMutation.error instanceof Error ? saveMutation.error.message : undefined
          }
          onCancel={() => {
            saveMutation.reset();
            setFormPlaylist(null);
          }}
          onSubmit={(input) => saveMutation.mutate(input)}
        />
      )}

      <FormError message={actionError instanceof Error ? actionError.message : undefined} />

      {playlists.length === 0 ? (
        <section className="empty-playlists">
          <MusicNotesPlus aria-hidden="true" weight="duotone" />
          <h2>Crée la première ambiance.</h2>
          <p>Apéro, années 2000, rap ou playlist libre : commence avec ce qui lancera la soirée.</p>
          <button className="primary-button" onClick={() => setFormPlaylist("create")}>
            Créer une playlist
          </button>
        </section>
      ) : (
        <div className="admin-playlist-list">
          {playlists.map((playlist) => (
            <article
              className={`admin-playlist-row${playlist.isActive ? " active-admin-playlist" : ""}`}
              key={playlist.id}
            >
              <PlaylistVisual visualKey={playlist.visualKey} label={playlist.name} compact />
              <div className="admin-playlist-copy">
                <div className="admin-playlist-title">
                  <h2>{playlist.name}</h2>
                  {playlist.isActive && (
                    <span className="active-label">
                      <CheckCircle aria-hidden="true" weight="fill" />
                      Playlist active
                    </span>
                  )}
                </div>
                <p>{playlist.description ?? "Aucune description."}</p>
                <div className="admin-playlist-meta">
                  <span>{playlist.quotaPerParticipant} ajouts par personne</span>
                  <span>{playlist.isOpen ? "Ajouts ouverts" : "Ajouts verrouillés"}</span>
                  <span>
                    {playlist.trackCount} morceau{playlist.trackCount === 1 ? "" : "x"}
                  </span>
                </div>
              </div>
              <div className="playlist-row-actions">
                {!playlist.isActive && (
                  <button
                    className="secondary-button"
                    onClick={() => activateMutation.mutate(playlist.id)}
                    disabled={activateMutation.isPending}
                  >
                    <Play aria-hidden="true" weight="fill" />
                    {hasActivePlaylist ? "Activer" : "Définir initiale"}
                  </button>
                )}
                <button
                  className="icon-button"
                  onClick={() => toggleLockMutation.mutate(playlist)}
                  aria-label={
                    playlist.isOpen ? `Verrouiller ${playlist.name}` : `Ouvrir ${playlist.name}`
                  }
                >
                  <LockKey aria-hidden="true" weight={playlist.isOpen ? "regular" : "fill"} />
                </button>
                <button
                  className="icon-button"
                  onClick={() => setFormPlaylist(playlist)}
                  aria-label={`Modifier ${playlist.name}`}
                >
                  <PencilSimple aria-hidden="true" />
                </button>
                <button
                  className="icon-button danger-button"
                  onClick={() => requestDelete(playlist)}
                  disabled={playlist.trackCount > 0 || playlist.isActive}
                  aria-label={`Supprimer ${playlist.name}`}
                >
                  <Trash aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
