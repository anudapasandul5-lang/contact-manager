"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/query/keys";
import type { BucketedTasks } from "@/lib/forecast/buckets";
import { ForecastSkeleton } from "./ForecastSkeleton";
import { ForecastColumns } from "./ForecastColumns";
import { ModeToggle } from "./ModeToggle";
import { ForecastSwimLanes } from "./ForecastSwimLanes";

type Business = { id: string; name: string; color: string };
type ForecastData = { buckets: BucketedTasks; businesses: Business[] };

type Mode = "columns" | "swimlane";

const STORAGE_KEY = "forecast-mode";
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function ForecastClient() {
  // Load mode from localStorage (client-only)
  const [mode, setMode] = useState<Mode>("columns");
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "swimlane" || stored === "columns") setMode(stored);
  }, []);

  const handleModeToggle = (newMode: Mode) => {
    setMode(newMode);
    localStorage.setItem(STORAGE_KEY, newMode);
  };

  const { data, isLoading } = useQuery<ForecastData>({
    queryKey: queryKeys.forecast.all,
    queryFn: () =>
      fetch(`/api/forecast?tz=${encodeURIComponent(TZ)}`).then((r) => {
        if (!r.ok) throw new Error(r.statusText);
        return r.json() as Promise<ForecastData>;
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
