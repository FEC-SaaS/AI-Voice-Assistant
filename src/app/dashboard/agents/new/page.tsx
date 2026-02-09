"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
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

export default function NewAgentPage() {
  const router = useRouter();
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: (agent) => {
      toast.success("Agent created successfully!");
      router.push(`/dashboard/agents/${agent.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      voiceProvider: "elevenlabs",
      voiceId: "rachel",
      language: "en-US",
      modelProvider: "openai",
      model: "gpt-4o",
    },
  });

  const [showReceptionistConfig, setShowReceptionistConfig] = useState(false);
  const [showMissedCallConfig, setShowMissedCallConfig] = useState(false);
  const selectedProvider = watch("voiceProvider");
  const watchReceptionist = watch("enableReceptionist");
  const watchMissedCall = watch("enableMissedCallTextBack");
  const filteredVoices = VOICES.filter((v) => v.provider === selectedProvider);

  const onSubmit = (data: CreateAgentInput) => {
    createAgent.mutate(data);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/agents">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Create Agent</h1>
          <p className="text-gray-500">Configure your AI voice agent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Basic Information</h2>
          <div className="space-y-2">
            <Label htmlFor="name">Agent Name *</Label>
            <Input id="name" placeholder="e.g., Sales Agent" {...register("name")} />
            {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" placeholder="Brief description of what this agent does" {...register("description")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="firstMessage">First Message</Label>
            <textarea
              id="firstMessage"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Hello! This is an AI assistant calling from..."
              {...register("firstMessage")}
            />
          </div>
        </div>

        <div className="rounded-lg border bg-white p-6 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">System Prompt *</h2>
          <p className="text-sm text-gray-500">Define how your agent should behave during calls.</p>
          <textarea
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={`You are a professional sales representative for [Company].\nYour goal is to:\n1. Introduce yourself\n2. Qualify the prospect\n3. Schedule a meeting`}
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
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <select
              id="model"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              {...register("model")}
            >
              {AI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
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

          <hr className="border-gray-100" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableReceptionist" className="text-base">Enable Receptionist Mode</Label>
              <p className="text-sm text-gray-500">
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
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
                    <Label htmlFor="receptionistConfig.duringHoursGreeting">During-Hours Greeting</Label>
                    <textarea
                      id="receptionistConfig.duringHoursGreeting"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Thank you for calling [Company]. How may I direct your call?"
                      {...register("receptionistConfig.duringHoursGreeting")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receptionistConfig.afterHoursGreeting">After-Hours Greeting</Label>
                    <textarea
                      id="receptionistConfig.afterHoursGreeting"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Thank you for calling [Company]. Our office is currently closed..."
                      {...register("receptionistConfig.afterHoursGreeting")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="receptionistConfig.afterHoursAction">After-Hours Action</Label>
                    <select
                      id="receptionistConfig.afterHoursAction"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      {...register("receptionistConfig.afterHoursAction")}
                    >
                      <option value="take_message">Take a message</option>
                      <option value="info_only">Provide information only</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="receptionistConfig.enableCallScreening" className="text-sm">Enable Call Screening</Label>
                      <p className="text-xs text-gray-500">Ask callers for their name and purpose before transferring</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="receptionistConfig.enableCallScreening"
                        className="sr-only peer"
                        {...register("receptionistConfig.enableCallScreening")}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-gray-400">
                    Set up departments and staff at{" "}
                    <Link href="/dashboard/receptionist/departments" className="text-primary hover:underline">
                      Receptionist &rarr; Departments
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}

          <hr className="border-gray-100" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableMissedCallTextBack" className="text-base">Missed Call Text-Back</Label>
              <p className="text-sm text-gray-500">
                Automatically send an SMS when an inbound call is missed, and optionally auto-callback
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="enableMissedCallTextBack"
                className="sr-only peer"
                {...register("enableMissedCallTextBack")}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          {watchMissedCall && (
            <div className="ml-4 space-y-4 border-l-2 border-primary/20 pl-4">
              <button
                type="button"
                onClick={() => setShowMissedCallConfig(!showMissedCallConfig)}
                className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {showMissedCallConfig ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                Missed Call Configuration
              </button>
              {showMissedCallConfig && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="missedCallConfig.textBackMessage">Text-Back Message</Label>
                    <textarea
                      id="missedCallConfig.textBackMessage"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Hi! We missed your call. Reply YES if you'd like us to call you back."
                      {...register("missedCallConfig.textBackMessage")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="missedCallConfig.afterHoursMessage">After-Hours Message</Label>
                    <textarea
                      id="missedCallConfig.afterHoursMessage"
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      placeholder="Thanks for calling! We're currently closed but will return your call during business hours."
                      {...register("missedCallConfig.afterHoursMessage")}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="missedCallConfig.enableAutoCallback" className="text-sm">Auto-Callback</Label>
                      <p className="text-xs text-gray-500">Automatically call back missed callers after a delay</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="missedCallConfig.enableAutoCallback"
                        className="sr-only peer"
                        {...register("missedCallConfig.enableAutoCallback")}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="missedCallConfig.callbackDelayMinutes">Callback Delay (minutes)</Label>
                      <Input
                        id="missedCallConfig.callbackDelayMinutes"
                        type="number"
                        min={1}
                        max={60}
                        defaultValue={5}
                        {...register("missedCallConfig.callbackDelayMinutes", { valueAsNumber: true })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="missedCallConfig.dedupWindowMinutes">Dedup Window (minutes)</Label>
                      <Input
                        id="missedCallConfig.dedupWindowMinutes"
                        type="number"
                        min={5}
                        max={1440}
                        defaultValue={30}
                        {...register("missedCallConfig.dedupWindowMinutes", { valueAsNumber: true })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="missedCallConfig.autoCreateLead" className="text-sm">Auto-Create Lead</Label>
                      <p className="text-xs text-gray-500">Automatically create a contact/lead from missed callers</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="missedCallConfig.autoCreateLead"
                        className="sr-only peer"
                        defaultChecked
                        {...register("missedCallConfig.autoCreateLead")}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4">
          <Link href="/dashboard/agents">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createAgent.isLoading}>
            {createAgent.isLoading ? "Creating..." : "Create Agent"}
          </Button>
        </div>
      </form>
    </div>
  );
}
