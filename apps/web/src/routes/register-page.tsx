import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, UserPlus } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";

import { userRegistrationRequestSchema, type UserSession } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { registerUser } from "../lib/api/auth";

const registrationFormSchema = userRegistrationRequestSchema
  .extend({
    passwordConfirmation: z.string().min(1, "Confirme ton mot de passe."),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Les mots de passe ne correspondent pas.",
  });

type RegistrationForm = z.infer<typeof registrationFormSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const form = useForm<RegistrationForm>({
    resolver: zodResolver(registrationFormSchema),
    defaultValues: { displayName: "", email: "", password: "", passwordConfirmation: "" },
  });
  const registrationMutation = useMutation({
    mutationFn: ({ passwordConfirmation: _passwordConfirmation, ...input }: RegistrationForm) =>
      registerUser(input),
    onSuccess: (session) => {
      queryClient.setQueryData<UserSession>(["user-session"], session);
      void navigate("/parties", { replace: true });
    },
  });

  return (
    <main className="page-shell compact-shell">
      <Link className="brand-link" to="/">
        SongFest
      </Link>
      <section className="form-card" aria-labelledby="register-title">
        <span className="icon-chip accent-chip">
          <UserPlus aria-hidden="true" weight="bold" />
        </span>
        <p className="eyebrow">Ton espace</p>
        <h1 className="screen-title" id="register-title">
          Crée tes soirées.
        </h1>
        <p className="screen-copy">
          Un seul compte pour préparer, lancer et retrouver toutes tes soirées.
        </p>
        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => registrationMutation.mutate(values))}
        >
          <label className="field">
            <span>Nom affiché</span>
            <input autoComplete="name" {...form.register("displayName")} />
            <FormError message={form.formState.errors.displayName?.message} />
          </label>
          <label className="field">
            <span>E-mail</span>
            <input type="email" autoComplete="email" {...form.register("email")} />
            <FormError message={form.formState.errors.email?.message} />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
              aria-describedby="password-help"
              {...form.register("password")}
            />
            <small className="field-hint" id="password-help">
              12 caractères minimum.
            </small>
            <FormError message={form.formState.errors.password?.message} />
          </label>
          <label className="field">
            <span>Confirmer le mot de passe</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={256}
              {...form.register("passwordConfirmation")}
            />
            <FormError message={form.formState.errors.passwordConfirmation?.message} />
          </label>
          <FormError
            message={
              registrationMutation.error instanceof Error
                ? registrationMutation.error.message
                : undefined
            }
          />
          <button className="primary-button full-button" disabled={registrationMutation.isPending}>
            {registrationMutation.isPending ? "Création…" : "Créer mon compte"}
            <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </form>
        <p className="form-switch-copy">
          Déjà inscrit ? <Link to="/login">Se connecter</Link>
        </p>
      </section>
    </main>
  );
}
