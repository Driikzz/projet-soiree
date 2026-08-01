import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { getHealth } from "../lib/api/health";

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <main className="page-shell">
      <section className="home-hero-grid" aria-labelledby="page-title">
        <div className="hero">
          <p className="eyebrow">Programmation musicale collaborative</p>
          <h1 id="page-title">La soirée choisit l’ambiance.</h1>
          <p className="hero-copy">
            Les invités proposent et votent. L’organisateur garde le contrôle de la lecture.
          </p>
          <Link className="primary-link" to="/admin/parties/new">
            Créer une soirée
            <ArrowRight aria-hidden="true" weight="bold" />
          </Link>
        </div>
        <figure className="hero-art">
          <img
            src="/images/songfest-hero.jpg"
            width="1536"
            height="1024"
            alt="Un groupe réuni autour d’enceintes et de disques colorés"
            fetchPriority="high"
          />
        </figure>
      </section>

      <aside className="status-card" aria-live="polite">
        {healthQuery.isPending ? (
          <>
            <span className="status-skeleton" aria-hidden="true" />
            <span>Connexion au serveur…</span>
          </>
        ) : healthQuery.isError ? (
          <>
            <WarningCircle aria-hidden="true" weight="fill" />
            <span>Le serveur est indisponible.</span>
          </>
        ) : (
          <>
            <CheckCircle aria-hidden="true" weight="fill" />
            <span>Le socle SongFest est opérationnel.</span>
          </>
        )}
      </aside>
    </main>
  );
}
