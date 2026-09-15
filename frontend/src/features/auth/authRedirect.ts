export type PendingReportSearch = {
  reportLat?: number;
  reportLng?: number;
  reportTargetId?: string;
  reportName?: string;
  reportAddress?: string;
};

const coordinate = (value: unknown) => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export const validateAuthRedirectSearch = (
  search: Record<string, unknown>,
): PendingReportSearch => ({
  reportLat: coordinate(search.reportLat),
  reportLng: coordinate(search.reportLng),
  reportTargetId:
    typeof search.reportTargetId === "string" ? search.reportTargetId : undefined,
  reportName: typeof search.reportName === "string" ? search.reportName : undefined,
  reportAddress:
    typeof search.reportAddress === "string" ? search.reportAddress : undefined,
});

export const hasPendingReport = (
  search: PendingReportSearch,
): search is PendingReportSearch & { reportLat: number; reportLng: number } =>
  search.reportLat !== undefined && search.reportLng !== undefined;
