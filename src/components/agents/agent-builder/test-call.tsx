"use client";

import { useState } from "react";
import { PhoneCall, Loader2, CheckCircle, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface TestCallProps {
  agentId: string;
}

export function TestCall({ agentId }: TestCallProps) {
  const [testNumber, setTestNumber] = useState("");
  const [callStatus, setCallStatus] = useState<string | null>(null);

  const testCall = trpc.agents.testCall.useMutation({
    onSuccess: (data) => {
      setCallStatus(data.status);
      toast.success("Test call initiated!");
    },
    onError: (err) => {
      setCallStatus("failed");
      toast.error(err.message);
    },
  });

  const handleCall = () => {
    setCallStatus(null);
    testCall.mutate({ agentId, phoneNumber: testNumber });
  };

  return (
    <div className="rounded-lg border border-primary/20 bg-primary/5 p-6">
      <h3 className="text-lg font-semibold text-gray-900">Make a Test Call</h3>
      <p className="mt-1 text-sm text-gray-500">
        Enter a phone number to test this agent. The agent will call the number
        and use its configured prompt.
      </p>
      <div className="mt-4 flex items-end gap-4">
        <div className="flex-1 space-y-2">
          <Label htmlFor="testNumber">Phone Number</Label>
          <Input
            id="testNumber"
            placeholder="+1234567890"
            value={testNumber}
            onChange={(e) => setTestNumber(e.target.value)}
          />
        </div>
        <Button
          onClick={handleCall}
          disabled={testCall.isPending || !testNumber}
        >
          {testCall.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Calling...
            </>
          ) : (
            <>
              <PhoneCall className="mr-2 h-4 w-4" /> Call Now
            </>
          )}
        </Button>
      </div>
      {callStatus && (
        <div className="mt-3 flex items-center gap-2 text-sm">
          {callStatus === "failed" ? (
            <>
              <XCircle className="h-4 w-4 text-red-500" /> Call failed
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 text-green-500" /> Call initiated
              (status: {callStatus})
            </>
          )}
        </div>
      )}
    </div>
  );
}
