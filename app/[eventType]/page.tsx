import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingPage from "@/components/booking-page";
import { ogAlt, ogSize } from "@/lib/og-meta";
import { loadSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ eventType: string }> };

async function getEventType(id: string) {
  const settings = await loadSettings();
  return settings.event_types.find((event) => event.id === id) ?? null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { eventType: id } = await params;
  const event = await getEventType(id);
  if (!event) return {};
  const description = event.description || `Book ${event.name} with Sivaganesh.`;
  const durations = `${event.durations.join(" / ")} min`;
  // A page-level openGraph block replaces the root one, so the shared preview
  // image has to be listed again here.
  const image = { url: "/opengraph-image", width: ogSize.width, height: ogSize.height, alt: ogAlt };
  return {
    title: event.name,
    description,
    alternates: { canonical: `/${event.id}` },
    openGraph: {
      type: "website",
      siteName: "meet.siv19.dev",
      title: `${event.name} · ${durations}`,
      description: `${description} Pick a time in your timezone.`,
      url: `/${event.id}`,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.name} · ${durations}`,
      description: `${description} Pick a time in your timezone.`,
      images: [image],
    },
  };
}

export default async function EventBookingPage({ params }: PageProps) {
  const { eventType: id } = await params;
  const event = await getEventType(id);
  if (!event) notFound();
  return <BookingPage eventType={event} />;
}
