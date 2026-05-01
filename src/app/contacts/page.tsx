import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { HeaderWithProfile } from "@/components/shared/HeaderWithProfile";
import { ContactsGrid } from "@/components/contacts/ContactsGrid";
import { ContactsGridSkeleton } from "@/components/contacts/ContactsGridSkeleton";
import { resolveSessionFromCookies } from "@/lib/auth/session";
import { fetchSupabaseNetworkData } from "@/lib/supabase/network";
import { queryKeys } from "@/lib/query/keys";

export default async function ContactsPage() {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);
  if (!resolved.user) redirect("/login");

  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60_000 } },
  });
  await qc.prefetchQuery({
    queryKey: queryKeys.network.all,
    queryFn: () =>
      fetchSupabaseNetworkData(resolved.user!.id, resolved.accessToken ?? undefined),
  });

  return (
    <div className="flex h-screen flex-col">
      <HeaderWithProfile />
      <main
        className="flex-1 overflow-y-auto p-6"
        style={{ background: "var(--clay-bg)", transition: "background 0.3s ease" }}
      >
        <HydrationBoundary state={dehydrate(qc)}>
          <Suspense fallback={<ContactsGridSkeleton />}>
            <ContactsGrid />
          </Suspense>
        </HydrationBoundary>
      </main>
    </div>
  );
}
