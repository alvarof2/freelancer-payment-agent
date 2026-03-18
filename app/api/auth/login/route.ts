import { NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, getExpectedSessionToken, isValidPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({})) as { password?: string };

  if (!body.password || !(await isValidPassword(body.password))) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: await getExpectedSessionToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
