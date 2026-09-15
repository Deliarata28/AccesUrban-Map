import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { MapPin, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import { Label } from "../../components/ui/label";
import {
  accessibilityFeatures,
  accessibilityValueLabel,
  placeCategories,
  sourceLabels,
} from "../../config/accessibility";
import type {
  MapPlace,
  PlaceInput,
  PlaceSource,
  AccessibilityValue,
} from "../../types/place";
import { evaluateAccessibility } from "../../utils/accessibility";
import { saveMockPlace } from "../../stores/placeStore";
import { StatusBadge } from "./AdminShared";
import { ChoiceMenu } from "../../components/ChoiceMenu";

const newPlace = (): PlaceInput => ({
  name: "",
  address: "",
  category: "Instituție publică",
  note: "",
  position: [47.0105, 28.8353],
  source: "MANUAL",
  verified: false,
  accessibility: {
    rampa: "necunoscut",
    intrareFaraTrepte: "necunoscut",
    lift: "necunoscut",
    toaletaAccesibila: "necunoscut",
    parcareAccesibila: "necunoscut",
    pavajTactil: "necunoscut",
    semnalAudio: "necunoscut",
  },
});
export function PlaceEditor({
  place,
  onClose,
  onSaved,
}: {
  place?: MapPlace;
  onClose: () => void;
  onSaved: (place: MapPlace) => void;
}) {
  const [draft, setDraft] = useState<PlaceInput>(() =>
    place ? structuredClone(place) : newPlace(),
  );
  const assessment = evaluateAccessibility(draft.accessibility);
  const mutation = useMutation({
    mutationFn: async () => saveMockPlace(draft, place?.id),
    onSuccess: onSaved,
  });
  const set = <K extends keyof PlaceInput>(key: K, value: PlaceInput[K]) =>
    setDraft((previous) => ({ ...previous, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent className="place-editor admin-dialog">
        <DialogHeader>
          <DialogTitle>
            {place ? "Editează intrarea" : "Adaugă o intrare"}
          </DialogTitle>
          <DialogDescription>
            Informații clare, pentru o hartă mai utilă.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="admin-form">
          <div className="form-section-title">
            <MapPin size={17} />
            Informații despre intrare
          </div>
          <div className="field">
            <Label htmlFor="place-name">Nume</Label>
            <Input
              id="place-name"
              required
              minLength={2}
              maxLength={160}
              value={draft.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Ex. Biblioteca Municipală B.P. Hasdeu"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="place-category">Categorie</Label>
              <ChoiceMenu
                id="place-category"
                value={draft.category}
                options={placeCategories.map((item) => ({
                  value: item.label,
                  label: item.label,
                }))}
                onChange={(value) => set("category", value)}
              />
            </div>
            <div className="field">
              <Label htmlFor="place-source">Sursa informațiilor</Label>
              <ChoiceMenu
                id="place-source"
                value={draft.source}
                options={Object.entries(sourceLabels).map(([value, label]) => ({
                  value,
                  label,
                }))}
                onChange={(value) =>
                  setDraft((previous) => ({
                    ...previous,
                    source: value as PlaceSource,
                    verified:
                      value === "MOCK" ? false : previous.verified,
                  }))
                }
              />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="place-address">Adresă</Label>
            <Input
              id="place-address"
              required
              minLength={3}
              maxLength={240}
              value={draft.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Stradă, număr, sector"
            />
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="place-lat">Latitudine</Label>
              <Input
                id="place-lat"
                type="number"
                step="any"
                min={-90}
                max={90}
                required
                value={Number.isNaN(draft.position[0]) ? "" : draft.position[0]}
                onChange={(e) =>
                  set("position", [e.target.valueAsNumber, draft.position[1]])
                }
              />
            </div>
            <div className="field">
              <Label htmlFor="place-lng">Longitudine</Label>
              <Input
                id="place-lng"
                type="number"
                step="any"
                min={-180}
                max={180}
                required
                value={Number.isNaN(draft.position[1]) ? "" : draft.position[1]}
                onChange={(e) =>
                  set("position", [draft.position[0], e.target.valueAsNumber])
                }
              />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="place-description">Descriere</Label>
            <Textarea
              id="place-description"
              required
              minLength={10}
              maxLength={2000}
              value={draft.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Descrie intrarea, accesul și aspectele utile pentru vizitatori."
              rows={3}
            />
          </div>
          <fieldset className="facility-editor">
            <legend>Facilități de accesibilitate</legend>
            <p>Alege „De verificat” dacă informația nu este confirmată.</p>
            {accessibilityFeatures.map(({ key, label, points }) => (
              <div className="facility-editor-row" key={key}>
                <label htmlFor={`facility-${key}`}>
                  {label}
                  <small>{points} puncte</small>
                </label>
                <ChoiceMenu
                  id={`facility-${key}`}
                  value={draft.accessibility[key]}
                  options={Object.entries(accessibilityValueLabel).map(
                    ([value, label]) => ({ value, label }),
                  )}
                  onChange={(value) =>
                    set("accessibility", {
                      ...draft.accessibility,
                      [key]: value as AccessibilityValue,
                    })
                  }
                />
              </div>
            ))}
          </fieldset>
          <div className="score-preview">
            <div>
              <span>Scor calculat automat</span>
              <strong>
                {assessment.known ? assessment.score : "—"}
                <small> / 100</small>
              </strong>
            </div>
            <StatusBadge status={assessment.status} />
          </div>
          <label className="check-field">
            <input
              type="checkbox"
              checked={draft.verified}
              disabled={draft.source === "MOCK"}
              onChange={(e) => set("verified", e.target.checked)}
            />
            <span>Date confirmate pentru publicare</span>
          </label>
          {mutation.error && (
            <p className="form-error" role="alert">
              {mutation.error.message}
            </p>
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
              <Save />
              {mutation.isPending ? "Se salvează…" : "Salvează intrarea"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
