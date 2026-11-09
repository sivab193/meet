import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/** 1200x630 is the size LinkedIn, WhatsApp, Slack, X and Facebook all crop well. */
export const ogSize = { width: 1200, height: 630 };
export const ogAlt = "Book a call with Sivaganesh at meet.siv19.dev";

const SLOTS = ["9:00 AM", "10:30 AM", "1:00 PM", "3:30 PM"];
const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

async function loadFonts() {
  const dir = join(process.cwd(), "lib", "fonts");
  const [regular, semibold, bold] = await Promise.all([
    readFile(join(dir, "Geist-Regular.ttf")),
    readFile(join(dir, "Geist-SemiBold.ttf")),
    readFile(join(dir, "Geist-Bold.ttf")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: semibold, weight: 600 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
  ];
}

/** Shared social preview card, rendered by Satori via next/og. */
export async function renderOgImage() {
  const fonts = await loadFonts();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#070913",
          color: "#e6e9f2",
          fontFamily: "Geist",
          overflow: "hidden",
        }}
      >
        {/* Grid texture */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        {/* Glows */}
        <div
          style={{
            position: "absolute",
            top: -260,
            left: -120,
            width: 760,
            height: 760,
            display: "flex",
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(99,102,241,0.45) 0%, rgba(99,102,241,0) 65%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -300,
            right: -160,
            width: 720,
            height: 720,
            display: "flex",
            borderRadius: 9999,
            background: "radial-gradient(circle, rgba(34,211,238,0.25) 0%, rgba(34,211,238,0) 65%)",
          }}
        />

        {/* Left: copy */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 0 64px 72px",
            width: 700,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 55%, #22d3ee 100%)",
                fontSize: 36,
                fontWeight: 700,
                color: "#ffffff",
                boxShadow: "0 12px 40px rgba(99,102,241,0.5)",
              }}
            >
              S
            </div>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 600 }}>
              meet<span style={{ color: "#94a0b8" }}>.siv19.dev</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                alignSelf: "flex-start",
                padding: "8px 18px",
                borderRadius: 9999,
                background: "rgba(16,185,129,0.14)",
                color: "#34d399",
                fontSize: 22,
                fontWeight: 600,
              }}
            >
              <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#34d399", display: "flex" }} />
              Open for conversations
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                marginTop: 26,
                fontSize: 76,
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.03em",
              }}
            >
              <span>Book a call with</span>
              <span
                style={{
                  backgroundImage: "linear-gradient(100deg, #818cf8 0%, #a78bfa 45%, #22d3ee 100%)",
                  backgroundClip: "text",
                  color: "transparent",
                }}
              >
                Sivaganesh
              </span>
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 28, lineHeight: 1.4, color: "#94a0b8" }}>
              Pick a time that works in your timezone.
            </div>
          </div>

          <div style={{ display: "flex", gap: 14 }}>
            {["15 min", "30 min", "60 min"].map((d) => (
              <div
                key={d}
                style={{
                  display: "flex",
                  padding: "10px 20px",
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "rgba(255,255,255,0.04)",
                  fontSize: 22,
                  color: "#cbd2e1",
                }}
              >
                {d}
              </div>
            ))}
          </div>
        </div>

        {/* Right: mock booking card */}
        <div style={{ display: "flex", alignItems: "center", paddingLeft: 24 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 400,
              padding: 30,
              borderRadius: 28,
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(13,17,34,0.85)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "#94a0b8" }}>
              <span style={{ color: "#e6e9f2", fontWeight: 600 }}>Pick a date</span>
              <span>This week</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20 }}>
              {DAYS.map((d, i) => {
                const selected = i === 2;
                const open = i < 5;
                return (
                  <div
                    key={i}
                    style={{
                      width: 42,
                      height: 42,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 12,
                      fontSize: 18,
                      fontWeight: 600,
                      background: selected ? "#6366f1" : open ? "rgba(99,102,241,0.16)" : "transparent",
                      color: selected ? "#ffffff" : open ? "#a5b4fc" : "#4b5470",
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 26 }}>
              {SLOTS.map((s, i) => (
                <div
                  key={s}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: 52,
                    borderRadius: 14,
                    fontSize: 21,
                    fontWeight: 600,
                    border: i === 1 ? "1px solid #6366f1" : "1px solid rgba(255,255,255,0.1)",
                    background: i === 1 ? "#6366f1" : "rgba(255,255,255,0.03)",
                    color: i === 1 ? "#ffffff" : "#cbd2e1",
                  }}
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    ),
    { ...ogSize, fonts }
  );
}
