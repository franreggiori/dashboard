import { cookies } from "next/headers";

const SESSION = "admin_session";

export function isAuthenticated() {
  return cookies().get(SESSION)?.value === "ok";
}

export function setSession() {
  cookies().set(SESSION, "ok", { httpOnly: true, sameSite: "lax", path: "/" });
}

export function clearSession() {
  cookies().delete(SESSION);
}
