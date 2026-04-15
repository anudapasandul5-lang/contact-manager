import { redirectIfAuthenticated } from "@/lib/auth/server-guards";
import { LoginForm } from "@/components/auth/LoginForm";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <main className="min-h-screen px-6 py-10" style={{ background: "var(--clay-bg)" }}>
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section className="space-y-5">
            <p
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em]"
              style={{
                background: "linear-gradient(145deg, #dbeafe, #e0e7ff)",
                color: "#3730a3",
                boxShadow: "var(--clay-shadow-sm)",
              }}
            >
              Secure Workspace
            </p>
            <div className="space-y-3">
              <h1
                className="text-4xl font-bold tracking-tight sm:text-5xl"
                style={{ color: "var(--clay-text)", fontFamily: "var(--font-space-grotesk), ui-sans-serif" }}
              >
                Contact Manager
              </h1>
              <p className="max-w-xl text-base leading-7" style={{ color: "var(--clay-text-secondary)" }}>
                Sign in to manage your network, browse the mind map, and keep company and project relationships behind an authenticated boundary.
              </p>
            </div>
          </section>

          <LoginForm />
        </div>
      </div>
    </main>
  );
}
