"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentSchema, type CreateAgentInput } from "@/schemas/agent";
import { VOICES, VOICE_PROVIDERS } from "@/constants/voices";
import { toast } from "sonner";

const AI_MODELS = [
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

export default function EditAgentPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data: agent, isLoading } = trpc.agents.get.useQuery({ id: params.id });
  const updateAgent = trpc.agents.update.useMutation({
    onSuccess: () => {
      toast.success("Agent updated successfully!");
      router.push(`/dashboard/agents/${params.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
  });

  useEffect(() => {
    if (agent) {
      const settings = (agent.settings as Record<string, unknown>) || {};
      reset({
        name: agent.name,
        description: agent.description || "",
        systemPrompt: agent.systemPrompt,
        firstMessage: agent.firstMessage || "",
        voiceProvider: agent.voiceProvider,
        voiceId: agent.voiceId,
        language: agent.language,
        modelProvider: agent.modelProvider,
        model: agent.model,
        enableAppointments: (settings.enableAppointments as boolean) || false,
      });
    }
  }, [agent, reset]);

  const selectedProvider = watch("voiceProvider");
  const filteredVoices = VOICES.filter((v) => v.provider === (selectedProvider || "elevenlabs"));

  const onSubmit = (data: CreateAgentInput) => {
    updateAgent.mutate({ id: params.id, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/agents/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Edit Agent</h1>
          <p className="text-gray-500">Update {agent?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name *</Label>
            <Input id="name" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMessage">First Message</Label>
            <textarea
              id="firstMessage"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("firstMessage")}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">System Prompt *</h2>
          <textarea
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("systemPrompt")}
          />
          {errors.systemPrompt && <p className="text-sm text-red-500">{errors.systemPrompt.message}</p>}
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Voice Configuration</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voiceProvider">Voice Provider</Label>
              <select
                id="voiceProvider"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("voiceProvider")}
              >
                {VOICE_PROVIDERS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="voiceId">Voice</Label>
              <select
                id="voiceId"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                {...register("voiceId")}
              >
                {filteredVoices.map((v) => (
                  <option key={v.id} value={v.id}>{v.name} - {v.description}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">AI Model</h2>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("model")}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Capabilities</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAppointments" className="text-base">Enable Appointment Scheduling</Label>
              <p className="text-sm text-gray-500">
                Allow this agent to check availability and schedule appointments during calls
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="enableAppointments"
                className="sr-only peer"
                {...register("enableAppointments")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href={`/dashboard/agents/${params.id}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateAgent.isLoading}>
            {updateAgent.isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
