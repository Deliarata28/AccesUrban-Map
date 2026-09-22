import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminPage } from "../../features/admin/AdminPage";
import { getCurrentUser } from "../../stores/sessionStore";
export type AdminTab = "overview" | "places" | "reports" | "messages" | "community";
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    const user = getCurrentUser();
    if (!user) throw redirect({ to: "/conectare" });
    if (user.role !== "ADMIN") throw redirect({ to: "/map" });
  },
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => ({
    tab: ["overview", "places", "reports", "messages", "community"].includes(
      String(search.tab),
    )
      ? (search.tab as AdminTab)
      : "overview",
  }),
  component: AdminPage,
});
