import { ImageResponse } from "next/og";

// Image metadata
export const alt = "Meet with Sivaganesh — find a time to talk";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0f172a 0%, #111827 55%, #1e293b 100%)",
          padding: "72px",
          color: "#f8fafc",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            fontSize: 28,
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          meet.siv19.dev
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 92,
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            Find a time to talk.
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 36,
              lineHeight: 1.35,
              color: "#cbd5e1",
              maxWidth: 900,
            }}
          >
            Schedule a conversation with Sivaganesh. Pick a meeting type and see
            only the times that are open.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            fontSize: 30,
            color: "#e2e8f0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#22c55e",
              color: "#052e16",
              fontSize: 36,
              fontWeight: 700,
            }}
          >
            S
          </div>
          <span style={{ fontWeight: 600 }}>Sivaganesh Balaganesh</span>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
