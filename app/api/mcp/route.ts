import { NextResponse } from "next/server";
import { GET as listSlots } from "@/app/api/slots/route";
import { POST as createBooking } from "@/app/api/book/route";
import { getAppUrl, loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, unknown>;
};

const tools = [
  {
    name: "list_event_types",
    description: "List the meeting types Sivaganesh currently offers, including allowed durations and public booking links.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_available_slots",
    description: "List available meeting starts as UTC ISO-8601 instants. Compare these with the guest's own calendar in their timezone.",
    inputSchema: {
      type: "object",
      required: ["eventType", "date", "duration", "timeZone"],
      properties: {
        eventType: { type: "string" },
        date: { type: "string", description: "Date in the guest's timezone, YYYY-MM-DD" },
        duration: { type: "integer" },
        timeZone: { type: "string", description: "Guest IANA timezone, for example America/Chicago" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "book_meeting",
    description: "Book a slot after the guest has approved the exact time. Returns the meeting and cancellation links.",
    inputSchema: {
      type: "object",
      required: ["eventType", "date", "startUtc", "duration", "name", "email"],
      properties: {
        eventType: { type: "string" },
        date: { type: "string", description: "Guest-local date used to find the slot, YYYY-MM-DD" },
        startUtc: { type: "string", description: "An exact UTC instant returned by list_available_slots" },
        duration: { type: "integer" },
        name: { type: "string" },
        email: { type: "string" },
        notes: { type: "string" },
      },
      additionalProperties: false,
    },
  },
];

function rpc(id: JsonRpcRequest["id"], result: unknown, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result }, { status });
}

function rpcError(id: JsonRpcRequest["id"], code: number, message: string, status = 400) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status }
  );
}

async function responsePayload(response: Response) {
  const payload = await response.json();
  if (!response.ok) throw new Error(
    typeof payload?.error === "string" ? payload.error : `request failed (${response.status})`
  );
  return payload;
}

export async function POST(request: Request) {
  let message: JsonRpcRequest;
  try {
    message = (await request.json()) as JsonRpcRequest;
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  if (message.jsonrpc !== "2.0" || !message.method) {
    return rpcError(message.id, -32600, "Invalid Request");
  }

  if (message.method === "notifications/initialized") {
    return new NextResponse(null, { status: 202 });
  }
  if (message.method === "initialize") {
    return rpc(message.id, {
      protocolVersion: "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "meet-siv19-dev", version: "1.0.0" },
      instructions:
        "Find a mutually free time, ask the guest to confirm the exact slot, then call book_meeting. Never infer private host calendar details from open slots.",
    });
  }
  if (message.method === "ping") return rpc(message.id, {});
  if (message.method === "tools/list") return rpc(message.id, { tools });

  if (message.method !== "tools/call") {
    return rpcError(message.id, -32601, "Method not found");
  }

  const name = typeof message.params?.name === "string" ? message.params.name : "";
  const args =
    message.params?.arguments && typeof message.params.arguments === "object"
      ? (message.params.arguments as Record<string, unknown>)
      : {};

  try {
    let data: unknown;
    if (name === "list_event_types") {
      const settings = await loadSettings();
      const baseUrl = getAppUrl();
      data = settings.event_types.map((event) => ({
        ...event,
        bookingUrl: `${baseUrl}/${event.id}`,
      }));
    } else if (name === "list_available_slots") {
      const url = new URL("/api/slots", request.url);
      url.searchParams.set("eventType", String(args.eventType ?? ""));
      url.searchParams.set("date", String(args.date ?? ""));
      url.searchParams.set("duration", String(args.duration ?? ""));
      url.searchParams.set("timeZone", String(args.timeZone ?? "UTC"));
      const headers = new Headers();
      const forwardedFor = request.headers.get("x-forwarded-for");
      if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
      data = await responsePayload(await listSlots(new Request(url, { headers })));
    } else if (name === "book_meeting") {
      const headers = new Headers({ "content-type": "application/json" });
      const forwardedFor = request.headers.get("x-forwarded-for");
      if (forwardedFor) headers.set("x-forwarded-for", forwardedFor);
      data = await responsePayload(
        await createBooking(
          new Request(new URL("/api/book", request.url), {
            method: "POST",
            headers,
            body: JSON.stringify({ ...args, honeypot: "" }),
          })
        )
      );
    } else {
      return rpcError(message.id, -32602, `Unknown tool: ${name}`);
    }
    return rpc(message.id, {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: data,
      isError: false,
    });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : "Tool call failed";
    return rpc(message.id, {
      content: [{ type: "text", text: messageText }],
      isError: true,
    });
  }
}

export function GET() {
  return NextResponse.json({
    name: "Sivaganesh scheduling MCP server",
    transport: "Streamable HTTP",
    endpoint: `${getAppUrl()}/api/mcp`,
  });
}
