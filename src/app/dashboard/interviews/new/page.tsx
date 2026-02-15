"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  UserSearch,
  Bot,
  Clock,
  Settings2,
  AlertCircle,
  Sparkles,
  Plus,
  X,
  Briefcase,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const TIMEZONES = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Phoenix", label: "Arizona (MST)" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
];

const EXPERIENCE_LEVELS = [
  { value: "", label: "Select..." },
  { value: "entry", label: "Entry Level (0-2 years)" },
  { value: "mid", label: "Mid Level (3-5 years)" },
  { value: "senior", label: "Senior (5-10 years)" },
  { value: "executive", label: "Executive (10+ years)" },
];

export default function NewInterviewPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    agentId: "",
    jobTitle: "",
    jobDescription: "",
    experience: "",
    education: "",
    skills: [] as string[],
    questions: [] as string[],
    timeZone: "America/New_York",
    callingHoursStart: "09:00",
    callingHoursEnd: "17:00",
    maxCallsPerDay: 50,
  });
  const [newSkill, setNewSkill] = useState("");
  const [newQuestion, setNewQuestion] = useState("");

  const { data: agents, isLoading: agentsLoading } = trpc.agents.list.useQuery();

  const createInterview = trpc.interviews.create.useMutation({
    onSuccess: (campaign) => {
      toast.success("Interview campaign created! Now add candidates.");
      router.push(`/dashboard/interviews/${campaign.id}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const generateQuestions = trpc.interviews.generateQuestions.useMutation({
    onSuccess: (result) => {
      setFormData((prev) => ({
        ...prev,
        skills: Array.from(new Set([...prev.skills, ...result.skills])),
        questions: Array.from(new Set([...prev.questions, ...result.questions])),
      }));
      toast.success(`Added ${result.skills.length} skills and ${result.questions.length} questions — review them below!`);
      // Scroll to skills section so user can see the results
      setTimeout(() => {
        document.getElementById("skills-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAddSkill = () => {
    const skill = newSkill.trim();
    if (skill && !formData.skills.includes(skill)) {
      setFormData({ ...formData, skills: [...formData.skills, skill] });
      setNewSkill("");
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter((s) => s !== skill) });
  };

  const handleAddQuestion = () => {
    const question = newQuestion.trim();
    if (question && !formData.questions.includes(question)) {
      setFormData({ ...formData, questions: [...formData.questions, question] });
      setNewQuestion("");
    }
  };

  const handleRemoveQuestion = (question: string) => {
    setFormData({ ...formData, questions: formData.questions.filter((q) => q !== question) });
  };

  const handleGenerate = () => {
    if (!formData.jobTitle.trim() || !formData.jobDescription.trim()) {
      toast.error("Enter a job title and description first");
      return;
    }
    generateQuestions.mutate({
      jobTitle: formData.jobTitle.trim(),
      jobDescription: formData.jobDescription.trim(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Campaign name is required");
      return;
    }
    if (!formData.jobTitle.trim()) {
      toast.error("Job title is required");
      return;
    }
    if (!formData.jobDescription.trim()) {
      toast.error("Job description is required");
      return;
    }
    if (!formData.agentId) {
      toast.error("Please select a voice agent");
      return;
    }

    createInterview.mutate({
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      agentId: formData.agentId,
      jobTitle: formData.jobTitle.trim(),
      jobDescription: formData.jobDescription.trim(),
      jobRequirements: {
        skills: formData.skills,
        experience: formData.experience,
        education: formData.education,
        questions: formData.questions,
      },
      timeZone: formData.timeZone,
      callingHours: {
        start: formData.callingHoursStart,
        end: formData.callingHoursEnd,
      },
      maxCallsPerDay: formData.maxCallsPerDay,
    });
  };

  const hasNoAgents = !agentsLoading && (!agents || agents.length === 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/interviews">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create Interview Campaign</h1>
          <p className="text-muted-foreground">Set up AI-powered candidate interviews</p>
        </div>
      </div>

      {/* No Agents Warning */}
      {hasNoAgents && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-500/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-400">No voice agents available</h3>
              <p className="mt-1 text-sm text-yellow-400">
                You need a voice agent to conduct interviews.
              </p>
              <Link href="/dashboard/agents/new">
                <Button size="sm" className="mt-3">
                  <Bot className="mr-2 h-4 w-4" />
                  Create Agent
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <UserSearch className="h-5 w-5 text-muted-foreground/70" />
            <h2 className="text-lg font-semibold text-foreground">Campaign Info</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Campaign Name *</Label>
              <Input
                id="name"
                placeholder="e.g., Senior React Developer - Q1 Hiring"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the hiring campaign..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="mt-1"
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="agentId">Interviewer Agent *</Label>
              <select
                id="agentId"
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                disabled={agentsLoading || hasNoAgents}
              >
                <option value="">Select an agent...</option>
                {agents?.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-muted-foreground">
                The AI voice that will conduct phone interviews
              </p>
            </div>
          </div>
        </div>

        {/* Job Details */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-muted-foreground/70" />
              <h2 className="text-lg font-semibold text-foreground">Job Details</h2>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generateQuestions.isPending || !formData.jobTitle.trim() || !formData.jobDescription.trim()}
            >
              {generateQuestions.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Generate Questions
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="jobTitle">Job Title *</Label>
              <Input
                id="jobTitle"
                placeholder="e.g., Senior React Developer"
                value={formData.jobTitle}
                onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="jobDescription">Job Description *</Label>
              <Textarea
                id="jobDescription"
                placeholder="Paste the full job description here..."
                value={formData.jobDescription}
                onChange={(e) => setFormData({ ...formData, jobDescription: e.target.value })}
                className="mt-1"
                rows={6}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                The AI will use this to generate relevant interview questions
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="experience">Experience Level</Label>
                <select
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {EXPERIENCE_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="education">Education Requirement</Label>
                <Input
                  id="education"
                  placeholder="e.g., Bachelor's in CS"
                  value={formData.education}
                  onChange={(e) => setFormData({ ...formData, education: e.target.value })}
                  className="mt-1"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skills */}
        <div id="skills-section" className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Required Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {formData.skills.map((skill) => (
              <span
                key={skill}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-sm text-primary"
              >
                {skill}
                <button type="button" onClick={() => handleRemoveSkill(skill)} className="hover:text-red-400">
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            {formData.skills.length === 0 && (
              <p className="text-sm text-muted-foreground">No skills added yet. Use &ldquo;Generate Questions&rdquo; or add manually.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a skill..."
              value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddSkill(); } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAddSkill}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Interview Questions */}
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Interview Questions</h2>
          <div className="space-y-2 mb-3">
            {formData.questions.map((question, index) => (
              <div key={index} className="flex items-start gap-2 rounded-lg bg-secondary/50 p-3">
                <span className="text-sm text-muted-foreground font-medium min-w-[24px]">{index + 1}.</span>
                <p className="text-sm flex-1">{question}</p>
                <button type="button" onClick={() => handleRemoveQuestion(question)} className="text-muted-foreground hover:text-red-400">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {formData.questions.length === 0 && (
              <p className="text-sm text-muted-foreground">No custom questions. The AI will generate questions based on skills and job description.</p>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add a custom interview question..."
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddQuestion(); } }}
              className="flex-1"
            />
            <Button type="button" variant="outline" onClick={handleAddQuestion}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Calling Settings */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings2 className="h-5 w-5 text-muted-foreground/70" />
            <h2 className="text-lg font-semibold text-foreground">Calling Settings</h2>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="timeZone">Timezone</Label>
              <select
                id="timeZone"
                value={formData.timeZone}
                onChange={(e) => setFormData({ ...formData, timeZone: e.target.value })}
                className="mt-1 block w-full rounded-md border border-border bg-card px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>{tz.label}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground/70" />
                Calling Hours
              </Label>
              <div className="mt-1 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="callingHoursStart" className="text-xs text-muted-foreground">Start</Label>
                  <Input
                    id="callingHoursStart"
                    type="time"
                    value={formData.callingHoursStart}
                    onChange={(e) => setFormData({ ...formData, callingHoursStart: e.target.value })}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="callingHoursEnd" className="text-xs text-muted-foreground">End</Label>
                  <Input
                    id="callingHoursEnd"
                    type="time"
                    value={formData.callingHoursEnd}
                    onChange={(e) => setFormData({ ...formData, callingHoursEnd: e.target.value })}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="maxCallsPerDay">Max Interviews Per Day</Label>
              <Input
                id="maxCallsPerDay"
                type="number"
                min={1}
                max={100}
                value={formData.maxCallsPerDay}
                onChange={(e) => setFormData({ ...formData, maxCallsPerDay: parseInt(e.target.value) || 50 })}
                className="mt-1 w-32"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Link href="/dashboard/interviews">
            <Button variant="outline" type="button">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createInterview.isPending || hasNoAgents}>
            {createInterview.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserSearch className="mr-2 h-4 w-4" />
                Create Interview Campaign
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
