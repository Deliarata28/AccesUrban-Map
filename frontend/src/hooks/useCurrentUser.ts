import { useMemo, useSyncExternalStore } from "react";
import {
  getCurrentMockUser,
  getMockAuthRevision,
  subscribeMockAuth,
} from "../stores/authStore";
export function useCurrentUser() {
  const revision = useSyncExternalStore(
    subscribeMockAuth,
    getMockAuthRevision,
    () => 0,
  );
  return useMemo(getCurrentMockUser, [revision]);
}
