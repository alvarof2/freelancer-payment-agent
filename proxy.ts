import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data).then((buf) => Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

async function isAuthenticated(request: NextRequest) {
  const password = process.env.DEMO_ADMIN_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!password || !secret || !token) return false;
  const expected = await sha256Hex(`${password}:${secret}`);
  return token === expected;
}

function isProtectedPage(pathname: string) {
  if (pathname === "/") return true;
  if (pathname === "/roadmap") return true;
  if (pathname.startsWith("/invoices")) return true;
  return false;
}

function isProtectedApi(pathname: string) {
  return [
    "/api/invoices/reset",
    "/api/reconciliation/poll",
    "/api/webhooks/payments/test",
  ].includes(pathname)
    || /^\/api\/invoices\/[^/]+\/(status|reminder)$/.test(pathname);
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname === "/favicon.ico" || pathname.startsWith("/pay/") || pathname === "/login" || pathname === "/api/auth/login" || pathname === "/api/auth/logout") {
    return NextResponse.next();
  }

  if (pathname === "/api/invoices" && request.method === "POST") {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedApi(pathname)) {
    if (!(await isAuthenticated(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  if (isProtectedPage(pathname)) {
    if (!(await isAuthenticated(request))) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!.*\\..*).*)"],
};
