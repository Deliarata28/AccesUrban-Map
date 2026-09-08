import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";

export function AppProvider() {
  return <RouterProvider router={router} />;
}
