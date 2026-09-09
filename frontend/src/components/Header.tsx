import { UserRound } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { mainNavigation } from "../config/navigation";
import accessibilityLogo from "../assets/accessurban-accessibility-logo-clean.png";
import "./Header.css";

export function Header() {
  const location = useLocation();

  const isActive = (href: string) => {
    const [path, hash] = href.split("#");
    const currentPath = location.pathname === "/" ? "/home" : location.pathname;
    const targetPath = path === "/" ? "/home" : path;

    if (currentPath !== targetPath) return false;
    if (!hash) return true;
    return location.hash === hash || (!location.hash && hash === "acasa");
  };

  return (
    <div className="header-shell">
      <header className="site-header">
        <a className="brand" href="/home" aria-label="AccesUrban Map acasa">
          <span className="brand-mark">
            <img src={accessibilityLogo} alt="" aria-hidden="true" />
          </span>
          <span className="brand-text">
            <strong>AccesUrban Map</strong>
            <small>Chișinau fără bariere</small>
          </span>
        </a>

        <nav className="main-nav" aria-label="Navigare principala">
          {mainNavigation.map((item) => {
            const active = isActive(item.href);
            return (
            <a
              key={item.href}
              href={item.href}
              className={active ? "is-active" : undefined}
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <Link className="login-link" to="/autentificare" aria-label="Autentificare">
            <UserRound aria-hidden="true" size={22} strokeWidth={2.1} />
          </Link>

          <a className="header-action" href="/map">
            Vezi harta
          </a>
        </div>
      </header>
    </div>
  );
}
