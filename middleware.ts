import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  console.log("Middleware processing request for:", pathname);

  /*
   * Playwright starts the dev server and requires a 200 status to
   * begin the tests, so this ensures that the tests can start
   */
  if (pathname.startsWith("/ping")) {
    return new Response("pong", { status: 200 });
  }

  // Skip middleware for API routes to prevent infinite loops
  if (pathname.startsWith("/api/")) {
    console.log("Skipping middleware for API route");
    return NextResponse.next();
  }

  // Check for local user in cookies
  const localUserCookie = request.cookies.get("local_user");
  console.log("Local user cookie:", localUserCookie);

  // If no local user, redirect to login page
  if (!localUserCookie) {
    console.log("No user found, redirecting to login");
    // Only redirect if we're not already on an auth page
    if (
      !pathname.startsWith("/local-login") &&
      !pathname.startsWith("/local-register")
    ) {
      return NextResponse.redirect(new URL("/local-login", request.url));
    }
    // For auth pages, allow access
    console.log("On auth page, allowing access");
    return NextResponse.next();
  }

  // Parse the local user
  let localUser = null;
  try {
    localUser = JSON.parse(localUserCookie.value);
    console.log("Parsed user:", localUser);
  } catch (e) {
    console.log("Failed to parse user cookie, redirecting to login");
    // If parsing fails, redirect to local login
    return NextResponse.redirect(new URL("/local-login", request.url));
  }

  // Check if user is trying to access auth pages while already logged in
  if (
    localUser &&
    (pathname === "/local-login" || pathname === "/local-register")
  ) {
    console.log("User already logged in, redirecting to home");
    return NextResponse.redirect(new URL("/", request.url));
  }

  console.log("Allowing access to protected route");
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
