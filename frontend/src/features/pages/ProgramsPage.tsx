import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, MapPin } from "lucide-react";
import { useState } from "react";
import programAccessibleWalk from "../../assets/program-accessible-walk.png";
import programCommunityPlanning from "../../assets/program-community-planning.png";
import programOrientationWhiteCane from "../../assets/program-orientation-white-cane.png";
import programSignLanguage from "../../assets/program-sign-language.png";
import programStreetAudit from "../../assets/program-street-audit.png";
import { Footer } from "../../components/Footer";
import { Header } from "../../components/Header";
import { Button } from "../../components/ui/button";
import "./ProgramsPage.css";

const programs = [
  {
    date: "26 septembrie",
    time: "10:30 – 12:00",
    location: "Parcul Ștefan cel Mare",
    meetingPoint: "Aleea Scriitorilor",
    title: "Harta din cartier",
    summary: "Ne întâlnim pentru a compara drumurile folosite zilnic și pentru a adăuga observații care pot ajuta următorul vizitator.",
    details: [
      "Alegem împreună două-trei trasee scurte din zona centrală.",
      "Notăm intrări, rampe, treceri și alte detalii utile pe hartă.",
      "Poți veni cu o experiență concretă sau doar să afli cum funcționează platforma.",
    ],
    image: programCommunityPlanning,
    imageAlt: "Participanți la o întâlnire comunitară care analizează o hartă",
  },
  {
    date: "4 octombrie",
    time: "11:00 – 12:30",
    location: "Parcul Valea Morilor",
    meetingPoint: "Strada Alexei Mateevici 67",
    title: "Plimbare fără bariere",
    summary: "Parcurgem împreună o porțiune de traseu, vedem ce funcționează bine și discutăm unde mai este nevoie de informații clare.",
    details: [
      "Ritmul grupului este stabilit de participanți, iar traseul rămâne scurt.",
      "Observăm accesul la alei, treceri și zonele de odihnă.",
      "La final, fiecare observație utilă poate deveni un raport pe hartă.",
    ],
    image: programAccessibleWalk,
    imageAlt: "Grup de participanți care parcurge o alee accesibilă",
  },
  {
    date: "14 octombrie",
    time: "18:30 – 20:00",
    location: "Scuarul Catedralei",
    meetingPoint: "Lângă intrarea principală în parc",
    title: "Observații din teren",
    summary: "Un atelier practic despre cum documentezi o barieră astfel încât informația să fie utilă pentru oameni și ușor de verificat.",
    details: [
      "Vedem ce fotografie și ce descriere explică o situație fără ambiguități.",
      "Discutăm diferența dintre o intrare accesibilă și una care doar pare accesibilă.",
      "Exersăm raportarea pe hartă, cu accent pe date concrete.",
    ],
    image: programStreetAudit,
    imageAlt: "Participanți care observă și documentează accesul la o trecere pietonală",
  },
  {
    date: "22 octombrie",
    time: "17:00 – 18:30",
    location: "Parcul Valea Morilor",
    meetingPoint: "Intrarea dinspre strada Alexei Mateevici",
    title: "Orientare în oraș",
    summary: "O ieșire pentru a descoperi repere utile, suprafețe tactile și informații care pot face deplasarea mai previzibilă pentru persoane cu deficiențe de vedere sau care folosesc ajutoare de mers.",
    details: [
      "Identificăm repere auditive, tactile și vizuale de-a lungul unei porțiuni scurte de traseu.",
      "Discutăm despre zonele în care o descriere mai clară pe hartă ar ajuta la orientare.",
      "Notăm ce informații pot reduce surprizele înainte de plecare.",
    ],
    image: programOrientationWhiteCane,
    imageAlt: "Participant care se orientează cu un baston alb pe un traseu cu pavaj tactil",
  },
  {
    date: "7 noiembrie",
    time: "16:30 – 18:00",
    location: "Parcul Dendrariu",
    meetingPoint: "Intrarea principală dinspre strada Eugen Doga",
    title: "Comunicare accesibilă",
    summary: "O întâlnire despre felul în care descrierile, fotografiile și indicațiile clare ajută persoanele surde, cu deficiențe de auz sau cu nevoi diferite de comunicare să folosească harta independent.",
    details: [
      "Comparăm descrieri clare, fotografii utile și indicii vizuale pentru punctele importante.",
      "Vedem cum poate fi raportată o problemă fără să fie nevoie de explicații lungi.",
      "Strângem idei pentru informații mai ușor de urmărit direct pe hartă.",
    ],
    image: programSignLanguage,
    imageAlt: "Participanți la un atelier care comunică prin limbaj mimico-gestual",
  },
] as const;

function getCardPosition(index: number, activeIndex: number) {
  const offset = (index - activeIndex + programs.length) % programs.length;
  if (offset === 0) return "active";
  if (offset === 1) return "next";
  if (offset === programs.length - 1) return "previous";
  return offset < programs.length / 2 ? "far-next" : "far-previous";
}

export function ProgramsPage() {
  const [activeIndex, setActiveIndex] = useState(0);
  const reduceMotion = useReducedMotion();
  const activeProgram = programs[activeIndex];

  const showPrevious = () => {
    setActiveIndex((current) => (current - 1 + programs.length) % programs.length);
  };

  const showNext = () => {
    setActiveIndex((current) => (current + 1) % programs.length);
  };

  return (
    <div className="site-shell">
      <a className="skip-link" href="#continut">Sari la conținut</a>
      <Header />

      <main id="continut" className="programs-page">
        <motion.section
          className="programs-intro"
          aria-labelledby="programs-title"
          initial={reduceMotion ? false : { opacity: 0, y: 18 }}
          animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <div>
            <h1 id="programs-title">Întâlniri care fac orașul mai ușor de parcurs.</h1>
          </div>
          <p>Alege un program, vino la punctul de întâlnire și contribuie cu observații care fac harta mai utilă pentru toți.</p>
        </motion.section>

        <section className="programs-carousel-section" aria-labelledby="programs-carousel-title">
          <div className="programs-carousel-header">
            <div>
              <h2 id="programs-carousel-title">Alege următoarea întâlnire</h2>
            </div>
            <div className="programs-carousel-controls" aria-label="Navigare programe">
              <Button type="button" variant="outline" size="icon" onClick={showPrevious} aria-label="Programul anterior"><ArrowLeft aria-hidden="true" /></Button>
              <span aria-live="polite" className="programs-carousel-count">{activeIndex + 1} / {programs.length}</span>
              <Button type="button" variant="outline" size="icon" onClick={showNext} aria-label="Programul următor"><ArrowRight aria-hidden="true" /></Button>
            </div>
          </div>

          <div className="programs-carousel" aria-roledescription="carousel">
            <div className="programs-arc" role="list">
              {programs.map((program, index) => {
                const position = getCardPosition(index, activeIndex);
                const isActive = index === activeIndex;

                return (
                  <button
                    key={program.title}
                    type="button"
                    className="programs-carousel-card"
                    data-position={position}
                    aria-current={isActive ? "true" : undefined}
                    aria-hidden={position.startsWith("far-")}
                    aria-label={`Vezi programul: ${program.title}`}
                    tabIndex={position.startsWith("far-") ? -1 : undefined}
                    onClick={() => setActiveIndex(index)}
                  >
                    <img src={program.image} alt={program.imageAlt} />
                    <span className="programs-card-shade" />
                    <span className="programs-card-meta">{program.date}</span>
                    <span className="programs-card-title">{program.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <AnimatePresence mode="wait" initial={false}>
            <motion.article
              key={activeProgram.title}
              className="programs-details"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={reduceMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              aria-live="polite"
            >
              <div className="programs-details-main">
                <h2>{activeProgram.title}</h2>
                <p>{activeProgram.summary}</p>
                <ul>{activeProgram.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
              </div>

              <aside className="programs-event-card" aria-label={`Detalii pentru ${activeProgram.title}`}>
                <div className="programs-event-info"><CalendarDays aria-hidden="true" /><div><span>Data</span><strong>{activeProgram.date}</strong></div></div>
                <div className="programs-event-info"><Clock3 aria-hidden="true" /><div><span>Ora</span><strong>{activeProgram.time}</strong></div></div>
                <div className="programs-event-info"><MapPin aria-hidden="true" /><div><span>{activeProgram.location}</span><strong>{activeProgram.meetingPoint}</strong></div></div>
                <Button asChild className="programs-map-link"><Link to="/map" search={{ mode: "search" }}>Vezi pe hartă</Link></Button>
              </aside>
            </motion.article>
          </AnimatePresence>
        </section>
      </main>
      <Footer />
    </div>
  );
}
