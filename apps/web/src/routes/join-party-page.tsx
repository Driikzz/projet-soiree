import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, MusicNotes, UsersThree } from "@phosphor-icons/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useParams } from "react-router-dom";

import { joinPartyRequestSchema, type JoinPartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { LoadingPage } from "../components/loading-page";
import { getPublicParty, joinParty } from "../lib/api/parties";

export function JoinPartyPage() {
  const navigate = useNavigate();
  const { partyCode = "" } = useParams();
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
    onSuccess: ({ party }) => {
      void navigate(`/party/${party.id}`, { replace: true });
    },
  });

  if (partyQuery.isPending) {
    return <LoadingPage />;
  }

  const party = partyQuery.data?.party;
  if (party === undefined) {
    return (
      <main className="page-shell compact-shell">
        <Link className="brand-link" to="/">
          SongFest
        </Link>
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

  return (
    <main className="join-page">
      <section className="join-identity" aria-label="Présentation de la soirée">
        <Link className="brand-link" to="/">
          SongFest
        </Link>
        <span className="party-mark">
          <MusicNotes aria-hidden="true" weight="fill" />
        </span>
        <p className="eyebrow">Tu es invité·e à</p>
        <h1 className="join-party-name">{party.name}</h1>
        <p className="screen-copy">
          Propose tes sons, vote pour les favoris et aide à choisir la prochaine ambiance.
        </p>
      </section>

      <section className="join-form-panel" aria-labelledby="join-title">
        <span className="icon-chip">
          <UsersThree aria-hidden="true" weight="fill" />
        </span>
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
            <FormError
              message={joinMutation.error instanceof Error ? joinMutation.error.message : undefined}
            />
            <button className="primary-button full-button" disabled={joinMutation.isPending}>
              {joinMutation.isPending ? "Entrée en cours…" : "Rejoindre la soirée"}
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
