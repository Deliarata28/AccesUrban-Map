import { Header } from "../../components/Header";
import { Map } from "../../features/Map/Map";
import "./MapPage.css";

export function MapPage() {
  return (
    <div className="site-shell map-page">
      <a className="skip-link" href="#continut">Sari la conținut</a>
      <Header />
      <main id="continut" className="map-page-shell" aria-label="Harta accesibilității">
        <Map />
      </main>
    </div>
  );
}
