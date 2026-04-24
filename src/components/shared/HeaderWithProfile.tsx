import { cookies } from "next/headers";
import { resolveSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveAvatarUrl } from "@/lib/media/media";
import { Header } from "./Header";

export async function HeaderWithProfile() {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);

  if (!resolved.user) {
    return <Header />;
  }

  const supabase = getSupabaseServer(resolved.accessToken ?? undefined);

  const { data } = await supabase
    .from("user_profiles")
    .select("display_name, avatar_path")
    .eq("user_id", resolved.user.id)
    .maybeSingle();

  const avatarUrl = data?.avatar_path
    ? await resolveAvatarUrl(supabase as never, data.avatar_path as string)
    : null;

  return (
    <Header
      avatarUrl={avatarUrl}
      displayName={(data?.display_name as string | null) ?? null}
      email={resolved.user.email ?? null}
    />
  );
}
