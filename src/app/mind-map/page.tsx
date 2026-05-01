import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { HeaderWithProfile } from "@/components/shared/HeaderWithProfile";
import { MindMapSkeleton } from "@/components/mind-map/MindMapSkeleton";
import { resolveSessionFromCookies } from "@/lib/auth/session";
import { fetchSupabaseNetworkData } from "@/lib/supabase/network";
import { queryKeys } from "@/lib/query/keys";

const MindMapCanvas = dynamic(
  () => import("@/components/mind-map/MindMapCanvas").then((m) => m.MindMapCanvas),
  { ssr: false, loading: () => <MindMapSkeleton /> },
);

export default async function MindMapPage() {
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
      <main className="flex-1" style={{ background: "#f5f0eb", position: "relative" }}>
        <HydrationBoundary state={dehydrate(qc)}>
          <Suspense fallback={<MindMapSkeleton />}>
            <MindMapCanvas />
          </Suspense>
        </HydrationBoundary>
      </main>
    </div>
  );
}
