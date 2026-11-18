import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const locale = path === "/zh" || path.startsWith("/zh/") || path.startsWith("/articles") || path.startsWith("/resume") ? "zh" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ["/((?!_next/|api/|favicon.ico).*)"] };
