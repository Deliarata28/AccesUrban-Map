// In development Vite forwards this relative path to the .NET API.  A deployed
// frontend can override it with VITE_API_URL, without changing application code.
const configuredApiUrl = import.meta.env.VITE_API_URL ?? "/api/v1";

export const apiUrl = configuredApiUrl.replace(/\/$/, "");

const tokenKey = "accesurban.jwt";

const storage = () =>
  typeof window === "undefined" ? null : window.sessionStorage;

export function getAccessToken() {
  return storage()?.getItem(tokenKey) ?? null;
}

export function saveAccessToken(token: string) {
  storage()?.setItem(tokenKey, token);
}

export function clearAccessToken() {
  storage()?.removeItem(tokenKey);
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly traceId?: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  const token = getAccessToken();

  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return undefined as T;

  const body = await response.json().catch(() => null) as
    | { message?: string; title?: string; code?: string; Code?: string; traceId?: string; TraceId?: string }
    | null;

  if (!response.ok) {
    throw new ApiError(
      body?.message ?? body?.title ?? "Cererea către server nu a reușit.",
      response.status,
      body?.traceId ?? body?.TraceId ?? response.headers.get("X-Trace-Id") ?? undefined,
      body?.code ?? body?.Code ?? undefined,
    );
  }

  return body as T;
}
