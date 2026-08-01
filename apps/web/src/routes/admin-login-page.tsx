import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  adminLoginRequestSchema,
  type AdminLoginRequest,
  type AdminSession,
} from "@songfest/shared";

import { FormError } from "../components/form-error";
import { loginAdmin } from "../lib/api/auth";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const form = useForm<AdminLoginRequest>({
    resolver: zodResolver(adminLoginRequestSchema),
    defaultValues: { username: "", password: "" },
  });
  const loginMutation = useMutation({
    mutationFn: loginAdmin,
    onSuccess: (session) => {
      queryClient.setQueryData<AdminSession>(["admin-session"], session);
      const destination =
        (location.state as { from?: string } | null)?.from ?? "/admin/parties/new";
      void navigate(destination, { replace: true });
    },
  });

  return (
    <main className="page-shell compact-shell">
      <Link className="brand-link" to="/">
        SongFest
      </Link>
      <section className="form-card" aria-labelledby="login-title">
        <span className="icon-chip">
          <LockKey aria-hidden="true" weight="bold" />
        </span>
        <p className="eyebrow">Espace organisateur</p>
        <h1 className="screen-title" id="login-title">
          Prends les commandes.
        </h1>
        <p className="screen-copy">
          Cette connexion protège la création de soirée et, bientôt, les contrôles Spotify.
        </p>

        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
        >
          <label className="field">
            <span>Identifiant</span>
            <input
              autoComplete="username"
              {...form.register("username")}
              aria-invalid={form.formState.errors.username !== undefined}
            />
            <FormError message={form.formState.errors.username?.message} />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <input
              type="password"
              autoComplete="current-password"
              {...form.register("password")}
              aria-invalid={form.formState.errors.password !== undefined}
            />
            <FormError message={form.formState.errors.password?.message} />
          </label>
          <FormError
            message={loginMutation.error instanceof Error ? loginMutation.error.message : undefined}
          />
          <button className="primary-button full-button" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? "Connexion…" : "Se connecter"}
            <ArrowRight aria-hidden="true" weight="bold" />
          </button>
        </form>
      </section>
    </main>
  );
}
