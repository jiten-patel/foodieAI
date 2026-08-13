"use client";

import { signIn as nextAuthSignIn } from "next-auth/react";

/**
 * Login is two calls, not one:
 *  1. A direct browser-side fetch to the backend's own login endpoint
 *     (proxied same-origin via /api/backend/auth/login) — this is what
 *     actually lands the backend's httpOnly access_token/refresh_token
 *     cookies in the browser, which every other /api/* call depends on.
 *  2. NextAuth's signIn(), which re-checks the same credentials and creates
 *     NextAuth's own session (used by middleware/proxy and useSession() for
 *     role-based UI, separate from the backend's cookie).
 */
export async function loginUser(email, password) {
  const res = await fetch("/api/backend/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Invalid email or password");
  }

  const result = await nextAuthSignIn("credentials", {
    email,
    password,
    redirect: false,
  });
  if (result?.error) throw new Error(result.error);

  return res.json();
}

export async function registerUser(email, password, name) {
  const res = await fetch("/api/backend/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || "Registration failed");
  }
  return res.json();
}
