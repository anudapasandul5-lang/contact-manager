// src/env.ts
// Validates required environment variables.
// The exported `env` object is populated at module load — import this file
// in layout.tsx so the server fails immediately if vars are missing.

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "DATABASE_URL",
] as const;

type RequiredVar = (typeof REQUIRED)[number];

export function validateEnv(
  processEnv: Record<string, string | undefined>,
): Record<RequiredVar, string> {
  const missing = REQUIRED.filter((key) => !processEnv[key]);

  if (missing.length > 0) {
    throw new Error(
      [
        "Missing required environment variables:",
        ...missing.map((k) => `  - ${k}`),
        "",
        "Create a .env.local file with these values.",
      ].join("\n"),
    );
  }

  return Object.fromEntries(
    REQUIRED.map((key) => [key, processEnv[key] as string]),
  ) as Record<RequiredVar, string>;
}

export const env = validateEnv(process.env as Record<string, string | undefined>);
