import type { Metadata } from "next";
import { notFound } from "next/navigation";
import BookingPage from "@/components/booking-page";
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
  return {
    title: event.name,
    description: event.description || `Book ${event.name} with Sivaganesh.`,
    alternates: { canonical: `/${event.id}` },
  };
}

export default async function EventBookingPage({ params }: PageProps) {
  const { eventType: id } = await params;
  const event = await getEventType(id);
  if (!event) notFound();
  return <BookingPage eventType={event} />;
}
