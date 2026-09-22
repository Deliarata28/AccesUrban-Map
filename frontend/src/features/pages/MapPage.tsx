import { ArrowLeft, Home } from "lucide-react";
import { Link } from "@tanstack/react-router";
import accessibilityLogo from "../../assets/accessurban-accessibility-logo-clean.png";
import { Map } from "../../features/Map/Map";
import "./MapPage.css";

export function MapPage() {
  return (
    <div className="site-shell map-page">
      <a className="skip-link" href="#continut">Sari la conținut</a>
      <div className="map-page-topbar" aria-label="Navigare hartă">
        <Link className="map-page-back" to="/home" aria-label="Înapoi la pagina principală">
          <ArrowLeft size={18} aria-hidden="true" />
          <span>Înapoi</span>
        </Link>
        <Link className="map-page-brand" to="/home" aria-label="AccesUrban Map, pagina principală">
          <img src={accessibilityLogo} alt="" aria-hidden="true" />
          <span>AccesUrban Map</span>
        </Link>
        <Link className="map-page-home" to="/home" aria-label="Pagina principală">
          <Home size={18} aria-hidden="true" />
          <span>Acasă</span>
        </Link>
      </div>
      <main id="continut" className="map-page-shell" aria-label="Harta accesibilității">
        <Map />
      </main>
    </div>
  );
}
