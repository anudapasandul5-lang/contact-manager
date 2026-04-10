// src/env.ts
// Validates required environment variables at server startup.
// Import this file in layout.tsx so the server fails immediately if vars are missing.

export { validateEnv } from "@/lib/validate-env";
import { validateEnv } from "@/lib/validate-env";

export const env = validateEnv(process.env as Record<string, string | undefined>);
