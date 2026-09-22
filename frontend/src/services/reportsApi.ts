import type { AppRole } from "./authApi";
import { apiRequest } from "./apiClient";
import { attachPhoto, uploadImage } from "./photosApi";
import type { Position } from "../types/place";

export type AppReportType =
  | "BLOCKED_RAMP"
  | "DAMAGED_SIDEWALK"
  | "BROKEN_ELEVATOR"
  | "WRONG_INFORMATION"
  | "OTHER";

export type AppReportStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AppReport = {
  id: string;
  placeId: string | null;
  placeName: string;
  position?: Position;
  userId: string;
  userName: string;
  type: AppReportType;
  description: string;
  photoUrl: string | null;
  status: AppReportStatus;
  createdAt: string;
  updatedAt: string;
  reviewedBy: string | null;
  moderatorNote: string;
};

type ApiReportType = "BlockedRamp" | "DamagedSidewalk" | "BrokenElevator" | "WrongInformation" | "Other";
type ApiReportStatus = "Pending" | "Approved" | "Rejected";

type ApiReport = {
  id: number;
  placeId: number | null;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  userId: number;
  userName: string;
  type: ApiReportType;
  description: string;
  status: ApiReportStatus;
  createdAt: string;
  updatedAt: string;
  photoUrl: string | null;
  reviewedByUserId: number | null;
  moderatorNote: string | null;
};

type ApiPublicReport = Omit<ApiReport, "userId" | "userName" | "status" | "createdAt" | "reviewedByUserId" | "moderatorNote">;

const typeFromApi: Record<ApiReportType, AppReportType> = {
  BlockedRamp: "BLOCKED_RAMP",
  DamagedSidewalk: "DAMAGED_SIDEWALK",
  BrokenElevator: "BROKEN_ELEVATOR",
  WrongInformation: "WRONG_INFORMATION",
  Other: "OTHER",
};

const typeToApi: Record<AppReportType, ApiReportType> = {
  BLOCKED_RAMP: "BlockedRamp",
  DAMAGED_SIDEWALK: "DamagedSidewalk",
  BROKEN_ELEVATOR: "BrokenElevator",
  WRONG_INFORMATION: "WrongInformation",
  OTHER: "Other",
};

const statusFromApi: Record<ApiReportStatus, AppReportStatus> = {
  Pending: "PENDING",
  Approved: "APPROVED",
  Rejected: "REJECTED",
};

export const reportTypeLabels: Record<AppReportType, string> = {
  BLOCKED_RAMP: "Rampă blocată",
  DAMAGED_SIDEWALK: "Trotuar deteriorat",
  BROKEN_ELEVATOR: "Lift defect",
  WRONG_INFORMATION: "Informații incorecte",
  OTHER: "Altă problemă",
};

export const reportStatusLabels: Record<AppReportStatus, string> = {
  PENDING: "În așteptare",
  APPROVED: "Aprobat",
  REJECTED: "Respins",
};

function mapReport(report: ApiReport): AppReport {
  const position = report.latitude === null || report.longitude === null
    ? undefined
    : [report.latitude, report.longitude] as Position;

  return {
    id: String(report.id),
    placeId: report.placeId === null ? null : String(report.placeId),
    placeName: report.locationName,
    position,
    userId: String(report.userId),
    userName: report.userName,
    type: typeFromApi[report.type],
    description: report.description,
    photoUrl: report.photoUrl,
    status: statusFromApi[report.status],
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    reviewedBy: report.reviewedByUserId === null ? null : String(report.reviewedByUserId),
    moderatorNote: report.moderatorNote ?? "",
  };
}

export async function getApiReports(role: AppRole) {
  const endpoint = role === "ADMIN" ? "/reports" : "/reports/mine";
  const reports = await apiRequest<ApiReport[]>(endpoint);
  return reports.map(mapReport);
}

export async function getPublicApiReports() {
  const reports = await apiRequest<ApiPublicReport[]>("/reports/public");
  return reports.map((report) => mapReport({
    ...report,
    userId: 0,
    userName: "",
    status: "Approved",
    createdAt: report.updatedAt,
    reviewedByUserId: null,
    moderatorNote: null,
  }));
}

export async function submitApiReport(input: {
  placeId: string;
  placeName: string;
  position: Position;
  type: AppReportType;
  description: string;
  photo?: File | null;
}) {
  const numericPlaceId = /^\d+$/.test(input.placeId) ? Number(input.placeId) : undefined;
  const report = await apiRequest<ApiReport>("/reports/submit", {
    method: "POST",
    body: JSON.stringify({
      placeId: numericPlaceId,
      locationName: input.placeName,
      latitude: input.position[0],
      longitude: input.position[1],
      type: typeToApi[input.type],
      description: input.description,
    }),
  });

  if (input.photo) {
    const upload = await uploadImage(input.photo);
    await attachPhoto({ reportId: report.id, url: upload.url });
    report.photoUrl = upload.url;
  }

  return mapReport(report);
}

export async function moderateApiReport(
  id: string,
  status: Exclude<AppReportStatus, "PENDING">,
  moderatorNote: string,
) {
  const endpoint = status === "APPROVED" ? `/reports/${id}/approve` : `/reports/${id}/reject`;
  const report = await apiRequest<ApiReport>(endpoint, {
    method: "PUT",
    body: JSON.stringify({ moderatorNote }),
  });
  return mapReport(report);
}
