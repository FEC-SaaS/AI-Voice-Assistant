export default function CampaignDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Campaign Details</h1>
      <p className="text-gray-500">Campaign ID: {params.id}</p>
    </div>
  );
}
