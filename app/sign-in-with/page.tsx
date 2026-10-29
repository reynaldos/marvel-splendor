import { redirect } from "next/navigation";

import { NOTICE_BUTTON, NoticeScreen } from "@/components/lobby/NoticeScreen";
import { auth0 } from "@/lib/auth0";
import { otherSignIn } from "@/lib/get-or-create-user";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata("Sign in", undefined, true);

/** Each way in, by the start of its Auth0 user id: what to call it, and the connection that signs in with it. */
const METHODS: Record<string, { label: string; connection: string }> = {
  "google-oauth2": { label: "Google", connection: "google-oauth2" },
  auth0: { label: "email", connection: "Username-Password-Authentication" },
};

// Where a sign-in lands when its email already has an account that signs in another way.
export default async function SignInWithPage() {
  const session = await auth0.getSession();
  if (!session) redirect("/");
  const method = await otherSignIn(session.user);
  if (!method) redirect("/");
  const { label, connection } = METHODS[method] ?? { label: method, connection: method };
  const email = session.user.email!;

  return (
    <NoticeScreen title={`Sign in with ${label}`} message={`${email} already has an account. Sign in with ${label} to play on it.`}>
      <a href={`/auth/login?${new URLSearchParams({ connection, login_hint: email, returnTo: "/" })}`} className={NOTICE_BUTTON}>
        Continue with {label}
      </a>
      <a href="/auth/logout" className="text-xs text-cosmos-300 underline hover:text-white">
        Sign out
      </a>
    </NoticeScreen>
  );
}
