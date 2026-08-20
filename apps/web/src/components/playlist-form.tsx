import { zodResolver } from "@hookform/resolvers/zod";
import { Check, X } from "@phosphor-icons/react";
import { useForm } from "react-hook-form";
import type { z } from "zod";

import {
  createPlaylistRequestSchema,
  type CreatePlaylistRequest,
  type PlaylistSummary,
  type PlaylistVisualKey,
} from "@songfest/shared";

import { FormError } from "./form-error";
import { PlaylistVisual } from "./playlist-visual";

const visualOptions: { key: PlaylistVisualKey; label: string }[] = [
  { key: "sunset", label: "Apéro" },
  { key: "pixel", label: "Nostalgie" },
  { key: "bass", label: "Basses" },
  { key: "pulse", label: "Électro" },
  { key: "midnight", label: "Minuit" },
  { key: "free", label: "Libre" },
];

type PlaylistFormInput = z.input<typeof createPlaylistRequestSchema>;

interface PlaylistFormProps {
  initialPlaylist?: PlaylistSummary;
  isPending: boolean;
  errorMessage: string | undefined;
  onCancel: () => void;
  onSubmit: (input: CreatePlaylistRequest) => void;
}

export function PlaylistForm({
  initialPlaylist,
  isPending,
  errorMessage,
  onCancel,
  onSubmit,
}: PlaylistFormProps) {
  const form = useForm<PlaylistFormInput, unknown, CreatePlaylistRequest>({
    resolver: zodResolver(createPlaylistRequestSchema),
    defaultValues: {
      name: initialPlaylist?.name ?? "",
      description: initialPlaylist?.description ?? "",
      visualKey: initialPlaylist?.visualKey ?? "sunset",
      quotaPerParticipant: initialPlaylist?.quotaPerParticipant ?? 5,
      isOpen: initialPlaylist?.isOpen ?? true,
      trackVotesEnabled: initialPlaylist?.trackVotesEnabled ?? true,
      explicitContentAllowed: initialPlaylist?.explicitContentAllowed ?? false,
    },
  });

  return (
    <section className="playlist-form-card" aria-labelledby="playlist-form-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">
            {initialPlaylist === undefined ? "Nouvelle ambiance" : "Réglages"}
          </p>
          <h2 id="playlist-form-title">
            {initialPlaylist === undefined
              ? "Créer une ambiance"
              : `Modifier ${initialPlaylist.name}`}
          </h2>
        </div>
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Fermer">
          <X aria-hidden="true" />
        </button>
      </div>

      <form className="form-stack" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="form-columns">
          <label className="field">
            <span>Nom</span>
            <input
              autoFocus
              placeholder="Années 2000"
              maxLength={80}
              {...form.register("name")}
              aria-invalid={form.formState.errors.name !== undefined}
            />
            <FormError message={form.formState.errors.name?.message} />
          </label>
          <label className="field quota-field">
            <span>Ajouts par personne</span>
            <input
              type="number"
              min={0}
              max={50}
              inputMode="numeric"
              {...form.register("quotaPerParticipant", { valueAsNumber: true })}
              aria-invalid={form.formState.errors.quotaPerParticipant !== undefined}
            />
            <FormError message={form.formState.errors.quotaPerParticipant?.message} />
          </label>
        </div>

        <label className="field">
          <span>Description</span>
          <textarea
            rows={3}
            maxLength={500}
            placeholder="Les refrains que tout le monde connaît."
            {...form.register("description")}
          />
          <FormError message={form.formState.errors.description?.message} />
        </label>

        <fieldset className="visual-picker">
          <legend>Label du vinyle</legend>
          <div className="visual-options">
            {visualOptions.map((option) => (
              <label key={option.key} className="visual-option">
                <input type="radio" value={option.key} {...form.register("visualKey")} />
                <PlaylistVisual visualKey={option.key} label={option.label} compact />
                <span>{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="setting-list">
          <label className="toggle-setting">
            <input type="checkbox" {...form.register("isOpen")} />
            <span>
              <strong>Ajouts ouverts</strong>
              Les invités peuvent proposer des morceaux.
            </span>
          </label>
          <label className="toggle-setting">
            <input type="checkbox" {...form.register("trackVotesEnabled")} />
            <span>
              <strong>Votes actifs</strong>
              Les titres de cette ambiance pourront recevoir des votes.
            </span>
          </label>
          <label className="toggle-setting">
            <input type="checkbox" {...form.register("explicitContentAllowed")} />
            <span>
              <strong>Contenu explicite autorisé</strong>
              Les résultats explicites pourront être ajoutés.
            </span>
          </label>
        </div>

        <FormError message={errorMessage} />
        <div className="form-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>
            Annuler
          </button>
          <button className="primary-button" disabled={isPending}>
            <Check aria-hidden="true" weight="bold" />
            {isPending ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </section>
  );
}
