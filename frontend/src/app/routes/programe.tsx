import { createFileRoute } from "@tanstack/react-router";
import { ProgramsPage } from "../../features/pages/ProgramsPage";

export const Route = createFileRoute("/programe")({
  component: ProgramsPage,
});
