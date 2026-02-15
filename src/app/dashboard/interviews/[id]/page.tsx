"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  Users,
  Play,
  Pause,
  Square,
  Trophy,
  BarChart3,
  Phone,
  ChevronDown,
  ChevronUp,
  UserPlus,
  Upload,
  Clock,
  Star,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

function getScoreBg(score: number) {
  if (score >= 80) return "bg-green-500/10";
  if (score >= 60) return "bg-yellow-500/10";
  if (score >= 40) return "bg-orange-500/10";
  return "bg-red-500/10";
}

function getRecommendationBadge(rec: string) {
  switch (rec) {
    case "strong_yes":
      return { label: "Strong Yes", color: "text-green-400", bg: "bg-green-500/10", icon: CheckCircle2 };
    case "yes":
      return { label: "Yes", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 };
    case "maybe":
      return { label: "Maybe", color: "text-yellow-400", bg: "bg-yellow-500/10", icon: HelpCircle };
    case "no":
      return { label: "No", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle };
    default:
      return { label: "Pending", color: "text-muted-foreground", bg: "bg-secondary", icon: Clock };
  }
}

export default function InterviewDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [expandedCandidate, setExpandedCandidate] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCandidate, setNewCandidate] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    email: "",
  });

  const { data: campaign, isLoading: campaignLoading } = trpc.interviews.get.useQuery({ id });
  const { data: candidates, isLoading: candidatesLoading, refetch } = trpc.interviews.getCandidates.useQuery({ campaignId: id });
  const { data: stats } = trpc.interviews.getJobStats.useQuery({ campaignId: id });

  const addContact = trpc.contacts.create.useMutation({
    onSuccess: () => {
      toast.success("Candidate added!");
      setNewCandidate({ firstName: "", lastName: "", phoneNumber: "", email: "" });
      setShowAddForm(false);
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const startCampaign = trpc.campaigns.start.useMutation({
    onSuccess: () => { toast.success("Interviews started!"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const pauseCampaign = trpc.campaigns.pause.useMutation({
    onSuccess: () => { toast.success("Paused"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const resumeCampaign = trpc.campaigns.resume.useMutation({
    onSuccess: () => { toast.success("Resumed"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const completeCampaign = trpc.campaigns.complete.useMutation({
    onSuccess: () => { toast.success("Completed"); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCandidate.firstName.trim() || !newCandidate.phoneNumber.trim()) {
      toast.error("Name and phone number are required");
      return;
    }
    addContact.mutate({
      firstName: newCandidate.firstName.trim(),
      lastName: newCandidate.lastName.trim() || undefined,
      phoneNumber: newCandidate.phoneNumber.trim(),
      email: newCandidate.email.trim() || undefined,
      campaignId: id,
    });
  };

  if (campaignLoading || candidatesLoading) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/interviews">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        </div>
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="space-y-6 max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/interviews">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Interview not found</h1>
        </div>
      </div>
    );
  }

  const jobReqs = (campaign.jobRequirements as { skills?: string[]; experience?: string; education?: string; questions?: string[] }) || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/interviews">
            <Button variant="ghost" size="sm"><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{campaign.name}</h1>
            <p className="text-muted-foreground">{campaign.jobTitle}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <Button onClick={() => startCampaign.mutate({ id })} disabled={startCampaign.isPending}>
              {startCampaign.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}
              Start Interviews
            </Button>
          )}
          {campaign.status === "running" && (
            <>
              <Button variant="outline" onClick={() => pauseCampaign.mutate({ id })} disabled={pauseCampaign.isPending}>
                <Pause className="mr-2 h-4 w-4" />Pause
              </Button>
              <Button variant="outline" onClick={() => completeCampaign.mutate({ id })} disabled={completeCampaign.isPending}>
                <Square className="mr-2 h-4 w-4" />Complete
              </Button>
            </>
          )}
          {campaign.status === "paused" && (
            <>
              <Button onClick={() => resumeCampaign.mutate({ id })} disabled={resumeCampaign.isPending}>
                <Play className="mr-2 h-4 w-4" />Resume
              </Button>
              <Button variant="outline" onClick={() => completeCampaign.mutate({ id })} disabled={completeCampaign.isPending}>
                <Square className="mr-2 h-4 w-4" />Complete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Users className="h-4 w-4" />Total Candidates
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.totalCandidates}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Phone className="h-4 w-4" />Interviewed
            </div>
            <p className="mt-1 text-2xl font-bold">{stats.interviewed}</p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <BarChart3 className="h-4 w-4" />Avg Score
            </div>
            <p className={`mt-1 text-2xl font-bold ${stats.avgScore > 0 ? getScoreColor(stats.avgScore) : ""}`}>
              {stats.avgScore > 0 ? stats.avgScore : "—"}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Trophy className="h-4 w-4" />Top Score
            </div>
            <p className={`mt-1 text-2xl font-bold ${stats.maxScore > 0 ? getScoreColor(stats.maxScore) : ""}`}>
              {stats.maxScore > 0 ? stats.maxScore : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Recommendation Breakdown */}
      {stats && stats.interviewed > 0 && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recommendation Breakdown</h3>
          <div className="flex gap-4 flex-wrap">
            {(["strong_yes", "yes", "maybe", "no"] as const).map((rec) => {
              const badge = getRecommendationBadge(rec);
              const count = stats.recommendations[rec] || 0;
              return (
                <div key={rec} className={`flex items-center gap-2 rounded-lg px-3 py-2 ${badge.bg}`}>
                  <badge.icon className={`h-4 w-4 ${badge.color}`} />
                  <span className={`text-sm font-medium ${badge.color}`}>{badge.label}: {count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Job Info */}
      <div className="rounded-xl border bg-card p-6">
        <h3 className="text-lg font-semibold mb-3">Job Requirements</h3>
        {campaign.jobDescription && (
          <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap line-clamp-4">{campaign.jobDescription}</p>
        )}
        <div className="flex flex-wrap gap-2 mt-2">
          {jobReqs.skills?.map((skill) => (
            <span key={skill} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary font-medium">{skill}</span>
          ))}
        </div>
        {jobReqs.experience && <p className="text-xs text-muted-foreground mt-2">Experience: {jobReqs.experience}</p>}
        {jobReqs.education && <p className="text-xs text-muted-foreground">Education: {jobReqs.education}</p>}
      </div>

      {/* Add Candidate */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
          <UserPlus className="mr-2 h-4 w-4" />Add Candidate
        </Button>
        <Link href={`/dashboard/campaigns/${id}`}>
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />Import CSV
          </Button>
        </Link>
      </div>

      {showAddForm && (
        <form onSubmit={handleAddCandidate} className="rounded-xl border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <Label className="text-xs">First Name *</Label>
              <Input
                placeholder="John"
                value={newCandidate.firstName}
                onChange={(e) => setNewCandidate({ ...newCandidate, firstName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Last Name</Label>
              <Input
                placeholder="Doe"
                value={newCandidate.lastName}
                onChange={(e) => setNewCandidate({ ...newCandidate, lastName: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Phone *</Label>
              <Input
                placeholder="+1 555-0123"
                value={newCandidate.phoneNumber}
                onChange={(e) => setNewCandidate({ ...newCandidate, phoneNumber: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input
                placeholder="john@example.com"
                value={newCandidate.email}
                onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                className="mt-1"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addContact.isPending}>
              {addContact.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
              Add
            </Button>
          </div>
        </form>
      )}

      {/* Candidate Ranking Table */}
      <div className="rounded-xl border bg-card">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Candidate Rankings</h3>
          <p className="text-sm text-muted-foreground">Sorted by interview score (highest first)</p>
        </div>

        {!candidates?.length ? (
          <div className="p-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No candidates yet. Add candidates above to get started.</p>
          </div>
        ) : (
          <div className="divide-y">
            {candidates.map((candidate, index) => {
              const call = candidate.calls[0];
              const score = call?.interviewScore;
              const analysis = call?.interviewAnalysis as Record<string, unknown> | null;
              const recommendation = (analysis?.recommendation as string) || "";
              const badge = getRecommendationBadge(recommendation);
              const isExpanded = expandedCandidate === candidate.id;
              const candidateName = `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() || "Unknown";

              return (
                <div key={candidate.id}>
                  {/* Row */}
                  <button
                    onClick={() => setExpandedCandidate(isExpanded ? null : candidate.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary text-sm font-bold">
                      {score != null ? index + 1 : "—"}
                    </div>

                    {/* Name & Phone */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{candidateName}</p>
                      <p className="text-xs text-muted-foreground">{candidate.phoneNumber}</p>
                    </div>

                    {/* Score */}
                    <div className="text-right">
                      {score != null ? (
                        <div className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${getScoreBg(score)} ${getScoreColor(score)}`}>
                          <Star className="h-3.5 w-3.5" />
                          {score}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {candidate.status === "pending" ? "Pending" : candidate.status === "called" ? "In Progress" : candidate.status}
                        </span>
                      )}
                    </div>

                    {/* Recommendation Badge */}
                    {recommendation && (
                      <div className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${badge.bg} ${badge.color}`}>
                        <badge.icon className="h-3 w-3" />
                        {badge.label}
                      </div>
                    )}

                    {/* Expand */}
                    {call && (
                      isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && call && analysis && (() => {
                    const a = analysis as {
                      summary?: string;
                      skillScores?: Record<string, number>;
                      strengths?: string[];
                      weaknesses?: string[];
                      redFlags?: string[];
                      standoutMoments?: string[];
                      communicationScore?: number;
                      cultureFit?: string;
                      experienceMatch?: string;
                    };
                    return (
                    <div className="px-4 pb-4 space-y-4 border-t bg-secondary/30">
                      {/* Summary */}
                      <div className="pt-4">
                        <h4 className="text-sm font-semibold mb-1">Summary</h4>
                        <p className="text-sm text-muted-foreground">{a.summary ?? ""}</p>
                      </div>

                      {/* Skill Scores */}
                      {a.skillScores && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2">Skill Scores</h4>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {Object.entries(a.skillScores).map(([skill, skillScore]) => (
                              <div key={skill} className="flex items-center justify-between rounded-lg bg-card p-2 px-3">
                                <span className="text-sm truncate">{skill}</span>
                                <span className={`text-sm font-bold ${getScoreColor(skillScore)}`}>{skillScore}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Strengths & Weaknesses */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4 text-green-400" />Strengths
                          </h4>
                          <ul className="space-y-1">
                            {a.strengths?.map((s, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                                <span className="text-green-400 mt-0.5">+</span> {s}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-4 w-4 text-yellow-400" />Weaknesses
                          </h4>
                          <ul className="space-y-1">
                            {a.weaknesses?.map((w, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                                <span className="text-yellow-400 mt-0.5">-</span> {w}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Red Flags */}
                      {(a.redFlags?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <XCircle className="h-4 w-4 text-red-400" />Red Flags
                          </h4>
                          <ul className="space-y-1">
                            {a.redFlags!.map((flag, i) => (
                              <li key={i} className="text-sm text-red-400 flex items-start gap-1">
                                <span className="mt-0.5">!</span> {flag}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Standout Moments */}
                      {(a.standoutMoments?.length ?? 0) > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-400" />Standout Moments
                          </h4>
                          <ul className="space-y-1">
                            {a.standoutMoments!.map((m, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex items-start gap-1">
                                <span className="text-amber-400 mt-0.5">*</span> {m}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Additional Info */}
                      <div className="grid gap-3 sm:grid-cols-3 text-sm">
                        <div className="rounded-lg bg-card p-3">
                          <span className="text-muted-foreground">Communication</span>
                          <p className={`font-bold ${getScoreColor(a.communicationScore ?? 0)}`}>
                            {a.communicationScore ?? 0}/100
                          </p>
                        </div>
                        <div className="rounded-lg bg-card p-3">
                          <span className="text-muted-foreground">Culture Fit</span>
                          <p className="font-medium text-foreground">{a.cultureFit ?? "—"}</p>
                        </div>
                        <div className="rounded-lg bg-card p-3">
                          <span className="text-muted-foreground">Experience Match</span>
                          <p className="font-medium text-foreground">{a.experienceMatch ?? "—"}</p>
                        </div>
                      </div>

                      {/* Transcript & Recording */}
                      <div className="flex gap-2 pt-2">
                        {call.recordingUrl && (
                          <a href={call.recordingUrl} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm">
                              <Play className="mr-2 h-3.5 w-3.5" />Listen
                            </Button>
                          </a>
                        )}
                        {call.transcript && (
                          <details className="flex-1">
                            <summary className="cursor-pointer text-sm text-primary hover:underline">View Transcript</summary>
                            <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap bg-card rounded-lg p-3 max-h-64 overflow-y-auto">
                              {call.transcript}
                            </pre>
                          </details>
                        )}
                      </div>

                      {/* Call Duration */}
                      {call.durationSeconds != null && (
                        <p className="text-xs text-muted-foreground">
                          Interview duration: {Math.floor(call.durationSeconds / 60)}m {call.durationSeconds % 60}s
                        </p>
                      )}
                    </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
