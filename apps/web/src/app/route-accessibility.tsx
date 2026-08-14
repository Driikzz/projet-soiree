import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Accueil";
  if (pathname === "/login") return "Connexion";
  if (pathname === "/register") return "Créer un compte";
  if (pathname === "/parties") return "Mes soirées";
  if (pathname === "/parties/new") return "Créer une soirée";
  if (pathname.includes("/dashboard")) return "Tableau de bord";
  if (pathname.includes("/playlists")) return "Playlists";
  if (pathname.includes("/spotify")) return "Configuration Spotify";
  if (pathname.includes("/share")) return "Inviter";
  if (pathname.startsWith("/join/")) return "Rejoindre une soirée";
  if (pathname.startsWith("/party/")) return "Soirée";
  return "Page introuvable";
};

export function RouteAccessibility() {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    document.title = `${pageTitle} | SongFest`;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pageTitle]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {pageTitle}
    </p>
  );
}
