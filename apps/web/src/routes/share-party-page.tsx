import {
  CheckCircle,
  Copy,
  MusicNotes,
  QrCode,
  ShareNetwork,
  SpeakerHigh,
  UsersThree,
} from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { getAdminParty, openParty } from "../lib/api/parties";
import { usePartyRealtime } from "../lib/realtime/use-party-realtime";

export function SharePartyPage() {
  const { partyId = "" } = useParams();
  usePartyRealtime(partyId);
  const queryClient = useQueryClient();
  const [qrCodeUrl, setQrCodeUrl] = useState<string>();
  const [qrCodeError, setQrCodeError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string>();
  const partyQuery = useQuery({
    queryKey: ["admin-party", partyId],
    queryFn: ({ signal }) => getAdminParty(partyId, signal),
    enabled: partyId !== "",
    refetchInterval: 10_000,
  });
  const party = partyQuery.data?.party;
  const joinUrl = party === undefined ? "" : `${window.location.origin}/join/${party.code}`;

  useEffect(() => {
    if (joinUrl === "") {
      return;
    }

    let isCurrent = true;
    void QRCode.toDataURL(joinUrl, {
      width: 480,
      margin: 2,
      errorCorrectionLevel: "M",
      color: {
        dark: "#101719",
        light: "#F4F7F5",
      },
    })
      .then((url) => {
        if (isCurrent) {
          setQrCodeError(undefined);
          setQrCodeUrl(url);
        }
      })
      .catch(() => {
        if (isCurrent) {
          setQrCodeError("Le QR code n’a pas pu être généré. Utilise le code de la soirée.");
        }
      });

    return () => {
      isCurrent = false;
    };
  }, [joinUrl]);

  const openMutation = useMutation({
    mutationFn: () => openParty(partyId),
    onSuccess: (data) => {
      queryClient.setQueryData(["admin-party", partyId], data);
    },
  });

  if (partyQuery.isPending) {
    return <LoadingPage />;
  }

  if (party === undefined) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Soirée introuvable</p>
        <h1 className="screen-title">Impossible d’afficher le QR code.</h1>
        <FormError
          message={partyQuery.error instanceof Error ? partyQuery.error.message : undefined}
        />
      </main>
    );
  }

  const isOpen = party.status === "OPEN" || party.status === "ACTIVE";

  const copyJoinUrl = async () => {
    try {
      setCopyError(undefined);
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      setCopyError("La copie automatique est indisponible. Ouvre le lien invité pour le copier.");
    }
  };

  return (
    <main className="page-shell share-shell">
      <header className="topbar">
        <Link className="brand-link" to="/">
          SongFest
        </Link>
        <span className={`status-badge ${isOpen ? "status-open" : ""}`}>
          {isOpen ? "Entrées ouvertes" : "Brouillon"}
        </span>
      </header>

      <div className="share-grid">
        <section className="share-copy" aria-labelledby="share-title">
          <p className="eyebrow">Inviter tout le monde</p>
          <h1 className="screen-title share-title" id="share-title">
            Scanne, choisis un pseudo, c’est parti.
          </h1>
          <p className="screen-copy">
            Aucun compte Spotify n’est demandé aux invités. Ils rejoignent directement{" "}
            <strong>{party.name}</strong>.
          </p>

          <div className="party-code" aria-label={`Code de la soirée ${party.code}`}>
            <span>Code de la soirée</span>
            <strong>{party.code}</strong>
          </div>
          <p className="participant-count" aria-live="polite">
            <UsersThree aria-hidden="true" weight="fill" />
            {party.activeParticipantCount === 0
              ? "Personne n’a encore rejoint"
              : `${party.activeParticipantCount} participant${party.activeParticipantCount > 1 ? "s" : ""} connecté${party.activeParticipantCount > 1 ? "s" : ""}`}
          </p>

          {!isOpen ? (
            <button
              className="primary-button"
              onClick={() => openMutation.mutate()}
              disabled={openMutation.isPending}
            >
              <UsersThree aria-hidden="true" weight="bold" />
              {openMutation.isPending ? "Ouverture…" : "Ouvrir les entrées"}
            </button>
          ) : (
            <div className="success-note" role="status">
              <CheckCircle aria-hidden="true" weight="fill" />
              Les invités peuvent maintenant rejoindre la soirée.
            </div>
          )}
          <FormError
            message={openMutation.error instanceof Error ? openMutation.error.message : undefined}
          />
          <Link
            className="secondary-button configure-link"
            to={`/admin/parties/${partyId}/dashboard`}
          >
            <MusicNotes aria-hidden="true" weight="bold" />
            Ouvrir le tableau de bord
          </Link>
          <Link className="text-link spotify-config-link" to={`/admin/parties/${partyId}/spotify`}>
            <SpeakerHigh aria-hidden="true" weight="bold" />
            Configurer Spotify
          </Link>
        </section>

        <aside className="qr-card" aria-label="QR code de participation">
          <span className="qr-label">
            <QrCode aria-hidden="true" weight="bold" />À afficher ou projeter
          </span>
          {qrCodeError !== undefined ? (
            <div className="qr-placeholder">{qrCodeError}</div>
          ) : qrCodeUrl === undefined ? (
            <div className="qr-placeholder">Génération du QR code…</div>
          ) : (
            <img src={qrCodeUrl} alt={`QR code pour rejoindre ${party.name}`} />
          )}
          <button
            className="secondary-button full-button"
            type="button"
            onClick={() => void copyJoinUrl()}
          >
            {copied ? (
              <CheckCircle aria-hidden="true" weight="fill" />
            ) : (
              <Copy aria-hidden="true" weight="bold" />
            )}
            {copied ? "Lien copié" : "Copier le lien"}
          </button>
          <FormError message={copyError} />
          <a className="text-link" href={joinUrl} target="_blank" rel="noreferrer">
            Tester la page invité
            <ShareNetwork aria-hidden="true" />
          </a>
        </aside>
      </div>
    </main>
  );
}
