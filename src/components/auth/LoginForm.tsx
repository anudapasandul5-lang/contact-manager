"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthModeConfig, type AuthMode } from "@/lib/auth/form";
import { getOAuthErrorMessage } from "@/lib/auth/oauth";
import { LoginFormView } from "@/components/auth/LoginFormView";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const oauthError = getOAuthErrorMessage(searchParams.get("error"));

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const config = getAuthModeConfig(mode);

    const res = await fetch(config.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Unable to sign in.");
      return;
    }

    const data = (await res.json().catch(() => null)) as
      | { requiresEmailConfirmation?: boolean; successMessage?: string }
      | null;

    if (mode === "sign-up" && data?.requiresEmailConfirmation) {
      setSuccess(data.successMessage ?? config.successLabel ?? "Account created.");
      return;
    }

    startTransition(() => {
      router.replace("/mind-map");
      router.refresh();
    });
  }

  function handleModeChange(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSuccess(null);
  }

  function handleGoogleSignIn() {
    setError(null);
    setSuccess(null);
    window.location.assign("/api/auth/google/start");
  }

  return (
    <LoginFormView
      mode={mode}
      email={email}
      password={password}
      isPending={isPending}
      error={error}
      success={success}
      oauthError={oauthError}
      onEmailChange={setEmail}
      onPasswordChange={setPassword}
      onGoogleSignIn={handleGoogleSignIn}
      onModeChange={handleModeChange}
      onSubmit={handleSubmit}
    />
  );
}
