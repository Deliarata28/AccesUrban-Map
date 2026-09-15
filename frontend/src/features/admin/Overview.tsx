import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  ArrowUpRight,
  CheckCheck,
  MapPin,
  Sparkles,
  ShieldCheck,
  TrendingUp,
} from "lucide-react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { statusMeta } from "../../config/accessibility";
import type { AccessibilityStatus, MapPlace } from "../../types/place";
import { evaluateAccessibility } from "../../utils/accessibility";
import { EmptyState } from "./AdminShared";

export function Overview({ places }: { places: MapPlace[] }) {
  const [highlightedMetric, setHighlightedMetric] = useState<string | null>(
    null,
  );
  const distribution = Object.entries(statusMeta).map(([key, value]) => ({
    key,
    ...value,
    count: places.filter(
      (place) => evaluateAccessibility(place.accessibility).status === key,
    ).length,
  }));
  const assessments = places.map((place) => evaluateAccessibility(place.accessibility));
  const knownScores = assessments
    .filter((assessment) => assessment.known)
    .map((assessment) => assessment.score);
  const averageScore = knownScores.length
    ? Math.round(knownScores.reduce((sum, score) => sum + score, 0) / knownScores.length)
    : 0;
  const confirmedFacilities = places.reduce(
    (total, place) =>
      total + Object.values(place.accessibility).filter((value) => value === "da").length,
    0,
  );
  const totalFacilities = places.length * 7;
  const completion = totalFacilities
    ? Math.round((confirmedFacilities / totalFacilities) * 100)
    : 0;
  const recent = [...places]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4);
  const accessible = distribution.find((item) => item.key === "accesibil")?.count ?? 0;
  const needsReview = distribution.find((item) => item.key === "necunoscut")?.count ?? 0;
  let cursor = 0;
  const gradient = distribution
    .map((item) => {
      const start = cursor;
      cursor += (item.count / (places.length || 1)) * 100;
      return `${item.color} ${start}% ${cursor}%`;
    })
    .join(", ");

  const metrics = [
    {
      label: "Scor mediu de acces",
      value: averageScore,
      detail: "din 100 puncte analizate",
      focusTitle: "Scorul orașului",
      focusDescription: "Media facilităților cunoscute pentru locațiile din hartă.",
      icon: ShieldCheck,
      tone: "green",
    },
    {
      label: "Locații cartografiate",
      value: places.length,
      detail: "coordonate din surse publice",
      focusTitle: "Catalog cartografiat",
      focusDescription: "Locațiile afișate provin din coordonate publice și pot fi completate de comunitate.",
      icon: MapPin,
      tone: "blue",
    },
    {
      label: "Facilități active",
      value: confirmedFacilities,
      detail: "informații confirmate",
      focusTitle: "Facilități urmărite",
      focusDescription: "Fiecare facilitate confirmată face harta mai utilă.",
      icon: TrendingUp,
      tone: "amber",
    },
    {
      label: "Actualizări recente",
      value: recent.length,
      detail: "intrări revizuite",
      focusTitle: "Activitate recentă",
      focusDescription: "Cele mai noi modificări sunt pregătite pentru verificare.",
      icon: Activity,
      tone: "rose",
    },
  ];
  const highlighted = metrics.find(
    (metric) => metric.label === highlightedMetric,
  );

  return (
    <>
      <section className="admin-welcome">
        <div>
          <span className="admin-eyebrow">UN ORAȘ MAI ACCESIBIL, ÎMPREUNĂ</span>
          <h1>
            Dashboard - AccesUrban Map<span>.</span>
          </h1>
          <p>O privire rapidă asupra accesului din oraș și a calității informațiilor.</p>
          <Button asChild>
            <Link to="/map">
              Deschide harta <ArrowUpRight />
            </Link>
          </Button>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-ring ring-one" />
          <div className="art-ring ring-two" />
          <div className="art-path" />
          <span className="art-pin art-pin-one">
            <MapPin />
          </span>
          <span className="art-pin art-pin-two">
            <CheckCheck />
          </span>
          <div className="art-center">
            <ShieldCheck size={43} strokeWidth={1.4} />
          </div>
          <span className="art-caption">Chișinău fără bariere</span>
        </div>
      </section>

      <div
        className="admin-stats"
        onMouseLeave={() => setHighlightedMetric(null)}
      >
        {metrics.map((item) => (
          <motion.div
            className="dashboard-metric"
            key={item.label}
            whileHover={{ y: -5 }}
            whileTap={{ scale: 0.985 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onHoverStart={() => setHighlightedMetric(item.label)}
          >
            <Card className="stat-card">
              <div>
                <span>{item.label}</span>
                <motion.i
                  className={`stat-icon ${item.tone}`}
                  whileHover={{ rotate: 8, scale: 1.08 }}
                  transition={{ duration: 0.2 }}
                >
                  <item.icon size={20} />
                </motion.i>
              </div>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="overview-grid">
        <Card className="admin-panel distribution-panel">
          <div className="panel-title">
            <div>
              <h2>Profilul de accesibilitate</h2>
              <p>Împărțirea punctelor după datele disponibile</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="distribution-content">
            <motion.div
              className="access-donut"
              style={{
                background: places.length
                  ? `conic-gradient(${gradient})`
                  : "#e0e4e5",
              }}
              role="img"
              aria-label={distribution
                .map((item) => `${item.label}: ${item.count}`)
                .join(", ")}
              initial={{ opacity: 0, scale: 0.88, rotate: -8 }}
              animate={{ opacity: 1, scale: 1, rotate: -1 }}
              whileHover={{ scale: 1.035, rotate: 0 }}
              transition={{ duration: 0.75, ease: "easeOut" }}
            >
              <div>
                <strong>{places.length}</strong>
                <span>puncte</span>
              </div>
            </motion.div>
            <div className="distribution-legend">
              {distribution.map((item) => (
                <div key={item.key}>
                  <span className="legend-dot" style={{ background: item.color }} />
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="admin-panel dashboard-insight-panel">
          <div className="panel-title">
            <div>
              <h2>Semnalul zilei</h2>
              <p>Calitatea informațiilor urmărite în dashboard</p>
            </div>
            <span className="dashboard-live-indicator">
              <span /> Live
            </span>
          </div>
          <div className="dashboard-insight-copy">
            <motion.span
              className="dashboard-insight-icon"
              animate={{
                scale: highlighted ? 1.06 : 1,
                rotate: highlighted ? 3 : 0,
              }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Sparkles size={20} />
            </motion.span>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={highlighted?.label ?? "overview"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                <strong>
                  {highlighted?.focusTitle ?? `${completion}% informații confirmate`}
                </strong>
                <p>
                  {highlighted?.focusDescription ??
                    "Fiecare actualizare clară ajută la o decizie mai sigură."}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="dashboard-progress" aria-label={`${completion}% informații confirmate`}>
            <motion.span
              initial={{ width: 0 }}
              animate={{ width: `${completion}%` }}
              transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            />
          </div>
          <div className="dashboard-insight-list">
            <div>
              <span>Scor mediu</span>
              <strong>{averageScore}/100</strong>
            </div>
            <div>
              <span>Acces bun</span>
              <strong>{accessible}</strong>
            </div>
          </div>
        </Card>
      </div>

      <div className="overview-grid">
        <Card className="admin-panel">
          <div className="panel-title">
            <div>
              <h2>Actualizări recente</h2>
              <p>Ultimele informații revizuite</p>
            </div>
            <Activity size={20} />
          </div>
          {recent.length ? (
            <div className="recent-places">
              {recent.map((place) => {
                const score = evaluateAccessibility(place.accessibility);
                return (
                  <Link
                    className="recent-place"
                    to="/map"
                    search={{ place: place.id }}
                    key={place.id}
                  >
                    <span
                      className="place-letter"
                      style={{
                        background: `${statusMeta[place.status as AccessibilityStatus].color}16`,
                        color: statusMeta[place.status as AccessibilityStatus].color,
                      }}
                    >
                      <MapPin size={21} />
                    </span>
                    <div>
                      <strong>{place.name}</strong>
                      <span>{place.category}</span>
                    </div>
                    <b>
                      {score.known ? score.score : "—"}
                      <small>/100</small>
                    </b>
                  </Link>
                );
              })}
            </div>
          ) : (
            <EmptyState title="Nu există actualizări încă">
              Datele noi vor apărea aici.
            </EmptyState>
          )}
        </Card>

        <Card className="admin-panel dashboard-status-panel">
          <div className="panel-title">
            <div>
              <h2>Starea datelor</h2>
              <p>Indicatori pentru următoarea verificare</p>
            </div>
            <TrendingUp size={20} />
          </div>
          <div className="dashboard-status-list">
            <div>
              <span className="dashboard-status-mark is-good" />
              <span>Acces bun</span>
              <strong>{accessible}</strong>
            </div>
            <div>
              <span className="dashboard-status-mark is-warn" />
              <span>Informații parțiale</span>
              <strong>{distribution.find((item) => item.key === "partial")?.count ?? 0}</strong>
            </div>
            <div>
              <span className="dashboard-status-mark is-alert" />
              <span>Necesită atenție</span>
              <strong>{needsReview}</strong>
            </div>
          </div>
          <div className="dashboard-status-note">
            <CheckCheck size={17} />
            Actualizează informațiile care au nevoie de confirmare.
          </div>
        </Card>
      </div>
    </>
  );
}
