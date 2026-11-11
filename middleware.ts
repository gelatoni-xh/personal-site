import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isLoginPage = /^\/(?:[a-z]{2}\/)?observability\/login(?:\/|$)/.test(path);
  const isLoginApi = path === "/api/observability/login";
  if (
    !isLoginPage && !isLoginApi &&
    (/^\/(?:[a-z]{2}\/)?observability(?:\/|$)/.test(path) ||
      path.startsWith("/api/observability/"))
  ) {
    const username = process.env.OBSERVABILITY_USERNAME;
    const password = process.env.OBSERVABILITY_PASSWORD;
    const authorization = request.headers.get("authorization");
    const session = request.cookies.get("governance_session")?.value;
    const expected =
      username && password ? `Basic ${btoa(`${username}:${password}`)}` : null;
    if (!expected || (authorization !== expected && session !== btoa(expected))) {
      if (/^\/(?:[a-z]{2}\/)?observability(?:\/|$)/.test(path)) {
        const locale = path.startsWith("/zh/") ? "zh" : "en";
        return NextResponse.redirect(new URL(`/${locale}/observability/login`, request.url));
      }
      return new NextResponse("Authentication required", {
        status: expected ? 401 : 404,
      });
    }
  }
  const locale =
    request.nextUrl.pathname === "/zh" ||
    request.nextUrl.pathname.startsWith("/zh/") ||
    request.nextUrl.pathname.startsWith("/articles") ||
    request.nextUrl.pathname.startsWith("/resume") ||
    request.nextUrl.pathname.startsWith("/observability")
      ? "zh"
      : "en";
  const headers = new Headers(request.headers);
  headers.set("x-site-locale", locale);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!_next/|api/|favicon.ico).*)", "/api/observability/:path*"],
};
