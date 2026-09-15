import { createFileRoute } from "@tanstack/react-router";
import { AuthFormPage } from "../../features/auth/AuthPage";
import { validateAuthRedirectSearch } from "../../features/auth/authRedirect";

export const Route = createFileRoute("/inregistrare")({
  validateSearch: validateAuthRedirectSearch,
  component: () => <AuthFormPage mode="register" />,
});
