import type { ReactNode } from "react";
import { Inbox, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { statusMeta } from "../../config/accessibility";
import {
  reportStatusLabels,
  type AppReportStatus,
} from "../../services/reportsApi";
import type { AccessibilityStatus } from "../../types/place";

export const formatDate = (date: string) =>
  new Date(date).toLocaleDateString("ro-RO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export function StatusBadge({
  status,
}: {
  status: AccessibilityStatus | AppReportStatus;
}) {
  const label =
    status in statusMeta
      ? statusMeta[status as AccessibilityStatus].label
      : reportStatusLabels[status as AppReportStatus];
  return (
    <Badge className={`status-badge status-${status}`}>
      <span aria-hidden="true" />
      {label}
    </Badge>
  );
}
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="admin-empty">
      <Inbox size={30} strokeWidth={1.3} />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}
export function Pagination({
  page,
  count,
  size = 8,
  onChange,
}: {
  page: number;
  count: number;
  size?: number;
  onChange: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(count / size));
  return (
    <div className="admin-pagination">
      <span>
        {count
          ? `${(page - 1) * size + 1}–${Math.min(page * size, count)} din ${count}`
          : "0 rezultate"}
      </span>
      <div>
        <Button
          variant="outline"
          size="icon"
          aria-label="Pagina precedentă"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <ChevronLeft />
        </Button>
        <span>
          {page} / {pages}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Pagina următoare"
          disabled={page >= pages}
          onClick={() => onChange(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>
    </div>
  );
}
