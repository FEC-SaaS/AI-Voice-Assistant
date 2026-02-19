"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("is-visible"); }),
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    el.querySelectorAll(".reveal").forEach((c) => obs.observe(c));
    return () => obs.disconnect();
  }, []);
  return ref;
}

function useLiveCounter(initial: number, increment: number, ms: number) {
  const [count, setCount] = useState(initial);
  useEffect(() => {
    const t = setInterval(() => setCount((c) => c + increment), ms);
    return () => clearInterval(t);
  }, [increment, ms]);
  return count;
}

const CALL_TILES = [
  { id: 1, name: "Kevin H.", label: "Burst pipe — flooding" },
  { id: 2, name: "Sandra L.", label: "Furnace not working" },
  { id: 3, name: "Mike T.", label: "No heat — 2am call" },
  { id: 4, name: "Rachel B.", label: "Electrical panel issue" },
  { id: 5, name: "Omar F.", label: "Water heater replacement" },
  { id: 6, name: "Diane K.", label: "AC unit failure" },
  { id: 7, name: "Chris W.", label: "Drain backup — urgent" },
  { id: 8, name: "Jennifer M.", label: "Gas smell detected" },
];

export default function HvacPage() {
  const pageRef = useScrollReveal();
  const jobs = useLiveCounter(12, 1, 240000);
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 2, 4, 6]);

  useEffect(() => {
    const t = setInterval(() => {
      setActiveTiles((prev) => {
        const next = new Set(prev);
        const all = CALL_TILES.map((c) => c.id);
        const candidate = all[Math.floor(Math.random() * all.length)];
        if (candidate === undefined) return Array.from(next);
        if (next.has(candidate)) next.delete(candidate);
        else next.add(candidate);
        return Array.from(next);
      });
    }, 1600);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        .vp-root {
          --accent: #f97316;
          --accent-dim: rgba(249,115,22,0.1);
          --accent-border: rgba(249,115,22,0.28);
          --bg: #08080b;
          --card: #101014;
          --card-raised: #18181d;
          --text-head: #f0f0f5;
          --text-body: #a0a0b0;
          --text-muted: #707080;
          --rule: rgba(255,255,255,0.06);
          font-family: var(--font-sans, Inter, sans-serif);
          background: var(--bg);
          color: var(--text-body);
        }
        .vp-root .reveal {
          opacity: 0; transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .vp-root .reveal.is-visible { opacity: 1; transform: translateY(0); }
        .vp-root .reveal-delay-1 { transition-delay: 0.1s; }
        .vp-root .reveal-delay-2 { transition-delay: 0.2s; }
        .vp-root .reveal-delay-3 { transition-delay: 0.3s; }
        .vp-root .reveal-delay-4 { transition-delay: 0.4s; }
        .vp-accent { color: var(--accent); }
        .vp-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;
          background: var(--accent); color: #fff; text-decoration: none;
          transition: opacity 0.2s;
        }
        .vp-btn-primary:hover { opacity: 0.88; }
        .vp-btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;
          border: 1.5px solid var(--accent-border); color: var(--text-head); text-decoration: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .vp-btn-ghost:hover { border-color: var(--accent); background: var(--accent-dim); }
        .vp-stat-card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; padding: 28px 24px; }
        .vp-feature-card { background: var(--card-raised); border: 1px solid var(--rule); border-radius: 12px; padding: 32px 28px; }
        .vp-call-tile { background: var(--card); border: 1px solid var(--rule); border-radius: 8px; padding: 12px 16px; transition: border-color 0.4s, background 0.4s; }
        .vp-call-tile.active { border-color: var(--accent-border); background: var(--accent-dim); }
        .vp-pulse { width: 8px; height: 8px; border-radius: 50%; background: var(--accent); display: inline-block; animation: vp-pulse-anim 1.4s ease infinite; }
        @keyframes vp-pulse-anim { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
        .vp-rule { border: none; border-top: 1px solid var(--rule); }
        .vp-race-card { background: var(--card); border: 1px solid var(--rule); border-radius: 12px; padding: 28px 24px; flex: 1; }
        .vp-race-card.lose { border-top: 3px solid #ef4444; }
        .vp-race-card.win { border-top: 3px solid var(--accent); }
        .vp-log-line { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
        .vp-log-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
      `}</style>

      <div className="vp-root" ref={pageRef}>

        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section style={{ padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 32 }}>
            <span className="vp-pulse" />
            HVAC / Plumbing / Electrical — CallTone BURST
          </div>
          <h1 className="reveal reveal-delay-1" style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.15, marginBottom: 24 }}>
            A burst pipe at 2am. Five homeowners called five contractors.{" "}
            <span className="vp-accent">One answered.</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px", color: "var(--text-body)" }}>
            Emergency trades live and die by first-call response. Homeowners in crisis don't negotiate — they hire whoever picks up. CallTone BURST answers every inbound call in under 2 seconds, dispatches the job, and confirms with the customer. At 2am. In a blizzard.
          </p>
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link href="/sign-up" className="vp-btn-primary">Start Free Trial</Link>
            <Link href="/sign-up" className="vp-btn-ghost">See Live Demo</Link>
          </div>

          {/* Live ticker */}
          <div className="reveal reveal-delay-4" style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "20px 32px" }}>
            <span className="vp-pulse" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Emergency jobs gone to competitors this week</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{jobs} jobs</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, lineHeight: 1.5 }}>from unanswered calls in your market</div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 2. PAIN STATS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <p className="reveal" style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 48 }}>Why the first call wins everything</p>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { num: "87%", label: "hire the first contractor who picks up", sub: "The conversation starts and ends there" },
              { num: "$1,200", label: "average emergency job value", sub: "Single call = four figures" },
              { num: "<3 min", label: "before the customer calls someone else", sub: "Your window is brutally short" },
              { num: "1.8s", label: "CallTone average answer time", sub: "No ring, no voicemail, no wait" },
            ].map((s, i) => (
              <div key={i} className={`vp-stat-card reveal reveal-delay-${i + 1}`}>
                <div style={{ fontSize: 40, fontWeight: 800, color: "var(--accent)", marginBottom: 10 }}>{s.num}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-head)", marginBottom: 6, lineHeight: 1.4 }}>{s.label}</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 3. BURST VISUAL ────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
            <div>
              <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>BURST Technology</p>
              <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.2, marginBottom: 20 }}>
                40 simultaneous emergencies. 40 simultaneous answers.
              </h2>
              <p className="reveal reveal-delay-2" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 24 }}>
                Winter storm surge. Pipe freeze across a neighborhood. Every homeowner calls at once. BURST doesn't queue them — it spins up 40 independent voice agents in parallel. Every caller gets a live answer in under 2 seconds, job details captured, technician dispatched.
              </p>
              <div className="reveal reveal-delay-3" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Storm surge capacity — <span style={{ color: "var(--accent)", fontWeight: 700 }}>unlimited simultaneous calls</span>
              </div>
            </div>
            <div className="reveal reveal-delay-2">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {CALL_TILES.map((tile) => (
                  <div key={tile.id} className={`vp-call-tile${activeTiles.includes(tile.id) ? " active" : ""}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {activeTiles.includes(tile.id) && <span className="vp-pulse" />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: activeTiles.includes(tile.id) ? "var(--text-head)" : "var(--text-muted)" }}>{tile.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{tile.label}</div>
                    {activeTiles.includes(tile.id) && (
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>— Dispatching</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 4. THE RACE ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Winter storm night. Two HVAC companies. Same calls.
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="vp-race-card lose reveal">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", marginBottom: 20 }}>Without CallTone</div>
              {[
                "2:14 am — Storm surge. 40 calls in 6 minutes.",
                "2:14 am — On-call tech answers 1 call manually.",
                "2:16 am — 39 callers still ringing. No answer.",
                "2:17 am — Callers start dialing competitor.",
                "2:19 am — Competitor BURST answers all 39.",
                "Morning — You captured 1 job. $1,200.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "#ef4444" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "#ef4444" }}>$46,800 lost</div>
            </div>
            <div className="vp-race-card win reveal reveal-delay-2">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>With CallTone BURST</div>
              {[
                "2:14 am — Storm surge. 40 calls in 6 minutes.",
                "2:14 am — BURST answers all 40 in 1.8s each.",
                "2:15 am — Job details captured. Techs notified.",
                "2:16 am — Priority queue built by urgency.",
                "2:18 am — Confirmations sent to all 40 customers.",
                "Morning — 40 jobs dispatched. Team fully booked.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--accent)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>$48,000 captured</div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 5. REAL SCENARIO ───────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Real Scenario</p>
          <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 8 }}>
            ProFlow Plumbing — Winter Storm, 2:14 am
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: 15, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
            Pipe freeze hits a suburban neighborhood. 40 homeowners call in 6 minutes. A single on-call tech can answer one. CallTone BURST answers all 40 — simultaneously — in under 2 seconds each.
          </p>
          <div className="reveal reveal-delay-2" style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "24px 28px" }}>
            {[
              { time: "02:14:03", event: "Inbound surge — 40 calls received", status: "burst active", color: "var(--accent)" },
              { time: "02:14:05", event: "All 40 callers answered — avg 1.8s", status: "answered", color: "var(--accent)" },
              { time: "02:15:12", event: "Job details captured — address, issue type, urgency", status: "logged", color: "var(--accent)" },
              { time: "02:16:44", event: "Priority queue dispatched to 8 on-call techs", status: "dispatched", color: "var(--accent)" },
              { time: "02:18:01", event: "40 customers receive ETA confirmation via SMS", status: "confirmed", color: "var(--accent)" },
              { time: "06:00:00", event: "40 jobs completed or in-progress. Zero missed.", status: "complete", color: "var(--accent)" },
            ].map((log, i) => (
              <div key={i} className="vp-log-line">
                <div className="vp-log-dot" style={{ background: log.color }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-head)", marginBottom: 2 }}>{log.event}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{log.time}</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, color: log.color, textTransform: "uppercase", letterSpacing: "0.08em" }}>{log.status}</div>
              </div>
            ))}
            <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>40 calls answered in under 4 minutes</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>$48,000 captured</span>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 6. FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Built for emergency trades
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                num: "01",
                title: "Unlimited simultaneous dispatch",
                desc: "Storm surge, pipe freeze, summer AC failures — BURST handles any volume spike. Every caller gets a live answer in 1.8 seconds. No on-call tech required to answer phones.",
              },
              {
                num: "02",
                title: "Urgency triage & smart dispatch",
                desc: "CallTone assesses job urgency from the call, ranks the dispatch queue, and routes the highest-priority jobs to available technicians first. Flooding beats a dripping faucet.",
              },
              {
                num: "03",
                title: "24/7 coverage — nights, weekends, holidays",
                desc: "The most valuable emergency calls come at the worst times. CallTone doesn't sleep, doesn't miss calls at 3am, and doesn't need overtime pay for holiday emergencies.",
              },
            ].map((f, i) => (
              <div key={i} className={`vp-feature-card reveal reveal-delay-${i + 1}`}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--accent)", letterSpacing: "0.1em", marginBottom: 16 }}>{f.num}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-head)", marginBottom: 12 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: "var(--text-body)", lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 7. FINAL CTA ───────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", background: "var(--accent-dim)", borderTop: "1px solid var(--accent-border)", borderBottom: "1px solid var(--accent-border)" }}>
          <div style={{ maxWidth: 640, margin: "0 auto", textAlign: "center" }}>
            <h2 className="reveal" style={{ fontSize: "clamp(26px, 4vw, 44px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 20 }}>
              The next emergency call is 3 minutes away from going to your competitor.
            </h2>
            <p className="reveal reveal-delay-1" style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
              Set up in 15 minutes. Works with your existing number. No hardware. No IT. First 14 days free — cancel any time.
            </p>
            <div className="reveal reveal-delay-2" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/sign-up" className="vp-btn-primary" style={{ fontSize: 16, padding: "16px 36px" }}>Start Free Trial</Link>
              <Link href="/sign-up" className="vp-btn-ghost" style={{ fontSize: 16, padding: "16px 36px" }}>Book a Demo Call</Link>
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
