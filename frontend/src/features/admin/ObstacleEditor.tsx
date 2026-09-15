import { useState, type FormEvent } from "react";
import { Save } from "lucide-react";
import { Button } from "../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../components/ui/dialog";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import type { AccessibilityPoint } from "../../services/osmAccessibility";
import { saveObstacleOverride } from "../../stores/obstacleStore";

export function ObstacleEditor({
  point,
  onClose,
  onSaved,
}: {
  point: AccessibilityPoint;
  onClose: () => void;
  onSaved: (point: AccessibilityPoint) => void;
}) {
  const [draft, setDraft] = useState(point);
  const [notes, setNotes] = useState(point.notes.join("\n"));
  const [error, setError] = useState("");

  const set = <K extends keyof AccessibilityPoint>(
    key: K,
    value: AccessibilityPoint[K],
  ) => setDraft((previous) => ({ ...previous, [key]: value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanNotes = notes
      .split("\n")
      .map((note) => note.trim())
      .filter(Boolean);
    if (draft.kind.trim().length < 3 || draft.streetName.trim().length < 3) {
      setError("Completează tipul obstacolului și strada.");
      return;
    }
    if (!cleanNotes.length) {
      setError("Adaugă cel puțin o descriere clară a obstacolului.");
      return;
    }
    const score = Math.max(0, Math.min(100, draft.score ?? 50));
    const saved = saveObstacleOverride({
      ...draft,
      kind: draft.kind.trim(),
      streetName: draft.streetName.trim(),
      score,
      status: score >= 90 ? "good" : score >= 70 ? "limited" : "problem",
      notes: cleanNotes,
    });
    onSaved(saved);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="admin-dialog obstacle-editor">
        <DialogHeader>
          <DialogTitle>Editează obstacolul</DialogTitle>
          <DialogDescription>
            Corectează informațiile afișate pe traseu. Poziția OSM rămâne neschimbată.
          </DialogDescription>
        </DialogHeader>
        <form className="admin-form" onSubmit={submit}>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="obstacle-kind">Tip obstacol</Label>
              <Input
                id="obstacle-kind"
                value={draft.kind}
                onChange={(event) => set("kind", event.target.value)}
              />
            </div>
            <div className="field">
              <Label htmlFor="obstacle-street">Stradă</Label>
              <Input
                id="obstacle-street"
                value={draft.streetName}
                onChange={(event) => set("streetName", event.target.value)}
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="obstacle-surface">Suprafață</Label>
              <Input
                id="obstacle-surface"
                value={draft.surface}
                onChange={(event) => set("surface", event.target.value)}
                placeholder="Ex. asfalt, piatră cubică"
              />
            </div>
            <div className="field">
              <Label htmlFor="obstacle-kerb">Bordură</Label>
              <Input
                id="obstacle-kerb"
                value={draft.kerb}
                onChange={(event) => set("kerb", event.target.value)}
                placeholder="Ex. înaltă, coborâtă"
              />
            </div>
          </div>
          <div className="form-grid">
            <div className="field">
              <Label htmlFor="obstacle-wheelchair">Acces rulant</Label>
              <Input
                id="obstacle-wheelchair"
                value={draft.wheelchair}
                onChange={(event) => set("wheelchair", event.target.value)}
                placeholder="Ex. limitat"
              />
            </div>
            <div className="field">
              <Label htmlFor="obstacle-width">Lățime</Label>
              <Input
                id="obstacle-width"
                value={draft.width}
                onChange={(event) => set("width", event.target.value)}
                placeholder="Ex. 0,9 m"
              />
            </div>
          </div>
          <div className="field">
            <Label htmlFor="obstacle-tactile">Pavaj tactil</Label>
            <Input
              id="obstacle-tactile"
              value={draft.tactilePaving}
              onChange={(event) => set("tactilePaving", event.target.value)}
              placeholder="Ex. prezent sau absent"
            />
          </div>
          <div className="field">
            <Label htmlFor="obstacle-score">Scor de accesibilitate</Label>
            <Input
              id="obstacle-score"
              type="number"
              min={0}
              max={100}
              value={draft.score ?? 50}
              onChange={(event) => set("score", event.target.valueAsNumber)}
            />
          </div>
          <div className="field">
            <Label htmlFor="obstacle-notes">Detalii</Label>
            <Textarea
              id="obstacle-notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Câte o informație verificată pe fiecare rând"
            />
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Anulează
            </Button>
            <Button type="submit">
              <Save />
              Salvează detaliile
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
