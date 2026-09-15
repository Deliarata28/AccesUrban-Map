import { getCurrentMockUser, requireMockAdmin } from "./authStore";
import { getMockPlaces } from "./placeStore";
import { readCollection, writeCollection } from "./mockStorage";
import { seedReports } from "../testing/mocks/reports";
import type { Position } from "../types/place";

export const reportTypeLabels = {
  BLOCKED_RAMP: "Rampă blocată",
  DAMAGED_SIDEWALK: "Trotuar deteriorat",
  BROKEN_ELEVATOR: "Lift defect",
  WRONG_INFORMATION: "Informații incorecte",
  OTHER: "Altă problemă",
};
export type MockReportType = keyof typeof reportTypeLabels;
export type ReportStatus = "PENDING" | "APPROVED" | "REJECTED";
export const reportStatusLabels: Record<ReportStatus, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
};
export type MockReport = {
  id: string;
  placeId: string;
  placeName: string;
  position?: Position;
  userId: string;
  userName: string;
  type: MockReportType;
  description: string;
  photoUrl: string | null;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  moderatorNote: string;
};
const KEY = "accessible-map:mock-reports";
function readReports(): MockReport[] {
  return readCollection<MockReport>(KEY, seedReports).map((report) => ({
    ...report,
    updatedAt: report.updatedAt ?? report.createdAt,
    reviewedBy: report.reviewedBy ?? null,
    moderatorNote: report.moderatorNote ?? "",
  }));
}
export function getMockReports(): MockReport[] {
  const user = getCurrentMockUser();
  if (!user) throw new Error("Conectează-te pentru a vedea rapoartele.");
  return readReports()
    .filter((report) => user.role === "ADMIN" || report.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
export function getPublicMockReports() {
  return readReports()
    .filter((report) => report.status === "APPROVED")
    .map(({ id, placeId, placeName, position, type, description, photoUrl, updatedAt }) => ({
      id,
      placeId,
      placeName,
      position,
      type,
      description,
      photoUrl,
      updatedAt,
    }));
}
export function createMockReport(input: {
  placeId: string;
  placeName: string;
  position: Position;
  type: MockReportType;
  description: string;
  photoUrl: string | null;
}): MockReport {
  const user = getCurrentMockUser();
  if (!user) throw new Error("Conectează-te pentru a trimite un raport.");
  const place = getMockPlaces().find((item) => item.id === input.placeId);
  const isMapPoint = input.placeId.startsWith("map-point:");
  if (!place && !isMapPoint)
    throw new Error("Locația nu mai există. Alege o altă locație.");
  if (
    !Number.isFinite(input.position[0]) ||
    !Number.isFinite(input.position[1])
  ) {
    throw new Error("Alege un punct valid pe hartă.");
  }
  if (!place && input.placeName.trim().length < 3)
    throw new Error("Punctul raportat trebuie să aibă un nume.");
  if (!Object.prototype.hasOwnProperty.call(reportTypeLabels, input.type))
    throw new Error("Selectează tipul problemei.");
  const description = input.description.trim();
  if (description.length < 10 || description.length > 2000)
    throw new Error("Descrie problema în 10–2000 de caractere.");
  if (
    input.photoUrl &&
    (!/^data:image\/(png|jpeg|webp);base64,/.test(input.photoUrl) ||
      input.photoUrl.length > 2_800_000)
  )
    throw new Error(
      "Fotografia trebuie să fie PNG, JPEG sau WebP și să aibă maximum 2 MB.",
    );
  const now = new Date().toISOString();
  const report: MockReport = {
    ...input,
    description,
    placeName: place?.name ?? input.placeName.trim(),
    position: [...input.position],
    id: crypto.randomUUID(),
    userId: user.id,
    userName: user.name,
    status: "PENDING",
    createdAt: now,
    updatedAt: now,
    reviewedBy: null,
    moderatorNote: "",
  };
  writeCollection(KEY, [...readReports(), report]);
  return report;
}
export function moderateMockReport(
  id: string,
  status: "APPROVED" | "REJECTED",
  note: string,
) {
  const admin = requireMockAdmin();
  if (!["APPROVED", "REJECTED"].includes(status))
    throw new Error("Decizie invalidă.");
  if (status === "REJECTED" && note.trim().length < 5)
    throw new Error("Explică motivul respingerii (minimum 5 caractere).");
  if (note.length > 1000)
    throw new Error("Nota poate avea maximum 1000 de caractere.");
  const reports = readReports();
  const report = reports.find((item) => item.id === id);
  if (!report) throw new Error("Raportul nu mai există.");
  if (report.status !== "PENDING")
    throw new Error("Raportul a fost deja verificat. Actualizează lista.");
  const updated = {
    ...report,
    status,
    moderatorNote: note.trim(),
    reviewedBy: admin.id,
    updatedAt: new Date().toISOString(),
  };
  writeCollection(
    KEY,
    reports.map((item) => (item.id === id ? updated : item)),
  );
  return updated;
}
