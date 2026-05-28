import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { QueryClient, dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { HeaderWithProfile } from "@/components/shared/HeaderWithProfile";
import { ForecastSkeleton } from "./ForecastSkeleton";
import { ForecastClient } from "./ForecastClient";
import { resolveSessionFromCookies } from "@/lib/auth/session";

export default async function ForecastPage() {
  const cookieStore = await cookies();
  const resolved = await resolveSessionFromCookies(cookieStore);
  if (!resolved.user) redirect("/login");

  const qc = new QueryClient({
    defaultOptions: { queries: { staleTime: 5 * 60_000 } },
  });

  // Server-side prefetch skipped: TZ is client-only; ForecastClient fetches on mount with real TZ.

  return (
    <div className="flex h-screen flex-col">
      <HeaderWithProfile />
      <main className="flex-1 overflow-hidden">
        <HydrationBoundary state={dehydrate(qc)}>
          <Suspense fallback={<ForecastSkeleton />}>
            <ForecastClient />
          </Suspense>
        </HydrationBoundary>
      </main>
    </div>
  );
}
