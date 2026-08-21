import type {
  ApiResponse,
  AuditEvent,
  BreachStatusResponse,
  Credential,
  CredentialHistoryVersion,
  CredentialShare,
  DeviceSession,
  NotificationItem,
  Passkey,
  PasswordHealthResponse,
  SharesListResponse,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

// In-memory CSRF token store, synchronized with sessionStorage for tab lifecycle persistence
let csrfTokenInMemory: string | null = null;

export function getCsrfToken(): string | null {
  if (csrfTokenInMemory) {
    return csrfTokenInMemory;
  }
  if (typeof window !== "undefined") {
    try {
      const stored = window.sessionStorage.getItem("vaultly_csrf");
      if (stored) {
        csrfTokenInMemory = stored;
        return stored;
      }
    } catch {
      // Ignore storage access errors (e.g. sandboxed iframes or private mode restrictions)
    }
  }
  return null;
}

export function setCsrfToken(token: string | null | undefined): void {
  csrfTokenInMemory = token || null;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        window.sessionStorage.setItem("vaultly_csrf", token);
      } else {
        window.sessionStorage.removeItem("vaultly_csrf");
      }
    } catch {
      // Ignore storage access errors
    }
  }
}

export function clearCsrfToken(): void {
  setCsrfToken(null);
}

function extractAndStoreCsrfToken(data: unknown): string | null {
  if (data && typeof data === "object") {
    const directToken = (data as Record<string, unknown>).csrfToken;
    if (typeof directToken === "string" && directToken.length > 0) {
      setCsrfToken(directToken);
      return directToken;
    }
    const nestedData = (data as Record<string, unknown>).data;
    if (nestedData && typeof nestedData === "object") {
      const nestedToken = (nestedData as Record<string, unknown>).csrfToken;
      if (typeof nestedToken === "string" && nestedToken.length > 0) {
        setCsrfToken(nestedToken);
        return nestedToken;
      }
    }
  }
  return null;
}

let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      const currentCsrf = getCsrfToken();
      if (currentCsrf) {
        headers["X-CSRF-Token"] = currentCsrf;
      }

      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers,
        cache: "no-store",
      });

      if (!res.ok) {
        clearCsrfToken();
        return false;
      }

      const body = await res.json().catch(() => ({}));
      extractAndStoreCsrfToken(body);
      return true;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

function handleSessionExpired() {
  clearCsrfToken();
  if (typeof window !== "undefined") {
    const pathname = window.location.pathname;
    const isAuthRoute =
      pathname === "/login" ||
      pathname === "/register" ||
      pathname === "/mfa";

    if (!isAuthRoute) {
      window.dispatchEvent(
        new CustomEvent("vaultly:session-expired", {
          detail: { message: "Your session has expired. Please sign in again." },
        })
      );
      window.location.href = "/login";
    }
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const isPublicAuthEndpoint =
    path === "/auth/login" ||
    path === "/auth/register" ||
    path === "/auth/mfa/verify" ||
    path === "/auth/passkeys/check" ||
    path === "/auth/passkeys/auth/begin" ||
    path === "/auth/passkeys/auth/finish" ||
    path === "/auth/refresh";

  const method = (options.method || "GET").toUpperCase();
  const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (options.headers) {
    if (options.headers instanceof Headers) {
      options.headers.forEach((value, key) => {
        headers[key] = value;
      });
    } else if (Array.isArray(options.headers)) {
      options.headers.forEach(([key, value]) => {
        headers[key] = value;
      });
    } else {
      Object.assign(headers, options.headers);
    }
  }

  // For mutating protected requests, ensure CSRF token is available
  if (isMutating && !isPublicAuthEndpoint) {
    let csrf = getCsrfToken();
    if (!csrf && !isRetry) {
      // Proactively refresh to get CSRF token if session cookies are present
      await attemptRefresh();
      csrf = getCsrfToken();
    }
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: "include",
    headers,
    cache: "no-store",
  });

  if (response.status === 401 && !isPublicAuthEndpoint && !isRetry) {
    // Attempt automatic token refresh
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry the original request once
      return request<T>(path, options, true);
    } else {
      handleSessionExpired();
      throw new Error("Your session has expired. Please sign in again.");
    }
  }

  // Handle 403 CSRF mismatch by attempting token refresh and retrying once
  if (response.status === 403 && !isPublicAuthEndpoint && !isRetry) {
    const errorBody = await response.clone().json().catch(() => ({}));
    const message = (errorBody?.message || "").toString().toLowerCase();
    if (message.includes("csrf")) {
      const refreshed = await attemptRefresh();
      if (refreshed) {
        return request<T>(path, options, true);
      }
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !isPublicAuthEndpoint) {
      handleSessionExpired();
      throw new Error("Your session has expired. Please sign in again.");
    }

    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  if (response.status === 204) return undefined as T;

  const body = await response.json();
  // Automatically capture and store CSRF token from any response
  extractAndStoreCsrfToken(body);

  return (body as ApiResponse<T>).data ?? body;
}

export const api = {
  auth: {
    me: () => request<User>("/auth/me"),
    login: (payload: { email: string; password: string }) =>
      request<{ mfaRequired: boolean; user?: User; mfaToken?: string; csrfToken?: string }>(
        "/auth/login",
        { method: "POST", body: JSON.stringify(payload) }
      ),
    register: (payload: { name: string; email: string; password: string }) =>
      request<User>("/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    logout: async () => {
      try {
        return await request<void>("/auth/logout", { method: "POST" });
      } finally {
        clearCsrfToken();
      }
    },
    verifyMfa: (payload: { code: string }) =>
      request<{ user?: User; csrfToken?: string }>("/auth/mfa/verify", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    setupMfa: () =>
      request<{ otpauthUrl: string }>("/auth/mfa/setup", {
        method: "POST",
      }),
    enableMfa: (code: string) =>
      request<{ enabled: boolean }>("/auth/mfa/enable", {
        method: "POST",
        body: JSON.stringify({ code }),
      }),
    changePassword: async (payload: { currentPassword: string; newPassword: string }) => {
      try {
        return await request<{ ok: boolean; message: string }>("/auth/change-password", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      } finally {
        clearCsrfToken();
      }
    },
    verifyPassword: (password: string) =>
      request<{ valid: boolean }>("/auth/verify-password", {
        method: "POST",
        body: JSON.stringify({ password }),
      }),
  },
  credentials: {
    list: (query = "") =>
      request<Credential[]>(
        `/credentials${query ? `?search=${encodeURIComponent(query)}` : ""}`
      ),
    get: (id: string) => request<Credential>(`/credentials/${id}`),
    create: (payload: Partial<Credential>) =>
      request<Credential>("/credentials", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    update: (id: string, payload: Partial<Credential>) =>
      request<Credential>(`/credentials/${id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    remove: (id: string) =>
      request<void>(`/credentials/${id}`, { method: "DELETE" }),
    reveal: (id: string) =>
      request<{ password: string }>(`/credentials/${id}/reveal`, {
        method: "POST",
      }),
    generate: (options?: Record<string, unknown>) =>
      request<{ password: string }>("/credentials/generate-password", {
        method: "POST",
        body: JSON.stringify(options || {}),
      }),
    health: () => request<PasswordHealthResponse>("/credentials/health"),
    history: (id: string) =>
      request<CredentialHistoryVersion[]>(`/credentials/${id}/history`),
    getHistoryVersion: (id: string, version: number) =>
      request<CredentialHistoryVersion>(`/credentials/${id}/history/${version}`),
    restoreVersion: (id: string, version: number) =>
      request<Credential>(`/credentials/${id}/history/${version}/restore`, {
        method: "POST",
      }),
    revealHistoryPassword: (id: string, version: number) =>
      request<{ password: string }>(
        `/credentials/${id}/history/${version}/reveal-password`,
        { method: "POST" }
      ),
  },
  breach: {
    getStatus: () => request<BreachStatusResponse>("/breach/status"),
    check: () => request<BreachStatusResponse>("/breach/check", { method: "POST" }),
  },
  passkeys: {
    list: () => request<Passkey[]>("/auth/passkeys"),
    check: (email: string) =>
      request<{ hasPasskey: boolean }>("/auth/passkeys/check", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    beginRegistration: () =>
      request<any>("/auth/passkeys/register/begin", { method: "POST" }),
    finishRegistration: (response: any, name?: string) =>
      request<{ verified: boolean; passkey: Passkey }>(
        "/auth/passkeys/register/finish",
        {
          method: "POST",
          body: JSON.stringify({ response, name }),
        }
      ),
    beginAuthentication: (email?: string) =>
      request<any>("/auth/passkeys/auth/begin", {
        method: "POST",
        body: JSON.stringify({ email }),
      }),
    finishAuthentication: (body: any) =>
      request<{ user: User; csrfToken?: string }>(
        "/auth/passkeys/auth/finish",
        {
          method: "POST",
          body: JSON.stringify(body),
        }
      ),
    revoke: (id: string) =>
      request<void>(`/auth/passkeys/${id}`, { method: "DELETE" }),
  },
  shares: {
    list: () => request<SharesListResponse>("/shares"),
    create: (payload: {
      credentialId: string;
      recipientEmail: string;
      permission?: "READ" | "READ_WRITE";
      expiresAt?: string;
    }) =>
      request<CredentialShare>("/shares", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    accept: (id: string) =>
      request<{ ok: boolean; status: string }>(`/shares/${id}/accept`, {
        method: "POST",
      }),
    decline: (id: string) =>
      request<{ ok: boolean; status: string }>(`/shares/${id}/decline`, {
        method: "POST",
      }),
    revoke: (id: string) =>
      request<{ ok: boolean; status: string }>(`/shares/${id}/revoke`, {
        method: "DELETE",
      }),
    reveal: (id: string) =>
      request<{ password: string }>(`/shares/${id}/reveal`),
  },
  audit: {
    list: () => request<AuditEvent[]>("/audit-logs"),
  },
  devices: {
    list: () => request<DeviceSession[]>("/auth/sessions"),
    revoke: (id: string) =>
      request<void>(`/auth/sessions/${id}`, { method: "DELETE" }),
    revokeOthers: () =>
      request<void>("/auth/sessions/revoke-others", { method: "POST" }),
  },
  notifications: {
    list: () => request<NotificationItem[]>("/notifications"),
    markRead: (id: string) =>
      request<void>(`/notifications/${id}/read`, { method: "POST" }),
  },
  admin: {
    users: () => request<User[]>("/admin/users"),
    updateRole: (id: string, role: User["role"]) =>
      request<User>(`/admin/users/${id}/role`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      }),
    disableUser: (id: string) =>
      request<void>(`/admin/users/${id}/disable`, { method: "POST" }),
  },
};
