import { apiRequest } from "./apiClient";
import {
  mapApiUser,
  type AccessibilityProfile,
  type ApiUser,
  type AppRole,
} from "./authApi";

export type ManagedUserInput = {
  name: string;
  email: string;
  role: AppRole;
  accessibilityProfile: AccessibilityProfile;
  avatarUrl: string | null;
};

export type NewManagedUserInput = ManagedUserInput & {
  password: string;
};

const apiRoles: Record<AppRole, "User" | "Administrator"> = {
  USER: "User",
  ADMIN: "Administrator",
};

const apiProfiles: Record<AccessibilityProfile, "Wheelchair" | "WalkingAid" | "VisualImpairment"> = {
  WHEELCHAIR: "Wheelchair",
  WALKING_AID: "WalkingAid",
  VISUAL_IMPAIRMENT: "VisualImpairment",
};

function toApiUserInput(input: ManagedUserInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    role: apiRoles[input.role],
    accessibilityProfile: apiProfiles[input.accessibilityProfile],
    avatarUrl: input.avatarUrl?.trim() || null,
  };
}

export async function getApiUsers() {
  const users = await apiRequest<ApiUser[]>("/users");
  return users.map(mapApiUser);
}

export async function createApiUser(input: NewManagedUserInput) {
  const user = await apiRequest<ApiUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      ...toApiUserInput(input),
      password: input.password,
    }),
  });
  return mapApiUser(user);
}

export async function updateApiUser(id: string, input: ManagedUserInput) {
  const user = await apiRequest<ApiUser>(`/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(toApiUserInput(input)),
  });
  return mapApiUser(user);
}

export async function resetApiUserPassword(id: string, newPassword: string) {
  await apiRequest<void>(`/users/${id}/password`, {
    method: "PUT",
    body: JSON.stringify({ newPassword }),
  });
}

export async function deleteApiUser(id: string) {
  await apiRequest<void>(`/users/${id}`, { method: "DELETE" });
}
