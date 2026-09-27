import { Auth0Client } from "@auth0/nextjs-auth0/server";

// Single shared Auth0 SDK v4 client. Reads AUTH0_DOMAIN, AUTH0_CLIENT_ID,
// AUTH0_CLIENT_SECRET, AUTH0_SECRET, and APP_BASE_URL from the environment
// (see .env.example). The SDK mounts its own routes (/auth/login,
// /auth/logout, /auth/callback, /auth/profile, ...) via `proxy.ts` — there is
// no catch-all route handler to write for this SDK major version.
export const auth0 = new Auth0Client();
