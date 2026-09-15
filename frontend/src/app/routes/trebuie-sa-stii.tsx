import { createFileRoute } from "@tanstack/react-router";
import { KnowPage } from "../../features/pages/KnowPage";

export const Route = createFileRoute("/trebuie-sa-stii")({
  component: KnowPage,
});
