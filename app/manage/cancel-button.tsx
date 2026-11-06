"use client";

import { useState } from "react";

export default function CancelButton({ token }: { token: string }) {
  const [state, setState] = useState<"idle" | "working" | "done" | "error">("idle");

  async function cancel() {
    setState("working");
    try {
      const r = await fetch("/api/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      setState(r.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800">
        This booking has been cancelled. A confirmation email was sent.
      </p>
    );
  }

  return (
    <div>
      <button
        onClick={cancel}
        disabled={state === "working"}
        className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 disabled:opacity-50"
      >
        {state === "working" ? "Cancelling…" : "Cancel this booking"}
      </button>
      {state === "error" && (
        <p className="mt-2 text-sm text-red-700">
          Could not cancel. Please try again.
        </p>
      )}
    </div>
  );
}
