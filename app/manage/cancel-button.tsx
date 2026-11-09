"use client";

import { Loader2, XCircle } from "lucide-react";
import { useState } from "react";
import { Alert, Button } from "@/components/ui";

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
    return <Alert tone="success">This booking has been cancelled. A confirmation email was sent.</Alert>;
  }

  return (
    <div className="space-y-3">
      <Button variant="danger" onClick={cancel} disabled={state === "working"}>
        {state === "working" ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
        {state === "working" ? "Cancelling…" : "Cancel this booking"}
      </Button>
      {state === "error" && <Alert>Could not cancel. Please try again.</Alert>}
    </div>
  );
}
