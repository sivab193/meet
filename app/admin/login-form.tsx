"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!r.ok) {
        setError("Wrong password.");
        return;
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-3">
      <div>
        <label className="mb-1 block text-sm font-medium" htmlFor="password">
          Admin password
        </label>
        <input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2"
          autoComplete="current-password"
        />
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <button
        type="submit"
        disabled={working}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 font-medium text-white disabled:opacity-50"
      >
        {working ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
