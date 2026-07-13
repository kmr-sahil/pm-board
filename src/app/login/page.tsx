"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { KanbanSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLES = ["admin", "employee", "client"];

function LoginForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const search = useSearchParams();
  const roleParam = search.get("role");
  const role = roleParam && ROLES.includes(roleParam) ? roleParam : null;

  // /login?role=admin|employee|client assigns that role after sign-in
  // (dev convenience backed by the set_login_role RPC — see README).
  const callbackUrl = () => {
    const url = new URL("/auth/callback", window.location.origin);
    if (role) url.searchParams.set("role", role);
    return url.toString();
  };

  async function signInWithGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl() },
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm p-8">
        <div className="mb-8 flex items-center gap-2">
          <KanbanSquare className="size-6 text-indigo-500" />
          <h1 className="text-lg font-semibold">PM Board</h1>
        </div>

        {role && (
          <p className="mb-4 rounded-lg bg-indigo-50 px-3 py-2 text-center text-xs text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-300">
            Signing in as <span className="font-semibold capitalize">{role}</span>
          </p>
        )}

        <button onClick={signInWithGoogle} className="btn w-full justify-center py-2">
          Continue with Google
        </button>

        <div className="my-6 flex items-center gap-3 text-xs text-zinc-400">
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
          or
          <div className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
        </div>

        <form onSubmit={sendMagicLink} className="space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com"
            className="input"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="btn-ghost w-full justify-center border border-zinc-300 py-2 dark:border-zinc-700"
          >
            {status === "sending" ? "Sending…" : "Send magic link"}
          </button>
        </form>

        {status === "sent" && (
          <p className="mt-4 text-center text-sm text-emerald-600 dark:text-emerald-400">
            Check your inbox for the sign-in link.
          </p>
        )}
        {status === "error" && (
          <p className="mt-4 text-center text-sm text-red-500">
            Could not send the link. Try again.
          </p>
        )}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
