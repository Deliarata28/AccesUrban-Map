import { createFileRoute, redirect } from "@tanstack/react-router";
import { MyReportsPage } from "../../features/reports/MyReportsPage";
import { getCurrentUser } from "../../stores/sessionStore";
export const Route = createFileRoute("/rapoartele-mele")({
  beforeLoad: () => {
    if (!getCurrentUser()) throw redirect({ to: "/conectare" });
  },
  component: MyReportsPage,
});
