export type MockRole = "USER" | "ADMIN";
export type AccessibilityProfile =
  "WHEELCHAIR" | "WALKING_AID" | "VISUAL_IMPAIRMENT";

export type MockUser = {
  id: string;
  name: string;
  email: string;
  role: MockRole;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
  createdAt: string;
};

type StoredUser = MockUser & {
  password: string;
};

const USERS_KEY = "accessible-map:mock-users";
const SESSION_KEY = "accessible-map:mock-session";
const authSubscribers = new Set<() => void>();
let authRevision = 0;
// Development fixture only. Real authentication belongs to the .NET API.
const adminFixture: StoredUser = {
  id: "mock-admin",
  name: "AccesUrban Map",
  email: "accesurbanmap@gmail.com",
  password: "accesurbanmap123",
  role: "ADMIN",
  accessibilityProfile: "WHEELCHAIR",
  avatarUrl: null,
  createdAt: "2026-09-01T08:00:00.000Z",
};

function canUseStorage() {
  return typeof window !== "undefined";
}

function readUsers(): StoredUser[] {
  if (!canUseStorage()) return [];

  try {
    const value = window.localStorage.getItem(USERS_KEY);
    if (!value) return [{ ...adminFixture }];

    const users = JSON.parse(value) as unknown;
    const stored = Array.isArray(users) ? (users as StoredUser[]) : [];
    const savedAdmin = stored.find((user) => user.email === adminFixture.email);
    return [
      { ...adminFixture, avatarUrl: savedAdmin?.avatarUrl ?? null },
      ...stored
        .filter((user) => user.email !== adminFixture.email)
        .map((user) => ({ ...user, role: "USER" as const })),
    ];
  } catch {
    return [{ ...adminFixture }];
  }
}

function writeUsers(users: StoredUser[]) {
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function normalizeAccessibilityProfile(value: unknown): AccessibilityProfile {
  if (value === "WALKING_AID" || value === "VISUAL_IMPAIRMENT") return value;
  return "WHEELCHAIR";
}

function toPublicUser(user: StoredUser): MockUser {
  const { password: _password, ...publicUser } = user;
  return {
    ...publicUser,
    accessibilityProfile: normalizeAccessibilityProfile(
      publicUser.accessibilityProfile,
    ),
    avatarUrl: publicUser.avatarUrl ?? null,
  };
}

export function subscribeMockAuth(listener: () => void) {
  authSubscribers.add(listener);
  return () => authSubscribers.delete(listener);
}

export function getMockAuthRevision() {
  return authRevision;
}

function notifyAuthChange() {
  authRevision += 1;
  authSubscribers.forEach((listener) => listener());
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function createId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getCurrentMockUser(): MockUser | null {
  if (!canUseStorage()) return null;

  const email = window.localStorage.getItem(SESSION_KEY);
  if (!email) return null;

  const user = readUsers().find((candidate) => candidate.email === email);
  return user ? toPublicUser(user) : null;
}

export function registerMockUser(input: {
  name: string;
  email: string;
  password: string;
  accessibilityProfile: AccessibilityProfile;
}): MockUser {
  const email = normalizeEmail(input.email);
  const users = readUsers();

  if (input.name.trim().length < 2 || input.name.length > 100)
    throw new Error("Introdu un nume între 2 și 100 de caractere.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("Introdu o adresă de email validă.");
  if (input.password.length < 8)
    throw new Error("Parola trebuie să aibă cel puțin 8 caractere.");

  if (users.some((user) => user.email === email)) {
    throw new Error("Există deja un cont cu această adresă de email.");
  }

  const user: StoredUser = {
    id: createId(),
    name: input.name.trim(),
    email,
    role: "USER",
    accessibilityProfile: input.accessibilityProfile,
    avatarUrl: null,
    password: input.password,
    createdAt: new Date().toISOString(),
  };

  writeUsers([...users, user]);
  window.localStorage.setItem(SESSION_KEY, user.email);
  notifyAuthChange();
  return toPublicUser(user);
}

export function loginMockUser(emailInput: string, password: string): MockUser {
  const email = normalizeEmail(emailInput);
  const user = readUsers().find((candidate) => candidate.email === email);

  if (!user || user.password !== password) {
    throw new Error("Emailul sau parola nu sunt corecte.");
  }

  window.localStorage.setItem(SESSION_KEY, user.email);
  notifyAuthChange();
  return toPublicUser(user);
}

export function logoutMockUser() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(SESSION_KEY);
  notifyAuthChange();
}

export function updateMockUser(input: {
  name: string;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
}): MockUser {
  if (!canUseStorage()) {
    throw new Error("Profilul nu poate fi actualizat în acest mediu.");
  }

  const currentEmail = window.localStorage.getItem(SESSION_KEY);
  const users = readUsers();
  const currentUser = users.find((user) => user.email === currentEmail);

  if (!currentUser) {
    throw new Error("Sesiunea a expirat. Conectează-te din nou.");
  }

  const name = input.name.trim();
  if (name.length < 2) {
    throw new Error("Numele trebuie să conțină cel puțin 2 caractere.");
  }

  const updatedUser: StoredUser = {
    ...currentUser,
    name,
    accessibilityProfile: input.accessibilityProfile,
    avatarUrl: input.avatarUrl,
  };

  writeUsers(
    users.map((user) => (user.id === currentUser.id ? updatedUser : user)),
  );
  notifyAuthChange();
  return toPublicUser(updatedUser);
}

export function requestMockPasswordReset(emailInput: string) {
  const email = normalizeEmail(emailInput);
  const exists = readUsers().some((user) => user.email === email);
  return { accepted: true, exists };
}

export function requireMockAdmin(): MockUser {
  const user = getCurrentMockUser();
  if (user?.role !== "ADMIN")
    throw new Error("Această acțiune este disponibilă doar administratorului.");
  return user;
}

export function getMockUsers(): MockUser[] {
  requireMockAdmin();
  return readUsers().map(toPublicUser);
}
