import { NextResponse } from "next/server";
import { getAppUrl } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const baseUrl = getAppUrl();
  return NextResponse.json({
    openapi: "3.1.0",
    info: {
      title: "Sivaganesh scheduling API",
      version: "1.0.0",
      description:
        "Public, privacy-preserving scheduling API. Agents see event types and open slots, never the owner's private calendar.",
    },
    servers: [{ url: baseUrl }],
    paths: {
      "/api/event-types": {
        get: {
          operationId: "listEventTypes",
          summary: "List public meeting types and booking links",
          responses: { "200": { description: "Available event types" } },
        },
      },
      "/api/slots": {
        get: {
          operationId: "listAvailableSlots",
          summary: "List open UTC instants for a host-local date",
          parameters: [
            { name: "eventType", in: "query", required: true, schema: { type: "string" } },
            { name: "date", in: "query", required: true, schema: { type: "string", format: "date" } },
            { name: "duration", in: "query", required: true, schema: { type: "integer" } },
            { name: "timeZone", in: "query", required: true, schema: { type: "string", example: "America/Chicago" } },
          ],
          responses: { "200": { description: "Open slots as UTC ISO-8601 instants" } },
        },
      },
      "/api/book": {
        post: {
          operationId: "bookMeeting",
          summary: "Book one currently open slot",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["eventType", "date", "startUtc", "duration", "name", "email"],
                  properties: {
                    eventType: { type: "string" },
                    date: { type: "string", format: "date" },
                    startUtc: { type: "string", format: "date-time" },
                    duration: { type: "integer" },
                    name: { type: "string" },
                    email: { type: "string", format: "email" },
                    notes: { type: "string" },
                    honeypot: { type: "string", const: "", default: "" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Booking confirmation, meeting link, and cancellation URL" },
            "409": { description: "The slot was just taken" },
          },
        },
      },
    },
  });
}
