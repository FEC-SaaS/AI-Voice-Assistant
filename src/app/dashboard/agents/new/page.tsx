"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createAgentSchema, type CreateAgentInput } from "@/schemas/agent";
import { VOICES, VOICE_PROVIDERS } from "@/constants/voices";
import { VoicePreviewButton } from "@/components/agents/voice-preview-button";
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
    control,
    formState: { errors },
  } = useForm<CreateAgentInput>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      voiceProvider: "vapi",
      voiceId: "Elliot",
      language: "en-US",
      modelProvider: "openai",
      model: "gpt-4o",
      voiceSpeed: 1.0,
      backgroundNoiseCancellation: true,
      interruptionSensitivity: "medium",
      fallbackConfig: { action: "hang_up" },
    },
  });

  const { fields: transferFields, append: appendTransfer, remove: removeTransfer } =
    useFieldArray({ control, name: "customTransferNumbers" });

  const [showReceptionistConfig, setShowReceptionistConfig] = useState(false);
  const [showAdvancedVoice, setShowAdvancedVoice] = useState(false);
  const [showTransferConfig, setShowTransferConfig] = useState(false);
  const [showFallbackConfig, setShowFallbackConfig] = useState(false);

  const selectedProvider = watch("voiceProvider");
  const selectedVoiceId = watch("voiceId");
  const watchReceptionist = watch("enableReceptionist");
  const watchFallbackAction = watch("fallbackConfig.action");
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
          <h1 className="text-2xl font-bold text-foreground">Create Agent</h1>
          <p className="text-muted-foreground">Configure your voice agent</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Information */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Basic Information</h2>
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
              placeholder="Hello! This is a representative calling from..."
              {...register("firstMessage")}
            />
          </div>
        </div>

        {/* System Prompt */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">System Prompt *</h2>
          <p className="text-sm text-muted-foreground">Define how your agent should behave during calls.</p>
          <textarea
            className="flex min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder={`You are a professional sales representative for [Company].\nYour goal is to:\n1. Introduce yourself\n2. Qualify the prospect\n3. Schedule a meeting`}
            {...register("systemPrompt")}
          />
          {errors.systemPrompt && <p className="text-sm text-red-500">{errors.systemPrompt.message}</p>}
        </div>

        {/* Voice Configuration */}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="voiceId">Voice</Label>
                <VoicePreviewButton voiceId={selectedVoiceId} />
              </div>
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

          {/* Advanced Voice Settings (collapsible) */}
          <button
            type="button"
            onClick={() => setShowAdvancedVoice(!showAdvancedVoice)}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {showAdvancedVoice ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            Advanced Voice Settings
          </button>

          {showAdvancedVoice && (
            <div className="space-y-4 border-l-2 border-primary/20 pl-4">
              {/* Speaking Rate */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voiceSpeed">Speaking Rate</Label>
                  <span className="text-xs text-muted-foreground">{watch("voiceSpeed") ?? 1.0}x</span>
                </div>
                <input
                  type="range"
                  id="voiceSpeed"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  className="w-full accent-primary"
                  {...register("voiceSpeed", { valueAsNumber: true })}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Slow (0.5x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Fast (2.0x)</span>
                </div>
              </div>

              {/* Interruption Sensitivity */}
              <div className="space-y-2">
                <Label htmlFor="interruptionSensitivity">Interruption Sensitivity</Label>
                <p className="text-xs text-muted-foreground">How easily callers can interrupt the agent mid-speech.</p>
                <select
                  id="interruptionSensitivity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("interruptionSensitivity")}
                >
                  <option value="low">Low — Agent finishes speaking before listening</option>
                  <option value="medium">Medium — Balanced (recommended)</option>
                  <option value="high">High — Agent stops immediately when interrupted</option>
                </select>
              </div>

              {/* Toggle switches */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Background Noise Cancellation</Label>
                    <p className="text-xs text-muted-foreground">Suppress background noise during calls</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" {...register("backgroundNoiseCancellation")} />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm">Filler Word Suppression</Label>
                    <p className="text-xs text-muted-foreground">Prevent agent from using filler words like &quot;um&quot; and &quot;uh&quot;</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" {...register("fillerWordSuppression")} />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Model */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Language Model</h2>
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

        {/* Capabilities */}
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
              <input type="checkbox" id="enableAppointments" className="sr-only peer" {...register("enableAppointments")} />
              <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
            </label>
          </div>

          <hr className="border-border/50" />

          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableReceptionist" className="text-base">Enable Receptionist Mode</Label>
              <p className="text-sm text-muted-foreground">
                Virtual receptionist that greets callers, looks up departments, transfers calls, and takes messages
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="enableReceptionist" className="sr-only peer" {...register("enableReceptionist")} />
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
                      <p className="text-xs text-muted-foreground">Ask callers for their name and purpose before transferring</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" id="receptionistConfig.enableCallScreening" className="sr-only peer" {...register("receptionistConfig.enableCallScreening")} />
                      <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground/70">
                    Set up departments and staff at{" "}
                    <Link href="/dashboard/receptionist/departments" className="text-primary hover:underline">
                      Receptionist → Departments
                    </Link>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Custom Transfer Numbers */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <button
            type="button"
            onClick={() => setShowTransferConfig(!showTransferConfig)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <h2 className="text-lg font-semibold text-foreground">Call Transfer Numbers</h2>
              <p className="text-sm text-muted-foreground">Configure additional phone numbers this agent can transfer calls to</p>
            </div>
            {showTransferConfig ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {showTransferConfig && (
            <div className="space-y-3">
              {transferFields.map((field, idx) => (
                <div key={field.id} className="flex items-center gap-2">
                  <Input
                    placeholder="Label (e.g., Billing)"
                    {...register(`customTransferNumbers.${idx}.label`)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="+1234567890"
                    {...register(`customTransferNumbers.${idx}.number`)}
                    className="flex-1"
                  />
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTransfer(idx)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendTransfer({ label: "", number: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transfer Number
              </Button>
              <p className="text-xs text-muted-foreground">
                These numbers are in addition to department/staff numbers configured in Receptionist settings.
              </p>
            </div>
          )}
        </div>

        {/* Fallback Handling */}
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <button
            type="button"
            onClick={() => setShowFallbackConfig(!showFallbackConfig)}
            className="flex w-full items-center justify-between"
          >
            <div className="text-left">
              <h2 className="text-lg font-semibold text-foreground">Fallback Handling</h2>
              <p className="text-sm text-muted-foreground">What the agent should do when it cannot help the caller</p>
            </div>
            {showFallbackConfig ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
          </button>

          {showFallbackConfig && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fallbackConfig.message">Fallback Message</Label>
                <p className="text-xs text-muted-foreground">Message spoken before ending the call or transferring</p>
                <textarea
                  id="fallbackConfig.message"
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  placeholder="I'm sorry I couldn't help with that. Let me transfer you to a team member who can assist."
                  {...register("fallbackConfig.message")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fallbackConfig.action">Fallback Action</Label>
                <select
                  id="fallbackConfig.action"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  {...register("fallbackConfig.action")}
                >
                  <option value="hang_up">End the call</option>
                  <option value="transfer">Transfer to a number</option>
                </select>
              </div>
              {watchFallbackAction === "transfer" && (
                <div className="space-y-2">
                  <Label htmlFor="fallbackConfig.transferNumber">Transfer Phone Number</Label>
                  <Input
                    id="fallbackConfig.transferNumber"
                    placeholder="+1234567890"
                    {...register("fallbackConfig.transferNumber")}
                  />
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
