import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const OPERATIONS_PREFIX = "/operations";
const OPERATIONS_LOGIN_PATH = "/operations/login";
const AUTH_SESSION_COOKIE_KEY = "mc.auth.session";

/**
 * @description Guards admin operations routes and redirects unauthenticated users to login.
 * @param request Incoming Next.js request.
 * @returns Redirect response or continue response.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith(OPERATIONS_PREFIX)) {
    return NextResponse.next();
  }

  const hasSessionCookie = request.cookies.get(AUTH_SESSION_COOKIE_KEY)?.value === "1";
  if (pathname === OPERATIONS_LOGIN_PATH) {
    if (!hasSessionCookie) {
      return NextResponse.next();
    }

    const dashboardUrl = new URL("/operations/dashboard", request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  if (hasSessionCookie) {
    return NextResponse.next();
  }

  const loginUrl = new URL(OPERATIONS_LOGIN_PATH, request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/operations/:path*"]
};
