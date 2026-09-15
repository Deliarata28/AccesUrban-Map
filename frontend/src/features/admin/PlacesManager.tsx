import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Search,
  Pencil,
  Trash2,
  ExternalLink,
  ArrowDownUp,
  Plus,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Card } from "../../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import type { MapPlace } from "../../types/place";
import {
  placeCategories,
  sourceLabels,
  statusMeta,
} from "../../config/accessibility";
import { filterPlaces, evaluateAccessibility } from "../../utils/accessibility";
import { deleteMockPlace } from "../../stores/placeStore";
import { StatusBadge, EmptyState, Pagination, formatDate } from "./AdminShared";
import { PlaceEditor } from "./PlaceEditor";
import { ChoiceMenu } from "../../components/ChoiceMenu";

export function PlacesManager({
  places,
  startAdding = false,
}: {
  places: MapPlace[];
  startAdding?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<"updated" | "name" | "score">("updated");
  const [editing, setEditing] = useState<MapPlace | "new" | null>(
    startAdding ? "new" : null,
  );
  const [removing, setRemoving] = useState<MapPlace | null>(null);
  const [notice, setNotice] = useState("");
  const deletion = useMutation({
    mutationFn: async (id: string) => deleteMockPlace(id),
    onSuccess: () => {
      setRemoving(null);
      setNotice(
        "Intrarea a fost ștearsă de pe hartă. Semnalele existente rămân în istoric.",
      );
    },
  });
  const filtered = filterPlaces(places, { search, category, status }).sort(
    (a, b) =>
      sort === "name"
        ? a.name.localeCompare(b.name, "ro")
        : sort === "score"
          ? evaluateAccessibility(b.accessibility).score -
            evaluateAccessibility(a.accessibility).score
          : b.updatedAt.localeCompare(a.updatedAt),
  );
  const currentPage = Math.min(
    page,
    Math.max(1, Math.ceil(filtered.length / 8)),
  );
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Date despre acces</h2>
          <p>Adaugă, verifică și actualizează informațiile din hartă.</p>
        </div>
        <Button onClick={() => setEditing("new")}>
          <Plus />
          Adaugă locație
        </Button>
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
              aria-label="Caută în catalog"
              placeholder="Caută după nume sau adresă…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <ChoiceMenu
            id="places-category"
            ariaLabel="Filtrează după categorie"
            value={category}
            options={[
              { value: "", label: "Toate categoriile" },
              ...placeCategories.map((c) => ({ value: c.label, label: c.label })),
            ]}
            onChange={(value) => {
              setCategory(value);
              setPage(1);
            }}
          />
          <ChoiceMenu
            id="places-status"
            ariaLabel="Filtrează după accesibilitate"
            value={status}
            options={[
              { value: "", label: "Orice accesibilitate" },
              ...Object.entries(statusMeta).map(([value, meta]) => ({
                value,
                label: meta.label,
              })),
            ]}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <label className="sort-select">
            <ArrowDownUp size={16} />
            <ChoiceMenu
              id="places-sort"
              ariaLabel="Sortează intrările"
              value={sort}
              options={[
                { value: "updated", label: "Actualizate recent" },
                { value: "name", label: "Nume A–Z" },
                { value: "score", label: "Scor descrescător" },
              ]}
              onChange={(value) => setSort(value as typeof sort)}
            />
          </label>
        </div>
        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Intrare</th>
                <th>Accesibilitate</th>
                <th>Scor</th>
                <th>Sursă / actualizare</th>
                <th>
                  <span className="sr-only">Acțiuni</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered
                .slice((currentPage - 1) * 8, currentPage * 8)
                .map((place) => {
                  const score = evaluateAccessibility(place.accessibility);
                  return (
                    <tr key={place.id}>
                      <td>
                        <strong>{place.name}</strong>
                        <span>{place.address}</span>
                        <small>{place.category}</small>
                      </td>
                      <td>
                        <StatusBadge status={score.status} />
                      </td>
                      <td>
                        <b className="table-score">
                          {score.known ? score.score : "—"}
                          <small>/100</small>
                        </b>
                      </td>
                      <td>
                        <span>
                          {place.verified
                            ? "Verificat în teren"
                            : sourceLabels[place.source]}
                        </span>
                        <small>{formatDate(place.updatedAt)}</small>
                      </td>
                      <td>
                        <div className="row-actions">
                          <Button asChild variant="ghost" size="icon">
                            <Link
                              to="/map"
                              search={{ place: place.id }}
                              aria-label={`Vezi pe hartă ${place.name}`}
                            >
                              <ExternalLink />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Editează ${place.name}`}
                            onClick={() => setEditing(place)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Șterge ${place.name}`}
                            onClick={() => {
                              deletion.reset();
                              setRemoving(place);
                            }}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {!filtered.length && (
          <EmptyState title="Nicio intrare găsită">
            Schimbă filtrele sau adaugă prima intrare.
          </EmptyState>
        )}
        <Pagination
          page={currentPage}
          count={filtered.length}
          onChange={setPage}
        />
      </Card>
      {editing && (
        <PlaceEditor
          key={editing === "new" ? "new" : editing.id}
          place={editing === "new" ? undefined : editing}
          onClose={() => setEditing(null)}
          onSaved={(place) => {
            setNotice(
              `„${place.name}” a fost salvată. Modificările sunt vizibile pe hartă.`,
            );
            setEditing(null);
          }}
        />
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent className="admin-dialog">
          <DialogHeader>
            <DialogTitle>Ștergi această intrare?</DialogTitle>
            <DialogDescription>
              „{removing?.name}” va fi eliminată de pe hartă. Semnalele sale
              rămân în istoricul de moderare.
            </DialogDescription>
          </DialogHeader>
          {deletion.error && (
            <p className="form-error" role="alert">
              {deletion.error.message}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoving(null)}>
              Păstrează intrarea
            </Button>
            <Button
              variant="destructive"
              disabled={deletion.isPending}
              onClick={() => removing && deletion.mutate(removing.id)}
            >
              Șterge intrarea
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
