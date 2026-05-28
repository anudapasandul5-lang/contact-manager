"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BucketedTasks } from "@/lib/forecast/buckets";
import { ForecastSkeleton } from "./ForecastSkeleton";
import { ForecastColumns } from "./ForecastColumns";
import { ModeToggle } from "./ModeToggle";
import { ForecastSwimLanes } from "./ForecastSwimLanes";

type Business = { id: string; name: string; color: string };
type ForecastData = { buckets: BucketedTasks; businesses: Business[] };

function toDate(v: string | null | undefined): Date | null {
  return v ? new Date(v) : null;
}

function deserializeBuckets(raw: BucketedTasks): BucketedTasks {
  const bucketKeys = Object.keys(raw) as (keyof BucketedTasks)[];
  const result = { ...raw };
  for (const key of bucketKeys) {
    result[key] = raw[key].map((t) => ({
      ...t,
      due_date: toDate(t.due_date as unknown as string),
      defer_date: toDate(t.defer_date as unknown as string),
      completed_at: toDate(t.completed_at as unknown as string),
      created_at: new Date(t.created_at as unknown as string),
      updated_at: new Date(t.updated_at as unknown as string),
    }));
  }
  return result;
}

type Mode = "columns" | "swimlane";

const STORAGE_KEY = "forecast-mode";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ForecastClient() {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "columns";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "swimlane" ? "swimlane" : "columns";
  });

  const handleModeToggle = (newMode: Mode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const { data, isLoading } = useQuery<ForecastData>({
    queryKey: queryKeys.forecast.all,
    queryFn: () =>
      fetch(`/api/forecast?tz=${encodeURIComponent(TZ)}`).then(async (r) => {
        if (!r.ok) throw new Error(r.statusText);
        const json = await r.json() as ForecastData;
        return { ...json, buckets: deserializeBuckets(json.buckets) };
      }),
    staleTime: 60_000,
  });

  if (isLoading || !data) return <ForecastSkeleton />;

  return (
    <div className="flex flex-col h-full">
      {/* Mode toggle bar */}
      <div
        className="flex items-center justify-end px-6 py-2 gap-2"
        style={{
          borderBottom: "1px solid var(--clay-header-border)",
          background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-alt))",
        }}
      >
        <ModeToggle mode={mode} onToggle={() => handleModeToggle(mode === "columns" ? "swimlane" : "columns")} />
      </div>

      {/* View */}
      <div className="flex-1 overflow-hidden">
        {mode === "columns" ? (
          <ForecastColumns buckets={data.buckets} businesses={data.businesses} />
        ) : (
          <ForecastSwimLanes buckets={data.buckets} businesses={data.businesses} />
        )}
      </div>
    </div>
  );
}
