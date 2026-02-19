"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { MessageSquarePlus, TrendingUp, Bug, Lightbulb, X } from "lucide-react";

type FeedbackType = "nps" | "feature_request" | "bug_report" | "general";

const TABS: { id: FeedbackType; label: string; icon: React.ReactNode }[] = [
  { id: "nps", label: "Rate Us", icon: <TrendingUp className="h-3.5 w-3.5" /> },
  { id: "feature_request", label: "Feature", icon: <Lightbulb className="h-3.5 w-3.5" /> },
  { id: "bug_report", label: "Bug", icon: <Bug className="h-3.5 w-3.5" /> },
  { id: "general", label: "General", icon: <MessageSquarePlus className="h-3.5 w-3.5" /> },
];

export function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<FeedbackType>("nps");
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setScore(null);
        setMessage("");
        setTab("nps");
      }, 2500);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (tab === "nps" && score === null) return;
    if (tab !== "nps" && !message.trim()) return;
    submit.mutate({
      type: tab,
      score: tab === "nps" ? (score ?? undefined) : undefined,
      message: message || undefined,
    });
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-2xl transition-all duration-200 hover:scale-105 hover:shadow-primary/30 active:scale-95"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)/0.8) 100%)",
          color: "white",
          boxShadow: "0 8px 32px hsl(var(--primary)/0.35), 0 2px 8px rgba(0,0,0,0.3)",
        }}
        aria-label="Send feedback"
      >
        <MessageSquarePlus className="h-4 w-4" />
        Feedback
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Send Feedback</DialogTitle>
            <DialogDescription>
              Help us improve VoxForge — your feedback goes directly to the team.
            </DialogDescription>
          </DialogHeader>

          {submitted ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <TrendingUp className="h-7 w-7" />
              </div>
              <p className="text-lg font-semibold">Thanks for your feedback!</p>
              <p className="text-sm text-muted-foreground">We read every response.</p>
            </div>
          ) : (
            <>
              {/* Tab switcher */}
              <div className="flex gap-1 rounded-xl border bg-secondary/50 p-1">
                {TABS.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={cn(
                      "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-all",
                      tab === t.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                {tab === "nps" && (
                  <>
                    <p className="text-sm text-muted-foreground">
                      How likely are you to recommend VoxForge to a colleague? (0–10)
                    </p>
                    <div className="flex gap-1">
                      {Array.from({ length: 11 }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setScore(i)}
                          className={cn(
                            "h-9 flex-1 rounded-md border text-xs font-semibold transition-colors",
                            score === i
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border hover:border-primary hover:text-primary"
                          )}
                        >
                          {i}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>Not likely</span>
                      <span>Very likely</span>
                    </div>
                  </>
                )}

                {tab === "feature_request" && (
                  <p className="text-sm text-muted-foreground">
                    What feature would make VoxForge more valuable for you?
                  </p>
                )}
                {tab === "bug_report" && (
                  <p className="text-sm text-muted-foreground">
                    Describe the bug — what happened and what you expected.
                  </p>
                )}
                {tab === "general" && (
                  <p className="text-sm text-muted-foreground">
                    Any thoughts, suggestions, or comments for the team.
                  </p>
                )}

                <Textarea
                  placeholder={
                    tab === "nps"
                      ? "Any additional comments? (optional)"
                      : tab === "bug_report"
                      ? "Steps to reproduce…"
                      : "Your message…"
                  }
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={4}
                />
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={
                    submit.isPending ||
                    (tab === "nps" && score === null) ||
                    (tab !== "nps" && !message.trim())
                  }
                >
                  {submit.isPending ? "Sending…" : "Send Feedback"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
