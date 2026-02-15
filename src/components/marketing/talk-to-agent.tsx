"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Phone, PhoneOff, Loader2, Mic } from "lucide-react";

type Status = "idle" | "connecting" | "connected" | "ended";

type Message = {
  role: "agent" | "customer";
  text: string;
};

type Scenario = {
  lines: Message[];
};

// ── Pre-recorded audio scenario scripts ──
// Each agent has 4 scenarios; audio files at /audio/demo/{agent}_{scenario}_{index}_{role}.mp3

const ATLAS_SCENARIOS: Scenario[] = [
  {
    // Scenario 1: Dental practice (12 lines, indices 00-11)
    lines: [
      { role: "agent", text: "Hey there! Thanks for checking out CallTone. I'm Atlas, your AI-powered business phone assistant. What kind of business are you running?" },
      { role: "customer", text: "I run a dental practice. We miss a lot of calls during procedures." },
      { role: "agent", text: "That's super common with dental offices. You're literally hands-in-mouth, can't pick up the phone. And every missed call is potentially a new patient walking to your competitor." },
      { role: "agent", text: "That's exactly what I handle. I pick up every single call, 24/7. I answer questions about your services, book appointments right into your calendar, and send the caller a confirmation text. All while you focus on your patients." },
      { role: "customer", text: "That sounds great. How does the appointment scheduling work?" },
      { role: "agent", text: "I ask the caller for their preferred date and time, check your real-time availability, and book it on the spot. They get an instant confirmation by email and text. No back-and-forth, no phone tag." },
      { role: "customer", text: "What if someone calls after hours or on weekends?" },
      { role: "agent", text: "I never sleep! Nights, weekends, holidays, I'm always here. After-hours callers get the same friendly, professional experience. I can even text you a summary of every call so you start your morning fully caught up." },
      { role: "customer", text: "Wow, that would save us so much time. How do I get started?" },
      { role: "agent", text: "It's really easy. Just sign up on our website and you can build your own AI phone agent in about two minutes. You'll be up and running before your next patient walks in!" },
      { role: "customer", text: "That sounds awesome. Thanks, Atlas!" },
      { role: "agent", text: "You're welcome! You're going to love having me on your team. Thanks for chatting and welcome to CallTone. Have a great day!" },
    ],
  },
  {
    // Scenario 2: Law firm (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "Hey! I'm Atlas from CallTone. I help businesses handle their phone calls with AI. Tell me, what kind of work do you do?" },
      { role: "customer", text: "I'm a personal injury attorney. My team is in court half the day and we miss way too many new client calls." },
      { role: "agent", text: "Oh, I hear that a lot from law firms. When someone's been in an accident, they're calling three or four attorneys. The first one who picks up usually gets the case." },
      { role: "customer", text: "Exactly. That's our biggest problem. By the time we call back, they've already hired someone else." },
      { role: "agent", text: "That's where I come in. I answer every call instantly, I qualify the lead by asking about their case, collect their contact info, and book a consultation right into your calendar. The caller feels taken care of, and you don't lose the case." },
      { role: "customer", text: "Can you handle sensitive conversations? Legal calls can be pretty emotional." },
      { role: "agent", text: "Absolutely. I'm trained to be empathetic and professional. I listen carefully, I don't rush people, and I make sure they feel heard. I can also route urgent calls directly to your cell if it's a high-priority situation." },
      { role: "customer", text: "What about intake forms? We need specific information from potential clients." },
      { role: "agent", text: "I can gather all the details you need during the call, like the type of incident, when it happened, insurance info, whatever your intake process requires. Then I send you a clean summary so you're fully prepped before the consultation." },
      { role: "customer", text: "That's impressive. How quickly can we get this set up?" },
      { role: "agent", text: "You can be live in about two minutes. Just sign up, customize my script with your firm's details, and connect your phone number. It's that simple." },
      { role: "customer", text: "I think we need this. Thanks, Atlas!" },
      { role: "agent", text: "My pleasure! You're going to capture so many more cases. Welcome to CallTone, and good luck in court!" },
    ],
  },
  {
    // Scenario 3: Auto repair (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "What's up! I'm Atlas, your AI phone assistant from CallTone. What line of work are you in?" },
      { role: "customer", text: "I own an auto repair shop. We're always under the hood and can't get to the phone." },
      { role: "agent", text: "Classic problem for auto shops. Your hands are covered in grease, the lift is up, you can't just drop everything to answer a call. But that caller might need a brake job worth five hundred bucks." },
      { role: "customer", text: "Right! And half the time it goes to voicemail and they just call the next shop." },
      { role: "agent", text: "Not anymore. I pick up every single call. I can answer questions about your services, give estimated turnaround times, and schedule drop-offs based on your availability. The customer gets helped immediately, and you don't lose the job." },
      { role: "customer", text: "What if they're asking about pricing? I can't have you quoting wrong prices." },
      { role: "agent", text: "Great question. You set up your service menu with price ranges, and I'll give accurate quotes based on what you've told me. For anything custom, I let them know you'll provide a detailed estimate after inspection, and I book them in." },
      { role: "customer", text: "Can you handle the tow truck calls? Those are usually emergencies." },
      { role: "agent", text: "For sure. I can flag emergency calls as high priority and immediately text or call you so you can dispatch. The customer gets reassurance right away, and you get the alert in seconds." },
      { role: "customer", text: "This sounds like exactly what we need. What's the setup like?" },
      { role: "agent", text: "Super easy. Sign up, plug in your services and hours, and forward your number. Takes about two minutes and you're live. No complicated tech stuff at all." },
      { role: "customer", text: "Love it. Thanks, Atlas!" },
      { role: "agent", text: "You got it! No more missed calls, no more lost jobs. Welcome to CallTone!" },
    ],
  },
  {
    // Scenario 4: Real estate (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "Hey there! Atlas here from CallTone. I'm an AI phone assistant that helps businesses never miss a call. What do you do?" },
      { role: "customer", text: "I'm a real estate agent. I'm constantly in showings and open houses and I miss leads all day." },
      { role: "agent", text: "Real estate is tough for that. You're driving between properties, you're mid-showing with a buyer, and your phone's buzzing with a potential seller. You can't just pause the tour to take it." },
      { role: "customer", text: "Exactly. And in this market, if you don't respond fast, another agent grabs them." },
      { role: "agent", text: "That's the thing, speed to lead is everything in real estate. I answer every call instantly. I find out if they're buying or selling, what area they're interested in, their budget range, and their timeline. Then I book a callback or showing with you." },
      { role: "customer", text: "Can you answer questions about specific listings?" },
      { role: "agent", text: "Yep! You can load your active listings into the system, and I'll share details like price, square footage, bedrooms, and open house times. I can even send them the listing link via text while we're on the call." },
      { role: "customer", text: "That's really smart. What about after-hours inquiries from Zillow or Realtor.com?" },
      { role: "agent", text: "Those are some of your best leads, and they usually come in evenings and weekends. I handle those calls 24/7 with the same energy and professionalism. You wake up to qualified leads instead of missed calls." },
      { role: "customer", text: "Alright, I'm convinced. How do I start?" },
      { role: "agent", text: "Just head to our website and sign up. You'll have your AI assistant live in a couple minutes. Your competitors won't know what hit them." },
      { role: "customer", text: "Ha! Love the confidence. Thanks, Atlas!" },
      { role: "agent", text: "Anytime! Go close some deals. Welcome to CallTone!" },
    ],
  },
];

const ARIA_SCENARIOS: Scenario[] = [
  {
    // Scenario 1: Plumbing (12 lines, indices 00-11)
    lines: [
      { role: "agent", text: "Hi there! I'm Aria, your AI voice agent from CallTone. I help businesses never miss a customer call. What industry are you in?" },
      { role: "customer", text: "I own a plumbing company. We get a ton of calls when my guys are out on jobs." },
      { role: "agent", text: "Plumbing is one of the busiest industries for inbound calls. Emergencies don't wait, and neither should your customers. I answer those calls instantly, day or night." },
      { role: "agent", text: "I gather the caller's info, describe your services, and schedule a visit based on your crew's availability. If it's an emergency, I flag it as high priority so you see it right away." },
      { role: "customer", text: "What about after-hours calls? We get a lot of those." },
      { role: "agent", text: "That's where I really shine. I work 24/7, weekends and holidays included. After-hours callers get the same professional experience. And I can send you a text alert for urgent calls so nothing falls through the cracks." },
      { role: "customer", text: "That's huge. We've definitely lost jobs because nobody picked up the phone." },
      { role: "agent", text: "Exactly, and that's the real cost of missed calls. Every unanswered ring is a job that goes to your competitor. With me handling your phones, you capture every single lead, even when your whole crew is out on jobs." },
      { role: "customer", text: "Alright, I'm sold. How do I set this up?" },
      { role: "agent", text: "Super easy! Sign up on our website and you'll have your own AI receptionist live in about two minutes. Your team will wonder how they ever managed without it." },
      { role: "customer", text: "Love it. Thanks, Aria!" },
      { role: "agent", text: "Thank you! I think you're really going to see a difference. Welcome to CallTone and have a fantastic day!" },
    ],
  },
  {
    // Scenario 2: Medical clinic (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "Hi! I'm Aria from CallTone. I'm an AI phone assistant that helps businesses manage their calls. What kind of practice do you run?" },
      { role: "customer", text: "I run a family medical clinic. Our front desk is overwhelmed with calls, patients are waiting on hold, it's a mess." },
      { role: "agent", text: "That's so common in medical offices. Your receptionist is checking in patients, handling insurance questions, and the phone just keeps ringing. Something's gotta give." },
      { role: "customer", text: "Exactly. We've even had patients complain they couldn't get through to book appointments." },
      { role: "agent", text: "That's a big deal because those patients will eventually find a clinic that does pick up. I solve that by answering every call immediately. I can schedule appointments, answer questions about your services and hours, and route urgent medical concerns to your staff." },
      { role: "customer", text: "What about prescription refill requests? We get those constantly." },
      { role: "agent", text: "I can take down the refill details, patient name, medication, pharmacy, and send them to your staff in an organized message. Your nurses can process them in batch instead of being interrupted all day." },
      { role: "customer", text: "Can you handle appointment reminders too?" },
      { role: "agent", text: "Absolutely! I can call or text patients with appointment reminders and even handle rescheduling if they need to change. That alone cuts no-shows by a huge amount, which means more revenue for your practice." },
      { role: "customer", text: "This could really transform how we operate. What's the cost look like?" },
      { role: "agent", text: "Way less than hiring another receptionist, I can tell you that. Just sign up on our website and you can try it out. Most clinics are up and running the same day." },
      { role: "customer", text: "Perfect. Thanks so much, Aria!" },
      { role: "agent", text: "You're so welcome! Your patients are going to love the experience. Welcome to CallTone!" },
    ],
  },
  {
    // Scenario 3: Hair salon (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "Hey there! I'm Aria, your AI phone assistant from CallTone. Tell me about your business!" },
      { role: "customer", text: "I own a hair salon and spa. We're always with clients and can't pick up the phone." },
      { role: "agent", text: "Oh I totally get that. You're mid-color, your hands are in foils, and the phone is ringing off the hook. You can't just stop what you're doing, but that caller wants to book a blowout for Saturday." },
      { role: "customer", text: "Yes! And our receptionist can only handle so much. During peak hours it's impossible." },
      { role: "agent", text: "That's exactly my sweet spot. I answer every call, book appointments based on stylist availability, and even handle specific requests like who they want to see or what service they need. The whole thing syncs with your calendar in real time." },
      { role: "customer", text: "What about walk-in availability? Sometimes people call to check if we have openings right now." },
      { role: "agent", text: "I can check your live schedule and let them know the earliest available slot. If there's a cancellation, I can fill it instantly by reaching out to your waitlist. That means fewer empty chairs and more revenue." },
      { role: "customer", text: "Oh wow, the waitlist thing is really cool. Do you send appointment confirmations?" },
      { role: "agent", text: "Of course! Text and email confirmations go out automatically. Plus I send reminders before the appointment so you get fewer no-shows. And if someone needs to cancel, I help them reschedule right away." },
      { role: "customer", text: "I think my whole team would love this. How do we get started?" },
      { role: "agent", text: "Just sign up online and add your stylists and services. You'll be live in minutes. Your clients will think you hired a super-organized receptionist!" },
      { role: "customer", text: "Ha! That's exactly what we need. Thanks, Aria!" },
      { role: "agent", text: "Thank you! Your salon is going to run so smoothly. Welcome to CallTone!" },
    ],
  },
  {
    // Scenario 4: Restaurant (13 lines, indices 00-12)
    lines: [
      { role: "agent", text: "Hi there! Aria here from CallTone. I'm an AI assistant that answers business calls. What do you do?" },
      { role: "customer", text: "I manage a restaurant. During dinner rush, nobody can answer the phone and we lose tons of reservation calls." },
      { role: "agent", text: "Oh, restaurants are one of my favorite use cases. Your staff is running food, bussing tables, greeting guests, and meanwhile the phone is ringing with someone wanting a table for six on Friday night." },
      { role: "customer", text: "That's literally every Friday and Saturday for us. We probably lose twenty reservations a week." },
      { role: "agent", text: "That's real money walking out the door. I answer every call instantly and handle reservations, party sizes, special requests, dietary needs, all of it. I plug right into your booking system so there's no double-booking." },
      { role: "customer", text: "What about takeout and delivery orders?" },
      { role: "agent", text: "I can walk callers through your menu, take their order, confirm the details, and even give them an estimated pickup time. It's like having a dedicated phone operator who never gets flustered during the rush." },
      { role: "customer", text: "People always ask about our specials and hours too." },
      { role: "agent", text: "Easy! You update your specials in the dashboard and I share them with every caller. Same with hours, location, parking info, private dining options, whatever you need. I'm always up to date." },
      { role: "customer", text: "This is exactly what we've been looking for. How fast can we set it up?" },
      { role: "agent", text: "You can be live before tonight's dinner rush! Just sign up, add your menu and hours, and connect your phone number. Takes about two minutes." },
      { role: "customer", text: "That's incredible. Thanks, Aria!" },
      { role: "agent", text: "My pleasure! Your tables are about to stay full. Welcome to CallTone and bon appetit!" },
    ],
  },
];

// ── Audio playback helper ──

function getAudioPath(agent: "atlas" | "aria", scenario: number, index: number, role: "agent" | "customer"): string {
  const idx = index.toString().padStart(2, "0");
  return `/audio/demo/${agent}_${scenario}_${idx}_${role}.mp3`;
}

function playAudio(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const audio = new Audio(src);
    audio.onended = () => resolve();
    audio.onerror = () => reject(new Error(`Failed to load audio: ${src}`));
    audio.play().catch(reject);
  });
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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scenarioRef = useRef(1);

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
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
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

      // Show typing indicator
      setIsTyping(true);
      setIsSpeaking(isAgent);

      const typingDuration = isAgent ? 700 : 500;

      playbackRef.current = setTimeout(() => {
        if (!activeRef.current) return;

        // Show the bubble and start playing audio simultaneously
        setIsTyping(false);
        setMessages((prev) => [...prev, msg]);
        scriptIndexRef.current = index + 1;
        setIsSpeaking(isAgent);

        // Play the pre-recorded audio file
        const agentKey = agentGender === "male" ? "atlas" : "aria";
        const audioSrc = getAudioPath(agentKey, scenarioRef.current, index, msg.role);

        const audio = new Audio(audioSrc);
        audioRef.current = audio;

        audio.onended = () => {
          if (!activeRef.current) return;
          audioRef.current = null;
          setIsSpeaking(false);
          // Brief pause between messages
          playbackRef.current = setTimeout(() => {
            playNextMessage(script, agentGender);
          }, 400);
        };

        audio.onerror = () => {
          // If audio fails, continue after a text-length-based delay
          if (!activeRef.current) return;
          audioRef.current = null;
          setIsSpeaking(false);
          const fallbackDelay = Math.min(msg.text.length * 40, 5000);
          playbackRef.current = setTimeout(() => {
            playNextMessage(script, agentGender);
          }, fallbackDelay);
        };

        audio.play().catch(() => {
          // Autoplay blocked or file missing — use fallback timing
          if (!activeRef.current) return;
          audioRef.current = null;
          setIsSpeaking(false);
          const fallbackDelay = Math.min(msg.text.length * 40, 5000);
          playbackRef.current = setTimeout(() => {
            playNextMessage(script, agentGender);
          }, fallbackDelay);
        });
      }, typingDuration);
    },
    [stopTimer]
  );

  const handleStartCall = useCallback(
    (agent: "male" | "female") => {
      // Pick a random scenario (1-4)
      const scenario = Math.floor(Math.random() * 4) + 1;
      scenarioRef.current = scenario;

      const scenarios = agent === "male" ? ATLAS_SCENARIOS : ARIA_SCENARIOS;
      const script = scenarios[scenario - 1]!.lines;

      setAgentType(agent);
      setStatus("connecting");
      setMessages([]);
      setElapsed(0);
      scriptIndexRef.current = 0;
      activeRef.current = true;

      trackEvent({ event: "button_click", agent });

      // Preload first audio file for faster start
      const agentKey = agent === "male" ? "atlas" : "aria";
      const firstAudioSrc = getAudioPath(agentKey, scenario, 0, script[0]!.role);
      const preload = new Audio(firstAudioSrc);
      preload.preload = "auto";

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
            className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-full bg-blue-600 px-6 py-3.5 text-white shadow-lg shadow-blue-600/25 transition-all duration-300 hover:bg-cyan-500 hover:shadow-xl hover:shadow-cyan-500/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
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
            className="group relative inline-flex flex-col items-center justify-center gap-1 rounded-full bg-purple-600 px-6 py-3.5 text-white shadow-lg shadow-purple-600/25 transition-all duration-300 hover:bg-pink-500 hover:shadow-xl hover:shadow-pink-500/30 hover:-translate-y-0.5 active:scale-[0.98] sm:px-10 sm:py-5"
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
          className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-12 sm:py-5"
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
          className="inline-flex items-center justify-center gap-3 rounded-full bg-red-600 px-10 py-4 text-base font-semibold text-white shadow-lg shadow-red-600/25 transition-all duration-300 hover:bg-orange-500 hover:shadow-xl hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-12 sm:py-5"
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
          className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-border px-8 py-4 text-base font-semibold text-foreground transition-all duration-300 hover:border-cyan-500 hover:bg-cyan-500/10 hover:text-cyan-400 hover:-translate-y-0.5 active:scale-[0.98] sm:text-lg sm:px-10 sm:py-5"
        >
          <Mic className="h-5 w-5 sm:h-6 sm:w-6" />
          Talk Again
        </button>
      </div>
    );
  }

  return null;
}
