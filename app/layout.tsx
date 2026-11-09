import type { Metadata } from "next";
import Footer from "@/components/footer";
import "./globals.css";

const siteUrl = "https://meet.siv19.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Meet with Sivaganesh",
    template: "%s — Meet with Sivaganesh",
  },
  description: "Find a mutually convenient time and schedule a conversation with Sivaganesh.",
  applicationName: "Meet with Sivaganesh",
  authors: [{ name: "Sivaganesh Balaganesh", url: "https://siv19.dev" }],
  creator: "Sivaganesh Balaganesh",
  keywords: [
    "Sivaganesh",
    "schedule a meeting",
    "book a call",
    "calendar booking",
    "meet.siv19.dev",
  ],
  openGraph: {
    type: "website",
    siteName: "Meet with Sivaganesh",
    title: "Meet with Sivaganesh",
    description:
      "Find a mutually convenient time and schedule a conversation with Sivaganesh.",
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet with Sivaganesh",
    description:
      "Find a mutually convenient time and schedule a conversation with Sivaganesh.",
    creator: "@siv19",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="flex min-h-dvh flex-col antialiased">
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}
