"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type FormState = "idle" | "loading" | "sent" | "error";
type LoginMode = "magic-link" | "password";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState<FormState>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [mode, setMode] = useState<LoginMode>("password");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;

    setState("loading");
    setErrorMessage("");

    const supabase = createClient();

    if (mode === "password") {
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setState("error");
      } else {
        window.location.href = "/";
      }
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        setErrorMessage(error.message);
        setState("error");
      } else {
        setState("sent");
      }
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Card */}
      <div className="rounded-2xl bg-white px-8 py-10 shadow-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          {/* Gulf Gold anchor accent */}
          <div className="mb-3 flex justify-center">
            <svg
              aria-hidden="true"
              className="h-10 w-10 text-gulf-gold"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Anchor icon */}
              <path d="M12 2a3 3 0 1 1 0 6 3 3 0 0 1 0-6Zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z" />
              <path d="M11 8.07V9H7a1 1 0 0 0 0 2h4v8.93A8.001 8.001 0 0 1 4.07 12H6a1 1 0 0 0 0-2H3a1 1 0 0 0-1 1 10 10 0 0 0 20 0 1 1 0 0 0-1-1h-3a1 1 0 0 0 0 2h1.93A8.001 8.001 0 0 1 13 19.93V11h4a1 1 0 0 0 0-2h-4v-.93a3.001 3.001 0 0 0 0-5.14V2h-2v.93a3.001 3.001 0 0 0 0 5.14Z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-navy">PortLink</h1>
          <p className="mt-1 text-base text-slate">Port of Mobile Ministry</p>
        </div>

        {state === "sent" ? (
          /* Success state */
          <div className="rounded-lg bg-green-50 px-6 py-5 text-center">
            <p className="text-base font-semibold text-green-800">
              Check your email for a login link.
            </p>
            <p className="mt-2 text-sm text-green-700">
              We sent a magic link to{" "}
              <span className="font-medium">{email.trim().toLowerCase()}</span>.
              Click it to sign in.
            </p>
            <button
              className="mt-4 text-sm text-bay-blue underline underline-offset-2"
              onClick={() => {
                setState("idle");
                setEmail("");
              }}
              type="button"
            >
              Use a different email
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-5">
              <label
                className="mb-2 block text-base font-medium text-foreground"
                htmlFor="email"
              >
                Email address
              </label>
              <input
                autoCapitalize="none"
                autoComplete="email"
                autoCorrect="off"
                className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-foreground placeholder:text-slate focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={state === "loading"}
                id="email"
                inputMode="email"
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                type="email"
                value={email}
              />
            </div>

            {mode === "password" && (
              <div className="mb-5">
                <label
                  className="mb-2 block text-base font-medium text-foreground"
                  htmlFor="password"
                >
                  Password
                </label>
                <input
                  autoComplete="current-password"
                  className="block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-base text-foreground placeholder:text-slate focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={state === "loading"}
                  id="password"
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  type="password"
                  value={password}
                />
              </div>
            )}

            {state === "error" && errorMessage && (
              <p className="mb-4 text-sm text-crimson" role="alert">
                {errorMessage}
              </p>
            )}

            <button
              className="flex w-full items-center justify-center rounded-lg bg-navy px-4 py-3 text-base font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={state === "loading" || !email.trim() || (mode === "password" && !password)}
              type="submit"
            >
              {state === "loading"
                ? "Signing in\u2026"
                : mode === "password"
                  ? "Sign In"
                  : "Send Magic Link"}
            </button>

            <div className="mt-4 text-center">
              <button
                className="text-sm text-bay-blue underline underline-offset-2"
                onClick={() => {
                  setMode(mode === "password" ? "magic-link" : "password");
                  setState("idle");
                  setErrorMessage("");
                }}
                type="button"
              >
                {mode === "password"
                  ? "Use magic link instead"
                  : "Sign in with password"}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Footer note */}
      <p className="mt-6 text-center text-sm text-slate">
        Port Ministry of Mobile &mdash; volunteers only
      </p>
    </div>
  );
}
