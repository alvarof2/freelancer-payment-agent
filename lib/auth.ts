import { cookies } from "next/headers";

export const AUTH_COOKIE_NAME = "demo_operator_session";

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required auth env: ${name}`);
  return value;
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function getExpectedSessionToken() {
  const password = requireEnv("DEMO_ADMIN_PASSWORD");
  const secret = requireEnv("SESSION_SECRET");
  return sha256(`${password}:${secret}`);
}

export async function isValidPassword(password: string) {
  const expected = process.env.DEMO_ADMIN_PASSWORD;
  if (!expected) throw new Error("Missing required auth env: DEMO_ADMIN_PASSWORD");
  return password === expected;
}

export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return false;
  return token === await getExpectedSessionToken();
}

export function getLoginRedirect(next?: string) {
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    return `/login?next=${encodeURIComponent(next)}`;
  }
  return "/login";
}
