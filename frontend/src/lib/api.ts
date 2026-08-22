const API_BASE = (import.meta.env.VITE_API_URL as string) || "http://localhost:8080";

const TOKEN_KEY = "dayflow_token";
const ROLE_KEY = "dayflow_role";

// Set to true to bypass authentication redirects for UI testing & development.
// Change to false for final production push to enforce JWT authentication.
export const AUTH_BYPASS_MODE = true;

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const storedToken = localStorage.getItem(TOKEN_KEY);
  if (AUTH_BYPASS_MODE) {
    return storedToken || "demo-bypass-token";
  }
  return storedToken;
}

export function getRole(): string | null {
  if (typeof window === "undefined") return null;
  const storedRole = localStorage.getItem(ROLE_KEY);
  if (AUTH_BYPASS_MODE) {
    return storedRole || "admin";
  }
  return storedRole;
}

export function setSession(token: string, role: string) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch {
      // response wasn't JSON — keep the generic message
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
