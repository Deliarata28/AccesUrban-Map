import { HandHeart } from "lucide-react";
import { Link } from "@tanstack/react-router";
import heroImage from "../../assets/accesurban-map-hero.png";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { AccessibilityTagList } from "./components/AccessibilityTagList";
import { FeatureCard } from "./components/FeatureCard";
import {
  accessibilityDetails,
  homeFeatures,
  journeyHighlights,
  mapStatuses,
  reportSteps,
} from "./data/homeContent";
import "./HomePage.css";

export function HomePage() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>

      <Header />

      <main id="continut">
        <section
          className="hero-section"
          id="acasa"
          aria-labelledby="home-title"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="hero-copy">
            <p className="eyebrow">Acces Urban Map</p>
            <h1 id="home-title">Harta care arată accesul, nu doar adresa.</h1>
            <p className="hero-lead">
              Găsește din timp intrări fără trepte, rampe funcționale, lifturi și
              trasee mai ușor de parcurs prin Chișinău.
            </p>

            <div className="hero-actions" aria-label="Acțiuni principale">
              <Link className="button primary" to="/map">
                Vezi harta
              </Link>
              <a className="button secondary" href="#raportare">
                Raportează o problemă
              </a>
            </div>
          </div>
        </section>

        <section className="quote-section" aria-label="Citat despre accesibilitate">
          <blockquote>
            <p>
              „Un oraș devine cu adevărat public atunci când intrările, traseele și
              serviciile lui pot fi folosite în siguranță de cât mai mulți oameni.”
            </p>
          </blockquote>
        </section>

        <section className="journey-section" aria-labelledby="journey-title">
          <div className="section-heading compact-heading">
            <p className="section-kicker">Înainte de drum</p>
            <h2 id="journey-title">Accesibilitatea trebuie să fie clară înainte să ajungi la ușă.</h2>
          </div>

          <div className="journey-grid">
            {journeyHighlights.map((item, index) => (
              <article className="info-card" key={item.title}>
                <span className="info-index">{String(index + 1).padStart(2, "0")}</span>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="map-section" id="harta" aria-labelledby="map-title">
          <div className="map-copy">
            <p className="section-kicker">Harta accesibilității</p>
            <h2 id="map-title">Hartă</h2>
            <p>Vezi locurile accesibile din oraș.</p>

            <aside className="map-summary" aria-label="Rezumat hartă accesibilitate">
              <div>
                <h3>Hartă</h3>
                <p>Locuri accesibile, dintr-o privire.</p>
              </div>

              <ul className="map-status-list" aria-label="Niveluri de accesibilitate">
                {mapStatuses.map((status) => (
                  <li key={status}>{status}</li>
                ))}
              </ul>
            </aside>
          </div>

          <Link className="map-preview" to="/map" aria-label="Deschide harta accesibilă">
            <div className="map-toolbar">
              <span>Centru, Chișinău</span>
              <span>Locații disponibile</span>
            </div>

            <div className="map-canvas">
              <span className="map-road road-one" />
              <span className="map-road road-two" />
              <span className="map-road road-three" />
              <span className="map-park" />

              <div className="map-pin pin-access">
                <span>Accesibil</span>
              </div>
              <div className="map-pin pin-lift">
                <span>Parțial accesibil</span>
              </div>
              <div className="map-pin pin-alert">
                <span>Accesibilitate redusă</span>
              </div>
              <div className="map-pin pin-unknown">
                <span>Necunoscut</span>
              </div>
            </div>
          </Link>
        </section>

        <section className="feature-section" id="cum-ajuta" aria-labelledby="features-title">
          <div className="section-heading">
            <p className="section-kicker">Trebuie să știi</p>
            <h2 id="features-title">Informația despre acces trebuie să fie clară înainte de plecare.</h2>
          </div>

          <div className="feature-grid">
            {homeFeatures.map((feature) => (
              <FeatureCard key={feature.title} title={feature.title} text={feature.text} />
            ))}
          </div>
        </section>

        <section className="details-section" id="facilitati" aria-label="Facilități urmărite">
          <div>
            <p className="details-title">Facilități urmărite</p>
            <span className="details-note">
              Aceste criterii descriu dacă un loc poate fi folosit mai ușor de persoane în scaun rulant,
              părinți cu cărucior sau persoane care evită scările.
            </span>
          </div>
          <AccessibilityTagList tags={accessibilityDetails} />
        </section>

        <section className="report-section" id="raportare" aria-labelledby="report-title">
          <div className="report-kicker">
            <span className="report-kicker__icon" aria-hidden="true"><HandHeart size={19} strokeWidth={2.1} /></span>
            <p className="section-kicker">Comunitate</p>
          </div>
          <h2 id="report-title">Când orașul se schimbă, harta trebuie actualizată.</h2>
          <p>
            Raportările ajută la corectarea informațiilor despre rampe blocate,
            trotuare deteriorate, lifturi indisponibile sau intrări greu de folosit.
          </p>

          <div className="report-grid">
            {reportSteps.map((step) => (
              <article key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
