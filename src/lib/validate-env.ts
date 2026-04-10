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
