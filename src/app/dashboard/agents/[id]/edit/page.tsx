"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Loader2, ChevronDown, ChevronUp } from "lucide-react";
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
  { value: "gpt-4o", label: "GPT-4o (Recommended)" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (Faster)" },
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

  const [showReceptionistConfig, setShowReceptionistConfig] = useState(false);

  useEffect(() => {
    if (agent) {
      const settings = (agent.settings as Record<string, unknown>) || {};
      const rcConfig = settings.receptionistConfig as Record<string, unknown> | undefined;
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
        enableReceptionist: (settings.enableReceptionist as boolean) || false,
        receptionistConfig: rcConfig ? {
          duringHoursGreeting: (rcConfig.duringHoursGreeting as string) || "",
          afterHoursGreeting: (rcConfig.afterHoursGreeting as string) || "",
          afterHoursAction: (rcConfig.afterHoursAction as "take_message" | "info_only") || "take_message",
          enableCallScreening: (rcConfig.enableCallScreening as boolean) || false,
        } : undefined,
      });
    }
  }, [agent, reset]);

  const selectedProvider = watch("voiceProvider");
  const watchReceptionist = watch("enableReceptionist");
  const filteredVoices = VOICES.filter((v) => v.provider === (selectedProvider || "vapi"));

  const onSubmit = (data: CreateAgentInput) => {
    updateAgent.mutate({ id: params.id, data });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
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
          <h1 className="text-2xl font-bold text-foreground">Edit Agent</h1>
          <p className="text-muted-foreground">Update {agent?.name}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
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

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">System Prompt *</h2>
          <textarea
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("systemPrompt")}
          />
          {errors.systemPrompt && <p className="text-sm text-red-500">{errors.systemPrompt.message}</p>}
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Voice Configuration</h2>
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

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">AI Model</h2>
          <select
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...register("model")}
          >
            {AI_MODELS.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Capabilities</h2>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAppointments" className="text-base">Enable Appointment Scheduling</Label>
              <p className="text-sm text-muted-foreground">
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
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <hr className="border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableReceptionist" className="text-base">Enable Receptionist Mode</Label>
              <p className="text-sm text-muted-foreground">
                AI receptionist that greets callers, looks up departments, transfers calls, and takes messages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="enableReceptionist"
                className="sr-only peer"
                {...register("enableReceptionist")}
              />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {watchReceptionist && (
            <div className="ml-4 space-y-4 border-l-2 border-primary/20 pl-4">
              <button
                type="button"
                onClick={() => setShowReceptionistConfig(!showReceptionistConfig)}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {showReceptionistConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Receptionist Configuration
              </button>
              {showReceptionistConfig && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="rc-duringHours">During-Hours Greeting</Label>
                    <textarea
                      id="rc-duringHours"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Thank you for calling [Company]. How may I direct your call?"
                      {...register("receptionistConfig.duringHoursGreeting")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rc-afterHours">After-Hours Greeting</Label>
                    <textarea
                      id="rc-afterHours"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Thank you for calling [Company]. Our office is currently closed..."
                      {...register("receptionistConfig.afterHoursGreeting")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rc-action">After-Hours Action</Label>
                    <select
                      id="rc-action"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...register("receptionistConfig.afterHoursAction")}
                    >
                      <option value="take_message">Take a message</option>
                      <option value="info_only">Provide information only</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="rc-screening" className="text-sm">Enable Call Screening</Label>
                      <p className="text-xs text-muted-foreground">Ask callers for their name and purpose before transferring</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="rc-screening"
                        className="sr-only peer"
                        {...register("receptionistConfig.enableCallScreening")}
                      />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    Manage departments at{" "}
                    <Link href="/dashboard/receptionist/departments" className="text-primary hover:underline">
                      Receptionist &rarr; Departments
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

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
