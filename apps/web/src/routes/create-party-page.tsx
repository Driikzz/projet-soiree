import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { createPartyRequestSchema, type CreatePartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { RotateBrand } from "../components/rotate-brand";
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
      void navigate(`/organizer/parties/${party.id}/share`);
    },
  });

  return (
    <main className="rotate-form-page sleeve-page">
      <header className="rotate-form-header">
        <RotateBrand compact />
        <Link className="back-link" to="/parties">
          <ArrowLeft aria-hidden="true" />
          Your records
        </Link>
      </header>
      <section className="form-card rotate-editor-card" aria-labelledby="create-title">
        <div className="editor-progress" aria-label="Étape 1 sur 1">
          <span>01</span>
          <i />
          <small>Nouvelle rotation</small>
        </div>
        <p className="eyebrow">Créer une édition</p>
        <h1 className="screen-title" id="create-title">
          Name the night.
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
              placeholder="Lucas’ Place"
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
            {createMutation.isPending ? "Création…" : "Continuer"}
            <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </form>
      </section>
    </main>
  );
}
