import { Mail } from "lucide-react";
import { footerNavigation } from "../config/navigation";
import accessibilityLogo from "../assets/accessurban-accessibility-logo-clean.png";
import "./Footer.css";

const resourceLinks = [
  { label: "Întrebări frecvente", href: "/contacte" },
  { label: "Criterii de accesibilitate", href: "/home#facilitati" },
];

const contactLinks = [
  { label: "accesurbanmap@gmail.com", href: "mailto:accesurbanmap@gmail.com" },
  { label: "Chișinău, Republica Moldova", href: "/home#acasa" },
];

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <circle cx="17.6" cy="6.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <section className="footer-about" aria-labelledby="footer-brand-title">
          <a className="footer-brand" href="/home#acasa" aria-label="AccesUrban Map acasă">
            <span className="footer-brand-mark">
              <img src={accessibilityLogo} alt="" aria-hidden="true" />
            </span>
            <span className="footer-brand-copy" id="footer-brand-title">
              <strong>AccesUrban Map</strong>
              <small>Chișinău fără bariere</small>
            </span>
          </a>
          <p>
            AccesUrban Map este o aplicație web dedicată îmbunătățirii calității
            vieții pentru persoanele cu dizabilități și mobilitate redusă, oferind
            informații clare despre accesul în locurile publice din Chișinău.
          </p>
        </section>

        <nav className="footer-column" aria-label="Suport">
          <h3>Suport</h3>
          {footerNavigation.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <nav className="footer-column" aria-label="Resurse">
          <h3>Resurse</h3>
          {resourceLinks.map((item) => (
            <a key={item.href} href={item.href}>
              {item.label}
            </a>
          ))}
        </nav>

        <address className="footer-column footer-contact">
          <h3>Contact</h3>
          {contactLinks.map((item) => (
            <a key={item.href} href={item.href}>
              {item.href.startsWith("mailto:") ? <Mail size={16} aria-hidden="true" /> : null}
              {item.label}
            </a>
          ))}
          <div className="footer-socials" aria-label="Rețele sociale">
            <span className="footer-social-icon" role="img" aria-label="Instagram">
              <InstagramIcon />
            </span>
            <span className="footer-social-icon" role="img" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.8 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5H17V3.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5V13h2.8v8h3.5Z" fill="currentColor" /></svg>
            </span>
          </div>
        </address>
      </div>

      <div className="footer-bottom">
        <p>© 2026 AccesUrban Map. Toate drepturile rezervate.</p>
      </div>
    </footer>
  );
}
