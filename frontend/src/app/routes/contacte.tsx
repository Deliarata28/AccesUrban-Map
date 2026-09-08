import { createFileRoute } from "@tanstack/react-router";
import { ContactsPage } from "../../features/pages/ContactsPage";

export const Route = createFileRoute("/contacte")({
  component: ContactsPage,
});
