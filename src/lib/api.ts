"use client";

/**
 * HTTP client for user-svc.
 *
 * Every response is the service's envelope: { status, data, error }. The
 * `data` is unwrapped here so callers never see the wrapper, and a 401 is
 * turned into a single well-known error type so the shell can send people
 * back to login from one place instead of every call site.
 */

const BASE =
  process.env.NEXT_PUBLIC_USER_SVC_URL?.replace(/\/+$/, "") ??
  "http://localhost:8080/user-svc-smm/api/v1";

export const DRIVE_BASE =
  process.env.NEXT_PUBLIC_PUCKOOPS_BE_URL?.replace(/\/+$/, "") ??
  "http://localhost:8082/puckoops-be/api/v1";

const TOKEN_KEY = "puckoops.token";
const USER_KEY = "puckoops.user";

export class Unauthorized extends Error {
  constructor() {
    super("Your session has expired");
    this.name = "Unauthorized";
  }
}

/** Carries the HTTP status so a caller can branch on it. Login uses 403 for
 *  "correct password, address not confirmed" and 400 for a bad password. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface Envelope<T> {
  status: number;
  data: T;
  error: boolean;
  /** Set on failures. The services put the reason here, not in `data`. */
  message?: string;
}

export function token(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

async function request<T>(
  base: string,
  path: string,
  init: RequestInit & { auth?: boolean } = {},
): Promise<T> {
  const { auth = true, headers, ...rest } = init;
  const bearer = auth ? token() : null;

  if (auth && !bearer) throw new Unauthorized();

  const res = await fetch(`${base}${path}`, {
    ...rest,
    headers: {
      "content-type": "application/json",
      ...(bearer ? { authorization: `Bearer ${bearer}` } : {}),
      ...headers,
    },
  });

  if (res.status === 401) {
    clearSession();
    throw new Unauthorized();
  }

  const json = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || !json || json.error) {
    // The services put the reason in `message`. Reading `data` instead
    // turned every refusal into "Request failed (403)" and threw away the
    // sentence written to be shown to the user.
    throw new ApiError(res.status, json?.message ?? `Request failed (${res.status})`);
  }
  return json.data;
}

/** One implementation, two services: the session and the 401 are shared. */
export function makeClient(base: string) {
  return {
    get: <T,>(path: string) => request<T>(base, path),
    post: <T,>(path: string, body: unknown, opts: { auth?: boolean } = {}) =>
      request<T>(base, path, { method: "POST", body: JSON.stringify(body), ...opts }),
    put: <T,>(path: string, body: unknown) =>
      request<T>(base, path, { method: "PUT", body: JSON.stringify(body) }),
    patch: <T,>(path: string, body: unknown) =>
      request<T>(base, path, { method: "PATCH", body: JSON.stringify(body) }),
    del: <T,>(path: string) => request<T>(base, path, { method: "DELETE" }),
  };
}

export const api = makeClient(BASE);

/* ---------------------------------------------------------------- auth -- */

export interface Me {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  phone_number?: string;
  country_code?: string;
  role: string;
  plan: string;
  quota_bytes: number;
  is_verified: boolean;
  is_onboarded: boolean;
}

export interface Person {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface LoginResponse {
  token: string;
  expire_at: number;
  user: { id: string; email: string; name: string; role: string };
}

export async function login(email: string, password: string): Promise<Me> {
  const data = await api.post<LoginResponse>("/user/login", { email, password }, { auth: false });
  window.localStorage.setItem(TOKEN_KEY, data.token);
  // Cached so the shell can paint before /users/me resolves; the server
  // remains the source of truth and overwrites this on load.
  window.localStorage.setItem(
    USER_KEY,
    JSON.stringify({ id: data.user.id, name: data.user.name, email: data.user.email }),
  );
  return me();
}

/** Asks for a fresh confirmation link. Always resolves: the service answers
 *  the same way whether or not the address has an unverified account. */
export async function resendVerification(email: string): Promise<void> {
  await api.post<string>(
    "/user/resend-verification",
    { email, verify_url: `${window.location.origin}/verify` },
    { auth: false },
  );
}

export async function signUp(input: {
  name: string;
  email: string;
  password: string;
  phoneNumber: string;
  countryCode: string;
}): Promise<void> {
  await api.post<string>(
    "/user/signup",
    {
      name: input.name,
      email: input.email,
      password: input.password,
      phone_number: input.phoneNumber,
      country_code: input.countryCode,
      region: "india",
      role: "member",
      verify_url: `${window.location.origin}/verify`,
    },
    { auth: false },
  );
}

/** Confirms the address using the token from the signup email. Idempotent
 *  server-side, so a second click is a success rather than an error. */
export async function verifyEmail(token: string): Promise<Me> {
  return api.post<Me>("/user/verify-email", { token }, { auth: false });
}

export function me(): Promise<Me> {
  return api.get<Me>("/users/me");
}

export function cachedUser(): { id: string; name: string; email: string } | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw || !token()) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);
}

/* ----------------------------------------------------------- directory -- */

/** Resolves an email to an account. Returns null when nobody matches, so
 *  the share dialog can say so rather than treating it as a failure. */
export async function lookupPerson(email: string): Promise<Person | null> {
  try {
    // URLSearchParams, not string concatenation: a "+" in an email is a
    // space once it reaches a query string.
    const qs = new URLSearchParams({ email });
    return await api.get<Person>(`/users/lookup?${qs}`);
  } catch (err) {
    if (err instanceof Unauthorized) throw err;
    return null;
  }
}

export function searchPeople(query: string, limit = 6): Promise<Person[]> {
  const qs = new URLSearchParams({ q: query, limit: String(limit) });
  return api.get<Person[]>(`/users/search?${qs}`);
}

export function batchPeople(ids: string[]): Promise<Person[]> {
  if (ids.length === 0) return Promise.resolve([]);
  return api.post<Person[]>("/users/batch", { ids });
}
