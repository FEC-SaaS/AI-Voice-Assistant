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

interface NPSPromptProps {
  open: boolean;
  onClose: () => void;
}

export function NPSPrompt({ open, onClose }: NPSPromptProps) {
  const [score, setScore] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setTimeout(onClose, 2000);
    },
    onError: (e) => toast.error(e.message),
  });

  const handleSubmit = () => {
    if (score === null) return;
    submit.mutate({ type: "nps", score, message: message || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>How likely are you to recommend us?</DialogTitle>
          <DialogDescription>
            On a scale of 0–10, how likely are you to recommend Calltone to a colleague?
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="py-6 text-center">
            <p className="text-lg font-medium">Thanks for your feedback! 🎉</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="flex justify-between gap-1">
                {Array.from({ length: 11 }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setScore(i)}
                    className={cn(
                      "h-9 w-9 rounded-md border text-sm font-medium transition-colors",
                      score === i
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary hover:text-primary"
                    )}
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Not likely</span>
                <span>Very likely</span>
              </div>

              <Textarea
                placeholder="Any additional comments? (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>Skip</Button>
              <Button onClick={handleSubmit} disabled={score === null || submit.isPending}>
                Submit
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
