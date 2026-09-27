import { auth0 } from "@/lib/auth0";

// Next.js 16 network-boundary hook (replaces middleware.ts). The Auth0 SDK
// v4 mounts all of its authentication routes (/auth/login, /auth/logout,
// /auth/callback, /auth/profile, /auth/access-token, ...) here and also
// handles rolling session cookies on every other request.
export async function proxy(request: Request) {
  return await auth0.middleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)"],
};
