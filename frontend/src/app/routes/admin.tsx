import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "../../features/admin/AdminPage";
export type AdminTab = "overview" | "places" | "reports" | "community";
export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => ({
    tab: ["overview", "places", "reports", "community"].includes(
      String(search.tab),
    )
      ? (search.tab as AdminTab)
      : "overview",
  }),
  component: AdminPage,
});
