"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Loader2 } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "ended";

type Message = {
  role: "agent" | "customer";
  text: string;
};

const ATLAS_SCRIPT: Message[] = [
  {
    role: "agent",
    text: "Hey there! Thanks for checking out CallTone. I'm Atlas \u2014 think of me as your AI-powered business phone assistant. What kind of business are you running?",
  },
  {
    role: "customer",
    text: "I run a dental practice. We miss a lot of calls during procedures.",
  },
  {
    role: "agent",
    text: "Oh yeah, that's super common with dental offices. You're literally hands-in-mouth, can't pick up the phone \u2014 and every missed call is potentially a new patient walking to your competitor.",
  },
  {
    role: "agent",
    text: "That's actually exactly what I handle. I pick up every single call, 24/7 \u2014 I can answer questions about your services, book appointments right into your calendar, and even send the caller a confirmation text.",
  },
  {
    role: "customer",
    text: "That sounds great. How does the appointment scheduling work?",
  },
  {
    role: "agent",
    text: "It's really simple \u2014 I ask the caller for their preferred date and time, check your real-time availability, and book it on the spot. They get an instant confirmation email and text. No back-and-forth, no phone tag.",
  },
  {
    role: "agent",
    text: "Want to see how easy it is? You can create your own AI agent in about 2 minutes \u2014 just sign up for a free trial, no credit card needed.",
  },
];

const ARIA_SCRIPT: Message[] = [
  {
    role: "agent",
    text: "Hi! I'm Aria, your AI voice agent from CallTone. I help businesses never miss a customer call again. What industry are you in?",
  },
  {
    role: "customer",
    text: "I own a plumbing company. We get a ton of calls when my guys are out on jobs.",
  },
  {
    role: "agent",
    text: "Plumbing \u2014 that's one of the busiest industries for inbound calls. Emergencies don't wait, and neither should your customers. I can answer those calls instantly, day or night.",
  },
  {
    role: "agent",
    text: "I'll gather the caller's info, describe your services, and schedule a visit based on your crew's availability. If it's an emergency, I can flag it as high priority so you see it right away.",
  },
  {
    role: "customer",
    text: "What about after-hours calls? We get a lot of those.",
  },
  {
    role: "agent",
    text: "That's actually where I shine \u2014 I work 24/7, weekends and holidays included. After-hours callers get the same professional experience as during business hours. I can even send you a text alert for urgent calls.",
  },
  {
    role: "agent",
    text: "The best part? Setup takes about 2 minutes. Sign up for a free trial and you'll have your own AI receptionist handling calls today. No credit card required!",
  },
];

// Timing for each message: [typing delay, display duration]
const MESSAGE_TIMING = { typingDelay: 1200, displayPause: 2200 };

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

const agentName = (t: "male" | "female" | null) =>
  t === "male" ? "Atlas" : "Aria";

export function TalkToAgent() {
  const [status, setStatus] = useState<Status>("idle");
  const [agentType, setAgentType] = useState<"male" | "female" | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const scriptIndexRef = useRef(0);
  const playbackRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackRef.current) clearTimeout(playbackRef.current);
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

  const stopPlayback = useCallback(() => {
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    setIsTyping(false);
    setIsSpeaking(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const playNextMessage = useCallback(
    (script: Message[]) => {
      const index = scriptIndexRef.current;
      if (index >= script.length) {
        // Script finished — auto-end after a short pause
        setIsSpeaking(false);
        playbackRef.current = setTimeout(() => {
          const duration = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          setStatus("ended");
          stopTimer();
          setIsSpeaking(false);
          trackEvent({
            event: "call_end",
            agent: agentType || undefined,
            duration,
          });
        }, 1500);
        return;
      }

      const msg = script[index]!;

      // Show typing indicator
      setIsTyping(true);
      if (msg.role === "agent") setIsSpeaking(true);

      playbackRef.current = setTimeout(() => {
        // Add the message
        setIsTyping(false);
        setMessages((prev) => [...prev, msg]);
        scriptIndexRef.current = index + 1;

        // Pause then play next
        playbackRef.current = setTimeout(() => {
          if (msg.role === "agent") setIsSpeaking(false);
          playNextMessage(script);
        }, MESSAGE_TIMING.displayPause);
      }, MESSAGE_TIMING.typingDelay);
    },
    [agentType, stopTimer]
  );

  const handleStartCall = useCallback(
    (agent: "male" | "female") => {
      const script = agent === "male" ? ATLAS_SCRIPT : ARIA_SCRIPT;

      setAgentType(agent);
      setStatus("connecting");
      setMessages([]);
      setElapsed(0);
      scriptIndexRef.current = 0;

      trackEvent({ event: "button_click", agent });

      // Brief "connecting" phase, then start playback
      playbackRef.current = setTimeout(() => {
        setStatus("connected");
        startTimer();
        trackEvent({ event: "call_start", agent });
        playNextMessage(script);
      }, 500);
    },
    [startTimer, playNextMessage]
  );

  const handleEndCall = useCallback(() => {
    stopPlayback();
    const duration = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setStatus("ended");
    stopTimer();
    trackEvent({
      event: "call_end",
      agent: agentType || undefined,
      duration,
    });
  }, [agentType, stopPlayback, stopTimer]);

  const handleReset = useCallback(() => {
    setStatus("idle");
    setAgentType(null);
    setElapsed(0);
    setIsSpeaking(false);
    setMessages([]);
    setIsTyping(false);
    scriptIndexRef.current = 0;
  }, []);

  // ────── Idle ──────
  if (status === "idle") {
    return (
      <div className="flex flex-row gap-3 sm:gap-4 justify-center">
        <button
          onClick={() => handleStartCall("male")}
          className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600 px-5 py-3 text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
        >
          <span className="flex items-center gap-2 sm:gap-3 text-sm font-semibold sm:text-lg">
            <Phone className="h-4 w-4 sm:h-6 sm:w-6" />
            Talk to Atlas
          </span>
          <span className="text-xs font-medium text-white/70">[Male]</span>
        </button>
        <button
          onClick={() => handleStartCall("female")}
          className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-2xl bg-purple-600 px-5 py-3 text-white shadow-lg shadow-purple-600/25 transition-all duration-300 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
        >
          <span className="flex items-center gap-2 sm:gap-3 text-sm font-semibold sm:text-lg">
            <Phone className="h-4 w-4 sm:h-6 sm:w-6" />
            Talk to Aria
          </span>
          <span className="text-xs font-medium text-white/70">[Female]</span>
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

  // ────── Connected ──────
  if (status === "connected") {
    return (
      <div className="flex flex-col items-center gap-5 w-full max-w-lg mx-auto">
        {/* Speaking indicator + timer */}
        <div className="flex items-center gap-4">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full transition-all duration-300 ${
                isSpeaking
                  ? "bg-green-500/30 scale-110"
                  : "bg-primary/15 scale-100"
              }`}
            />
            <div
              className={`absolute inset-2 rounded-full transition-all duration-300 ${
                isSpeaking
                  ? "bg-green-500/40 scale-105"
                  : "bg-primary/20 scale-100"
              }`}
            />
            <Phone className="relative h-6 w-6 text-primary" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              Speaking with {agentName(agentType)}
            </p>
            <p className="text-2xl font-mono font-bold text-primary">
              {formatTime(elapsed)}
            </p>
          </div>
        </div>

        {/* Chat bubbles */}
        <div className="w-full max-h-64 overflow-y-auto rounded-xl bg-secondary/30 border border-border p-3 space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                msg.role === "agent" ? "items-start" : "items-end"
              }`}
            >
              <span className="text-[10px] font-medium text-muted-foreground mb-0.5 px-1">
                {msg.role === "agent" ? agentName(agentType) : "Customer"}
              </span>
              <div
                className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === "agent"
                    ? "bg-primary/10 text-foreground rounded-tl-sm"
                    : "bg-blue-600 text-white rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-medium text-muted-foreground mb-0.5 px-1">
                {agentName(agentType)}
              </span>
              <div className="bg-primary/10 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:0ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:150ms]" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/50 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* End call button */}
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

  return null;
}
