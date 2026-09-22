import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Check,
  X,
  Search,
  Image,
  ExternalLink,
  MessageSquare,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import {
  moderateApiReport,
  reportTypeLabels,
  reportStatusLabels,
  type AppReport,
  type AppReportStatus,
} from "../../services/reportsApi";
import type { MapPlace } from "../../types/place";
import { normalizeSearch } from "../../utils/accessibility";
import { StatusBadge, EmptyState, Pagination, formatDate } from "./AdminShared";
import { ErrorPopup } from "../../components/ErrorPopup";

export function ReportsManager({
  reports,
  places,
}: {
  reports: AppReport[];
  places: MapPlace[];
}) {
  const [status, setStatus] = useState<AppReportStatus | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState("");
  const queryClient = useQueryClient();
  const selected = reports.find((report) => report.id === selectedId);
  const mutation = useMutation({
    mutationFn: async (decision: "APPROVED" | "REJECTED") =>
      moderateApiReport(selectedId!, decision, note),
    onSuccess: (report) => {
      void queryClient.invalidateQueries({ queryKey: ["reports"] });
      void queryClient.invalidateQueries({ queryKey: ["public-reports"] });
      setSelectedId(null);
      setNotice(
        report.status === "APPROVED"
          ? "Raport aprobat. Obstacolul este acum vizibil pe hartă."
          : "Raport respins. Utilizatorul poate vedea motivul în rapoartele sale.",
      );
    },
  });
  const filtered = reports.filter(
    (report) =>
      (!status || report.status === status) &&
      normalizeSearch(
        `${report.placeName} ${report.description} ${report.userName}`,
      ).includes(normalizeSearch(search)),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Fiecare verificare contează</h2>
          <p>Verifică semnalele trimise și oferă un răspuns clar.</p>
        </div>
        <span className="pending-label">
          {reports.filter((r) => r.status === "PENDING").length} în așteptare
        </span>
      </div>
      {notice && (
        <p className="admin-notice" role="status">
          {notice}
        </p>
      )}
      <div
        className="report-tabs"
        role="group"
        aria-label="Statusul rapoartelor"
      >
        {[["", "Toate"], ...Object.entries(reportStatusLabels)].map(
          ([value, label]) => (
            <button
              type="button"
              className={status === value ? "active" : ""}
              aria-pressed={status === value}
              key={value}
              onClick={() => {
                setStatus(value as AppReportStatus | "");
                setPage(1);
              }}
            >
              {label}
              <span>
                {reports.filter((r) => !value || r.status === value).length}
              </span>
            </button>
          ),
        )}
      </div>
      <Card className="admin-panel">
        <div className="admin-filters">
          <div className="search-control">
            <Search size={17} />
            <Input
              aria-label="Caută verificări"
              placeholder="Caută problema sau descrierea…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Problema raportată</th>
                <th>Trimis de</th>
                <th>Stare</th>
                <th>Data</th>
                <th>
                  <span className="sr-only">Acțiune</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 8, currentPage * 8)
                .map((report) => (
                  <tr key={report.id}>
                    <td>
                      <strong>
                        {reportTypeLabels[report.type]}{" "}
                        {report.photoUrl && (
                          <Image size={14} aria-label="Include fotografie" />
                        )}
                      </strong>
                      <span>{report.placeName}</span>
                    </td>
                    <td>
                      <span>{report.userName}</span>
                    </td>
                    <td>
                      <StatusBadge status={report.status} />
                    </td>
                    <td>
                      <small>{formatDate(report.createdAt)}</small>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedId(report.id);
                          setNote(report.moderatorNote);
                          mutation.reset();
                        }}
                      >
                        {report.status === "PENDING"
                          ? "Verifică"
                          : "Vezi detalii"}
                      </Button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState
            title={
              reports.length
                ? "Niciun raport pentru aceste filtre"
                : "Momentan, niciun raport"
            }
          >
            Problemele trimise din hartă vor apărea aici, împreună cu
            fotografiile.
          </EmptyState>
        )}
        <Pagination
          page={currentPage}
          count={filtered.length}
          onChange={setPage}
        />
      </Card>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
      >
        <DialogContent className="admin-dialog report-review">
          <DialogHeader>
            <DialogTitle>
              {selected && reportTypeLabels[selected.type]}
            </DialogTitle>
            <DialogDescription>{selected?.placeName}</DialogDescription>
          </DialogHeader>
          {selected && (
            <>
              <div className="report-review-meta">
                <StatusBadge status={selected.status} />
                <span>
                  {selected.userName} · {formatDate(selected.createdAt)}
                </span>
                {selected.position && (
                  <span>
                    {selected.position[0].toFixed(5)}, {selected.position[1].toFixed(5)}
                  </span>
                )}
              </div>
              <p className="report-description">{selected.description}</p>
              {selected.photoUrl ? (
                <a
                  href={selected.photoUrl}
                  download={`raport-${selected.id}.png`}
                  className="review-photo"
                >
                  <img
                    src={selected.photoUrl}
                    alt={`Problema raportată la ${selected.placeName}`}
                  />
                  <span>Descarcă fotografia originală</span>
                </a>
              ) : (
                <p className="muted-note">Nu a fost atașată o fotografie.</p>
              )}
              {places.some((place) => place.id === selected.placeId) ? (
                <Button asChild variant="outline">
                  <Link to="/map" search={{ place: selected.placeId ?? undefined }}>
                    <ExternalLink />
                    Vezi locația pe hartă
                  </Link>
                </Button>
              ) : selected.position ? (
                <Button asChild variant="outline">
                  <Link
                    to="/map"
                    search={{ lat: selected.position[0], lng: selected.position[1] }}
                  >
                    <ExternalLink />
                    Vezi punctul pe hartă
                  </Link>
                </Button>
              ) : (
                <p className="muted-note">
                  Locația a fost eliminată. Raportul este păstrat în istoric.
                </p>
              )}
              {selected.status === "PENDING" ? (
                <>
                  <div className="field">
                    <Label htmlFor="moderator-note">
                      <MessageSquare size={16} />
                      Mesaj pentru utilizator
                    </Label>
                    <Textarea
                      id="moderator-note"
                      maxLength={1000}
                      rows={3}
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Obligatoriu pentru respingere. Explică decizia pe scurt."
                    />
                  </div>
                  <p className="muted-note">
                    Aprobarea publică problema în detaliile locației.
                    Facilitățile se actualizează separat, după verificare.
                  </p>
                  {mutation.error && (
                    <ErrorPopup error={mutation.error} />
                  )}
                  <DialogFooter>
                    <Button
                      variant="outline"
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate("REJECTED")}
                    >
                      <X />
                      Respinge raportul
                    </Button>
                    <Button
                      disabled={mutation.isPending}
                      onClick={() => mutation.mutate("APPROVED")}
                    >
                      <Check />
                      Aprobă raportul
                    </Button>
                  </DialogFooter>
                </>
              ) : (
                <div className="moderator-note">
                  <strong>Decizie din {formatDate(selected.updatedAt)}</strong>
                  <p>
                    {selected.moderatorNote ||
                      "Raport verificat de administrator."}
                  </p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
