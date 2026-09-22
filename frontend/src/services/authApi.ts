import { apiRequest } from "./apiClient";

export type AppRole = "USER" | "ADMIN";
export type AccessibilityProfile =
  | "WHEELCHAIR"
  | "WALKING_AID"
  | "VISUAL_IMPAIRMENT";

export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
  createdAt: string;
};

type ApiRole = "User" | "Administrator";
type ApiAccessibilityProfile = "Wheelchair" | "WalkingAid" | "VisualImpairment";

export type ApiUser = {
  id: number;
  name: string;
  email: string;
  role: ApiRole;
  accessibilityProfile: ApiAccessibilityProfile;
  avatarUrl: string | null;
  createdAt: string;
};

type ApiAuthResponse = ApiUser & {
  token: string;
  expiresAt: string;
};

export type AuthResult = {
  user: AppUser;
  token: string;
  expiresAt: string;
};

export type AuthVerification = {
  verificationToken: string;
  email: string;
  expiresAt: string;
};

const roles: Record<ApiRole, AppRole> = {
  User: "USER",
  Administrator: "ADMIN",
};

const profiles: Record<ApiAccessibilityProfile, AccessibilityProfile> = {
  Wheelchair: "WHEELCHAIR",
  WalkingAid: "WALKING_AID",
  VisualImpairment: "VISUAL_IMPAIRMENT",
};

const apiProfiles: Record<AccessibilityProfile, ApiAccessibilityProfile> = {
  WHEELCHAIR: "Wheelchair",
  WALKING_AID: "WalkingAid",
  VISUAL_IMPAIRMENT: "VisualImpairment",
};

export function mapApiUser(user: ApiUser): AppUser {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: roles[user.role],
    accessibilityProfile: profiles[user.accessibilityProfile],
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  };
}

export async function requestLoginCode(email: string, password: string): Promise<AuthVerification> {
  return apiRequest<AuthVerification>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function verifyLoginCode(verificationToken: string, code: string): Promise<AuthResult> {
  const response = await apiRequest<ApiAuthResponse>("/auth/login/verify", {
    method: "POST",
    body: JSON.stringify({ verificationToken, code }),
  });
  return { user: mapApiUser(response), token: response.token, expiresAt: response.expiresAt };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  accessibilityProfile: AccessibilityProfile;
}): Promise<AuthResult> {
  const response = await apiRequest<ApiAuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      ...input,
      accessibilityProfile: apiProfiles[input.accessibilityProfile],
    }),
  });
  return { user: mapApiUser(response), token: response.token, expiresAt: response.expiresAt };
}

export async function getCurrentUser() {
  return mapApiUser(await apiRequest<ApiUser>("/auth/me"));
}

export async function updateProfile(input: {
  name: string;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
}) {
  return mapApiUser(await apiRequest<ApiUser>("/auth/profile", {
    method: "PUT",
    body: JSON.stringify({
      ...input,
      accessibilityProfile: apiProfiles[input.accessibilityProfile],
    }),
  }));
}

export async function changePassword(currentPassword: string, newPassword: string) {
  await apiRequest<void>("/auth/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
