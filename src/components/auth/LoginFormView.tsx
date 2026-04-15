import { LockKeyhole, Mail } from "lucide-react";
import type { FormEvent } from "react";
import type { AuthMode } from "@/lib/auth/form";
import { getAuthModeConfig } from "@/lib/auth/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface LoginFormViewProps {
  mode: AuthMode;
  email: string;
  password: string;
  isPending: boolean;
  error: string | null;
  success: string | null;
  oauthError: string | null;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onGoogleSignIn: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function LoginFormView({
  mode,
  email,
  password,
  isPending,
  error,
  success,
  oauthError,
  onEmailChange,
  onPasswordChange,
  onGoogleSignIn,
  onModeChange,
  onSubmit,
}: LoginFormViewProps) {
  const config = getAuthModeConfig(mode);

  return (
    <section
      className="rounded-[28px] border p-6 shadow-lg sm:p-8"
      style={{
        background: "linear-gradient(145deg, var(--clay-card), var(--clay-card-end))",
        borderColor: "var(--clay-border)",
        boxShadow: "var(--clay-shadow)",
      }}
    >
      <div className="mb-6 space-y-2">
        <h2 className="text-2xl font-semibold" style={{ color: "var(--clay-text)" }}>
          {mode === "sign-in" ? "Sign In" : "Create Account"}
        </h2>
        <p className="text-sm" style={{ color: "var(--clay-text-secondary)" }}>
          {mode === "sign-in"
            ? "Use your Supabase Auth account to access the app."
            : "Create a Supabase Auth account for this workspace if you do not have one yet."}
        </p>
      </div>

      <div className="mb-5 space-y-3">
        {oauthError && (
          <p
            className="rounded-lg border px-3 py-2 text-sm text-amber-800"
            style={{ borderColor: "#fde68a", background: "#fffbeb" }}
          >
            {oauthError}
          </p>
        )}

        <Button className="w-full" type="button" variant="outline" onClick={onGoogleSignIn}>
          Continue with Google
        </Button>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant={mode === "sign-in" ? "default" : "outline"}
          onClick={() => onModeChange("sign-in")}
        >
          Sign In
        </Button>
        <Button
          type="button"
          variant={mode === "sign-up" ? "default" : "outline"}
          onClick={() => onModeChange("sign-up")}
        >
          Create Account
        </Button>
      </div>

      <form className="space-y-4" onSubmit={onSubmit}>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>
            Email
          </span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="you@example.com"
              className="pl-10"
              required
            />
          </div>
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium" style={{ color: "var(--clay-text)" }}>
            Password
          </span>
          <div className="relative">
            <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="password"
              value={password}
              onChange={(event) => onPasswordChange(event.target.value)}
              placeholder="Your password"
              className="pl-10"
              required
            />
          </div>
        </label>

        {error && (
          <p
            className="rounded-lg border px-3 py-2 text-sm text-red-600"
            style={{ borderColor: "#fecaca", background: "#fff1f2" }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            className="rounded-lg border px-3 py-2 text-sm text-emerald-700"
            style={{ borderColor: "#a7f3d0", background: "#ecfdf5" }}
          >
            {success}
          </p>
        )}

        <Button className="w-full" type="submit" disabled={isPending}>
          {isPending ? config.pendingLabel : config.idleLabel}
        </Button>
      </form>
    </section>
  );
}
