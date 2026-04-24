import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { resolveSessionFromCookies } from "@/lib/auth/session";
import { getSupabaseServer } from "@/lib/supabase/server";
import { resolveAvatarUrl } from "@/lib/media/media";
import { HeaderWithProfile } from "@/components/shared/HeaderWithProfile";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);

  if (!resolved.user) {
    redirect("/login");
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
    <div className="flex h-screen flex-col">
      <HeaderWithProfile />
      <main
        className="flex-1 overflow-y-auto flex items-start justify-center p-8"
        style={{ background: "var(--clay-bg)", transition: "background 0.3s ease" }}
      >
        <ProfileForm
          initialDisplayName={(data?.display_name as string | null) ?? null}
          initialAvatarUrl={avatarUrl}
          email={resolved.user.email ?? null}
        />
      </main>
    </div>
  );
}
