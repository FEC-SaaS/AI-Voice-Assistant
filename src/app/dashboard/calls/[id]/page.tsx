"use client";

import Link from "next/link";
import {
  ArrowLeft, Loader2, Phone, PhoneIncoming, PhoneOutgoing,
  Clock, CheckCircle, XCircle, AlertCircle, Bot, User, Play, Pause,
  Sparkles, TrendingUp, ThumbsUp, ThumbsDown, Target, ListChecks, AlertTriangle,
  Brain, MessageSquare, Users, Lightbulb,
} from "lucide-react";
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatDuration(seconds: number | null) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const STATUS_MAP: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  completed: { icon: CheckCircle, color: "text-green-400 bg-green-500/100/10", label: "Completed" },
  failed: { icon: XCircle, color: "text-red-400 bg-red-500/100/10", label: "Failed" },
  "no-answer": { icon: AlertCircle, color: "text-yellow-400 bg-yellow-500/10", label: "No Answer" },
  queued: { icon: Clock, color: "text-blue-400 bg-blue-500/100/10", label: "Queued" },
  "in-progress": { icon: Phone, color: "text-blue-400 bg-blue-500/100/10", label: "In Progress" },
};

const SENTIMENT_MAP: Record<string, string> = {
  positive: "bg-green-500/100/10 text-green-400",
  neutral: "bg-secondary text-foreground/80",
  negative: "bg-red-500/100/10 text-red-400",
};

export default function CallDetailPage({ params }: { params: { id: string } }) {
  const { data: call, isLoading, refetch } = trpc.calls.get.useQuery({ id: params.id });
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const analyzeMutation = trpc.calls.analyze.useMutation({
    onSuccess: () => {
      toast.success("Call analyzed successfully!");
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleAnalyze = () => {
    analyzeMutation.mutate({ id: params.id });
  };

  // Parse analysis data
  const analysisData = call?.analysis as {
    keyPoints?: string[];
    objections?: string[];
    buyingSignals?: string[];
    actionItems?: string[];
    analyzedAt?: string;
    optOutDetected?: boolean;
    competitorMentions?: string[];
    coachingRecommendations?: string[];
    closeProbability?: number;
    nextBestAction?: string;
    objectionCategories?: Array<{
      category: string;
      objection: string;
      suggestedResponse: string;
    }>;
  } | null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground/70" />
      </div>
    );
  }

  if (!call) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-xl font-semibold text-foreground">Call not found</h2>
        <Link href="/dashboard/calls" className="mt-4 inline-block text-primary hover:underline">
          Back to Call Logs
        </Link>
      </div>
    );
  }

  const status = (call.status && STATUS_MAP[call.status]) || { icon: AlertCircle, color: "text-muted-foreground bg-secondary", label: call.status || "unknown" };
  const StatusIcon = status.icon;

  // Parse transcript if it's a JSON string
  let transcriptMessages: { role: string; content: string; timestamp?: number }[] = [];
  if (call.transcript) {
    try {
      const parsed = JSON.parse(call.transcript);
      if (Array.isArray(parsed)) {
        transcriptMessages = parsed;
      }
    } catch {
      // If it's plain text, show as single block
      transcriptMessages = [{ role: "system", content: call.transcript }];
    }
  }

  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/calls">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div className="flex items-center gap-3">
          {call.direction === "inbound" ? (
            <PhoneIncoming className="h-6 w-6 text-blue-500" />
          ) : (
            <PhoneOutgoing className="h-6 w-6 text-green-500" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground">Call Details</h1>
            <p className="text-sm text-muted-foreground">
              {call.direction === "inbound" ? "Inbound" : "Outbound"} call &middot; {formatDate(call.createdAt)}
            </p>
          </div>
        </div>
      </div>

      {/* Call Info Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Call Information</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Status</span>
              <div className="mt-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${status.color}`}>
                  <StatusIcon className="h-3.5 w-3.5" />
                  {status.label}
                </span>
              </div>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">To Number</span>
              <p className="text-sm font-mono text-foreground">{call.toNumber || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">From Number</span>
              <p className="text-sm font-mono text-foreground">{call.fromNumber || "—"}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Duration</span>
              <p className="text-sm text-foreground">{formatDuration(call.durationSeconds)}</p>
            </div>
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Vapi Call ID</span>
              <p className="text-sm font-mono text-muted-foreground">{call.vapiCallId || "—"}</p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6 space-y-4">
          <h2 className="text-lg font-semibold text-foreground">Context</h2>
          <div className="space-y-3">
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Agent</span>
              {call.agent ? (
                <Link
                  href={`/dashboard/agents/${call.agent.id}`}
                  className="mt-1 flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Bot className="h-4 w-4" />
                  {call.agent.name}
                </Link>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
            {call.campaign && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Campaign</span>
                <Link
                  href={`/dashboard/campaigns/${call.campaign.id}`}
                  className="mt-1 block text-sm text-primary hover:underline"
                >
                  {call.campaign.name}
                </Link>
              </div>
            )}
            {call.contact && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Contact</span>
                <p className="text-sm text-foreground">
                  {call.contact.firstName} {call.contact.lastName}
                  {call.contact.company && (
                    <span className="text-muted-foreground"> &middot; {call.contact.company}</span>
                  )}
                </p>
              </div>
            )}
            {call.sentiment && (
              <div>
                <span className="text-xs font-medium uppercase text-muted-foreground/70">Sentiment</span>
                <div className="mt-1">
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${SENTIMENT_MAP[call.sentiment] || "bg-secondary text-foreground/80"}`}>
                    {call.sentiment}
                  </span>
                </div>
              </div>
            )}
            <div>
              <span className="text-xs font-medium uppercase text-muted-foreground/70">Created</span>
              <p className="text-sm text-foreground">{formatDate(call.createdAt)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Smart Analysis
          </h2>
          {call.transcript && (
            <Button
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
              size="sm"
              variant={call.sentiment ? "outline" : "default"}
            >
              {analyzeMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
              ) : call.sentiment ? (
                <><Sparkles className="mr-2 h-4 w-4" /> Re-analyze</>
              ) : (
                <><Sparkles className="mr-2 h-4 w-4" /> Run Analysis</>
              )}
            </Button>
          )}
        </div>

        {call.sentiment ? (
          <div className="mt-4 space-y-6">
            {/* Summary */}
            {call.summary && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Summary</h3>
                <p className="text-sm text-foreground/80">{call.summary}</p>
              </div>
            )}

            {/* Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Sentiment */}
              <div className="rounded-lg bg-secondary p-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {call.sentiment === "positive" ? (
                    <ThumbsUp className="h-4 w-4 text-green-500" />
                  ) : call.sentiment === "negative" ? (
                    <ThumbsDown className="h-4 w-4 text-red-500" />
                  ) : (
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  )}
                  Sentiment
                </div>
                <p className={`mt-1 text-lg font-semibold capitalize ${
                  call.sentiment === "positive" ? "text-green-400" :
                  call.sentiment === "negative" ? "text-red-400" : "text-muted-foreground"
                }`}>
                  {call.sentiment}
                </p>
              </div>

              {/* Lead Score */}
              {call.leadScore !== null && (
                <div className="rounded-lg bg-secondary p-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Lead Score
                  </div>
                  <p className={`mt-1 text-lg font-semibold ${
                    call.leadScore >= 70 ? "text-green-400" :
                    call.leadScore >= 40 ? "text-yellow-400" : "text-red-400"
                  }`}>
                    {call.leadScore}/100
                  </p>
                </div>
              )}

              {/* Opt-Out Warning */}
              {analysisData?.optOutDetected && (
                <div className="rounded-lg bg-red-500/10 p-4 col-span-2">
                  <div className="flex items-center gap-2 text-sm text-red-400">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Opt-Out Detected</span>
                  </div>
                  <p className="mt-1 text-sm text-red-400">
                    Customer requested to be added to DNC list
                  </p>
                </div>
              )}
            </div>

            {/* Key Points */}
            {analysisData?.keyPoints && analysisData.keyPoints.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Key Points
                </h3>
                <ul className="space-y-1">
                  {analysisData.keyPoints.map((point, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Buying Signals */}
            {analysisData?.buyingSignals && analysisData.buyingSignals.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <ThumbsUp className="h-4 w-4 text-green-500" />
                  Buying Signals
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisData.buyingSignals.map((signal, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-400">
                      {signal}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Objections */}
            {analysisData?.objections && analysisData.objections.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-500" />
                  Objections Raised
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisData.objections.map((objection, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                      {objection}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Items */}
            {analysisData?.actionItems && analysisData.actionItems.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-500" />
                  Action Items
                </h3>
                <ul className="space-y-1">
                  {analysisData.actionItems.map((item, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">
                        <CheckCircle className="h-3.5 w-3.5" />
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Close Probability & Next Best Action */}
            {(analysisData?.closeProbability != null || analysisData?.nextBestAction) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {analysisData?.closeProbability != null && (
                  <div className="rounded-lg bg-secondary p-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="h-4 w-4" />
                      Close Probability
                    </div>
                    <p className={`mt-1 text-lg font-semibold ${
                      analysisData.closeProbability >= 60 ? "text-green-400" :
                      analysisData.closeProbability >= 30 ? "text-yellow-400" : "text-red-400"
                    }`}>
                      {analysisData.closeProbability}%
                    </p>
                  </div>
                )}
                {analysisData?.nextBestAction && (
                  <div className="rounded-lg bg-blue-500/10 p-4">
                    <div className="flex items-center gap-2 text-sm text-blue-400">
                      <Lightbulb className="h-4 w-4" />
                      Next Best Action
                    </div>
                    <p className="mt-1 text-sm text-blue-400 font-medium">
                      {analysisData.nextBestAction}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Competitor Mentions */}
            {analysisData?.competitorMentions && analysisData.competitorMentions.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-500" />
                  Competitor Mentions
                </h3>
                <div className="flex flex-wrap gap-2">
                  {analysisData.competitorMentions.map((comp, i) => (
                    <span key={i} className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-medium text-purple-400">
                      {comp}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Objection Categories with Suggested Responses */}
            {analysisData?.objectionCategories && analysisData.objectionCategories.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  Objection Analysis
                </h3>
                <div className="space-y-3">
                  {analysisData.objectionCategories.map((oc, i) => (
                    <div key={i} className="rounded-lg border p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-400">
                          {oc.category}
                        </span>
                      </div>
                      <p className="text-sm text-foreground/80">{oc.objection}</p>
                      <div className="mt-2 rounded bg-green-500/10 p-2">
                        <p className="text-xs text-green-400">
                          <span className="font-medium">Suggested response:</span> {oc.suggestedResponse}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Coaching Recommendations */}
            {analysisData?.coachingRecommendations && analysisData.coachingRecommendations.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-indigo-500" />
                  Coaching Recommendations
                </h3>
                <ul className="space-y-1">
                  {analysisData.coachingRecommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-foreground/80 flex items-start gap-2">
                      <span className="text-indigo-500 mt-0.5">
                        <Lightbulb className="h-3.5 w-3.5" />
                      </span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {analysisData?.analyzedAt && (
              <p className="text-xs text-muted-foreground/70">
                Analyzed on {new Date(analysisData.analyzedAt).toLocaleString()}
              </p>
            )}
          </div>
        ) : (
          <div className="mt-4 text-center py-8">
            {call.transcript ? (
              <div>
                <Sparkles className="mx-auto h-12 w-12 text-muted-foreground/70" />
                <p className="mt-2 text-sm text-muted-foreground">
                  This call has not been analyzed yet.
                </p>
                <Button
                  onClick={handleAnalyze}
                  disabled={analyzeMutation.isPending}
                  className="mt-4"
                >
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...</>
                  ) : (
                    <><Sparkles className="mr-2 h-4 w-4" /> Run Analysis</>
                  )}
                </Button>
              </div>
            ) : (
              <div>
                <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/70" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No transcript available to analyze.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Audio Player */}
      {call.recordingUrl && (
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold text-foreground">Recording</h2>
          <div className="mt-4 flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={toggleAudio}>
              {isPlaying ? (
                <><Pause className="mr-2 h-4 w-4" /> Pause</>
              ) : (
                <><Play className="mr-2 h-4 w-4" /> Play</>
              )}
            </Button>
            <audio
              ref={audioRef}
              src={call.recordingUrl}
              onEnded={() => setIsPlaying(false)}
              className="flex-1"
              controls
            />
          </div>
        </div>
      )}

      {/* Transcript */}
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground">Transcript</h2>
        {transcriptMessages.length > 0 ? (
          <div className="mt-4 space-y-3">
            {transcriptMessages.map((msg, i) => {
              const isAssistant = msg.role === "assistant" || msg.role === "bot" || msg.role === "ai";
              return (
                <div key={i} className={`flex gap-3 ${isAssistant ? "" : "flex-row-reverse"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                    isAssistant ? "bg-primary/10" : "bg-secondary"
                  }`}>
                    {isAssistant ? (
                      <Bot className="h-4 w-4 text-primary" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`max-w-[75%] rounded-lg px-4 py-2 text-sm ${
                    isAssistant
                      ? "bg-primary/5 text-foreground"
                      : "bg-secondary text-foreground"
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.timestamp != null && (
                      <p className="mt-1 text-xs text-muted-foreground/70">
                        {Math.floor(msg.timestamp / 60)}:{String(Math.floor(msg.timestamp % 60)).padStart(2, "0")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            No transcript available for this call.
          </p>
        )}
      </div>
    </div>
  );
}
