"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useOrganization } from "@clerk/nextjs";
import {
  Bot, ArrowRight, ArrowLeft, Check, Phone, Mic,
  MessageSquare, Loader2, Sparkles, Zap, BookOpen,
  Search, Globe, Hash, AlertCircle, CheckCircle,
  ChevronRight, Shield, PhoneCall, SkipForward,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

// ─── Steps ──────────────────────────────────────────────────────
const STEPS = [
  { id: 1, title: "Welcome", description: "Overview of your setup" },
  { id: 2, title: "Create Agent", description: "Build your voice agent" },
  { id: 3, title: "Phone Number", description: "Give your agent a number" },
  { id: 4, title: "Knowledge Base", description: "Teach your agent" },
  { id: 5, title: "Test Call", description: "Hear your agent in action" },
  { id: 6, title: "All Set", description: "You're ready to go!" },
];

// ─── Agent Templates ────────────────────────────────────────────
const AGENT_TEMPLATES = [
  {
    id: "receptionist",
    title: "Virtual Receptionist",
    description: "Answer calls, take messages, and route inquiries to the right department",
    icon: Phone,
    color: "bg-blue-500",
    systemPrompt: `You are a professional virtual receptionist for {company_name}. Your role is to:
- Greet callers warmly and professionally
- Answer basic questions about the business
- Take messages and collect contact information
- Schedule appointments when appropriate
- Transfer calls to the appropriate department

Always be polite, helpful, and maintain a professional tone. If you don't know the answer to a question, offer to take a message or transfer the call.`,
    firstMessage: "Hello, thank you for calling! How may I help you today?",
  },
  {
    id: "sales",
    title: "Sales Outreach",
    description: "Cold calling, lead qualification, and appointment booking for your sales team",
    icon: Zap,
    color: "bg-amber-500",
    systemPrompt: `You are a friendly sales representative for {company_name}. Your role is to:
- Introduce yourself and the company
- Qualify leads by asking relevant questions
- Understand the prospect's needs and pain points
- Schedule follow-up calls or meetings
- Handle objections professionally

Be personable and conversational, not pushy. Focus on understanding the prospect's needs first.`,
    firstMessage: "Hi there! This is {agent_name} from {company_name}. Do you have a quick moment to chat?",
  },
  {
    id: "support",
    title: "Customer Support",
    description: "Handle customer inquiries, troubleshoot issues, and ensure satisfaction",
    icon: MessageSquare,
    color: "bg-green-500",
    systemPrompt: `You are a helpful customer support agent for {company_name}. Your role is to:
- Listen to customer concerns with empathy
- Troubleshoot common issues
- Provide clear, step-by-step solutions
- Escalate complex issues appropriately
- Follow up to ensure satisfaction

Always be patient and understanding. The customer's experience is your top priority.`,
    firstMessage: "Hi! I'm here to help. What can I assist you with today?",
  },
  {
    id: "custom",
    title: "Custom Agent",
    description: "Start from scratch and build an agent tailored to your unique needs",
    icon: Sparkles,
    color: "bg-purple-500",
    systemPrompt: "",
    firstMessage: "",
  },
];

// ─── Phone Number Types ─────────────────────────────────────────
type ProvisionMethod = "search" | "import";

interface AvailableNumber {
  phone_number: string;
  friendly_name: string;
  locality: string;
  region: string;
  iso_country: string;
}

const ONBOARDING_STORAGE_KEY = "calltone_onboarding_progress";

interface OnboardingProgress {
  currentStep: number;
  createdAgentId: string | null;
  createdPhoneNumberId: string | null;
  createdPhoneNumber: string | null;
  agentName: string;
  selectedTemplate: string | null;
}

function loadProgress(): OnboardingProgress | null {
  if (typeof window === "undefined") return null;
  try {
    const saved = localStorage.getItem(ONBOARDING_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveProgress(progress: OnboardingProgress) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Ignore storage errors
  }
}

function clearProgress() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ONBOARDING_STORAGE_KEY);
  } catch {
    // Ignore
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();

  // Load persisted progress
  const saved = loadProgress();
  const [currentStep, setCurrentStep] = useState(saved?.currentStep ?? 1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(saved?.selectedTemplate ?? null);
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(saved?.createdAgentId ?? null);
  const [createdPhoneNumberId, setCreatedPhoneNumberId] = useState<string | null>(saved?.createdPhoneNumberId ?? null);
  const [createdPhoneNumber, setCreatedPhoneNumber] = useState<string | null>(saved?.createdPhoneNumber ?? null);

  // Agent form state
  const [agentName, setAgentName] = useState(saved?.agentName ?? "");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  // Phone number state
  const [provisionMethod, setProvisionMethod] = useState<ProvisionMethod>("search");
  const [selectedCountry, setSelectedCountry] = useState("US");
  const [numberType, setNumberType] = useState("local");
  const [areaCode, setAreaCode] = useState("");
  const [searchResults, setSearchResults] = useState<AvailableNumber[]>([]);
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [pricing, setPricing] = useState<{ monthlyBase: number; monthlySaaS: number } | null>(null);
  const [twilioSid, setTwilioSid] = useState("");
  const [twilioToken, setTwilioToken] = useState("");
  const [importNumber, setImportNumber] = useState("");

  // Knowledge base state
  const [knowledgeName, setKnowledgeName] = useState("");
  const [knowledgeContent, setKnowledgeContent] = useState("");

  // Test call state
  const [testCallPhone, setTestCallPhone] = useState("");

  const utils = trpc.useUtils();

  // Persist progress when key state changes
  useEffect(() => {
    saveProgress({
      currentStep,
      createdAgentId,
      createdPhoneNumberId,
      createdPhoneNumber,
      agentName,
      selectedTemplate,
    });
  }, [currentStep, createdAgentId, createdPhoneNumberId, createdPhoneNumber, agentName, selectedTemplate]);

  // Queries
  const { data: countries } = trpc.phoneNumbers.getSupportedCountries.useQuery(
    undefined,
    { enabled: currentStep === 3 }
  );

  // Mutations
  const createAgent = trpc.agents.create.useMutation({
    onSuccess: (agent) => {
      setCreatedAgentId(agent.id);
      toast.success("Agent created successfully!");
      setCurrentStep(3);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const searchAvailable = trpc.phoneNumbers.searchAvailable.useMutation({
    onSuccess: (data) => {
      setSearchResults(data.numbers);
      setPricing(data.pricing);
      if (data.numbers.length === 0) {
        toast.info("No numbers found. Try a different area code or type.");
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const buyNumber = trpc.phoneNumbers.buyNumber.useMutation({
    onSuccess: (phoneNumber) => {
      setCreatedPhoneNumberId(phoneNumber.id);
      setCreatedPhoneNumber(phoneNumber.number);
      toast.success(`Phone number ${phoneNumber.number} provisioned!`);
      // Auto-assign to agent
      if (createdAgentId) {
        assignToAgent.mutate({ id: phoneNumber.id, agentId: createdAgentId });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const importTwilio = trpc.phoneNumbers.importTwilio.useMutation({
    onSuccess: (phoneNumber) => {
      setCreatedPhoneNumberId(phoneNumber.id);
      setCreatedPhoneNumber(phoneNumber.number);
      toast.success(`Phone number ${phoneNumber.number} imported!`);
      // Auto-assign to agent
      if (createdAgentId) {
        assignToAgent.mutate({ id: phoneNumber.id, agentId: createdAgentId });
      }
    },
    onError: (err) => toast.error(err.message),
  });

  const assignToAgent = trpc.phoneNumbers.assignToAgent.useMutation({
    onSuccess: () => {
      toast.success("Phone number assigned to your agent!");
      setCurrentStep(4);
    },
    onError: (err) => {
      toast.error(`Assignment failed: ${err.message}`);
      // Still proceed since the number was provisioned
      setCurrentStep(4);
    },
  });

  const createKnowledge = trpc.knowledge.create.useMutation({
    onSuccess: () => {
      toast.success("Knowledge base added!");
      setCurrentStep(5);
    },
    onError: (err) => toast.error(err.message),
  });

  const testCall = trpc.agents.testCall.useMutation({
    onSuccess: () => {
      toast.success("Test call initiated! Your phone should ring shortly.");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const completeOnboarding = trpc.users.completeOnboarding.useMutation({
    onSuccess: () => {
      clearProgress();
      utils.users.me.invalidate();
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  // Check if organization exists
  useEffect(() => {
    if (isLoaded && !organization) {
      router.push("/sign-in");
    }
  }, [isLoaded, organization, router]);

  // Handlers
  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setAgentName(templateId === "custom" ? "" : template.title);
      setSystemPrompt(
        template.systemPrompt.replace(/{company_name}/g, organization?.name || "your company")
      );
      setFirstMessage(
        template.firstMessage
          .replace("{agent_name}", "Alex")
          .replace("{company_name}", organization?.name || "your company")
      );
    }
  };

  const handleCreateAgent = () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    if (!systemPrompt.trim() || systemPrompt.trim().length < 10) {
      toast.error("Please enter a system prompt (at least 10 characters)");
      return;
    }
    createAgent.mutate({
      name: agentName,
      systemPrompt,
      firstMessage: firstMessage || undefined,
    });
  };

  const handleSearchNumbers = () => {
    searchAvailable.mutate({
      countryCode: selectedCountry,
      type: numberType as "local" | "toll-free" | "mobile",
      areaCode: areaCode || undefined,
      limit: 5,
    });
  };

  const handleBuyNumber = () => {
    if (!selectedNumber) {
      toast.error("Please select a number");
      return;
    }
    buyNumber.mutate({
      phoneNumber: selectedNumber,
      countryCode: selectedCountry,
      type: numberType as "local" | "toll-free" | "mobile",
    });
  };

  const handleImportNumber = () => {
    if (!twilioSid.trim() || !twilioToken.trim() || !importNumber.trim()) {
      toast.error("Please fill in all Twilio fields");
      return;
    }
    importTwilio.mutate({
      twilioAccountSid: twilioSid,
      twilioAuthToken: twilioToken,
      phoneNumber: importNumber,
    });
  };

  const handleAddKnowledge = () => {
    if (!knowledgeName.trim()) {
      toast.error("Please enter a name for the knowledge document");
      return;
    }
    if (!knowledgeContent.trim()) {
      toast.error("Please enter some business information");
      return;
    }
    createKnowledge.mutate({
      name: knowledgeName,
      type: "manual",
      content: knowledgeContent,
      agentId: createdAgentId || undefined,
    });
  };

  const handleComplete = () => {
    completeOnboarding.mutate();
  };

  const isPhoneStepBusy =
    searchAvailable.isPending || buyNumber.isPending || importTwilio.isPending || assignToAgent.isPending;

  if (!isLoaded) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl py-8 px-4">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                    currentStep > step.id
                      ? "border-primary bg-primary text-white"
                      : currentStep === step.id
                      ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/20"
                      : "border-border text-muted-foreground/70"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <span
                  className={`mt-2 text-[10px] sm:text-xs text-center leading-tight ${
                    currentStep >= step.id ? "text-primary font-medium" : "text-muted-foreground/70"
                  }`}
                >
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div
                  className={`mx-1 sm:mx-2 h-0.5 w-8 sm:w-16 transition-colors duration-300 ${
                    currentStep > step.id ? "bg-primary" : "bg-secondary"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ─── Step 1: Welcome ─── */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 p-8 text-white text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <Bot className="h-8 w-8" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold">
                Welcome to CallTone!
              </h1>
              <p className="mt-2 text-white/80 max-w-lg mx-auto">
                Welcome, <span className="font-semibold text-white">{organization?.name}</span>!
                Let&apos;s get your first voice agent up and running. This guided setup takes
                about 5 minutes.
              </p>
            </div>
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Here&apos;s what we&apos;ll set up together:
              </h2>
              <div className="space-y-3">
                {[
                  {
                    step: 1,
                    icon: Bot,
                    title: "Create Your Voice Agent",
                    desc: "Choose a template and customize your agent's personality and behavior.",
                    required: true,
                  },
                  {
                    step: 2,
                    icon: Phone,
                    title: "Provision a Phone Number",
                    desc: "Your agent needs a phone number to make and receive calls. We'll help you get one.",
                    required: true,
                  },
                  {
                    step: 3,
                    icon: BookOpen,
                    title: "Add Business Knowledge",
                    desc: "Teach your agent about your business so it can answer caller questions accurately.",
                    required: false,
                  },
                  {
                    step: 4,
                    icon: PhoneCall,
                    title: "Make a Test Call",
                    desc: "Call your agent's number to hear it in action and verify everything works.",
                    required: false,
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex items-start gap-4 rounded-xl border border-border/50 bg-background p-4 transition-all hover:border-primary/20"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
                      <item.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-foreground">{item.title}</h3>
                        {item.required ? (
                          <Badge variant="default" className="text-[10px] py-0">
                            Required
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[10px] py-0">
                            Optional
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex justify-center">
                <Button size="lg" onClick={() => setCurrentStep(2)} className="px-8">
                  Let&apos;s Begin
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─── Step 2: Create Agent ─── */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {!selectedTemplate ? (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/10 text-primary border-0">Step 2 of 6</Badge>
                </div>
                <CardTitle>Choose a Template</CardTitle>
                <CardDescription>
                  Pick a pre-built template to get started quickly. Each template comes with an
                  optimized system prompt and greeting message that you can customize.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {AGENT_TEMPLATES.map((template) => {
                    const Icon = template.icon;
                    return (
                      <button
                        key={template.id}
                        onClick={() => handleSelectTemplate(template.id)}
                        className="flex items-start gap-4 rounded-xl border-2 border-border/50 p-5 text-left transition-all hover:border-primary hover:shadow-lg hover:-translate-y-0.5 group"
                      >
                        <div className={`rounded-xl ${template.color} p-3 shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {template.title}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground/70 group-hover:text-primary mt-1 transition-colors" />
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="bg-primary/10 text-primary border-0">Step 2 of 6</Badge>
                </div>
                <CardTitle>Configure Your Agent</CardTitle>
                <CardDescription>
                  Customize your agent&apos;s name and behavior. The system prompt defines how
                  your agent will interact with callers.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div>
                  <Label htmlFor="agentName">Agent Name *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    A friendly name to identify this agent in your dashboard
                  </p>
                  <Input
                    id="agentName"
                    placeholder="e.g., Sales Assistant, Front Desk"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="systemPrompt">System Prompt *</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    This defines your agent&apos;s personality, tone, and what it should do on
                    calls. Be specific about the behavior you want.
                  </p>
                  <Textarea
                    id="systemPrompt"
                    rows={7}
                    placeholder="Describe how your agent should behave..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="firstMessage">First Message</Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    The opening line your agent says when it answers or places a call.
                    Leave blank for a default greeting.
                  </p>
                  <Input
                    id="firstMessage"
                    placeholder="e.g., Hello! How can I help you today?"
                    value={firstMessage}
                    onChange={(e) => setFirstMessage(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                if (selectedTemplate) {
                  setSelectedTemplate(null);
                } else {
                  setCurrentStep(1);
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {selectedTemplate && (
              <Button onClick={handleCreateAgent} disabled={createAgent.isPending}>
                {createAgent.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Agent...
                  </>
                ) : (
                  <>
                    Create Agent & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* ─── Step 3: Phone Number ─── */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-0">Step 3 of 6</Badge>
                <Badge variant="destructive" className="text-[10px] py-0">Required</Badge>
              </div>
              <CardTitle>Provision a Phone Number</CardTitle>
              <CardDescription>
                Your voice agent needs a phone number to make and receive calls. Without a number,
                your agent can&apos;t communicate with anyone. Choose how you&apos;d like to get one:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Already provisioned — show success */}
              {createdPhoneNumber ? (
                <div className="space-y-4">
                  <div className="rounded-xl border-2 border-border bg-green-500/10 p-5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-500/10">
                        <CheckCircle className="h-6 w-6 text-green-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-green-400">Phone Number Ready!</p>
                        <p className="text-lg font-mono text-green-400">{createdPhoneNumber}</p>
                        <p className="text-sm text-green-400 mt-0.5">
                          Assigned to <span className="font-medium">{agentName}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={() => setCurrentStep(4)}>
                      Continue
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Method Toggle */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => setProvisionMethod("search")}
                      className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        provisionMethod === "search"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${provisionMethod === "search" ? "bg-primary/10" : "bg-secondary"}`}>
                        <Search className={`h-5 w-5 ${provisionMethod === "search" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Search & Buy</p>
                        <p className="text-xs text-muted-foreground">Get a new number instantly</p>
                      </div>
                    </button>
                    <button
                      onClick={() => setProvisionMethod("import")}
                      className={`flex-1 flex items-center gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                        provisionMethod === "import"
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-border"
                      }`}
                    >
                      <div className={`rounded-lg p-2 ${provisionMethod === "import" ? "bg-primary/10" : "bg-secondary"}`}>
                        <Globe className={`h-5 w-5 ${provisionMethod === "import" ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Import from Twilio</p>
                        <p className="text-xs text-muted-foreground">Use your existing number</p>
                      </div>
                    </button>
                  </div>

                  {/* Search & Buy Flow */}
                  {provisionMethod === "search" && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-blue-500/10 border border-border p-3">
                        <p className="text-sm text-blue-400">
                          Search for available phone numbers by country and type. Select one to
                          purchase and it will be automatically assigned to your agent.
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div>
                          <Label>Country</Label>
                          <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {countries ? (
                                countries.map((c: { code: string; name: string }) => (
                                  <SelectItem key={c.code} value={c.code}>
                                    {c.name}
                                  </SelectItem>
                                ))
                              ) : (
                                <SelectItem value="US">United States</SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Select value={numberType} onValueChange={setNumberType}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="local">Local</SelectItem>
                              <SelectItem value="toll-free">Toll-Free</SelectItem>
                              <SelectItem value="mobile">Mobile</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Area Code (optional)</Label>
                          <div className="flex gap-2">
                            <Input
                              placeholder="e.g., 415"
                              value={areaCode}
                              onChange={(e) => setAreaCode(e.target.value)}
                              maxLength={5}
                            />
                            <Button
                              onClick={handleSearchNumbers}
                              disabled={searchAvailable.isPending}
                              className="flex-shrink-0"
                            >
                              {searchAvailable.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Search className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Search Results */}
                      {searchResults.length > 0 && (
                        <div className="space-y-2">
                          <Label>Select a Number</Label>
                          {pricing && (
                            <p className="text-xs text-muted-foreground">
                              Monthly cost: ${pricing.monthlySaaS.toFixed(2)}/mo
                            </p>
                          )}
                          <div className="grid gap-2">
                            {searchResults.map((num) => (
                              <button
                                key={num.phone_number}
                                onClick={() => setSelectedNumber(num.phone_number)}
                                className={`flex items-center justify-between rounded-lg border-2 p-3 text-left transition-all ${
                                  selectedNumber === num.phone_number
                                    ? "border-primary bg-primary/5"
                                    : "border-border hover:border-border"
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <Hash className="h-4 w-4 text-muted-foreground/70" />
                                  <span className="font-mono font-medium">{num.phone_number}</span>
                                </div>
                                <span className="text-sm text-muted-foreground">
                                  {num.locality && `${num.locality}, `}{num.region}
                                </span>
                              </button>
                            ))}
                          </div>
                          <Button
                            onClick={handleBuyNumber}
                            disabled={!selectedNumber || buyNumber.isPending}
                            className="w-full mt-2"
                          >
                            {buyNumber.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Provisioning...
                              </>
                            ) : (
                              <>
                                <Phone className="mr-2 h-4 w-4" />
                                Get This Number
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Import Twilio Flow */}
                  {provisionMethod === "import" && (
                    <div className="space-y-4">
                      <div className="rounded-lg bg-blue-500/10 border border-border p-3">
                        <p className="text-sm text-blue-400">
                          Already have a Twilio number? Import it here. You&apos;ll need your
                          Twilio Account SID, Auth Token, and the phone number in E.164 format
                          (e.g., +14155551234).
                        </p>
                      </div>
                      <div>
                        <Label>Twilio Account SID</Label>
                        <Input
                          placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          value={twilioSid}
                          onChange={(e) => setTwilioSid(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Twilio Auth Token</Label>
                        <Input
                          type="password"
                          placeholder="Your Twilio Auth Token"
                          value={twilioToken}
                          onChange={(e) => setTwilioToken(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Phone Number (E.164)</Label>
                        <Input
                          placeholder="+14155551234"
                          value={importNumber}
                          onChange={(e) => setImportNumber(e.target.value)}
                        />
                      </div>
                      <Button
                        onClick={handleImportNumber}
                        disabled={importTwilio.isPending}
                        className="w-full"
                      >
                        {importTwilio.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Importing...
                          </>
                        ) : (
                          <>
                            <Globe className="mr-2 h-4 w-4" />
                            Import Number
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {!createdPhoneNumber && (
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setCurrentStep(2)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground/70">
                <Shield className="h-4 w-4" />
                <span>This step is required</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Step 4: Knowledge Base ─── */}
      {currentStep === 4 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-0">Step 4 of 6</Badge>
                <Badge variant="secondary" className="text-[10px] py-0">Optional</Badge>
              </div>
              <CardTitle>Add Business Knowledge</CardTitle>
              <CardDescription>
                Help your agent answer questions about your business accurately. Add
                information like your services, pricing, hours, FAQ, or anything callers
                commonly ask about. You can always add more later.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="knowledgeName">Document Name</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  A label to identify this knowledge (e.g., &quot;Business Overview&quot;, &quot;FAQ&quot;, &quot;Services&quot;)
                </p>
                <Input
                  id="knowledgeName"
                  placeholder="e.g., Business Overview"
                  value={knowledgeName}
                  onChange={(e) => setKnowledgeName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="knowledgeContent">Business Information</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Paste or type any information you want your agent to know. Include
                  details like:
                </p>
                <ul className="text-xs text-muted-foreground mb-3 ml-4 list-disc space-y-0.5">
                  <li>Business name, address, and hours of operation</li>
                  <li>Products or services you offer</li>
                  <li>Pricing information</li>
                  <li>Frequently asked questions and answers</li>
                  <li>Policies (returns, cancellations, etc.)</li>
                </ul>
                <Textarea
                  id="knowledgeContent"
                  rows={8}
                  placeholder={`Example:\n\nBusiness: ${organization?.name || "Acme Inc"}\nHours: Mon-Fri 9am-5pm EST\nPhone: ${createdPhoneNumber || "(555) 123-4567"}\n\nServices:\n- Service A: Description and pricing\n- Service B: Description and pricing\n\nFAQ:\nQ: What are your hours?\nA: We're open Monday to Friday, 9am to 5pm Eastern Time.`}
                  value={knowledgeContent}
                  onChange={(e) => setKnowledgeContent(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-amber-500/10 border border-border p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-amber-400">
                    The more detailed your knowledge base, the better your agent can answer
                    caller questions. You can add more documents anytime from the Knowledge Base
                    section.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(3)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(5)}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip for Now
              </Button>
              <Button onClick={handleAddKnowledge} disabled={createKnowledge.isPending}>
                {createKnowledge.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Save & Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 5: Test Call ─── */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 mb-1">
                <Badge className="bg-primary/10 text-primary border-0">Step 5 of 6</Badge>
                <Badge variant="secondary" className="text-[10px] py-0">Optional</Badge>
              </div>
              <CardTitle>Test Your Agent</CardTitle>
              <CardDescription>
                Everything is set up! Call your agent&apos;s phone number to hear it in action
                and make sure it works the way you want.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Agent Summary */}
              <div className="rounded-xl border-2 border-border/50 bg-background p-5">
                <h3 className="font-semibold text-foreground mb-3">Your Agent Summary</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{agentName}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedTemplate ? AGENT_TEMPLATES.find(t => t.id === selectedTemplate)?.title : "Custom"} Agent
                      </p>
                    </div>
                  </div>
                  {createdPhoneNumber && (
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
                        <Phone className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-mono font-medium text-foreground">{createdPhoneNumber}</p>
                        <p className="text-sm text-muted-foreground">Assigned phone number</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Test Call Instructions */}
              <div className="rounded-xl border-2 border-primary/20 bg-primary/5 p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 flex-shrink-0">
                    <PhoneCall className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">How to Test</h3>
                    <ol className="mt-2 space-y-2 text-sm text-foreground/80">
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                        <span>Pick up your phone and dial <span className="font-mono font-semibold">{createdPhoneNumber || "your agent's number"}</span></span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                        <span>Your voice agent will answer and greet you</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                        <span>Have a conversation to test its responses and behavior</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white text-xs font-bold flex-shrink-0 mt-0.5">4</span>
                        <span>If you want to adjust anything, you can edit your agent from the dashboard</span>
                      </li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Call Me Button */}
              {createdAgentId && (
                <div className="rounded-xl border-2 border-green-500/20 bg-green-500/5 p-5">
                  <h3 className="font-semibold text-foreground mb-2">Quick Test: Have the Agent Call You</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Enter your phone number and we&apos;ll have your agent call you directly.
                  </p>
                  <div className="flex gap-2">
                    <Input
                      placeholder="+1 (555) 123-4567"
                      value={testCallPhone}
                      onChange={(e) => setTestCallPhone(e.target.value)}
                      type="tel"
                    />
                    <Button
                      onClick={() => {
                        if (!testCallPhone.trim() || testCallPhone.replace(/\D/g, "").length < 10) {
                          toast.error("Please enter a valid phone number");
                          return;
                        }
                        testCall.mutate({
                          agentId: createdAgentId,
                          phoneNumber: testCallPhone,
                        });
                      }}
                      disabled={testCall.isPending}
                      className="flex-shrink-0"
                    >
                      {testCall.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <PhoneCall className="mr-2 h-4 w-4" />
                          Call Me
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="rounded-lg bg-blue-500/10 border border-border p-3">
                <div className="flex gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-blue-400">
                    It may take a few seconds for a newly provisioned number to become active.
                    If the call doesn&apos;t connect, wait a moment and try again.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(4)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setCurrentStep(6)}>
                <SkipForward className="mr-2 h-4 w-4" />
                Skip for Now
              </Button>
              <Button onClick={() => setCurrentStep(6)}>
                I&apos;ve Tested, Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Step 6: Complete ─── */}
      {currentStep === 6 && (
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 p-8 text-white text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-10 w-10" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold">You&apos;re All Set!</h1>
            <p className="mt-2 text-white/90 max-w-lg mx-auto">
              Your voice agent is live and ready to handle calls. Here&apos;s a summary of
              what we set up:
            </p>
          </div>
          <CardContent className="p-6 sm:p-8 space-y-6">
            {/* Setup Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-4 w-4 text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-sm">Voice Agent Created</p>
                  <p className="text-xs text-muted-foreground">{agentName}</p>
                </div>
              </div>
              {createdPhoneNumber && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Phone Number Assigned</p>
                    <p className="text-xs text-muted-foreground font-mono">{createdPhoneNumber}</p>
                  </div>
                </div>
              )}
              {knowledgeContent && (
                <div className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-500/10">
                    <Check className="h-4 w-4 text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Knowledge Base Added</p>
                    <p className="text-xs text-muted-foreground">{knowledgeName}</p>
                  </div>
                </div>
              )}
            </div>

            {/* What's Next */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Explore What&apos;s Next</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  href="/dashboard/campaigns/new"
                  className="group rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Mic className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-medium text-sm">Launch a Campaign</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Start automated outbound calling campaigns to reach your contacts
                  </p>
                </Link>
                <Link
                  href="/dashboard/knowledge"
                  className="group rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <BookOpen className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-medium text-sm">Add More Knowledge</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload documents or add more business info to make your agent smarter
                  </p>
                </Link>
                <Link
                  href="/dashboard/agents/new"
                  className="group rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Bot className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-medium text-sm">Create More Agents</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Build specialized agents for different departments or use cases
                  </p>
                </Link>
                <Link
                  href="/dashboard/settings"
                  className="group rounded-xl border border-border p-4 hover:border-primary/30 hover:bg-primary/5 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <Shield className="h-6 w-6 text-primary" />
                    <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                  </div>
                  <h4 className="font-medium text-sm">Configure Settings</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    Set up team members, billing, integrations, and compliance
                  </p>
                </Link>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={handleComplete} disabled={completeOnboarding.isPending} className="px-8">
                {completeOnboarding.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Finishing...
                  </>
                ) : (
                  <>
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
