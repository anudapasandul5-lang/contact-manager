import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSessionFromCookies } from "@/lib/auth/session";

export async function getServerUser() {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);
  return resolved.user;
}

export async function redirectIfUnauthenticated() {
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }
}

export async function redirectIfAuthenticated() {
  const user = await getServerUser();
  if (user) {
    redirect("/mind-map");
  }
}
