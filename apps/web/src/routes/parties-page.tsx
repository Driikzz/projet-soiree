import { ArrowRight, CalendarPlus, SignOut } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import type { PartySummary } from "@songfest/shared";

import { LoadingPage } from "../components/loading-page";
import { getUserSession, logoutUser } from "../lib/api/auth";
import { listOwnedParties } from "../lib/api/parties";

const statusLabel: Record<PartySummary["status"], string> = {
  DRAFT: "En préparation",
  OPEN: "Invitations ouvertes",
  ACTIVE: "En cours",
  ENDED: "Terminée",
};

const getPartyDestination = (party: PartySummary) =>
  party.status === "DRAFT"
    ? `/organizer/parties/${party.id}/share`
    : `/organizer/parties/${party.id}/dashboard`;

export function PartiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sessionQuery = useQuery({
    queryKey: ["user-session"],
    queryFn: ({ signal }) => getUserSession(signal),
  });
  const partiesQuery = useQuery({
    queryKey: ["owned-parties"],
    queryFn: ({ signal }) => listOwnedParties(signal),
  });
  const logoutMutation = useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.clear();
      void navigate("/", { replace: true });
    },
  });

  if (sessionQuery.isPending || partiesQuery.isPending) {
    return <LoadingPage />;
  }

  if (sessionQuery.isError || partiesQuery.isError) {
    return (
      <main className="page-shell compact-shell">
        <p className="eyebrow">Espace indisponible</p>
        <h1 className="screen-title">Impossible de charger tes soirées.</h1>
      </main>
    );
  }

  const parties = partiesQuery.data.parties;

  return (
    <main className="page-shell account-shell">
      <header className="account-header">
        <div>
          <Link className="brand-link" to="/">
            SongFest
          </Link>
          <p className="eyebrow">Bonjour {sessionQuery.data.user.displayName}</p>
          <h1>Mes soirées</h1>
        </div>
        <div className="account-actions">
          <Link className="primary-link" to="/parties/new">
            <CalendarPlus aria-hidden="true" weight="bold" />
            Nouvelle soirée
          </Link>
          <button
            className="text-button"
            type="button"
            disabled={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <SignOut aria-hidden="true" />
            Se déconnecter
          </button>
        </div>
      </header>

      {parties.length === 0 ? (
        <section className="account-empty-state">
          <span>01</span>
          <div>
            <p className="eyebrow">Première soirée</p>
            <h2>Commence par lui donner un nom.</h2>
            <p>
              Tu pourras ensuite préparer les ambiances, connecter Spotify et inviter le groupe.
            </p>
          </div>
          <Link className="primary-link" to="/parties/new">
            Créer ma soirée
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
        </section>
      ) : (
        <section className="party-library" aria-label="Tes soirées">
          {parties.map((party, index) => (
            <Link className="party-library-row" to={getPartyDestination(party)} key={party.id}>
              <span className="party-library-index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <h2>{party.name}</h2>
                <p>
                  {statusLabel[party.status]} · code {party.code}
                </p>
              </div>
              <div className="party-library-meta">
                <span>{party.activeParticipantCount} participant(s)</span>
                <ArrowRight aria-hidden="true" weight="bold" />
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
