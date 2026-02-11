"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "ended" | "error";

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
      body: JSON.stringify({ ...data, sessionId: getSessionId() }),
    });
  } catch {
    // Non-blocking
  }
}

async function fetchLocation(): Promise<string | undefined> {
  try {
    const res = await fetch("https://ipapi.co/json/", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    return [data.city, data.region, data.country_name]
      .filter(Boolean)
      .join(", ");
  } catch {
    return undefined;
  }
}

export function TalkToAgent() {
  const [status, setStatus] = useState<Status>("idle");
  const [agentType, setAgentType] = useState<"male" | "female" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const vapiRef = useRef<InstanceType<
    typeof import("@vapi-ai/web").default
  > | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (vapiRef.current) {
        try {
          vapiRef.current.stop();
        } catch {
          /* ignore */
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

    if (!publicKey || !assistantId) {
      setAgentType(agent);
      setStatus("error");
      return;
    }

    setAgentType(agent);
    setStatus("connecting");

    const locationPromise = fetchLocation();
    trackEvent({ event: "button_click", agent });

    try {
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

      vapi.on("speech-start", () => setIsSpeaking(true));
      vapi.on("speech-end", () => setIsSpeaking(false));

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
        /* ignore */
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

  // ────── Idle ──────
  if (status === "idle") {
    return (
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => handleStartCall("male")}
          className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
        >
          <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          Talk to Male Agent
        </button>
        <button
          onClick={() => handleStartCall("female")}
          className="group relative inline-flex items-center justify-center gap-3 rounded-2xl bg-purple-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-purple-600/25 transition-all duration-300 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
        >
          <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          Talk to Female Agent
        </button>
      </div>
    );
  }

  // ────── Connecting ──────
  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-24 w-24 sm:h-28 sm:w-28 items-center justify-center">
          <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
          <div className="absolute inset-3 animate-pulse rounded-full bg-primary/30" />
          <Loader2 className="relative h-10 w-10 text-primary animate-spin" />
        </div>
        <p className="text-base sm:text-lg font-medium text-foreground">
          Just a sec...
        </p>
        <p className="text-sm text-muted-foreground">
          Connecting to {agentType === "male" ? "Male" : "Female"} Agent
        </p>
      </div>
    );
  }

  // ────── Connected ──────
  if (status === "connected") {
    return (
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex h-28 w-28 sm:h-32 sm:w-32 items-center justify-center">
          <div
            className={`absolute inset-0 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-green-500/30 scale-110"
                : "bg-primary/15 scale-100"
            }`}
          />
          <div
            className={`absolute inset-3 rounded-full transition-all duration-300 ${
              isSpeaking
                ? "bg-green-500/40 scale-105"
                : "bg-primary/20 scale-100"
            }`}
          />
          <div className="absolute inset-6 rounded-full bg-primary/30 animate-pulse" />
          <Phone className="relative h-10 w-10 text-primary" />
        </div>
        <div className="text-center">
          <p className="text-base sm:text-lg font-medium text-foreground">
            Speaking with {agentType === "male" ? "Male" : "Female"} Agent
          </p>
          <p className="text-3xl sm:text-4xl font-mono font-bold text-primary mt-2">
            {formatTime(elapsed)}
          </p>
        </div>
        <button
          onClick={handleEndCall}
          className="inline-flex items-center justify-center gap-3 rounded-2xl bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-12 sm:py-5"
        >
          <PhoneOff className="h-5 w-5 sm:h-6 sm:w-6" />
          Click to End Call
        </button>
      </div>
    );
  }

  // ────── Ended ──────
  if (status === "ended") {
    return (
      <div className="flex flex-col items-center gap-5">
        <p className="text-xl sm:text-2xl font-semibold text-foreground">
          Thanks for trying CallTone!
        </p>
        {elapsed > 0 && (
          <p className="text-sm text-muted-foreground">
            Call duration: {formatTime(elapsed)}
          </p>
        )}
        <button
          onClick={handleReset}
          className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-border px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
        >
          <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
          Talk Again
        </button>
      </div>
    );
  }

  // ────── Error ──────
  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-base sm:text-lg text-muted-foreground">
        {!process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY
          ? "Demo coming soon"
          : "Something went wrong. Please try again."}
      </p>
      <button
        onClick={handleReset}
        className="inline-flex items-center justify-center gap-3 rounded-2xl border-2 border-border px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
      >
        <Phone className="h-5 w-5 sm:h-6 sm:w-6" />
        Try Again
      </button>
    </div>
  );
}
