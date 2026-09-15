import { createFileRoute } from "@tanstack/react-router";
import { MyReportsPage } from "../../features/reports/MyReportsPage";
export const Route = createFileRoute("/rapoartele-mele")({
  component: MyReportsPage,
});
