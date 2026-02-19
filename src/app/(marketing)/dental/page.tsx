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
  { id: 1, name: "Sarah M.", label: "New patient inquiry" },
  { id: 2, name: "James T.", label: "Cleaning appointment" },
  { id: 3, name: "Maria L.", label: "Emergency tooth pain" },
  { id: 4, name: "Derek W.", label: "Invisalign consult" },
  { id: 5, name: "Priya K.", label: "Whitening quote" },
  { id: 6, name: "Tom R.", label: "Crown follow-up" },
  { id: 7, name: "Lisa C.", label: "New patient inquiry" },
  { id: 8, name: "Ahmed S.", label: "Root canal consult" },
];

export default function DentalPage() {
  const pageRef = useScrollReveal();
  const revenue = useLiveCounter(800, 180, 90000);
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 3, 5]);

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
    }, 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        .vp-root {
          --accent: #00c4aa;
          --accent-dim: rgba(0,196,170,0.12);
          --accent-border: rgba(0,196,170,0.3);
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
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.55s ease, transform 0.55s ease;
        }
        .vp-root .reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }
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
        .vp-stat-card {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 28px 24px;
        }
        .vp-feature-card {
          background: var(--card-raised); border: 1px solid var(--rule);
          border-radius: 12px; padding: 32px 28px;
        }
        .vp-call-tile {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 8px; padding: 12px 16px;
          transition: border-color 0.4s, background 0.4s;
        }
        .vp-call-tile.active {
          border-color: var(--accent-border);
          background: var(--accent-dim);
        }
        .vp-pulse {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--accent); display: inline-block;
          animation: vp-pulse-anim 1.4s ease infinite;
        }
        @keyframes vp-pulse-anim {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.7); }
        }
        .vp-rule { border: none; border-top: 1px solid var(--rule); }
        .vp-race-card {
          background: var(--card); border: 1px solid var(--rule);
          border-radius: 12px; padding: 28px 24px; flex: 1;
        }
        .vp-race-card.lose { border-top: 3px solid #ef4444; }
        .vp-race-card.win { border-top: 3px solid var(--accent); }
        .vp-log-line {
          display: flex; align-items: flex-start; gap: 14px;
          padding: 12px 0; border-bottom: 1px solid var(--rule);
        }
        .vp-log-dot {
          width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px;
        }
      `}</style>

      <div className="vp-root" ref={pageRef}>

        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section style={{ padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 32 }}>
            <span className="vp-pulse" />
            Dental Practices — CallTone BURST
          </div>
          <h1 className="reveal reveal-delay-1" style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.15, marginBottom: 24 }}>
            While you were with a patient,{" "}
            <span className="vp-accent">3 callers chose a different practice.</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px", color: "var(--text-body)" }}>
            Every unanswered call is a new patient walking into your competitor's chair. CallTone BURST answers every call — simultaneously — in under 2 seconds, books the appointment, and sends the confirmation. While you're with patients.
          </p>
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link href="/sign-up" className="vp-btn-primary">Start Free Trial</Link>
            <Link href="/sign-up" className="vp-btn-ghost">See Live Demo</Link>
          </div>

          {/* Live ticker */}
          <div className="reveal reveal-delay-4" style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "20px 32px" }}>
            <span className="vp-pulse" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Revenue lost to unanswered calls today</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>${revenue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, lineHeight: 1.5 }}>across dental practices near you</div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 2. PAIN STATS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <p className="reveal" style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 48 }}>The numbers your practice can't afford to ignore</p>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { num: "62%", label: "of callers won't leave a voicemail", sub: "They move on immediately" },
              { num: "78%", label: "book with the first practice that answers", sub: "Speed is the entire competition" },
              { num: "$850", label: "average new patient lifetime value", sub: "Each missed call = $850 gone" },
              { num: "34%", label: "of calls arrive during busy or lunch hours", sub: "Your highest-risk windows" },
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
                Every caller gets a live answer. Simultaneously.
              </h2>
              <p className="reveal reveal-delay-2" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 24 }}>
                Traditional phone systems queue callers or send them to voicemail. BURST spins up independent voice agents for every inbound call — no queue, no hold music, no missed opportunity. Your lunch break is no longer your competitor's best sales hour.
              </p>
              <div className="reveal reveal-delay-3" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Avg answer time — <span style={{ color: "var(--accent)", fontWeight: 700 }}>1.8 seconds</span>
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
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>— Connected</div>
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
            The same Tuesday. Two different practices.
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="vp-race-card lose reveal">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", marginBottom: 20 }}>Without CallTone</div>
              {[
                "12:31 pm — Dr. Patel steps away for lunch",
                "12:32 pm — Call #1 rings. Goes to voicemail.",
                "12:34 pm — Call #2. Voicemail again.",
                "12:38 pm — Call #3. Caller hangs up at 4 rings.",
                "12:41 pm — Call #4. Different practice answers first.",
                "1:00 pm — 4 missed calls. 0 bookings.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "#ef4444" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "#ef4444" }}>$3,400 lost</div>
            </div>
            <div className="vp-race-card win reveal reveal-delay-2">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>With CallTone BURST</div>
              {[
                "12:31 pm — Dr. Patel steps away for lunch",
                "12:32 pm — All 4 callers answered in 1.8s",
                "12:33 pm — Appointment 1 booked. Confirmation sent.",
                "12:35 pm — Appointment 2 & 3 booked.",
                "12:39 pm — Emergency slot offered to caller #4.",
                "1:00 pm — 4 answered. 4 booked. Dr. Patel still at lunch.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--accent)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>$3,400 captured</div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 5. REAL SCENARIO ───────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Real Scenario</p>
          <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 8 }}>
            Bright Smile Dental — Tuesday, 12:30 pm
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: 15, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
            Front desk on lunch. Dr. Kim with a patient. Four prospective patients call in 11 minutes. Without CallTone, that's $4,200 in new patient value walking out the door. Here's what CallTone logged instead.
          </p>
          <div className="reveal reveal-delay-2" style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "24px 28px" }}>
            {[
              { time: "12:31:02", event: "Inbound — Sarah M. — New patient inquiry", status: "answered", color: "var(--accent)" },
              { time: "12:31:08", event: "Inbound — James T. — Cleaning request", status: "answered", color: "var(--accent)" },
              { time: "12:33:14", event: "Sarah M. — Appointment booked Feb 27 @ 2:00 pm", status: "booked", color: "var(--accent)" },
              { time: "12:35:22", event: "Inbound — Maria L. — Emergency tooth pain", status: "answered", color: "var(--accent)" },
              { time: "12:36:01", event: "Maria L. — Same-day slot offered, accepted", status: "booked", color: "var(--accent)" },
              { time: "12:38:45", event: "Inbound — Derek W. — Invisalign consult", status: "answered", color: "var(--accent)" },
              { time: "12:42:09", event: "All 4 callers — Confirmations sent via SMS", status: "complete", color: "var(--accent)" },
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
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Total time elapsed: 11 min 07 sec</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>$4,200 captured</span>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 6. FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Built for dental practices
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                num: "01",
                title: "Unlimited simultaneous calls",
                desc: "Whether it's 1 call or 40 during your lunch rush, every caller gets a live answer. No queue. No voicemail. No lost patients.",
              },
              {
                num: "02",
                title: "HIPAA-aware intake & booking",
                desc: "Collects patient name, DOB, insurance, and chief complaint. Books directly into your scheduler. Sends confirmation SMS.",
              },
              {
                num: "03",
                title: "After-hours coverage — zero staff cost",
                desc: "Saturday emergencies, evening inquiries, holiday weekends. CallTone handles them all so you don't have to staff for them.",
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
              Stop losing patients to silence.
            </h2>
            <p className="reveal reveal-delay-1" style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
              Set up in 15 minutes. No hardware. No IT. Works with your existing phone number and scheduling software. First 14 days free — no credit card required.
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
