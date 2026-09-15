import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
} from "lucide-react";
import accessibilityLogo from "../../assets/accessurban-accessibility-logo-clean.png";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import {Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle,} from "../../components/ui/card";
import "./KnowPage.css";

const guideSteps = [
  {
    category: "Locuri",
    title: "Alege locul",
    text: "Caută o instituție, un centru comercial sau un restaurant și deschide detaliile lui înainte să pleci.",
    action: "Caută o locație",
    mode: "search" as const,
  },
  {
    category: "Trasee",
    title: "Planifică traseul",
    text: "Selectează plecarea și destinația. Harta afișează ruta, indicațiile și obstacolele documentate pe parcurs.",
    action: "Planifică traseul",
    mode: "route" as const,
  },
  {
    category: "Raportări",
    title: "Raportează ce s-a schimbat",
    text: "Poți marca direct pe hartă un obstacol și poți atașa o fotografie. Raportul este verificat înainte de publicare.",
    action: "Deschide harta",
    mode: "report" as const,
  },
];

const informationPrinciples = [
  "Scorul include numai facilități documentate.",
  "O informație fără sursă rămâne neconfirmată.",
  "Obstacolele apar pentru traseul selectat.",
];

export function KnowPage() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="site-shell">
      <a className="skip-link" href="#continut">
        Sari la conținut
      </a>
      <Header />

      <main id="continut" className="know-page">
        <motion.section
          className="know-hero"
          aria-labelledby="know-title"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="know-hero-copy">
            <h1 id="know-title">Tot ce trebuie să știi înainte să pleci.</h1>
            <p>
              AccesUrban Map te ajută să alegi un loc și un traseu cu mai multă
              claritate. Verifici informațiile utile, vezi ce este documentat și
              poți contribui când întâlnești o problemă reală.
            </p>
            <div className="know-hero-actions">
              <Button asChild size="lg" className="know-primary-action">
                <Link to="/map">
                  Deschide harta
                </Link>
              </Button>
              <Link
                className="know-text-link"
                to="/trebuie-sa-stii"
                hash="cum-functioneaza"
              >
                Cum funcționează
              </Link>
            </div>
          </div>
          <div className="know-hero-brand" aria-hidden="true">
            <img src={accessibilityLogo} alt="" />
          </div>
        </motion.section>

        <section className="know-guide" aria-labelledby="cum-functioneaza">
          <div className="know-section-heading">
            <span className="know-section-label">Ghid de utilizare</span>
            <h2 id="cum-functioneaza">Alege informația de care ai nevoie.</h2>
            <p>
              Fiecare zonă a hărții este organizată pentru o decizie concretă,
              înainte să pornești la drum.
            </p>
          </div>

          <div className="know-guide-grid">
            {guideSteps.map((step, index) => {
              return (
                <motion.div
                  key={step.title}
                  initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                  whileInView={reduceMotion ? undefined : { opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.34, delay: index * 0.08 }}
                >
                  <Card className="know-step-card">
                    <CardHeader>
                      <div className="know-step-card-topline">
                        <span className="know-step-number">0{index + 1}</span>
                        <span className="know-step-label">{step.category}</span>
                      </div>
                      <CardTitle>{step.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{step.text}</CardDescription>
                    </CardContent>
                    <CardFooter>
                      <Link to="/map" search={{ mode: step.mode }}>
                        {step.action}
                        <ArrowRight size={16} aria-hidden="true" />
                      </Link>
                    </CardFooter>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </section>

        <section className="know-trust" aria-labelledby="trust-title">
          <div className="know-trust-copy">
            <h2 id="trust-title">Cum citești datele de pe hartă.</h2>
            <p>
              Harta diferențiază informațiile documentate, rapoartele comunității
              și datele care mai trebuie verificate.
            </p>
          </div>
          <Card className="know-principles-card">
            <CardHeader>
              <CardTitle>Pe scurt</CardTitle>
              <CardDescription>Ce se afișează și de ce.</CardDescription>
            </CardHeader>
            <CardContent>
              <ul>
                {informationPrinciples.map((principle) => (
                  <li key={principle}>
                    <span>{principle}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Link to="/map">
                Vezi datele pe hartă
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </CardFooter>
          </Card>
        </section>
      </main>
      <Footer />
    </div>
  );
}
