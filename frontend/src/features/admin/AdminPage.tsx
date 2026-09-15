import { useState } from "react";
import { Link, useSearch } from "@tanstack/react-router";
import {
  LayoutDashboard,
  MapPin,
  Flag,
  UsersRound,
  Accessibility,
  Camera,
  Eye,
  ArrowUpRight,
  LogOut,
  ShieldCheck,
  Search,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { usePlaces, useReports, useUsers } from "../../hooks/useAppData";
import { logoutMockUser } from "../../stores/authStore";
import type { MockUser } from "../../stores/authStore";
import { reportStatusLabels, reportTypeLabels } from "../../stores/reportStore";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import type { MockReport } from "../../stores/reportStore";
import { Overview } from "./Overview";
import { PlacesManager } from "./PlacesManager";
import { ReportsManager } from "./ReportsManager";
import { EmptyState, formatDate } from "./AdminShared";
import { normalizeSearch } from "../../utils/accessibility";
import logo from "../../assets/accessurban-accessibility-logo-clean.png";
import type { AdminTab } from "../../app/routes/admin";
import "../reports/Reports.css";
import "./AdminPage.css";

const navigation: { tab: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "overview", label: "Dashboard", icon: LayoutDashboard },
  { tab: "places", label: "Date", icon: MapPin },
  { tab: "reports", label: "Verificări", icon: Flag },
  { tab: "community", label: "Conturi", icon: UsersRound },
];

const accessibilityProfileLabels: Record<
  MockUser["accessibilityProfile"],
  string
> = {
  WHEELCHAIR: "Scaun rulant",
  WALKING_AID: "Dispozitiv de mers",
  VISUAL_IMPAIRMENT: "Deficiență de vedere",
};

type AccountReportStats = {
  total: number;
  photos: number;
  pending: number;
  approved: number;
  rejected: number;
};

export function AdminPage() {
  const user = useCurrentUser();
  if (!user || user.role !== "ADMIN")
    return (
      <div className="admin-access">
        <ShieldCheck size={44} />
        <h1>
          {user
            ? "Acces pentru administrator"
            : "Conectează-te pentru administrare"}
        </h1>
        <p>
          {user
            ? "Contul tău poate consulta harta și raporta probleme. Administrarea este disponibilă contului de administrator."
            : "Folosește contul de administrator pentru a gestiona catalogul și semnalele."}
        </p>
        <Button asChild>
          <Link to={user ? "/map" : "/conectare"}>
            {user ? "Deschide harta" : "Conectează-te"}
          </Link>
        </Button>
        <Link to="/home">Înapoi la pagina principală</Link>
      </div>
    );
  return <AdminWorkspace />;
}
function AdminWorkspace() {
  const { tab } = useSearch({ from: "/admin" });
  const user = useCurrentUser()!;
  const placesQuery = usePlaces();
  const reportsQuery = useReports();
  const usersQuery = useUsers();
  const places = placesQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<MockUser | null>(null);
  const pendingCount = reports.filter(
    (report) => report.status === "PENDING",
  ).length;
  const error = placesQuery.error || reportsQuery.error || usersQuery.error;
  const users = (usersQuery.data ?? []).filter((person) =>
    normalizeSearch(`${person.name} ${person.email}`).includes(
      normalizeSearch(userSearch),
    ),
  );
  const reportStats = new Map<
    string,
    AccountReportStats
  >();
  reports.forEach((report) => {
    const current = reportStats.get(report.userId) ?? {
      total: 0,
      photos: 0,
      pending: 0,
      approved: 0,
      rejected: 0,
    };
    current.total += 1;
    current.photos += report.photoUrl ? 1 : 0;
    current[report.status.toLowerCase() as "pending" | "approved" | "rejected"] += 1;
    reportStats.set(report.userId, current);
  });
  return (
    <div className="admin-shell">
      <a href="#admin-content" className="skip-link">
        Sari la conținut
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Închide meniul"
        />
      )}
      <aside className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}>
        <Link to="/home" className="admin-brand">
          <img src={logo} alt="" />
          <div>
            <strong>AccesUrban Map</strong>
            <span>Chișinău fără bariere</span>
          </div>
        </Link>
        <nav aria-label="Dashboard">
          {navigation.map((item) => (
            <Link
              key={item.tab}
              to="/admin"
              search={{ tab: item.tab }}
              className={`admin-nav-item ${tab === item.tab ? "active" : ""}`}
              aria-current={tab === item.tab ? "page" : undefined}
              onClick={() => {
                setMenuOpen(false);
              }}
            >
              <item.icon size={19} />
              <span>{item.label}</span>
              {item.tab === "reports" && pendingCount > 0 && (
                <b>{pendingCount}</b>
              )}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="sidebar-help-icon">
              <AdminStatusMark />
            </span>
            <div className="sidebar-help-copy">
              <strong>O hartă pentru toți.</strong>
              <Link to="/map">
                Deschide harta <ArrowUpRight size={15} />
              </Link>
            </div>
          </div>
          <Link className="back-to-site" to="/home">
            <ArrowLeft size={17} />
            Înapoi la site
          </Link>
          <div className="sidebar-account">
            <span className="admin-avatar">AU</span>
            <div>
              <strong>{user.name}</strong>
              <small>Administrator</small>
            </div>
            <button
              onClick={logoutMockUser}
              aria-label="Deconectare administrator"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
      <div className="admin-main-wrap">
        <header className="admin-topbar">
          <div className="admin-breadcrumb">
            <Button
              className="admin-menu-toggle"
              variant="ghost"
              size="icon"
              aria-label={menuOpen ? "Închide meniul" : "Deschide meniul"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </Button>
            <span>Administrare</span>
          </div>
          <div className="admin-top-actions">
            <Button asChild variant="outline" size="sm">
              <Link to="/map">
                Vezi harta <ArrowUpRight />
              </Link>
            </Button>
          </div>
        </header>
        <main id="admin-content" className="admin-main">
          {tab === "overview" && (
            <div className="admin-page-heading">
              <h2>Dashboard</h2>
            </div>
          )}
          {error ? (
            <div className="admin-error" role="alert">
              <h2>Datele nu au putut fi încărcate</h2>
              <p>{error.message}</p>
              <Button
                onClick={() => {
                  void placesQuery.refetch();
                  void reportsQuery.refetch();
                  void usersQuery.refetch();
                }}
              >
                Încearcă din nou
              </Button>
            </div>
          ) : placesQuery.isPending ||
            reportsQuery.isPending ||
            usersQuery.isPending ? (
            <div className="admin-loading" role="status">
              Se încarcă datele…
            </div>
          ) : (
            <>
              {tab === "overview" && (
                <Overview places={places} />
              )}
              {tab === "places" && <PlacesManager places={places} />}
              {tab === "reports" && (
                <ReportsManager reports={reports} places={places} />
              )}
              {tab === "community" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Oameni care fac diferența</h2>
                      <p>
                        Conturile înregistrate și contribuțiile lor în acest
                        browser.
                      </p>
                    </div>
                    <span className="pending-label">
                      {usersQuery.data?.length ?? 0} conturi
                    </span>
                  </div>
                  <Card className="admin-panel">
                    <div className="admin-filters">
                      <div className="search-control">
                        <Search size={17} />
                        <Input
                          value={userSearch}
                          onChange={(e) => setUserSearch(e.target.value)}
                          aria-label="Caută utilizatori"
                          placeholder="Caută după nume sau email…"
                        />
                      </div>
                    </div>
                    <div className="table-scroll">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Utilizator</th>
                            <th>Rol</th>
                            <th>Necesitate de acces</th>
                            <th>Înregistrat</th>
                            <th>Rapoarte</th>
                            <th>Imagini</th>
                            <th><span className="sr-only">Acțiuni</span></th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.map((person) => (
                            <tr key={person.id} className="account-row">
                              <td>
                                <div className="account-person">
                                  {person.avatarUrl ? (
                                    <img
                                      className="account-avatar-image"
                                      src={person.avatarUrl}
                                      alt=""
                                    />
                                  ) : (
                                    <span className="account-avatar-fallback">
                                      {person.name.slice(0, 1).toUpperCase()}
                                    </span>
                                  )}
                                  <span>
                                    <strong>{person.name}</strong>
                                    <small>{person.email}</small>
                                  </span>
                                </div>
                              </td>
                              <td>
                                <span>
                                  {person.role === "ADMIN"
                                    ? "Administrator"
                                    : "Utilizator"}
                                </span>
                              </td>
                              <td>
                                <span className="account-profile">
                                  <Accessibility size={16} />
                                  {accessibilityProfileLabels[
                                    person.accessibilityProfile
                                  ]}
                                </span>
                                <small>Profil declarat</small>
                              </td>
                              <td>
                                <span>{formatDate(person.createdAt)}</span>
                              </td>
                              <td>
                                <strong className="account-stat-value">
                                  {reportStats.get(person.id)?.total ?? 0}
                                </strong>
                                <small>
                                  {reportStats.get(person.id)?.pending ?? 0} în așteptare · {reportStats.get(person.id)?.approved ?? 0} aprobate
                                </small>
                              </td>
                              <td>
                                <span className="account-media-stat">
                                  <Camera size={15} />
                                  {reportStats.get(person.id)?.photos ?? 0}
                                </span>
                                <small>atașate rapoartelor</small>
                              </td>
                              <td>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Vezi detaliile contului ${person.name}`}
                                  onClick={() => setSelectedAccount(person)}
                                >
                                  <Eye size={17} />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {!users.length && (
                      <EmptyState title="Niciun utilizator găsit">
                        Încearcă un alt nume sau email.
                      </EmptyState>
                    )}
                  </Card>
                  <Dialog
                    open={!!selectedAccount}
                    onOpenChange={(open) => {
                      if (!open) setSelectedAccount(null);
                    }}
                  >
                    <DialogContent className="admin-dialog account-review">
                      <DialogHeader>
                        <DialogTitle>
                          {selectedAccount?.name}
                        </DialogTitle>
                        <DialogDescription>
                          {selectedAccount?.email} · detalii de activitate
                        </DialogDescription>
                      </DialogHeader>
                      {selectedAccount && (
                        <AccountDetails
                          user={selectedAccount}
                          reports={reports.filter(
                            (report) => report.userId === selectedAccount.id,
                          )}
                          stats={reportStats.get(selectedAccount.id)}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                </>
              )}
            </>
          )}
          <footer className="admin-footer">
            <span>© {new Date().getFullYear()} AccesUrban Map</span>
            <span>Creat pentru un oraș mai accesibil.</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function AdminStatusMark() {
  return <ShieldCheck size={24} strokeWidth={1.5} />;
}

function AccountDetails({
  user,
  reports,
  stats,
}: {
  user: MockUser;
  reports: MockReport[];
  stats?: AccountReportStats;
}) {
  return (
    <div className="account-details">
      <div className="account-detail-summary">
        <div className="account-detail-profile">
          <span className="account-avatar-fallback">
            {user.name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{accessibilityProfileLabels[user.accessibilityProfile]}</strong>
            <small>Necesitatea de acces declarată la cont</small>
          </div>
        </div>
        <div className="account-detail-stat">
          <strong>{stats?.total ?? 0}</strong>
          <small>rapoarte trimise</small>
        </div>
        <div className="account-detail-stat">
          <strong>{stats?.photos ?? 0}</strong>
          <small>fotografii atașate</small>
        </div>
      </div>
      <div className="account-details-heading">
        <strong>Activitatea contului</strong>
        <span>{reports.length} intrări</span>
      </div>
      {reports.length ? (
        <div className="account-report-list">
          {reports.map((report) => (
            <article key={report.id} className="account-report-item">
              <div>
                <strong>{report.placeName}</strong>
                <span>
                  {reportTypeLabels[report.type]} · {formatDate(report.createdAt)}
                </span>
                <small>
                  {reportStatusLabels[report.status]} · {report.photoUrl ? "Fotografie atașată" : "Fără fotografie"}
                </small>
              </div>
              {report.photoUrl && (
                <a
                  href={report.photoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="account-report-photo"
                >
                  <img src={report.photoUrl} alt="Fotografia raportului" />
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-note">Acest cont nu are încă rapoarte trimise.</p>
      )}
    </div>
  );
}
