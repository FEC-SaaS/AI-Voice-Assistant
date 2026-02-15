"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Loader2, Mic } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "ended";

type Message = {
  role: "agent" | "customer";
  text: string;
};

// ── Scripts focused on VALUE, no pricing ──

const ATLAS_SCRIPT: Message[] = [
  {
    role: "agent",
    text: "Hey there! Thanks for checking out CallTone. I'm Atlas, your AI-powered business phone assistant. What kind of business are you running?",
  },
  {
    role: "customer",
    text: "I run a dental practice. We miss a lot of calls during procedures.",
  },
  {
    role: "agent",
    text: "That's super common with dental offices. You're literally hands-in-mouth, can't pick up the phone. And every missed call is potentially a new patient walking to your competitor.",
  },
  {
    role: "agent",
    text: "That's exactly what I handle. I pick up every single call, 24/7. I answer questions about your services, book appointments right into your calendar, and send the caller a confirmation text. All while you focus on your patients.",
  },
  {
    role: "customer",
    text: "That sounds great. How does the appointment scheduling work?",
  },
  {
    role: "agent",
    text: "I ask the caller for their preferred date and time, check your real-time availability, and book it on the spot. They get an instant confirmation by email and text. No back-and-forth, no phone tag.",
  },
  {
    role: "customer",
    text: "What if someone calls after hours or on weekends?",
  },
  {
    role: "agent",
    text: "I never sleep! Nights, weekends, holidays, I'm always here. After-hours callers get the same friendly, professional experience. I can even text you a summary of every call so you start your morning fully caught up.",
  },
  {
    role: "customer",
    text: "Wow, that would save us so much time. How do I get started?",
  },
  {
    role: "agent",
    text: "It's really easy. Just sign up on our website and you can build your own AI phone agent in about two minutes. You'll be up and running before your next patient walks in!",
  },
  {
    role: "customer",
    text: "That sounds awesome. Thanks, Atlas!",
  },
  {
    role: "agent",
    text: "You're welcome! You're going to love having me on your team. Thanks for chatting and welcome to CallTone. Have a great day!",
  },
];

const ARIA_SCRIPT: Message[] = [
  {
    role: "agent",
    text: "Hi there! I'm Aria, your AI voice agent from CallTone. I help businesses never miss a customer call. What industry are you in?",
  },
  {
    role: "customer",
    text: "I own a plumbing company. We get a ton of calls when my guys are out on jobs.",
  },
  {
    role: "agent",
    text: "Plumbing is one of the busiest industries for inbound calls. Emergencies don't wait, and neither should your customers. I answer those calls instantly, day or night.",
  },
  {
    role: "agent",
    text: "I gather the caller's info, describe your services, and schedule a visit based on your crew's availability. If it's an emergency, I flag it as high priority so you see it right away.",
  },
  {
    role: "customer",
    text: "What about after-hours calls? We get a lot of those.",
  },
  {
    role: "agent",
    text: "That's where I really shine. I work 24/7, weekends and holidays included. After-hours callers get the same professional experience. And I can send you a text alert for urgent calls so nothing falls through the cracks.",
  },
  {
    role: "customer",
    text: "That's huge. We've definitely lost jobs because nobody picked up the phone.",
  },
  {
    role: "agent",
    text: "Exactly, and that's the real cost of missed calls. Every unanswered ring is a job that goes to your competitor. With me handling your phones, you capture every single lead, even when your whole crew is out on jobs.",
  },
  {
    role: "customer",
    text: "Alright, I'm sold. How do I set this up?",
  },
  {
    role: "agent",
    text: "Super easy! Sign up on our website and you'll have your own AI receptionist live in about two minutes. Your team will wonder how they ever managed without it.",
  },
  {
    role: "customer",
    text: "Love it. Thanks, Aria!",
  },
  {
    role: "agent",
    text: "Thank you! I think you're really going to see a difference. Welcome to CallTone and have a fantastic day!",
  },
];

// ── Cached voices so we don't re-scan every utterance ──
let cachedVoices: { male: SpeechSynthesisVoice | null; female: SpeechSynthesisVoice | null } | null = null;

function getVoices(): { male: SpeechSynthesisVoice | null; female: SpeechSynthesisVoice | null } {
  if (cachedVoices) return cachedVoices;
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { male: null, female: null };
  }

  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return { male: null, female: null };

  const english = voices.filter(
    (v) => v.lang.startsWith("en") && !v.name.includes("Whisper")
  );

  const findVoice = (keywords: string[]) =>
    english.find((v) => {
      const n = v.name.toLowerCase();
      return keywords.some((k) => n.includes(k));
    });

  const female =
    findVoice(["samantha", "karen", "tessa", "moira", "fiona", "victoria", "zira", "female"]) ||
    null;
  const male =
    findVoice(["daniel", "james", "david", "mark", "alex", "tom", "male"]) ||
    null;

  // Fallback: if we only found one, use different english voices
  const fallback1 = english[0] || voices[0] || null;
  const fallback2 = english[1] || english[0] || voices[0] || null;

  cachedVoices = {
    male: male || fallback1,
    female: female || fallback2,
  };
  return cachedVoices;
}

/** Speak text using the browser's built-in Speech Synthesis API (free, zero network). */
function speak(
  text: string,
  voiceGender: "male" | "female",
  onEnd: () => void
): void {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    onEnd();
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.08;
  utterance.pitch = voiceGender === "female" ? 1.12 : 0.88;
  utterance.volume = 1;

  const v = getVoices();
  utterance.voice = voiceGender === "female" ? v.female : v.male;

  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  window.speechSynthesis.speak(utterance);
}

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

// ── Colorful animated bars ring (Vapi-style) ──
function AnimatedRing({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative inline-flex items-center justify-center">
      {/* Outer animated color ring */}
      <div className="absolute -inset-1.5 rounded-full overflow-hidden">
        <div className="absolute inset-0 animate-color-ring-spin">
          <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#818CF8,#06B6D4,#10B981,#F59E0B,#EF4444,#EC4899,#A855F6,#818CF8)]" />
        </div>
      </div>
      {/* Inner mask to create ring effect */}
      <div className="absolute -inset-0.5 rounded-full bg-background" />
      {/* Glow layer */}
      <div className="absolute -inset-3 rounded-full opacity-30 blur-md animate-color-ring-spin">
        <div className="absolute inset-0 bg-[conic-gradient(from_0deg,#818CF8,#06B6D4,#10B981,#F59E0B,#EF4444,#EC4899,#A855F6,#818CF8)]" />
      </div>
      {/* Button content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}

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
  const activeRef = useRef(false);

  // Pre-load voices (some browsers need a getVoices() call first)
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.getVoices();
    const handler = () => {
      cachedVoices = null; // bust cache so next getVoices() re-scans
      getVoices();
    };
    window.speechSynthesis.onvoiceschanged = handler;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      activeRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      if (playbackRef.current) clearTimeout(playbackRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
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

  const stopPlayback = useCallback(() => {
    activeRef.current = false;
    if (playbackRef.current) {
      clearTimeout(playbackRef.current);
      playbackRef.current = null;
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsTyping(false);
    setIsSpeaking(false);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const playNextMessage = useCallback(
    (script: Message[], agentGender: "male" | "female") => {
      if (!activeRef.current) return;

      const index = scriptIndexRef.current;
      if (index >= script.length) {
        setIsSpeaking(false);
        playbackRef.current = setTimeout(() => {
          if (!activeRef.current) return;
          const duration = Math.floor(
            (Date.now() - startTimeRef.current) / 1000
          );
          activeRef.current = false;
          setStatus("ended");
          stopTimer();
          setIsSpeaking(false);
          trackEvent({ event: "call_end", agent: agentGender, duration });
        }, 1500);
        return;
      }

      const msg = script[index]!;
      const isAgent = msg.role === "agent";
      // Customer uses the opposite gender voice for contrast
      const customerGender: "male" | "female" =
        agentGender === "male" ? "female" : "male";
      const speakGender = isAgent ? agentGender : customerGender;

      // Show typing indicator
      setIsTyping(true);
      setIsSpeaking(isAgent);

      const typingDuration = isAgent ? 700 : 500;

      playbackRef.current = setTimeout(() => {
        if (!activeRef.current) return;

        // Show the bubble and start speaking simultaneously
        setIsTyping(false);
        setMessages((prev) => [...prev, msg]);
        scriptIndexRef.current = index + 1;
        setIsSpeaking(isAgent);

        // Speak the message (both agent and customer have voice)
        speak(msg.text, speakGender, () => {
          if (!activeRef.current) return;
          setIsSpeaking(false);
          // Brief pause between messages
          playbackRef.current = setTimeout(() => {
            playNextMessage(script, agentGender);
          }, 400);
        });
      }, typingDuration);
    },
    [stopTimer]
  );

  const handleStartCall = useCallback(
    (agent: "male" | "female") => {
      const script = agent === "male" ? ATLAS_SCRIPT : ARIA_SCRIPT;

      setAgentType(agent);
      setStatus("connecting");
      setMessages([]);
      setElapsed(0);
      scriptIndexRef.current = 0;
      activeRef.current = true;

      trackEvent({ event: "button_click", agent });

      playbackRef.current = setTimeout(() => {
        if (!activeRef.current) return;
        setStatus("connected");
        startTimer();
        trackEvent({ event: "call_start", agent });
        playNextMessage(script, agent);
      }, 800);
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
    activeRef.current = false;
  }, []);

  // ────── Idle ──────
  if (status === "idle") {
    return (
      <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 justify-center items-center">
        <AnimatedRing>
          <button
            onClick={() => handleStartCall("male")}
            className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-full bg-blue-600 px-6 py-3.5 text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:bg-blue-700 hover:shadow-xl hover:shadow-blue-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
          >
            <span className="flex items-center gap-2 sm:gap-3 text-sm font-semibold sm:text-lg">
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              Talk to Atlas
            </span>
            <span className="text-xs font-medium text-white/70">[Male]</span>
          </button>
        </AnimatedRing>
        <AnimatedRing>
          <button
            onClick={() => handleStartCall("female")}
            className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-full bg-purple-600 px-6 py-3.5 text-white shadow-lg shadow-purple-600/25 transition-all duration-300 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
          >
            <span className="flex items-center gap-2 sm:gap-3 text-sm font-semibold sm:text-lg">
              <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
              Talk to Aria
            </span>
            <span className="text-xs font-medium text-white/70">[Female]</span>
          </button>
        </AnimatedRing>
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
          className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-12 sm:py-5"
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
          className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-red-700 hover:shadow-xl hover:shadow-red-600/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-12 sm:py-5"
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
          className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-border px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-primary/30 hover:bg-primary/5 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
        >
          <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
          Talk Again
        </button>
      </div>
    );
  }

  return null;
}
