import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const getPageTitle = (pathname: string) => {
  if (pathname === "/") return "Accueil";
  if (pathname === "/login") return "Connexion";
  if (pathname === "/register") return "Créer un compte";
  if (pathname === "/parties") return "Your Records";
  if (pathname === "/parties/new") return "New Rotation";
  if (pathname.includes("/dashboard")) return "Host Live";
  if (pathname.includes("/playlists")) return "Music Control";
  if (pathname.includes("/spotify")) return "Control";
  if (pathname.includes("/share")) return "Inviter";
  if (pathname.startsWith("/join/")) return "Join the Rotation";
  if (pathname.startsWith("/party/")) return "Live Rotation";
  return "Page introuvable";
};

export function RouteAccessibility() {
  const { pathname } = useLocation();
  const pageTitle = getPageTitle(pathname);

  useEffect(() => {
    document.title = `${pageTitle} | ROTATE`;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [pageTitle]);

  return (
    <p className="sr-only" role="status" aria-live="polite">
      {pageTitle}
    </p>
  );
}
