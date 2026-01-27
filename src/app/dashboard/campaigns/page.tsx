import Link from "next/link";
import { Plus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <p className="text-gray-500">
            Create and manage outbound calling campaigns
          </p>
        </div>
        <Link href="/dashboard/campaigns/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Campaign
          </Button>
        </Link>
      </div>

      {/* Campaigns List */}
      <div className="rounded-lg border bg-white">
        <div className="p-8 text-center">
          <Megaphone className="mx-auto h-12 w-12 text-gray-300" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            No campaigns yet
          </h3>
          <p className="mt-2 text-gray-500">
            Create a campaign to start making outbound calls.
          </p>
          <Link href="/dashboard/campaigns/new">
            <Button className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
