import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Confetti } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { createPartyRequestSchema, type CreatePartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { createParty } from "../lib/api/parties";

export function CreatePartyPage() {
  const navigate = useNavigate();
  const form = useForm<CreatePartyRequest>({
    resolver: zodResolver(createPartyRequestSchema),
    defaultValues: { name: "" },
  });
  const createMutation = useMutation({
    mutationFn: createParty,
    onSuccess: ({ party }) => {
      void navigate(`/admin/parties/${party.id}/share`);
    },
  });

  return (
    <main className="page-shell compact-shell">
      <Link className="brand-link" to="/">
        SongFest
      </Link>
      <section className="form-card" aria-labelledby="create-title">
        <span className="icon-chip accent-chip">
          <Confetti aria-hidden="true" weight="fill" />
        </span>
        <p className="eyebrow">Nouvelle soirée</p>
        <h1 className="screen-title" id="create-title">
          Comment s’appelle la fête ?
        </h1>
        <p className="screen-copy">
          Tu pourras préparer les ambiances et connecter Spotify juste après.
        </p>
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => createMutation.mutate(values))}
        >
          <label className="field">
            <span>Nom de la soirée</span>
            <input
              autoFocus
              placeholder="Anniversaire de Léa"
              maxLength={120}
              {...form.register("name")}
              aria-invalid={form.formState.errors.name !== undefined}
            />
            <FormError message={form.formState.errors.name?.message} />
          </label>
          <FormError
            message={
              createMutation.error instanceof Error ? createMutation.error.message : undefined
            }
          />
          <button className="primary-button full-button" disabled={createMutation.isPending}>
            {createMutation.isPending ? "Création…" : "Créer la soirée"}
            <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </form>
      </section>
    </main>
  );
}
