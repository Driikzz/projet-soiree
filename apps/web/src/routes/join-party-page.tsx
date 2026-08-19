import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";

import { joinPartyRequestSchema, type JoinPartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { AvatarMark } from "../components/avatar-mark";
import { RotateBrand } from "../components/rotate-brand";
import { RotReference } from "../components/rot-reference";
import { getPublicParty, joinParty } from "../lib/api/parties";

export function JoinPartyPage() {
  const navigate = useNavigate();
  const { partyCode = "" } = useParams();
  const [joinedPartyId, setJoinedPartyId] = useState<string>();
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
  const nickname = useWatch({ control: form.control, name: "nickname" });

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
      <section className="join-identity" aria-label="Présentation de la soirée">
        <RotateBrand />
        <RotReference code={party.code} live={party.status === "ACTIVE"} />
        <p className="eyebrow">Join the rotation</p>
        <h1 className="join-party-name">{party.name}</h1>
        <p className="join-date">The night is being recorded.</p>
      </section>

      <section className="join-form-panel" aria-labelledby="join-title">
        <h2 id="join-title">Comment on t’appelle ?</h2>
        <p>Pas de compte à créer. Ton pseudo restera lié à ce navigateur.</p>
        {canJoin ? (
          <form
            className="form-stack"
            onSubmit={form.handleSubmit((values) => joinMutation.mutate(values))}
          >
            <label className="field">
              <span>Ton pseudo</span>
              <input
                autoFocus
                autoComplete="nickname"
                placeholder="Camille"
                maxLength={30}
                {...form.register("nickname")}
                aria-invalid={form.formState.errors.nickname !== undefined}
              />
              <FormError message={form.formState.errors.nickname?.message} />
            </label>
            <div className="join-mark-preview">
              <AvatarMark seed={nickname || "rotate"} label={nickname || "ton profil"} />
              <span>
                <strong>Your mark</strong>
                Un symbole ROTATE sera généré pour toi.
              </span>
            </div>
            <FormError
              message={joinMutation.error instanceof Error ? joinMutation.error.message : undefined}
            />
            <button className="primary-button full-button" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Entrée en cours…" : "Join the rotation"}
              <ArrowRight aria-hidden="true" weight="bold" />
            </button>
          </form>
        ) : (
          <div className="locked-note" role="status">
            Cette soirée n’est pas encore ouverte. L’organisateur te fait signe dès que c’est prêt.
          </div>
        )}
      </section>
    </main>
  );
}
