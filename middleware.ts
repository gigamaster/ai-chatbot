import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Skip middleware for API routes to prevent infinite loops
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Check for local user in cookies
  const localUserCookie = request.cookies.get("local_user");

  // If no local user, allow access to root page which will handle client-side auth
  if (!localUserCookie) {
    // Allow access to root page and auth pages
    if (
      pathname === "/" ||
      pathname.startsWith("/local-login") ||
      pathname.startsWith("/local-register")
    ) {
      return NextResponse.next();
    }

    // Redirect other pages to root for client-side auth handling
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Parse the local user
  let localUser = null;
  try {
    localUser = JSON.parse(localUserCookie.value);
    console.log("Parsed user:", localUser);
  } catch (e) {
    console.log("Failed to parse user cookie, allowing access to root page");
    // If parsing fails, allow access to root page for client-side handling
    if (pathname === "/") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Check if user is trying to access auth pages while already logged in
  if (
    localUser &&
    (pathname === "/local-login" || pathname === "/local-register")
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/chat/:id",
    "/api/:path*",
    "/local-login",
    "/local-register",
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
