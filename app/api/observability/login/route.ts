import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { username, password } = await request.json().catch(() => ({}));
  const expectedUsername = process.env.OBSERVABILITY_USERNAME;
  const expectedPassword = process.env.OBSERVABILITY_PASSWORD;
  if (!expectedUsername || !expectedPassword) {
    return NextResponse.json({ error: "Authentication is not configured." }, { status: 404 });
  }
  if (username !== expectedUsername || password !== expectedPassword) {
    return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
  }

  const token = btoa(`Basic ${btoa(`${expectedUsername}:${expectedPassword}`)}`);
  const response = NextResponse.json({ ok: true });
  response.cookies.set("governance_session", token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  return response;
}
