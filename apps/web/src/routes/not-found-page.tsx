import { ArrowLeft, MusicNotes } from "@phosphor-icons/react";
import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <main className="page-shell compact-shell not-found-page">
      <span className="icon-chip" aria-hidden="true">
        <MusicNotes weight="duotone" />
      </span>
      <p className="eyebrow">Erreur 404</p>
      <h1 className="screen-title">Cette scène n’existe pas.</h1>
      <p className="screen-copy">Le lien a peut-être expiré ou la soirée est déjà terminée.</p>
      <Link className="primary-link" to="/">
        <ArrowLeft aria-hidden="true" weight="bold" />
        Revenir à l’accueil
      </Link>
    </main>
  );
}
