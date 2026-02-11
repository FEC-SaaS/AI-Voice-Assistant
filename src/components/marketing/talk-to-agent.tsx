"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";

type Status = "idle" | "connecting" | "connected" | "ended" | "error";

// Generate a session ID for analytics
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("calltone_session");
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("calltone_session", id);
  }
  return id;
}

async function trackEvent(data: {
  event: string;
  agent?: string;
  duration?: number;
  location?: string;
}) {
  try {
    await fetch("/api/analytics/landing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...data,
        sessionId: getSessionId(),
      }),
    });
  } catch {
    // Non-blocking, silently fail
  }
}

async function fetchLocation(): Promise<string | undefined> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return undefined;
    const data = await res.json();
    return [data.city, data.region, data.country_name].filter(Boolean).join(", ");
  } catch {
    return undefined;
  }
}

export function TalkToAgent() {
  const [status, setStatus] = useState<Status>("idle");
  const [agentType, setAgentType] = useState<"male" | "female" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const vapiRef = useRef<InstanceType<typeof import("@vapi-ai/web").default> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const handleStartCall = async (agent: "male" | "female") => {
    const publicKey = process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
    const assistantId =
      agent === "male"
        ? process.env.NEXT_PUBLIC_VAPI_MALE_ASSISTANT_ID
        : process.env.NEXT_PUBLIC_VAPI_FEMALE_ASSISTANT_ID;

    // Graceful degradation when env vars are missing
    if (!publicKey || !assistantId) {
      setAgentType(agent);
      setStatus("error");
      return;
    }

    setAgentType(agent);
    setStatus("connecting");

    // Track button click and fetch location (non-blocking)
    const locationPromise = fetchLocation();
    trackEvent({ event: "button_click", agent });

    try {
      // Dynamic import to avoid SSR issues
      const VapiModule = await import("@vapi-ai/web");
      const Vapi = VapiModule.default;

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setStatus("connected");
        startTimer();
        locationPromise.then((location) => {
          trackEvent({ event: "call_start", agent, location });
        });
      });

      vapi.on("call-end", () => {
        const duration = Math.floor(
          (Date.now() - startTimeRef.current) / 1000
        );
        setStatus("ended");
        stopTimer();
        setIsSpeaking(false);
        trackEvent({ event: "call_end", agent, duration });
      });

      vapi.on("error", (error: unknown) => {
        console.error("[TalkToAgent] Vapi error:", error);
        setStatus("error");
        stopTimer();
        setIsSpeaking(false);
        trackEvent({ event: "call_error", agent });
      });

      vapi.on("speech-start", () => {
        setIsSpeaking(true);
      });

      vapi.on("speech-end", () => {
        setIsSpeaking(false);
      });

      await vapi.start(assistantId);
    } catch (error) {
      console.error("[TalkToAgent] Failed to start call:", error);
      setStatus("error");
      trackEvent({ event: "call_error", agent });
    }
  };

  const handleEndCall = () => {
    if (vapiRef.current) {
      try {
        vapiRef.current.stop();
      } catch {
        // ignore
      }
    }
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setStatus("ended");
    stopTimer();
    setIsSpeaking(false);
    trackEvent({ event: "call_end", agent: agentType || undefined, duration });
  };

  const handleReset = () => {
    setStatus("idle");
    setAgentType(null);
    setElapsed(0);
    setIsSpeaking(false);
    vapiRef.current = null;
  };

  // Idle state — two buttons
  if (status === "idle") {
    return (
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          size="lg"
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => handleStartCall("male")}
        >
          <Phone className="mr-2 h-4 w-4" />
          Talk to Male Agent
        </Button>
        <Button
          size="lg"
          className="bg-purple-600 hover:bg-purple-700 text-white px-6 shadow-lg shadow-purple-600/25 hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5 transition-all duration-300"
          onClick={() => handleStartCall("female")}
        >
          <Phone className="mr-2 h-4 w-4" />
          Talk to Female Agent
        </Button>
      </div>
    );
  }

  // Connecting state
  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-20 w-20 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-2 animate-pulse rounded-full bg-primary/30" />
          <Phone className="relative h-8 w-8 text-primary" />
        </div>
        <p className="text-sm text-muted-foreground">
          Connecting to {agentType} agent...
        </p>
      </div>
    );
  }

  // Connected state
  if (status === "connected") {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-primary/30 scale-110"
                : "bg-primary/15 scale-100"
            }`}
          />
          <div
            className={`absolute inset-3 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-primary/40 scale-105"
                : "bg-primary/20 scale-100"
            }`}
          />
          <div className="absolute inset-6 rounded-full bg-primary/30 animate-pulse" />
          <Phone className="relative h-8 w-8 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            Speaking with {agentType === "male" ? "Male" : "Female"} Agent...
          </p>
          <p className="text-2xl font-mono font-bold text-primary mt-1">
            {formatTime(elapsed)}
          </p>
        </div>
        <Button
          variant="destructive"
          size="lg"
          onClick={handleEndCall}
          className="px-8"
        >
          <PhoneOff className="mr-2 h-4 w-4" />
          End Call
        </Button>
      </div>
    );
  }

  // Ended state
  if (status === "ended") {
    return (
      <div className="flex flex-col items-center gap-4">
        <p className="text-lg font-semibold text-foreground">
          Thanks for trying CallTone!
        </p>
        {elapsed > 0 && (
          <p className="text-sm text-muted-foreground">
            Call duration: {formatTime(elapsed)}
          </p>
        )}
        <Button
          size="lg"
          variant="outline"
          onClick={handleReset}
          className="px-8"
        >
          <Phone className="mr-2 h-4 w-4" />
          Talk Again
        </Button>
      </div>
    );
  }

  // Error state
  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        {!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
          ? "Demo coming soon"
          : "Something went wrong. Please try again."}
      </p>
      <Button
        size="lg"
        variant="outline"
        onClick={handleReset}
        className="px-8"
      >
        <Phone className="mr-2 h-4 w-4" />
        Try Again
      </Button>
    </div>
  );
}
