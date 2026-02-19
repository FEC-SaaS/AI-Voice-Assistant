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
  { id: 1, name: "Robert H.", label: "Car accident — injuries" },
  { id: 2, name: "Patricia W.", label: "Wrongful termination" },
  { id: 3, name: "Michael S.", label: "DUI arrest — tonight" },
  { id: 4, name: "Barbara L.", label: "Divorce — urgent" },
  { id: 5, name: "David K.", label: "Estate — probate" },
  { id: 6, name: "Jennifer M.", label: "Business dispute" },
  { id: 7, name: "Richard T.", label: "Criminal defense" },
  { id: 8, name: "Susan C.", label: "Immigration matter" },
];

export default function LawPage() {
  const pageRef = useScrollReveal();
  const caseValue = useLiveCounter(32000, 8500, 360000);
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 3, 6]);

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
    }, 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        .vp-root {
          --accent: #d97706;
          --accent-dim: rgba(217,119,6,0.1);
          --accent-border: rgba(217,119,6,0.28);
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
        .vp-root .reveal { opacity: 0; transform: translateY(20px); transition: opacity 0.55s ease, transform 0.55s ease; }
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
            Law Offices — CallTone BURST
          </div>
          <h1 className="reveal reveal-delay-1" style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.15, marginBottom: 24 }}>
            A potential client in crisis called 3 law firms.{" "}
            <span className="vp-accent">Yours went to voicemail.</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px", color: "var(--text-body)" }}>
            Legal clients in distress call multiple firms. Whoever answers first earns the trust — and the retainer. After-hours calls, weekend crises, Monday morning surges. CallTone answers every call in under 2 seconds, qualifies the lead, and schedules the consultation before your competitor's phone even rings twice.
          </p>
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link href="/sign-up" className="vp-btn-primary">Start Free Trial</Link>
            <Link href="/sign-up" className="vp-btn-ghost">See Live Demo</Link>
          </div>

          {/* Live ticker */}
          <div className="reveal reveal-delay-4" style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "20px 32px" }}>
            <span className="vp-pulse" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Case value gone to competitors today</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>${caseValue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, lineHeight: 1.5 }}>from unanswered calls at law firms near you</div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 2. PAIN STATS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <p className="reveal" style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 48 }}>Why legal intake speed determines case outcomes</p>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { num: "80%", label: "retain the first attorney who answers", sub: "Speed is the conversion" },
              { num: "$25K–$150K", label: "average case value by practice area", sub: "Each missed call is six figures" },
              { num: "42%", label: "of legal inquiries arrive after hours", sub: "Your highest-value window" },
              { num: "Qualifies", label: "CallTone screens and qualifies leads", sub: "Only warm leads reach your inbox" },
            ].map((s, i) => (
              <div key={i} className={`vp-stat-card reveal reveal-delay-${i + 1}`}>
                <div style={{ fontSize: 40, fontWeight: 800, color: "var(--accent)", marginBottom: 10, lineHeight: 1 }}>{s.num}</div>
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
                Every caller — even at 5:01 pm — gets a live answer.
              </h2>
              <p className="reveal reveal-delay-2" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 24 }}>
                The most urgent legal calls happen outside office hours. Car accidents, arrests, served papers. CallTone's after-hours voice agents answer instantly, ask the right intake questions, assess urgency, and schedule a consultation — or escalate emergencies to the on-call attorney.
              </p>
              <div className="reveal reveal-delay-3" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                After-hours capture rate — <span style={{ color: "var(--accent)", fontWeight: 700 }}>100% of inbound calls</span>
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
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>— Qualifying</div>
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
            Monday 5:02 pm. Eight after-hours calls. Two law firms.
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="vp-race-card lose reveal">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", marginBottom: 20 }}>Without CallTone</div>
              {[
                "5:02 pm — 8 calls arrive. Office is closed.",
                "5:02 pm — All 8 reach a voicemail recording.",
                "5:03 pm — 6 callers hang up without leaving message.",
                "5:04 pm — 2 leave messages. Heard next morning.",
                "9:00 am — Both already retained another firm.",
                "Revenue from 8 after-hours calls: $0",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "#ef4444" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "#ef4444" }}>6 cases lost — $300K+ gone</div>
            </div>
            <div className="vp-race-card win reveal reveal-delay-2">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>With CallTone BURST</div>
              {[
                "5:02 pm — 8 calls arrive. CallTone answers all 8.",
                "5:02 pm — Intake questions: issue type, urgency, facts.",
                "5:04 pm — 6 qualified leads. Consultations scheduled.",
                "5:06 pm — 1 emergency escalated to on-call attorney.",
                "5:07 pm — Confirmation emails sent to all 6 leads.",
                "Next morning — 6 consultations on calendar.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--accent)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>6 consultations booked</div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 5. REAL SCENARIO ───────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Real Scenario</p>
          <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 8 }}>
            Harmon & Webb Law — Monday, 5:02 pm
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: 15, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
            Personal injury and criminal defense practice. 8 calls arrive in the 5-minute window after close. CallTone handles full intake, screens practice fit, schedules consultations, and escalates one DUI arrest to the on-call attorney.
          </p>
          <div className="reveal reveal-delay-2" style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "24px 28px" }}>
            {[
              { time: "17:02:04", event: "Inbound — Robert H. — Auto accident, injuries — PI case", status: "qualified", color: "var(--accent)" },
              { time: "17:02:09", event: "Inbound — Michael S. — DUI arrest, tonight — escalated", status: "escalated", color: "#f97316" },
              { time: "17:02:14", event: "Inbound — Barbara L. — Divorce, contested — family law", status: "qualified", color: "var(--accent)" },
              { time: "17:03:44", event: "Robert H. — Consultation booked Tue 10:00 am", status: "booked", color: "var(--accent)" },
              { time: "17:04:12", event: "Barbara L. — Consultation booked Tue 2:00 pm", status: "booked", color: "var(--accent)" },
              { time: "17:06:58", event: "6 of 8 callers — Consultations confirmed. Emails sent.", status: "complete", color: "var(--accent)" },
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
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>8 calls. 5 minutes. 6 consultations scheduled.</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>$300K+ pipeline</span>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 6. FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Built for legal intake
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                num: "01",
                title: "24/7 intake — never miss a crisis call",
                desc: "Arrests happen at midnight. Accidents happen on weekends. CallTone answers every after-hours call with a trained intake agent that sounds professional and captures every detail.",
              },
              {
                num: "02",
                title: "Lead qualification — only warm leads to attorneys",
                desc: "Screens practice area fit, statute of limitations viability, and case strength before scheduling. Attorneys see a full intake summary — not a raw call log.",
              },
              {
                num: "03",
                title: "Emergency escalation — direct to on-call",
                desc: "DUI arrests, active criminal matters, and custody emergencies route directly to your on-call attorney via SMS alert with full call transcript attached.",
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
              Every unanswered call is a retainer you'll never see.
            </h2>
            <p className="reveal reveal-delay-1" style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
              Set up in 15 minutes. Works with your existing number and calendar. No hardware. No IT. First 14 days free — no credit card required.
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
