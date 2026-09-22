import { useSyncExternalStore } from "react";
import {
  getCurrentUser,
  getSessionRevision,
  subscribeSession,
} from "../stores/sessionStore";

export function useCurrentUser() {
  useSyncExternalStore(subscribeSession, getSessionRevision, () => 0);
  return getCurrentUser();
}
