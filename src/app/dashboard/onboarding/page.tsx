"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrganization } from "@clerk/nextjs";
import {
  Bot, ArrowRight, ArrowLeft, Check, Phone, Mic,
  MessageSquare, Loader2, Sparkles, Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const STEPS = [
  { id: 1, title: "Welcome", description: "Get started with VoxForge AI" },
  { id: 2, title: "Create Agent", description: "Build your first AI voice agent" },
  { id: 3, title: "Test Call", description: "Make your first test call" },
  { id: 4, title: "Complete", description: "You&apos;re all set!" },
];

const AGENT_TEMPLATES = [
  {
    id: "receptionist",
    title: "Virtual Receptionist",
    description: "Answer calls, take messages, and route inquiries",
    icon: Phone,
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
    description: "Cold calling and lead qualification",
    icon: Zap,
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
    description: "Handle customer inquiries and issues",
    icon: MessageSquare,
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
    description: "Start from scratch",
    icon: Sparkles,
    systemPrompt: "",
    firstMessage: "",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { organization, isLoaded } = useOrganization();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [, setCreatedAgentId] = useState<string | null>(null);

  // Agent form state
  const [agentName, setAgentName] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [firstMessage, setFirstMessage] = useState("");

  // Test call state
  const [testPhoneNumber, setTestPhoneNumber] = useState("");

  const utils = trpc.useUtils();

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

  const completeOnboarding = trpc.users.completeOnboarding.useMutation({
    onSuccess: () => {
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

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = AGENT_TEMPLATES.find((t) => t.id === templateId);
    if (template) {
      setAgentName(templateId === "custom" ? "" : template.title);
      setSystemPrompt(template.systemPrompt.replace("{company_name}", organization?.name || "your company"));
      setFirstMessage(template.firstMessage.replace("{agent_name}", "Alex").replace("{company_name}", organization?.name || "your company"));
    }
  };

  const handleCreateAgent = () => {
    if (!agentName.trim()) {
      toast.error("Please enter an agent name");
      return;
    }
    if (!systemPrompt.trim()) {
      toast.error("Please enter a system prompt");
      return;
    }

    createAgent.mutate({
      name: agentName,
      systemPrompt,
      firstMessage: firstMessage || undefined,
    });
  };

  const handleSkipTestCall = () => {
    setCurrentStep(4);
  };

  const handleComplete = () => {
    completeOnboarding.mutate();
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
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
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                    currentStep > step.id
                      ? "border-primary bg-primary text-white"
                      : currentStep === step.id
                      ? "border-primary text-primary"
                      : "border-gray-300 text-gray-400"
                  }`}
                >
                  {currentStep > step.id ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                <span className={`mt-2 text-xs ${currentStep >= step.id ? "text-primary font-medium" : "text-gray-400"}`}>
                  {step.title}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div className={`mx-2 h-0.5 w-16 sm:w-24 ${currentStep > step.id ? "bg-primary" : "bg-gray-200"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Welcome */}
      {currentStep === 1 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Welcome to VoxForge AI!</CardTitle>
            <CardDescription className="text-base">
              Welcome, {organization?.name}! Let&apos;s set up your first AI voice agent in just a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-lg border p-4 text-center">
                <Bot className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-2 font-medium">Create Agents</h3>
                <p className="text-sm text-gray-500">Build AI voice agents for any use case</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Phone className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-2 font-medium">Make Calls</h3>
                <p className="text-sm text-gray-500">Inbound and outbound calling</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <Mic className="mx-auto h-8 w-8 text-primary" />
                <h3 className="mt-2 font-medium">Natural Voice</h3>
                <p className="text-sm text-gray-500">Lifelike AI conversations</p>
              </div>
            </div>
            <div className="flex justify-center">
              <Button size="lg" onClick={() => setCurrentStep(2)}>
                Get Started
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Create Agent */}
      {currentStep === 2 && (
        <div className="space-y-6">
          {!selectedTemplate ? (
            <Card>
              <CardHeader>
                <CardTitle>Choose a Template</CardTitle>
                <CardDescription>
                  Select a template to get started quickly, or create a custom agent from scratch.
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
                        className="flex items-start gap-4 rounded-lg border p-4 text-left transition-all hover:border-primary hover:shadow-md"
                      >
                        <div className="rounded-lg bg-primary/10 p-3">
                          <Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-900">{template.title}</h3>
                          <p className="text-sm text-gray-500">{template.description}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Configure Your Agent</CardTitle>
                <CardDescription>
                  Customize your agent&apos;s name and behavior.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="agentName">Agent Name</Label>
                  <Input
                    id="agentName"
                    placeholder="e.g., Sales Assistant"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="systemPrompt">System Prompt</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    This defines your agent&apos;s personality and behavior
                  </p>
                  <Textarea
                    id="systemPrompt"
                    rows={6}
                    placeholder="Describe how your agent should behave..."
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="firstMessage">First Message (Optional)</Label>
                  <p className="text-sm text-gray-500 mb-2">
                    What your agent says when answering a call
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
                    Creating...
                  </>
                ) : (
                  <>
                    Create Agent
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Test Call */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-100">
                <Check className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle>Agent Created!</CardTitle>
              <CardDescription>
                Your AI agent is ready. Make a test call to hear it in action.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="rounded-lg border bg-gray-50 p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{agentName}</p>
                    <p className="text-sm text-gray-500">Ready for calls</p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="testPhone">Your Phone Number</Label>
                <p className="text-sm text-gray-500 mb-2">
                  We&apos;ll call this number so you can test your agent
                </p>
                <Input
                  id="testPhone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={testPhoneNumber}
                  onChange={(e) => setTestPhoneNumber(e.target.value)}
                />
              </div>

              <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Test calls require a provisioned phone number.
                  You can set this up later in the Phone Numbers section.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(2)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex gap-3">
              <Button variant="outline" onClick={handleSkipTestCall}>
                Skip for Now
              </Button>
              <Button onClick={() => setCurrentStep(4)}>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Complete */}
      {currentStep === 4 && (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <Sparkles className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">You&apos;re All Set!</CardTitle>
            <CardDescription className="text-base">
              Your VoxForge AI account is ready. Here&apos;s what you can do next:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <Phone className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium">Set Up Phone Numbers</h3>
                <p className="text-sm text-gray-500">Provision numbers for inbound and outbound calls</p>
              </div>
              <div className="rounded-lg border p-4">
                <MessageSquare className="h-6 w-6 text-primary mb-2" />
                <h3 className="font-medium">Create Campaigns</h3>
                <p className="text-sm text-gray-500">Launch automated calling campaigns</p>
              </div>
            </div>

            <div className="flex justify-center pt-4">
              <Button size="lg" onClick={handleComplete} disabled={completeOnboarding.isPending}>
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
