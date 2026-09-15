import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { subscribeMockData } from "../stores/mockStorage";
import { subscribeMockAuth } from "../stores/authStore";
import "../shadcn.css";

export function AppProvider() {
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries();
    };
    const authChange = () => {
      queryClient.removeQueries({ queryKey: ["reports"] });
      queryClient.removeQueries({ queryKey: ["users"] });
      refresh();
    };
    const unsubscribeData = subscribeMockData(refresh);
    const unsubscribeAuth = subscribeMockAuth(authChange);
    return () => {
      unsubscribeData();
      unsubscribeAuth();
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
