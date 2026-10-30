import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const locale = request.nextUrl.pathname === "/zh" || request.nextUrl.pathname.startsWith("/zh/") ||
    request.nextUrl.pathname.startsWith("/articles") ||
    request.nextUrl.pathname.startsWith("/resume") ||
    request.nextUrl.pathname.startsWith("/observability") ? "zh" : "en";
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico).*)"],
};
