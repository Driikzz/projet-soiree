import { useQuery } from "@tanstack/react-query";
import type { PropsWithChildren } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { getUserSession } from "../lib/api/auth";
import { ApiError } from "../lib/api/client";
import { LoadingPage } from "../components/loading-page";

export function ProtectedAdminRoute({ children }: PropsWithChildren) {
  const location = useLocation();
  const sessionQuery = useQuery({
    queryKey: ["user-session"],
    queryFn: ({ signal }) => getUserSession(signal),
    retry: false,
  });

  if (sessionQuery.isPending) {
    return <LoadingPage />;
  }

  if (
    sessionQuery.error instanceof ApiError &&
    sessionQuery.error.code === "AUTHENTICATION_REQUIRED"
  ) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (sessionQuery.isError) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Connexion impossible</p>
        <h1 className="screen-title">Le serveur ne répond pas.</h1>
        <p className="screen-copy">Vérifie l’API puis recharge cette page.</p>
      </main>
    );
  }

  return children;
}
