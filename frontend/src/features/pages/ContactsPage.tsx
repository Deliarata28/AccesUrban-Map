import { Link, useNavigate } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, MapPinned, MessageCircleMore, Send } from "lucide-react";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { usePlaces } from "../../hooks/useAppData";
import type { Position } from "../../types/place";
import { MapCanvas } from "../Map/MapCanvas";
import "../Map/Map.css";
import "./ContactsPage.css";

const contactDetails = [
  { icon: Mail, label: "E-mail", value: "accesurbanmap@gmail.com", href: "mailto:accesurbanmap@gmail.com" },
  { icon: MapPinned, label: "Oraș", value: "Chișinău, Republica Moldova", href: "/map" },
  { icon: MessageCircleMore, label: "Despre ce ne poți scrie", value: "Întrebări, observații sau idei pentru hartă", href: undefined },
] as const;

const contactMapCenter: Position = [47.0105, 28.8353];

export function ContactsPage() {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();
  const placesQuery = usePlaces();
  const previewPlaces = placesQuery.data?.slice(0, 18) ?? [];
  const openMap = () => navigate({ to: "/map" });

  return (
    <div className="site-shell">
      <a className="skip-link" href="#continut">Sari la conținut</a>
      <Header />
      <main id="continut" className="contacts-page">
        <motion.section
          className="contacts-intro"
          aria-labelledby="contacts-title"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <h1 id="contacts-title">Spune-ne ce poate face harta mai utilă.</h1>
        </motion.section>

        <section className="contacts-layout" aria-label="Date de contact și formular">
          <aside className="contacts-sidebar" aria-label="Date de contact">
            <div className="contacts-details">
              {contactDetails.map(({ icon: Icon, label, value, href }) => {
                const content = <><span className="contacts-detail-icon" aria-hidden="true"><Icon size={19} /></span><span className="contacts-detail-copy"><span>{label}</span><strong>{value}</strong></span></>;
                return href === "/map" ? (
                  <Link className="contacts-detail-card" key={label} to="/map">{content}</Link>
                ) : href ? <a className="contacts-detail-card" key={label} href={href}>{content}</a> : (
                  <div className="contacts-detail-card" key={label}>{content}</div>
                );
              })}
            </div>

            <div className="contacts-map-card">
              <div className="contacts-live-map" aria-label="Previzualizare hartă AccesUrban Map">
                <MapCanvas
                  places={previewPlaces}
                  parking={[]}
                  accessibilityPoints={[]}
                  onSelect={openMap}
                  onSelectParking={openMap}
                  onSelectAccessibility={openMap}
                  target={null}
                  route={null}
                  origin={null}
                  destination={null}
                  userLocation={null}
                  travelMode="foot"
                  panelOpen={false}
                  satellite={false}
                  recenterPosition={contactMapCenter}
                  recenterVersion={null}
                  onRecenter={openMap}
                  onPick={() => undefined}
                  picking={false}
                />
              </div>
              <Link to="/map" className="contacts-map-link">Deschide harta</Link>
            </div>
          </aside>

          <motion.section
            className="contacts-form-card"
            aria-labelledby="contacts-form-title"
            initial={reduceMotion ? false : { opacity: 0, y: 22 }}
            animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: reduceMotion ? 0 : 0.08, ease: "easeOut" }}
          >
            <div className="contacts-form-heading">
              <h2 id="contacts-form-title">Trimite-ne un mesaj</h2>
              <p>Descrie pe scurt ce ai nevoie. Mesajul se deschide în aplicația ta de e-mail.</p>
            </div>
            <form action="mailto:accesurbanmap@gmail.com" method="post" encType="text/plain" className="contacts-form">
              <div className="contacts-form-row">
                <div className="contacts-field"><Label htmlFor="contact-name">Nume</Label><Input id="contact-name" name="name" autoComplete="name" placeholder="Numele tău" required /></div>
                <div className="contacts-field"><Label htmlFor="contact-email">E-mail</Label><Input id="contact-email" name="email" type="email" autoComplete="email" placeholder="nume@exemplu.md" required /></div>
              </div>
              <div className="contacts-field"><Label htmlFor="contact-subject">Subiect</Label><Input id="contact-subject" name="subject" placeholder="Cu ce te putem ajuta?" required /></div>
              <div className="contacts-field"><Label htmlFor="contact-message">Mesaj</Label><Textarea id="contact-message" name="message" rows={6} placeholder="Scrie mesajul aici..." required /></div>
              <div className="contacts-form-actions">
                <Button type="submit" className="contacts-submit">Trimite mesajul<Send aria-hidden="true" /></Button>
                <span>Poți scrie și direct la accesurbanmap@gmail.com</span>
              </div>
            </form>
          </motion.section>
        </section>
      </main>
      <Footer />
    </div>
  );
}
