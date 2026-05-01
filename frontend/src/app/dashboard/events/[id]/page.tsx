import EventDetailsClient from './EventDetailsClient';

export async function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ id: (i + 1).toString() }));
}

export default async function EventDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailsClient />;
}
