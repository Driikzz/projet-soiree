import {
  ArrowSquareOut,
  CheckCircle,
  Desktop,
  DeviceMobile,
  MusicNotes,
  Pause,
  Play,
  SkipForward,
  SpeakerHigh,
  WarningCircle,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useSearchParams } from "react-router-dom";

import type { SpotifyDevice } from "@songfest/shared";

import { AdminPartyNav } from "../components/admin-party-nav";
import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { getAdminParty } from "../lib/api/parties";
import { controlPartyPlayback, getAdminPlayback } from "../lib/api/playback";
import {
  connectSpotify,
  getSpotifyDevices,
  getSpotifyPlayback,
  getSpotifyStatus,
  selectSpotifyDevice,
} from "../lib/api/spotify";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

function DeviceIcon({ type }: { type: string }) {
  const normalizedType = type.toLowerCase();
  if (normalizedType.includes("phone") || normalizedType.includes("smartphone")) {
    return <DeviceMobile aria-hidden="true" weight="fill" />;
  }
  if (normalizedType.includes("computer")) {
    return <Desktop aria-hidden="true" weight="fill" />;
  }
  return <SpeakerHigh aria-hidden="true" weight="fill" />;
}

export function AdminSpotifyPage() {
  const { partyId = "" } = useParams();
  usePartyRealtime(partyId);
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["spotify-status", partyId],
    queryFn: ({ signal }) => getSpotifyStatus(partyId, signal),
    enabled: partyId !== "",
  });
  const partyQuery = useQuery({
    queryKey: ["admin-party", partyId],
    queryFn: ({ signal }) => getAdminParty(partyId, signal),
    enabled: partyId !== "",
  });
  const isConnected = statusQuery.data?.isConnected === true;
  const devicesQuery = useQuery({
    queryKey: ["spotify-devices", partyId],
    queryFn: ({ signal }) => getSpotifyDevices(partyId, signal),
    enabled: isConnected && partyId !== "",
    retry: false,
  });
  const playbackQuery = useQuery({
    queryKey: ["spotify-playback", partyId],
    queryFn: ({ signal }) => getSpotifyPlayback(partyId, signal),
    enabled: isConnected && partyId !== "",
    retry: false,
  });
  const partyPlaybackQuery = useQuery({
    queryKey: ["party-playback", partyId],
    queryFn: ({ signal }) => getAdminPlayback(partyId, signal),
    enabled: isConnected && partyId !== "",
    retry: false,
    refetchInterval: 15_000,
  });
  const connectMutation = useMutation({
    mutationFn: () => connectSpotify(partyId),
    onSuccess: ({ authorizationUrl }) => {
      window.location.assign(authorizationUrl);
    },
  });
  const selectMutation = useMutation({
    mutationFn: (deviceId: string) => selectSpotifyDevice(partyId, deviceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["spotify-devices", partyId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-party", partyId] }),
      ]);
    },
  });
  const playbackControlMutation = useMutation({
    mutationFn: (control: "start" | "pause" | "resume" | "skip") =>
      controlPartyPlayback(partyId, control),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["party-playback", partyId] }),
        queryClient.invalidateQueries({ queryKey: ["spotify-playback", partyId] }),
        queryClient.invalidateQueries({ queryKey: ["admin-party", partyId] }),
      ]);
    },
  });

  if (statusQuery.isPending || partyQuery.isPending) {
    return <LoadingPage />;
  }

  const status = statusQuery.data;
  const party = partyQuery.data?.party;
  if (status === undefined || party === undefined) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Configuration indisponible</p>
        <h1 className="screen-title">Spotify ne peut pas être configuré.</h1>
        <FormError
          message={
            statusQuery.error instanceof Error
              ? statusQuery.error.message
              : partyQuery.error instanceof Error
                ? partyQuery.error.message
                : undefined
          }
        />
      </main>
    );
  }

  const oauthStatus = searchParams.get("spotify");

  return (
    <main className="page-shell spotify-shell">
      <AdminPartyNav partyId={partyId} partyName={party.name} />

      <section className="spotify-heading">
        <span className="party-mark">
          <MusicNotes aria-hidden="true" weight="fill" />
        </span>
        <p className="eyebrow">{party.name}</p>
        <h1 className="screen-title">Connecte la source musicale.</h1>
        <p className="screen-copy">
          Clique sur le bouton, connecte-toi directement chez Spotify et accepte les autorisations.
          Aucun token n’est à copier : SongFest utilisera uniquement le compte du créateur de cette
          soirée.
        </p>
      </section>

      {oauthStatus === "connected" && (
        <div className="success-note spotify-notice" role="status">
          <CheckCircle aria-hidden="true" weight="fill" />
          Le compte Spotify est connecté.
        </div>
      )}
      {oauthStatus === "denied" && (
        <div className="locked-playlist-note spotify-notice" role="status">
          <WarningCircle aria-hidden="true" weight="fill" />
          La connexion a été annulée dans Spotify.
        </div>
      )}
      {oauthStatus === "error" && (
        <div className="locked-playlist-note spotify-notice" role="alert">
          <WarningCircle aria-hidden="true" weight="fill" />
          Spotify n’a pas pu finaliser la connexion. Vérifie la configuration puis réessaie.
        </div>
      )}

      {!status.isConfigured ? (
        <section className="spotify-setup-card">
          <h2>Configuration serveur requise</h2>
          <p>
            Le développeur doit d’abord configurer l’application Spotify de SongFest sur le serveur.
            L’organisateur n’aura jamais de token à saisir ou à copier.
          </p>
        </section>
      ) : !status.isConnected ? (
        <section className="spotify-connect-card">
          <div>
            <h2>Autoriser SongFest</h2>
            <p>
              Spotify demandera l’accès à l’état de lecture, aux appareils et aux commandes du
              player.
            </p>
          </div>
          <button
            className="primary-button"
            onClick={() => connectMutation.mutate()}
            disabled={connectMutation.isPending}
          >
            <ArrowSquareOut aria-hidden="true" weight="bold" />
            {connectMutation.isPending ? "Redirection…" : "Se connecter avec Spotify"}
          </button>
          <FormError
            message={
              connectMutation.error instanceof Error ? connectMutation.error.message : undefined
            }
          />
        </section>
      ) : (
        <>
          <section className="spotify-connect-card" aria-label="Compte Spotify connecté">
            <div>
              <p className="eyebrow">Compte du créateur</p>
              <h2>Spotify est connecté</h2>
              <p>Les recherches et la lecture de cette soirée passent uniquement par ce compte.</p>
            </div>
            <button
              className="secondary-button"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              <ArrowSquareOut aria-hidden="true" weight="bold" />
              {connectMutation.isPending ? "Redirection…" : "Changer de compte"}
            </button>
            <FormError
              message={
                connectMutation.error instanceof Error ? connectMutation.error.message : undefined
              }
            />
          </section>
          <div className="spotify-config-grid">
            <section className="spotify-panel" aria-labelledby="devices-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Sortie audio</p>
                  <h2 id="devices-title">Appareil de diffusion</h2>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => void devicesQuery.refetch()}
                  disabled={devicesQuery.isFetching}
                >
                  Actualiser
                </button>
              </div>

              <FormError
                message={
                  devicesQuery.error instanceof Error ? devicesQuery.error.message : undefined
                }
              />
              {devicesQuery.data?.devices.length === 0 ? (
                <div className="device-empty">
                  <SpeakerHigh aria-hidden="true" weight="duotone" />
                  <p>Lance Spotify sur l’appareil qui diffusera la musique, puis actualise.</p>
                </div>
              ) : (
                <div className="device-list">
                  {devicesQuery.data?.devices.map((device) => (
                    <DeviceButton
                      key={device.id}
                      device={device}
                      isPending={selectMutation.isPending}
                      onSelect={() => selectMutation.mutate(device.id)}
                    />
                  ))}
                </div>
              )}
              <FormError
                message={
                  selectMutation.error instanceof Error ? selectMutation.error.message : undefined
                }
              />
            </section>

            <section className="spotify-panel" aria-labelledby="test-title">
              <p className="eyebrow">Test de connexion</p>
              <h2 id="test-title">Lecture détectée</h2>
              {playbackQuery.data?.track === null ? (
                <div className="playback-empty">
                  <MusicNotes aria-hidden="true" weight="duotone" />
                  <p>Aucun morceau Spotify n’est en cours de lecture.</p>
                </div>
              ) : playbackQuery.data?.track !== undefined ? (
                <div className="playback-preview">
                  {playbackQuery.data.track.coverUrl === null ? (
                    <span className="cover-fallback">
                      <MusicNotes aria-hidden="true" />
                    </span>
                  ) : (
                    <img
                      src={playbackQuery.data.track.coverUrl}
                      alt={`Pochette de ${playbackQuery.data.track.title}`}
                    />
                  )}
                  <div>
                    <strong>{playbackQuery.data.track.title}</strong>
                    <span>{playbackQuery.data.track.artistNames.join(", ")}</span>
                    <small>
                      {playbackQuery.data.isPlaying ? "Lecture en cours" : "Lecture en pause"}
                    </small>
                  </div>
                </div>
              ) : null}
              <button
                className="secondary-button full-button"
                onClick={() => void playbackQuery.refetch()}
                disabled={playbackQuery.isFetching}
              >
                Tester maintenant
              </button>
              <div className="playback-controls" aria-label="Contrôles de lecture">
                {party.status !== "ACTIVE" ? (
                  <button
                    className="primary-button"
                    onClick={() => playbackControlMutation.mutate("start")}
                    disabled={
                      playbackControlMutation.isPending ||
                      party.activePlaylistId === null ||
                      party.selectedDeviceId === null
                    }
                  >
                    <Play aria-hidden="true" weight="fill" />
                    Lancer la soirée
                  </button>
                ) : partyPlaybackQuery.data?.isPlaying === true ? (
                  <button
                    className="secondary-button"
                    onClick={() => playbackControlMutation.mutate("pause")}
                    disabled={playbackControlMutation.isPending}
                  >
                    <Pause aria-hidden="true" weight="fill" />
                    Pause
                  </button>
                ) : (
                  <button
                    className="secondary-button"
                    onClick={() => playbackControlMutation.mutate("resume")}
                    disabled={playbackControlMutation.isPending}
                  >
                    <Play aria-hidden="true" weight="fill" />
                    Reprendre
                  </button>
                )}
                {party.status === "ACTIVE" && (
                  <button
                    className="secondary-button"
                    onClick={() => playbackControlMutation.mutate("skip")}
                    disabled={playbackControlMutation.isPending}
                  >
                    <SkipForward aria-hidden="true" weight="fill" />
                    Morceau suivant
                  </button>
                )}
              </div>
              <FormError
                message={
                  playbackQuery.error instanceof Error ? playbackQuery.error.message : undefined
                }
              />
              <FormError
                message={
                  playbackControlMutation.error instanceof Error
                    ? playbackControlMutation.error.message
                    : undefined
                }
              />
            </section>
          </div>
        </>
      )}
    </main>
  );
}

interface DeviceButtonProps {
  device: SpotifyDevice;
  isPending: boolean;
  onSelect: () => void;
}

function DeviceButton({ device, isPending, onSelect }: DeviceButtonProps) {
  return (
    <button
      type="button"
      className={`device-button${device.isSelected ? " selected-device" : ""}`}
      onClick={onSelect}
      disabled={isPending || device.isRestricted}
    >
      <DeviceIcon type={device.type} />
      <span>
        <strong>{device.name}</strong>
        <small>
          {device.isRestricted
            ? "Contrôle indisponible"
            : device.isActive
              ? "Actif dans Spotify"
              : device.type}
        </small>
      </span>
      {device.isSelected && <CheckCircle aria-hidden="true" weight="fill" />}
    </button>
  );
}
