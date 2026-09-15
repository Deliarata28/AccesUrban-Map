import type { MockReport } from "../../stores/reportStore";
export const seedReports: MockReport[] = [
  {
    placeId: "usm",
    placeName: "Universitatea de Stat din Moldova",
    type: "BLOCKED_RAMP",
    description:
      "Un automobil blochează accesul la rampă. Verifică situația înainte de a modifica informațiile locației.",
    status: "PENDING",
  },
  {
    placeId: "parcul-stefan",
    placeName: "Parcul Ștefan cel Mare",
    type: "DAMAGED_SIDEWALK",
    description:
      "Suprafața unei alei este deteriorată pe o porțiune scurtă.",
    status: "PENDING",
  },
  {
    placeId: "biblioteca",
    placeName: "Biblioteca Municipală",
    type: "WRONG_INFORMATION",
    description:
      "Este necesară verificarea informației despre toaletă.",
    status: "PENDING",
  },
  {
    placeId: "gara",
    placeName: "Gara Feroviară Chișinău",
    type: "OTHER",
    description:
      "Accesul prin intrarea laterală este temporar blocat.",
    status: "APPROVED",
  },
  {
    placeId: "utm",
    placeName: "Universitatea Tehnică a Moldovei",
    type: "BROKEN_ELEVATOR",
    description:
      "Raport închis după verificarea informațiilor.",
    status: "REJECTED",
  },
].map((report, index) => ({
  ...report,
  type: report.type as MockReport["type"],
  status: report.status as MockReport["status"],
  id: `report-${index + 1}`,
  userId: "contributor",
  userName: "Contribuitor local",
  photoUrl: null,
  createdAt: `2026-09-0${8 - index}T09:30:00.000Z`,
  updatedAt: "2026-09-08T12:00:00.000Z",
  reviewedBy: report.status === "PENDING" ? null : "mock-admin",
  moderatorNote:
    report.status === "REJECTED"
      ? "Problema semnalată nu s-a confirmat la verificare."
      : "",
}));
