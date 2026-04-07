import { cookies } from "next/headers";

export const SESSION_COOKIE = "wm_session";
export const SESSION_SECRET = "wm_2026_xk9p_secure";
export const CORRECT_PASSWORD = "Copado135$";

export function setSession() {
  cookies().set(SESSION_COOKIE, SESSION_SECRET, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export function clearSession() {
  cookies().delete(SESSION_COOKIE);
}
