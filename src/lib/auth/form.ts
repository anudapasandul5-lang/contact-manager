export type AuthMode = "sign-in" | "sign-up";

interface AuthModeConfig {
  endpoint: string;
  idleLabel: string;
  pendingLabel: string;
  successLabel?: string;
}

const AUTH_MODE_CONFIG: Record<AuthMode, AuthModeConfig> = {
  "sign-in": {
    endpoint: "/api/auth/sign-in",
    idleLabel: "Sign In",
    pendingLabel: "Signing In...",
  },
  "sign-up": {
    endpoint: "/api/auth/sign-up",
    idleLabel: "Create Account",
    pendingLabel: "Creating Account...",
    successLabel: "Account created. You can finish sign-in from your inbox if email confirmation is enabled.",
  },
};

export function getAuthModeConfig(mode: AuthMode): AuthModeConfig {
  return AUTH_MODE_CONFIG[mode];
}

export function parseAuthCredentials(body: unknown) {
  const email = typeof (body as { email?: unknown } | null)?.email === "string"
    ? (body as { email: string }).email.trim()
    : "";
  const password = typeof (body as { password?: unknown } | null)?.password === "string"
    ? (body as { password: string }).password
    : "";

  if (!email || !password) {
    throw new Error("Email and password are required.");
  }

  return { email, password };
}
