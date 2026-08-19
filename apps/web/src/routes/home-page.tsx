import { ArrowRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { RecordStamp } from "../components/record-stamp";
import { RotateBrand } from "../components/rotate-brand";
import { getHealth } from "../lib/api/health";

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => getHealth(signal),
  });

  return (
    <main className="rotate-home">
      <header className="rotate-home-header">
        <RotateBrand />
        <Link className="rotate-text-link" to="/login">
          Connexion host
        </Link>
      </header>

      <section className="rotate-home-hero" aria-labelledby="page-title">
        <div className="rotate-home-copy">
          <p className="catalogue-label">ROT/OPEN — Collaborative listening</p>
          <h1 id="page-title" aria-label="THE NIGHT, RECORDED.">
            THE NIGHT,
            <br />
            RECORDED<span>.</span>
          </h1>
          <p>
            Crée la rotation. Tes invités rejoignent, proposent, votent et donnent du poids aux
            morceaux qui doivent passer ensuite.
          </p>
          <div className="rotate-home-actions">
            <Link className="primary-link" to="/parties">
              Créer une rotation
              <ArrowRight aria-hidden="true" weight="bold" />
            </Link>
            <Link className="secondary-button" to="/register">
              Créer un compte
            </Link>
          </div>
        </div>
        <div className="rotate-home-record" aria-label="ROTATE Record Culture">
          <div className="vinyl-disc">
            <span>ROTATE</span>
            <i />
            <small>Side A · 33 RPM</small>
          </div>
          <RecordStamp />
        </div>
      </section>

      <aside className="rotate-service-status" aria-live="polite">
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
            <span>ROTATE est opérationnel.</span>
          </>
        )}
      </aside>
    </main>
  );
}
