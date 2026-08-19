import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Camera } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { joinPartyRequestSchema, type JoinPartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { AvatarMark } from "../components/avatar-mark";
import { LiveIndicator } from "../components/live-indicator";
import { RotateBrand } from "../components/rotate-brand";
import { RotReference } from "../components/rot-reference";
import { getPublicParty, joinParty } from "../lib/api/parties";

export function JoinPartyPage() {
  const navigate = useNavigate();
  const { partyCode = "" } = useParams();
  const [joinedPartyId, setJoinedPartyId] = useState<string>();
  const markSeeds = Array.from({ length: 4 }, (_, index) => `${partyCode}:mark:${index + 1}`);
  const [selectedMarkSeed, setSelectedMarkSeed] = useState(markSeeds[0] ?? partyCode);
  const partyQuery = useQuery({
    queryKey: ["public-party", partyCode],
    queryFn: ({ signal }) => getPublicParty(partyCode.toUpperCase(), signal),
    retry: false,
  });
  const form = useForm<JoinPartyRequest>({
    resolver: zodResolver(joinPartyRequestSchema),
    defaultValues: { nickname: "" },
  });
  const joinMutation = useMutation({
    mutationFn: (input: JoinPartyRequest) => joinParty(partyCode.toUpperCase(), input),
    onSuccess: ({ party }) => setJoinedPartyId(party.id),
  });

  useEffect(() => {
    if (joinedPartyId === undefined) return;
    const timeout = window.setTimeout(() => {
      void navigate(`/party/${joinedPartyId}`, { replace: true });
    }, 650);
    return () => window.clearTimeout(timeout);
  }, [joinedPartyId, navigate]);

  if (partyQuery.isPending) {
    return <LoadingPage />;
  }

  const party = partyQuery.data?.party;
  if (party === undefined) {
    return (
      <main className="page-shell compact-shell">
        <RotateBrand />
        <section className="form-card">
          <p className="eyebrow">Code inconnu</p>
          <h1 className="screen-title">Cette soirée est introuvable.</h1>
          <p className="screen-copy">
            Vérifie le lien ou demande un nouveau QR code à l’organisateur.
          </p>
          <FormError
            message={partyQuery.error instanceof Error ? partyQuery.error.message : undefined}
          />
        </section>
      </main>
    );
  }

  const canJoin = party.status === "OPEN" || party.status === "ACTIVE";
  const formattedDate = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
    .format(new Date(party.createdAt))
    .replaceAll(".", "")
    .toUpperCase();

  if (joinedPartyId !== undefined) {
    return (
      <main className="join-success-page">
        <RotateBrand compact />
        <h1>
          YOU’RE
          <br />
          IN<span>.</span>
        </h1>
        <div className="join-success-record" aria-hidden="true">
          <span>ROTATE</span>
          <i />
        </div>
        <p>{party.name}</p>
      </main>
    );
  }

  return (
    <main className="join-page">
      <section className="join-sleeve" aria-labelledby="join-party-name">
        <header className="join-catalogue">
          <RotReference code={party.code} />
          <LiveIndicator waiting={party.status !== "ACTIVE"} />
        </header>

        <div className="join-party-heading">
          <h1 className="join-party-name" id="join-party-name">
            {party.name}
          </h1>
          <p className="join-date">{formattedDate}</p>
        </div>

        <div className="join-party-people" aria-label="Participants déjà présents">
          <div className="join-avatar-stack">
            {party.participantPreview.map((participant) => (
              <AvatarMark
                key={`${participant.nickname}:${participant.avatarSeed}`}
                seed={participant.avatarSeed}
                label={participant.nickname}
              />
            ))}
            {party.activeParticipantCount > party.participantPreview.length && (
              <span className="join-avatar-overflow">
                +{party.activeParticipantCount - party.participantPreview.length}
              </span>
            )}
          </div>
          <p>{party.activeParticipantCount} people already in</p>
        </div>

        <div className="join-form-panel">
          {canJoin ? (
            <form
              className="form-stack"
              onSubmit={form.handleSubmit((values) =>
                joinMutation.mutate({ ...values, avatarSeed: selectedMarkSeed }),
              )}
            >
              <label className="field">
                <span>Comment on t’appelle ?</span>
                <input
                  autoFocus
                  autoComplete="nickname"
                  placeholder="Ton pseudo"
                  maxLength={30}
                  {...form.register("nickname")}
                  aria-invalid={form.formState.errors.nickname !== undefined}
                />
                <FormError message={form.formState.errors.nickname?.message} />
              </label>
              <FormError
                message={
                  joinMutation.error instanceof Error ? joinMutation.error.message : undefined
                }
              />
              <button className="primary-button full-button" disabled={joinMutation.isPending}>
                {joinMutation.isPending ? "Entrée en cours…" : "Join the rotation"}
                <ArrowRight aria-hidden="true" weight="bold" />
              </button>

              <fieldset className="join-mark-picker">
                <legend>Your mark — optional</legend>
                <div>
                  {markSeeds.map((seed) => (
                    <button
                      type="button"
                      className="join-mark-option"
                      aria-pressed={selectedMarkSeed === seed}
                      aria-label={`Choisir le mark ${markSeeds.indexOf(seed) + 1}`}
                      onClick={() => setSelectedMarkSeed(seed)}
                      key={seed}
                    >
                      <AvatarMark seed={seed} label="Aperçu du mark" />
                    </button>
                  ))}
                  <button
                    type="button"
                    className="join-camera-option"
                    aria-label="Ajouter une photo — bientôt disponible"
                    disabled
                  >
                    <Camera aria-hidden="true" weight="bold" />
                  </button>
                </div>
              </fieldset>
            </form>
          ) : (
            <div className="locked-note" role="status">
              Cette soirée n’est pas encore ouverte. L’organisateur te fait signe dès que c’est
              prêt.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
