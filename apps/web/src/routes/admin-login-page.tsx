import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { userLoginRequestSchema, type UserLoginRequest, type UserSession } from "@songfest/shared";

import { FormError } from "../components/form-error";
import { RotateBrand } from "../components/rotate-brand";
import { loginUser } from "../lib/api/auth";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const form = useForm<UserLoginRequest>({
    resolver: zodResolver(userLoginRequestSchema),
    defaultValues: { identifier: "", password: "" },
  });
  const loginMutation = useMutation({
    mutationFn: loginUser,
    onSuccess: (session) => {
      queryClient.setQueryData<UserSession>(["user-session"], session);
      const destination = (location.state as { from?: string } | null)?.from ?? "/parties";
      void navigate(destination, { replace: true });
    },
  });

  return (
    <main className="page-shell compact-shell">
      <RotateBrand />
      <section className="form-card" aria-labelledby="login-title">
        <span className="icon-chip">
          <LockKey aria-hidden="true" weight="bold" />
        </span>
        <p className="eyebrow">Host access</p>
        <h1 className="screen-title" id="login-title">
          Prends les commandes.
        </h1>
        <p className="screen-copy">
          Retrouve tes rotations, prépare les invitations et garde le contrôle de la musique.
        </p>

        <form
          className="form-stack"
          onSubmit={form.handleSubmit((values) => loginMutation.mutate(values))}
        >
          <label className="field">
            <span>E-mail ou ancien identifiant</span>
            <input
              autoComplete="username"
              {...form.register("identifier")}
              aria-invalid={form.formState.errors.identifier !== undefined}
            />
            <FormError message={form.formState.errors.identifier?.message} />
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
        <p className="form-switch-copy">
          Pas encore de compte ? <Link to="/register">Créer mon espace</Link>
        </p>
      </section>
    </main>
  );
}
