"use client";

import { Bot, Check, Copy, ShieldCheck } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { Card, cn } from "./ui";

const SITE = "https://meet.siv19.dev";
const MCP_URL = `${SITE}/api/mcp`;
const OPENAPI_URL = `${SITE}/api/openapi`;

const subscribe = () => () => {};

function buildPrompt(timeZone: string): string {
  return `Help me schedule a meeting with Sivaganesh using his public scheduling service.

Connect with one of these:
- MCP server (Streamable HTTP): ${MCP_URL}
  Tools: list_event_types, list_available_slots, book_meeting
- REST API (OpenAPI spec): ${OPENAPI_URL}
  Endpoints: GET /api/event-types, GET /api/slots, POST /api/book

Steps:
1. List the meeting types and pick the one that fits. Ask me if it's unclear.
2. Find open slots over the next few days in my timezone (${timeZone}). If you can see my calendar, skip times I'm busy.
3. Suggest 2-3 options and wait for me to confirm one exact time.
4. Book only the time I confirmed, using my name and email: [your name], [your email].
5. Give me the meeting link and the cancellation link.`;
}

/** Copy text to the clipboard, falling back to a hidden textarea on older browsers. */
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}

function CopyButton({ text, label, className }: { text: string; label: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }}
      aria-label={copied ? "Copied" : label}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        copied
          ? "border-success/40 bg-success-soft text-success"
          : "border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-foreground",
        className
      )}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

function EndpointRow({ name, url }: { name: string; url: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-xl border border-border bg-background/60 py-1.5 pl-3 pr-1.5">
      <span className="shrink-0 text-xs font-semibold text-muted-foreground">{name}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-foreground">{url}</code>
      <CopyButton text={url} label="Copy" />
    </div>
  );
}

export default function AgentPrompt() {
  // Use the visitor's timezone in the prompt once we're in the browser.
  const timeZone = useSyncExternalStore(
    subscribe,
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "my local timezone",
    () => "my local timezone"
  );
  const prompt = buildPrompt(timeZone);

  return (
    <Card className="mt-16 overflow-hidden">
      <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between sm:p-6">
        <div className="flex gap-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary-soft-foreground">
            <Bot className="size-5" />
          </span>
          <div>
            <h2 className="font-semibold tracking-tight">Let your AI assistant book it</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Copy this prompt into ChatGPT, Claude, or any assistant that can call tools.
              Fill in your name and email, and it will find a time and book it.
            </p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground sm:shrink-0 sm:pt-1">
          <ShieldCheck className="size-4 text-success" />
          Only open slots are shared
        </span>
      </div>

      <div className="relative border-y border-border bg-muted/50">
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words px-5 py-4 pr-28 font-mono text-[13px] leading-6 text-foreground sm:px-6">
          {prompt}
        </pre>
        <CopyButton
          text={prompt}
          label="Copy prompt"
          className="absolute right-3 top-3 shadow-sm"
        />
      </div>

      <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
        <EndpointRow name="MCP" url={MCP_URL} />
        <EndpointRow name="OpenAPI" url={OPENAPI_URL} />
      </div>
    </Card>
  );
}
