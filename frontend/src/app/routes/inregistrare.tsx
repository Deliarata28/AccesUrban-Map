import { createFileRoute } from "@tanstack/react-router";
import { AuthFormPage } from "../../features/auth/AuthPage";

export const Route = createFileRoute("/inregistrare")({
  component: () => <AuthFormPage mode="register" />,
});
