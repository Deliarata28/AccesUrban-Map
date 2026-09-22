import { createFileRoute, redirect } from "@tanstack/react-router";
import { ProfilePage } from "../../features/profile/ProfilePage";
import { getCurrentUser } from "../../stores/sessionStore";

export const Route = createFileRoute("/profil")({
  beforeLoad: () => {
    if (!getCurrentUser()) throw redirect({ to: "/conectare" });
  },
  component: ProfilePage,
});
