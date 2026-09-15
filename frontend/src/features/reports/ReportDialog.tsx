import { useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  MapPin,
  Send,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import { ChoiceMenu } from "../../components/ChoiceMenu";
import { useCurrentUser } from "../../hooks/useCurrentUser";
import {
  createMockReport,
  reportTypeLabels,
  type MockReportType,
} from "../../stores/reportStore";
import type { Position } from "../../types/place";
import "./Reports.css";

export type ReportTarget = {
  id: string;
  name: string;
  address: string;
  position: Position;
};

const streetViewUrl = (position: Position) =>
  `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${position[0]},${position[1]}&heading=0&pitch=0&fov=90`;

export function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const user = useCurrentUser();
  const [type, setType] = useState<MockReportType>("BLOCKED_RAMP");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [reading, setReading] = useState(false);
  const readVersion = useRef(0);
  const mutation = useMutation({
    mutationFn: async () =>
      createMockReport({
        placeId: target.id,
        placeName: target.name,
        position: target.position,
        type,
        description,
        photoUrl: photo,
      }),
  });
  const selectPhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPhotoError("");
    const version = ++readVersion.current;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size > 2 * 1024 * 1024
    ) {
      setPhotoError("Alege un fișier PNG, JPEG sau WebP de maximum 2 MB.");
      return;
    }
    setReading(true);
    const reader = new FileReader();
    reader.onload = () => {
      if (version !== readVersion.current) return;
      setPhoto(String(reader.result));
      setPhotoName(file.name);
      setReading(false);
    };
    reader.onerror = () => {
      if (version !== readVersion.current) return;
      setPhotoError("Fotografia nu a putut fi citită.");
      setReading(false);
    };
    reader.readAsDataURL(file);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!reading && !mutation.isPending) mutation.mutate();
  };
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="report-dialog">
        <DialogHeader>
          <DialogTitle>
            {mutation.isSuccess
              ? "Raportul a fost înregistrat"
              : "Raportează o problemă"}
          </DialogTitle>
          <DialogDescription>
            Descrie problema exact în punctul ales pe hartă.
          </DialogDescription>
        </DialogHeader>
        <div className="report-location-card">
          <span className="report-location-icon" aria-hidden="true">
            <MapPin size={19} />
          </span>
          <div>
            <span>Punctul problemei</span>
            <strong>{target.name}</strong>
            <small>{target.address}</small>
          </div>
        </div>
        <a
          className="report-streetview-link"
          href={streetViewUrl(target.position)}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          <span>
            <strong>Verifică punctul în Street View</strong>
            <small>Deschide imaginea Google Maps din zona raportată</small>
          </span>
        </a>
        {!user ? (
          <div className="report-signin">
            <p>
              Conectează-te pentru a trimite o problemă și a urmări răspunsul
              administratorului.
            </p>
            <Button asChild>
              <Link
                to="/conectare"
                search={{
                  reportLat: target.position[0],
                  reportLng: target.position[1],
                  reportTargetId: target.id,
                  reportName: target.name,
                  reportAddress: target.address,
                }}
              >
                Conectează-te
              </Link>
            </Button>
          </div>
        ) : mutation.isSuccess ? (
          <div className="report-success">
            <CheckCircle2 size={42} />
            <h3>Mulțumim pentru contribuție!</h3>
            <p>
              Raportul este în așteptarea verificării. Îl găsești în „Rapoartele
              mele”.
            </p>
            <div className="report-actions">
              <Button variant="outline" asChild>
                <Link to="/rapoartele-mele">Rapoartele mele</Link>
              </Button>
              <Button onClick={onClose}>Înapoi la hartă</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="report-form">
            <div className="field">
              <Label htmlFor="report-type">Tipul problemei</Label>
              <ChoiceMenu
                id="report-type"
                value={type}
                options={Object.entries(reportTypeLabels).map(([key, label]) => ({
                  value: key,
                  label,
                }))}
                onChange={(value) => setType(value as MockReportType)}
              />
            </div>
            <div className="field">
              <Label htmlFor="report-description">Descriere</Label>
              <Textarea
                id="report-description"
                required
                minLength={10}
                maxLength={2000}
                rows={4}
                placeholder="Ex. Pe rampă este parcat un automobil și intrarea este blocată."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
              <small>{description.length}/2000 de caractere</small>
            </div>
            <div className="field">
              <Label htmlFor="report-photo">
                Fotografie <span className="optional-label">(recomandată)</span>
              </Label>
              <label className="photo-upload" htmlFor="report-photo">
                <ImagePlus size={23} />
                <span>
                  {reading ? "Se încarcă fotografia…" : "Alege o fotografie"}
                  <small>PNG, JPEG sau WebP · maximum 2 MB</small>
                </span>
              </label>
              <input
                id="report-photo"
                className="photo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={selectPhoto}
                disabled={reading}
              />
              {photo && (
                <div className="report-photo-preview">
                  <img src={photo} alt="Fotografia problemei selectate" />
                  <span>{photoName}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Elimină fotografia"
                    onClick={() => {
                      readVersion.current++;
                      setPhoto(null);
                      setPhotoName("");
                      setReading(false);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              )}
              {photoError && (
                <p className="form-error" role="alert">
                  {photoError}
                </p>
              )}
            </div>
            {mutation.error && (
              <p className="form-error" role="alert">
                {mutation.error.message}
              </p>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Anulează
              </Button>
              <Button type="submit" disabled={reading || mutation.isPending}>
                <Send />
                {mutation.isPending ? "Se trimite…" : "Trimite raportul"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
