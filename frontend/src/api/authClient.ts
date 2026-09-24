export interface LoginSuccess {
  token: string;
  username: string;
  fullName: string;
  role: string;
  modules: string[];
  actions: string[];
}

export class AuthApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

// Generic, non-sensitive message shown regardless of *why* login failed —
// the backend already returns a generic 401 detail, this is the fallback
// for network/unexpected-shape failures so the UI never leaks internals.
const GENERIC_LOGIN_ERROR = "Invalid username/email or password.";

export async function login(identifier: string, password: string): Promise<LoginSuccess> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier, password }),
  });

  if (!response.ok) {
    let detail = GENERIC_LOGIN_ERROR;
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new AuthApiError(response.status, detail);
  }

  const body = await response.json();
  return {
    token: body.token,
    username: body.username,
    fullName: body.full_name,
    role: body.role,
    modules: body.modules,
    actions: body.actions,
  };
}

export async function performRestrictedAction(token: string): Promise<{ status: string }> {
  const response = await fetch(`${API_BASE_URL}/modules/staff-management/actions/manage-users`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    let detail = "You do not have permission to perform this action.";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
      }
    } catch {
      // Non-JSON error body — keep the generic message.
    }
    throw new AuthApiError(response.status, detail);
  }

  return response.json();
}
