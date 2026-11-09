"use client";

import { KeyRound, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Label, buttonClass, cn, inputClass } from "@/components/ui";

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
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <Label htmlFor="password">Admin password</Label>
        <div className="relative">
          <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(inputClass, "pl-9")}
            autoComplete="current-password"
          />
        </div>
      </div>
      {error && <Alert>{error}</Alert>}
      <button type="submit" disabled={working} className={cn(buttonClass("primary", "lg"), "w-full")}>
        {working && <Loader2 className="size-4 animate-spin" />}
        {working ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
