import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Book a call with Sivaganesh",
  description: "Pick a time, get a Google Meet link. Simple single-user scheduling.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
