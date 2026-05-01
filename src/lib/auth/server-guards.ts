import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveSessionFromCookies } from "@/lib/auth/session";

// cache() deduplicates within RSC render trees only — not valid in Route Handlers
export const getServerUser = cache(async () => {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);
  return resolved.user;
});

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
