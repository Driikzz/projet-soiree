import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, X } from "@phosphor-icons/react";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";

import { createPartyRequestSchema, type CreatePartyRequest } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { RotateBrand } from "../components/rotate-brand";
import { createParty } from "../lib/api/parties";

type PartyTiming = "NOW" | "SCHEDULED";

const toLocalDateTimeValue = (date: Date) => {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
};

export function CreatePartyPage() {
  const navigate = useNavigate();
  const [timing, setTiming] = useState<PartyTiming>("NOW");
  const [scheduledFor, setScheduledFor] = useState(() =>
    toLocalDateTimeValue(new Date(Date.now() + 60 * 60_000)),
  );
  const [scheduleError, setScheduleError] = useState<string>();
  const form = useForm<CreatePartyRequest>({
    resolver: zodResolver(createPartyRequestSchema),
    defaultValues: { name: "", location: "" },
  });
  const createMutation = useMutation({
    mutationFn: createParty,
    onSuccess: ({ party }) => {
      void navigate(`/organizer/parties/${party.id}/playlists?setup=2`);
    },
  });

  const submitParty = (values: CreatePartyRequest) => {
    if (timing === "SCHEDULED" && scheduledFor === "") {
      setScheduleError("Choisis la date et l’heure de la rotation.");
      return;
    }

    setScheduleError(undefined);
    createMutation.mutate({
      name: values.name,
      ...(values.location?.trim() ? { location: values.location.trim() } : {}),
      ...(timing === "SCHEDULED" ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
    });
  };

  return (
    <main className="create-rotation-page">
      <aside className="create-brand-rail" aria-label="ROTATE — Record Culture">
        <RotateBrand />
        <span className="create-catalogue-ticket">
          ROT/<strong>NEW</strong>
        </span>
        <p>
          Chaque nuit.
          <br />
          Une édition unique.
          <br />
          Un souvenir.
        </p>
        <i aria-hidden="true" />
        <strong className="create-brand-tagline">
          The night,
          <br />
          <span>recorded.</span>
        </strong>
      </aside>

      <section className="create-rotation-workspace">
        <p className="create-board-label">
          <b>02</b> Créer une rotation
        </p>

        <article className="create-rotation-panel" aria-labelledby="create-title">
          <header className="create-panel-header">
            <Link to="/parties" aria-label="Revenir à tes records">
              <ArrowLeft aria-hidden="true" />
            </Link>
            <span>Étape 1/6</span>
            <Link to="/parties" aria-label="Fermer la création">
              <X aria-hidden="true" />
            </Link>
          </header>

          <h1 id="create-title">Nouvelle rotation</h1>

          <form className="create-rotation-form" onSubmit={form.handleSubmit(submitParty)}>
            <label className="create-field">
              <span>Nom de ta soirée</span>
              <input
                autoFocus
                placeholder="Lucas’ Place"
                maxLength={120}
                {...form.register("name")}
                aria-invalid={form.formState.errors.name !== undefined}
              />
              <FormError message={form.formState.errors.name?.message} />
            </label>

            <fieldset className="create-timing-field">
              <legend>Date</legend>
              <div className="create-segmented-control">
                <label>
                  <input
                    type="radio"
                    name="party-timing"
                    value="NOW"
                    checked={timing === "NOW"}
                    onChange={() => setTiming("NOW")}
                  />
                  <i aria-hidden="true" />
                  Maintenant
                </label>
                <label>
                  <input
                    type="radio"
                    name="party-timing"
                    value="SCHEDULED"
                    checked={timing === "SCHEDULED"}
                    onChange={() => setTiming("SCHEDULED")}
                  />
                  <i aria-hidden="true" />
                  Programmer
                </label>
              </div>
            </fieldset>

            {timing === "SCHEDULED" && (
              <label className="create-field create-schedule-field">
                <span>Date et heure</span>
                <input
                  type="datetime-local"
                  value={scheduledFor}
                  min={toLocalDateTimeValue(new Date())}
                  onChange={(event) => setScheduledFor(event.target.value)}
                  aria-invalid={scheduleError !== undefined}
                />
                <FormError message={scheduleError} />
              </label>
            )}

            <label className="create-field">
              <span>
                Lieu <small>(optionnel)</small>
              </span>
              <input placeholder="Lyon" maxLength={160} {...form.register("location")} />
              <FormError message={form.formState.errors.location?.message} />
            </label>

            <FormError
              message={
                createMutation.error instanceof Error ? createMutation.error.message : undefined
              }
            />

            <button className="create-next-button" disabled={createMutation.isPending}>
              {createMutation.isPending ? "Création…" : "Suivant"}
              <ArrowRight aria-hidden="true" weight="bold" />
            </button>
          </form>

          <div className="create-step-dots" aria-label="Étape 1 sur 6">
            {Array.from({ length: 6 }, (_, index) => (
              <i className={index === 0 ? "active" : undefined} key={index} />
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
