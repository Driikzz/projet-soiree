import { ArrowRight, CalendarPlus, SignOut } from "@phosphor-icons/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";

import type { PartySummary } from "@songfest/shared";

import { LoadingPage } from "../components/loading-page";
import { RecordStamp } from "../components/record-stamp";
import { RotateBrand } from "../components/rotate-brand";
import { RotReference } from "../components/rot-reference";
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
  const liveParties = parties.filter((party) => party.status !== "ENDED");
  const records = parties.filter((party) => party.status === "ENDED");

  return (
    <main className="page-shell account-shell rotate-library-shell">
      <header className="account-header">
        <div>
          <RotateBrand />
          <p className="eyebrow">Bonsoir {sessionQuery.data.user.displayName}</p>
          <h1>Your records.</h1>
        </div>
        <div className="account-actions">
          <Link className="primary-link" to="/parties/new">
            <CalendarPlus aria-hidden="true" weight="bold" />
            New rotation
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
          <RecordStamp compact />
          <div>
            <p className="eyebrow">Première édition</p>
            <h2>Ta première nuit commence ici.</h2>
            <p>
              Tu pourras ensuite préparer les ambiances, connecter Spotify et inviter le groupe.
            </p>
          </div>
          <Link className="primary-link" to="/parties/new">
            Créer une rotation
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
        </section>
      ) : (
        <div className="rotate-record-groups">
          {liveParties.length > 0 && (
            <section className="party-library" aria-labelledby="active-rotations-title">
              <div className="library-section-heading">
                <span>01</span>
                <h2 id="active-rotations-title">Active rotation</h2>
              </div>
              {liveParties.map((party) => (
                <Link
                  className="party-library-row active-record-row"
                  to={getPartyDestination(party)}
                  key={party.id}
                >
                  <RotReference code={party.code} live={party.status === "ACTIVE"} />
                  <div>
                    <h3>{party.name}</h3>
                    <p>{statusLabel[party.status]}</p>
                  </div>
                  <div className="party-library-meta">
                    <span>{party.activeParticipantCount} people</span>
                    <ArrowRight aria-hidden="true" weight="bold" />
                  </div>
                </Link>
              ))}
            </section>
          )}

          <section className="party-library" aria-labelledby="your-records-title">
            <div className="library-section-heading">
              <span>02</span>
              <h2 id="your-records-title">Your records</h2>
            </div>
            {records.length === 0 ? (
              <p className="records-empty">Les rotations terminées seront conservées ici.</p>
            ) : (
              records.map((party) => (
                <Link className="party-library-row" to={getPartyDestination(party)} key={party.id}>
                  <RotReference code={party.code} />
                  <div>
                    <h3>{party.name}</h3>
                    <p>
                      {new Intl.DateTimeFormat("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      }).format(new Date(party.createdAt))}
                    </p>
                  </div>
                  <div className="party-library-meta">
                    <span>{party.activeParticipantCount} people</span>
                    <ArrowRight aria-hidden="true" weight="bold" />
                  </div>
                </Link>
              ))
            )}
          </section>
        </div>
      )}
    </main>
  );
}
