import { RouterProvider } from "@tanstack/react-router";
import { router } from "./router";
import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { initializeSession, subscribeSession } from "../stores/sessionStore";
import "../shadcn.css";

export function AppProvider() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authChange = () => {
      queryClient.removeQueries({ queryKey: ["reports"] });
      queryClient.removeQueries({ queryKey: ["users"] });
      void queryClient.invalidateQueries();
    };

    const unsubscribe = subscribeSession(authChange);
    void initializeSession().finally(() => setReady(true));

    return () => {
      unsubscribe();
    };
  }, []);

  if (!ready) {
    return <div className="site-shell">Se încarcă sesiunea…</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  );
}
