import CommunityDetailsClient from './CommunityDetailsClient';

export async function generateStaticParams() {
  return Array.from({ length: 100 }, (_, i) => ({ id: (i + 1).toString() }));
}

export default async function CommunityDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CommunityDetailsClient id={id} />;
}
