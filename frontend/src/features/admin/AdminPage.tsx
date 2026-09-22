import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
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
  Pencil,
  Trash2,
  KeyRound,
  Plus,
  Mail,
  UserRound,
} from "lucide-react";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import { useContactMessages, usePlaces, useReports, useUsers } from "../../hooks/useAppData";
import { logoutUser, type AppUser } from "../../stores/sessionStore";
import { reportStatusLabels, reportTypeLabels, type AppReport } from "../../services/reportsApi";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Overview } from "./Overview";
import { PlacesManager } from "./PlacesManager";
import { ReportsManager } from "./ReportsManager";
import { EmptyState, formatDate } from "./AdminShared";
import { normalizeSearch } from "../../utils/accessibility";
import { deleteApiUser, resetApiUserPassword } from "../../services/usersApi";
import { AccountEditor } from "./AccountEditor";
import { MessagesManager } from "./MessagesManager";
import { ErrorPopup } from "../../components/ErrorPopup";
import logo from "../../assets/accessurban-accessibility-logo-clean.png";
import type { AdminTab } from "../../app/routes/admin";
import "../reports/Reports.css";
import "./AdminPage.css";

const navigation: { tab: AdminTab; label: string; icon: typeof LayoutDashboard }[] = [
  { tab: "overview", label: "Dashboard", icon: LayoutDashboard },
  { tab: "places", label: "Date", icon: MapPin },
  { tab: "reports", label: "Verificări", icon: Flag },
  { tab: "messages", label: "Mesaje", icon: Mail },
  { tab: "community", label: "Conturi", icon: UsersRound },
];

const accessibilityProfileLabels: Record<
  AppUser["accessibilityProfile"],
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
  const navigate = useNavigate();
  const user = useCurrentUser()!;
  const placesQuery = usePlaces();
  const reportsQuery = useReports();
  const usersQuery = useUsers();
  const messagesQuery = useContactMessages();
  const places = placesQuery.data ?? [];
  const reports = reportsQuery.data ?? [];
  const [menuOpen, setMenuOpen] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<AppUser | null>(null);
  const [editingAccount, setEditingAccount] = useState<AppUser | "new" | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<AppUser | null>(null);
  const [removingAccount, setRemovingAccount] = useState<AppUser | null>(null);
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const pendingCount = reports.filter(
    (report) => report.status === "PENDING",
  ).length;
  const error = placesQuery.error || reportsQuery.error || usersQuery.error;
  const messageError = messagesQuery.error;
  const accountDeletion = useMutation({
    mutationFn: deleteApiUser,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      setSelectedAccount(null);
      setRemovingAccount(null);
      setNotice("Contul a fost șters.");
    },
  });
 const users = (usersQuery.data ?? []).filter((person) =>
    person.role !== "ADMIN" &&
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
  const removingAccountReportCount = removingAccount
    ? reportStats.get(removingAccount.id)?.total ?? 0
    : 0;
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
              {item.tab === "messages" && (messagesQuery.data?.filter((message) => message.status === "New").length ?? 0) > 0 && (
                <b>{messagesQuery.data?.filter((message) => message.status === "New").length}</b>
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
          <Link className="back-to-site admin-profile-link" to="/profil">
            <UserRound size={17} />
            Profilul meu
          </Link>
          <div className="sidebar-account">
            <span className="admin-avatar">AU</span>
            <div>
              <strong>{user.name}</strong>
              <small>Administrator</small>
            </div>
            <button
              onClick={() => {
                logoutUser();
                void navigate({ to: "/conectare" });
              }}
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
          {error || messageError ? (
            <div className="admin-error" role="alert">
              <ErrorPopup error={error || messageError} />
              <h2>Datele nu au putut fi încărcate</h2>
              <Button
                onClick={() => {
                  void placesQuery.refetch();
                  void reportsQuery.refetch();
                  void usersQuery.refetch();
                  void messagesQuery.refetch();
                }}
              >
                Încearcă din nou
              </Button>
            </div>
          ) : placesQuery.isPending ||
            reportsQuery.isPending ||
            usersQuery.isPending ||
            messagesQuery.isPending ? (
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
              {tab === "messages" && (
                <MessagesManager messages={messagesQuery.data ?? []} />
              )}
              {tab === "community" && (
                <>
                  <div className="section-heading">
                    <div>
                      <h2>Oameni care fac diferența</h2>
                      <p>
                        Conturile înregistrate și contribuțiile lor în
                        platformă.
                      </p>
                    </div>
                    <div className="section-heading-actions">
                      <span className="pending-label">
                        {users.length} utilizatori
                      </span>
                      <Button onClick={() => setEditingAccount("new")}>
                        <Plus />
                        Adaugă cont
                      </Button>
                    </div>
                  </div>
                  {notice && (
                    <p className="admin-notice" role="status">
                      {notice}
                    </p>
                  )}
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
                                <div className="row-actions">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Vezi detaliile contului ${person.name}`}
                                    onClick={() => setSelectedAccount(person)}
                                  >
                                    <Eye size={17} />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Editează contul ${person.name}`}
                                    onClick={() => {
                                      setSelectedAccount(null);
                                      setEditingAccount(person);
                                    }}
                                  >
                                    <Pencil size={17} />
                                  </Button>
                                  {person.id !== user.id && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Resetează parola contului ${person.name}`}
                                        onClick={() => {
                                          setSelectedAccount(null);
                                          setPasswordTarget(person);
                                        }}
                                      >
                                        <KeyRound size={17} />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        aria-label={`Șterge contul ${person.name}`}
                                        onClick={() => {
                                          accountDeletion.reset();
                                          setSelectedAccount(null);
                                          setRemovingAccount(person);
                                        }}
                                      >
                                        <Trash2 size={17} />
                                      </Button>
                                    </>
                                  )}
                                </div>
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
                  {editingAccount && (
                    <AccountEditor
                      key={editingAccount === "new" ? "new" : editingAccount.id}
                      account={editingAccount === "new" ? undefined : editingAccount}
                      currentUserId={user.id}
                      onClose={() => setEditingAccount(null)}
                      onSaved={(savedAccount) => {
                        const wasNewAccount = editingAccount === "new";
                        setEditingAccount(null);
                        setNotice(
                          wasNewAccount
                            ? `Contul „${savedAccount.name}” a fost creat.`
                            : `Contul „${savedAccount.name}” a fost actualizat.`,
                        );
                      }}
                    />
                  )}
                  {passwordTarget && (
                    <AccountPasswordReset
                      key={passwordTarget.id}
                      account={passwordTarget}
                      onClose={() => setPasswordTarget(null)}
                      onSaved={() => {
                        setPasswordTarget(null);
                        setNotice(`Parola contului „${passwordTarget.name}” a fost resetată.`);
                      }}
                    />
                  )}
                  <Dialog
                    open={!!removingAccount}
                    onOpenChange={(open) => {
                      if (!open && !accountDeletion.isPending) setRemovingAccount(null);
                    }}
                  >
                    <DialogContent className="admin-dialog">
                      <DialogHeader>
                        <DialogTitle>
                          {removingAccountReportCount > 0 && removingAccount
                            ? "Contul are rapoarte păstrate în istoric"
                            : "Ștergi acest cont?"}
                        </DialogTitle>
                        <DialogDescription>
                          {removingAccountReportCount > 0 && removingAccount
                            ? `„${removingAccount.name}” nu poate fi șters deoarece a trimis rapoarte. Păstrăm istoricul contribuțiilor.`
                            : `„${removingAccount?.name}” va fi eliminat definitiv din platformă.`}
                        </DialogDescription>
                      </DialogHeader>
                      {accountDeletion.error && (
                        <ErrorPopup error={accountDeletion.error} />
                      )}
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setRemovingAccount(null)}
                          disabled={accountDeletion.isPending}
                        >
                          {removingAccountReportCount > 0
                            ? "Închide"
                            : "Păstrează contul"}
                        </Button>
                        {removingAccount && removingAccountReportCount === 0 && (
                          <Button
                            variant="destructive"
                            disabled={accountDeletion.isPending}
                            onClick={() => accountDeletion.mutate(removingAccount.id)}
                          >
                            <Trash2 />
                            {accountDeletion.isPending ? "Se șterge…" : "Șterge contul"}
                          </Button>
                        )}
                      </DialogFooter>
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
  user: AppUser;
  reports: AppReport[];
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

function AccountPasswordReset({
  account,
  onClose,
  onSaved,
}: {
  account: AppUser;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [validationError, setValidationError] = useState("");
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => resetApiUserPassword(account.id, newPassword),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["users"] });
      onSaved();
    },
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setValidationError("");

    if (newPassword.length < 8) {
      setValidationError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }

    if (newPassword !== confirmation) {
      setValidationError("Cele două parole nu coincid.");
      return;
    }

    mutation.mutate();
  };

  const error = validationError || (mutation.error instanceof Error ? mutation.error.message : "");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="admin-dialog password-reset-dialog">
        <DialogHeader>
          <DialogTitle>Resetează parola</DialogTitle>
          <DialogDescription>
            Setezi o parolă nouă pentru contul „{account.name}”. Parola veche nu este afișată.
          </DialogDescription>
        </DialogHeader>
        <form className="admin-form" onSubmit={submit}>
          <div className="field">
            <Label htmlFor="reset-account-password">Parolă nouă</Label>
            <Input
              id="reset-account-password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              autoComplete="new-password"
            />
          </div>
          <div className="field">
            <Label htmlFor="reset-account-password-confirmation">Confirmă parola nouă</Label>
            <Input
              id="reset-account-password-confirmation"
              type="password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={8}
              maxLength={100}
              required
              autoComplete="new-password"
            />
          </div>
          <p className="form-hint">
            În baza de date se păstrează doar hash-ul parolei, nu parola scrisă aici.
          </p>
          {error && (
            <ErrorPopup message={error} error={mutation.error} />
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Anulează
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              <KeyRound />
              {mutation.isPending ? "Se resetează…" : "Resetează parola"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
