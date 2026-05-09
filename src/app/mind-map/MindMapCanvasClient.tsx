"use client";

import dynamic from "next/dynamic";
import { MindMapSkeleton } from "@/components/mind-map/MindMapSkeleton";

export const MindMapCanvasClient = dynamic(
  () => import("@/components/mind-map/MindMapCanvas").then((m) => m.MindMapCanvas),
  { ssr: false, loading: () => <MindMapSkeleton /> },
);
