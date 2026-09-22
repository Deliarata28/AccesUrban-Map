import { Link } from "@tanstack/react-router";
import { Flag, MapPin } from "lucide-react";
import { Header } from "../../components/Header";
import { Footer } from "../../components/Footer";
import { Button } from "../../components/ui/button";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useReports, usePlaces } from "../../hooks/useAppData";
import { reportTypeLabels } from "../../services/reportsApi";
import { StatusBadge, formatDate } from "../admin/AdminShared";
import { ErrorPopup } from "../../components/ErrorPopup";
import "./Reports.css";
export function MyReportsPage() {
  const user = useCurrentUser();
  const reports = useReports();
  const places = usePlaces();
  return (
    <div className="my-reports-page">
      <Header />
      <main className="my-reports-main">
        <h1>Rapoartele mele</h1>
        <p>Urmărește problemele semnalate și răspunsurile administratorului.</p>
        <Button asChild variant="outline">
          <Link to="/map">
            <MapPin />
            Înapoi la hartă
          </Link>
        </Button>
        {!user ? (
          <div className="my-report">
            <p>Conectează-te pentru a vedea rapoartele tale.</p>
            <Button asChild>
              <Link to="/conectare">Conectează-te</Link>
            </Button>
          </div>
        ) : reports.isPending ? (
          <p role="status">Se încarcă rapoartele…</p>
        ) : reports.error ? (
          <ErrorPopup error={reports.error} />
        ) : (
          <div className="my-reports-list">
            {!(reports.data ?? []).filter((r) => r.userId === user.id)
              .length && (
              <div className="my-report">
                <Flag size={25} />
                <h2>Încă nu ai trimis rapoarte</h2>
                <p>
                  Alege o locație pe hartă și apasă „Raportează o problemă”.
                </p>
              </div>
            )}
            {(reports.data ?? [])
              .filter((r) => r.userId === user.id)
              .map((report) => (
                <article className="my-report" key={report.id}>
                  <div className="my-report-header">
                    <h2>{reportTypeLabels[report.type]}</h2>
                    <StatusBadge status={report.status} />
                  </div>
                  <p>{report.placeName}</p>
                  <small>{formatDate(report.createdAt)}</small>
                  <p>{report.description}</p>
                  {report.photoUrl && (
                    <img
                      src={report.photoUrl}
                      alt={`Fotografie atașată: ${reportTypeLabels[report.type]}`}
                    />
                  )}
                  {report.status !== "PENDING" && (
                    <div className="moderator-note">
                      <strong>Răspunsul administratorului</strong>
                      <p>
                        {report.moderatorNote || "Raportul a fost aprobat."}
                      </p>
                      <small>{formatDate(report.updatedAt)}</small>
                    </div>
                  )}
                  {places.data?.some(
                    (place) => place.id === report.placeId,
                  ) ? (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/map" search={{ place: report.placeId ?? undefined }}>
                        Vezi locația
                      </Link>
                    </Button>
                  ) : report.position ? (
                    <Button asChild variant="outline" size="sm">
                      <Link
                        to="/map"
                        search={{ lat: report.position[0], lng: report.position[1] }}
                      >
                        Vezi punctul raportat
                      </Link>
                    </Button>
                  ) : null}
                </article>
              ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
