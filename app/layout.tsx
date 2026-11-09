import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Footer from "@/components/footer";
import Header from "@/components/header";
import ThemeProvider from "@/components/theme-provider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = "https://meet.siv19.dev";
const title = "Book a call with Sivaganesh";
const description =
  "Pick a time that works for you. 15, 30, or 60 minute video calls, shown in your timezone, with an instant calendar invite.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: title,
    template: "%s · Meet with Sivaganesh",
  },
  description,
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
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "meet.siv19.dev",
    title,
    description,
    url: siteUrl,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#070913" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="relative flex min-h-dvh flex-col antialiased">
        <ThemeProvider>
          <div aria-hidden="true" className="page-backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[60rem]" />
          <Header />
          <div className="flex-1">{children}</div>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
