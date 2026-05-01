import BillDetailsClient from "./BillDetailsClient";

export async function generateStaticParams() {
  const communities = Array.from({ length: 100 }, (_, i) => (i + 1).toString());
  const bills = Array.from({ length: 100 }, (_, i) => (i + 1).toString());

  return communities.flatMap((id) => bills.map((billId) => ({ id, billId })));
}

export default async function BillDetails({ params }: { params: Promise<{ id: string, billId: string }> }) {
    const { id, billId } = await params;

    return (
        <BillDetailsClient id={billId} communityId={id} />
    )
}