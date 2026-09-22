import {
  changePassword,
  getCurrentUser as getCurrentUserFromApi,
  register,
  requestLoginCode as requestLoginCodeFromApi,
  verifyLoginCode as verifyLoginCodeFromApi,
  updateProfile,
  type AccessibilityProfile,
  type AppUser,
  type AuthVerification,
} from "../services/authApi";
import {
  clearAccessToken,
  getAccessToken,
  saveAccessToken,
} from "../services/apiClient";

export type { AccessibilityProfile, AppUser } from "../services/authApi";

let currentUser: AppUser | null = null;
let initialized = false;
let revision = 0;
const subscribers = new Set<() => void>();

const notify = () => {
  revision += 1;
  subscribers.forEach((listener) => listener());
};

export function subscribeSession(listener: () => void) {
  subscribers.add(listener);
  return () => subscribers.delete(listener);
}

export function getSessionRevision() {
  return revision;
}

export function getCurrentUser() {
  return currentUser;
}

export async function initializeSession() {
  if (initialized) return;

  if (!getAccessToken()) {
    initialized = true;
    notify();
    return;
  }

  try {
    currentUser = await getCurrentUserFromApi();
  } catch {
    clearAccessToken();
    currentUser = null;
  } finally {
    initialized = true;
    notify();
  }
}

export async function requestLoginCode(email: string, password: string): Promise<AuthVerification> {
  return requestLoginCodeFromApi(email, password);
}

export async function verifyLoginCode(verificationToken: string, code: string) {
  const result = await verifyLoginCodeFromApi(verificationToken, code);
  saveAccessToken(result.token);
  currentUser = result.user;
  initialized = true;
  notify();
  return result.user;
}

export async function registerUser(input: {
  name: string;
  email: string;
  password: string;
  accessibilityProfile: AccessibilityProfile;
}) {
  const result = await register(input);
  saveAccessToken(result.token);
  currentUser = result.user;
  initialized = true;
  notify();
  return result.user;
}

export async function updateCurrentUser(input: {
  name: string;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
}) {
  currentUser = await updateProfile(input);
  notify();
  return currentUser;
}

export function replaceCurrentUser(user: AppUser) {
  if (currentUser?.id !== user.id) return;

  currentUser = user;
  notify();
}

export async function changeCurrentUserPassword(currentPassword: string, newPassword: string) {
  await changePassword(currentPassword, newPassword);
}

export function logoutUser() {
  clearAccessToken();
  currentUser = null;
  initialized = true;
  notify();
}
