import { createFileRoute } from "@tanstack/react-router";
import { MapPage } from "../../features/pages/MapPage";

export const Route = createFileRoute("/map")({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    place?: string;
    lat?: number;
    lng?: number;
    reportLat?: number;
    reportLng?: number;
    reportTargetId?: string;
    reportName?: string;
    reportAddress?: string;
  } => {
    const coordinate = (value: unknown) => {
      const parsed = typeof value === "number" ? value : Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };
    return {
      place: typeof search.place === "string" ? search.place : undefined,
      lat: coordinate(search.lat),
      lng: coordinate(search.lng),
      reportLat: coordinate(search.reportLat),
      reportLng: coordinate(search.reportLng),
      reportTargetId:
        typeof search.reportTargetId === "string"
          ? search.reportTargetId
          : undefined,
      reportName:
        typeof search.reportName === "string" ? search.reportName : undefined,
      reportAddress:
        typeof search.reportAddress === "string"
          ? search.reportAddress
          : undefined,
    };
  },
  component: MapPage,
});
