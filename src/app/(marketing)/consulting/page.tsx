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
  { id: 1, name: "Rajesh K.", label: "SAP S/4HANA — 6 months" },
  { id: 2, name: "Priya M.", label: "Salesforce CRM — remote" },
  { id: 3, name: "Amit S.", label: "Oracle HCM — NYC" },
  { id: 4, name: "Neha P.", label: "AWS DevOps — C2C" },
  { id: 5, name: "Suresh R.", label: "Java microservices" },
  { id: 6, name: "Deepa N.", label: "SAP FICO — contract" },
  { id: 7, name: "Vikram T.", label: "PMP — PMO lead" },
  { id: 8, name: "Ananya B.", label: "Data engineer — RTR" },
];

export default function ConsultingPage() {
  const pageRef = useScrollReveal();
  const opportunities = useLiveCounter(3, 1, 480000);
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 2, 4, 5]);
  const [callCount, setCallCount] = useState(7);

  useEffect(() => {
    const t1 = setInterval(() => {
      setActiveTiles((prev) => {
        const next = new Set(prev);
        const all = CALL_TILES.map((c) => c.id);
        const candidate = all[Math.floor(Math.random() * all.length)];
        if (candidate === undefined) return Array.from(next);
        if (next.has(candidate)) next.delete(candidate);
        else next.add(candidate);
        return Array.from(next);
      });
    }, 1400);
    const t2 = setInterval(() => {
      setCallCount((c) => Math.min(c + 1, 500));
    }, 200);
    setTimeout(() => clearInterval(t2), 6000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, []);

  return (
    <>
      <style>{`
        .vp-root {
          --accent: #ef4444;
          --accent-dim: rgba(239,68,68,0.1);
          --accent-border: rgba(239,68,68,0.28);
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
        .vp-race-card.lose { border-top: 3px solid #707080; }
        .vp-race-card.win { border-top: 3px solid var(--accent); }
        .vp-log-line { display: flex; align-items: flex-start; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--rule); }
        .vp-log-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 6px; }
      `}</style>

      <div className="vp-root" ref={pageRef}>

        {/* ── 1. HERO ─────────────────────────────────────────────── */}
        <section style={{ padding: "100px 24px 80px", maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <div className="reveal" style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "var(--accent-dim)", border: "1px solid var(--accent-border)", borderRadius: 99, padding: "6px 16px", fontSize: 13, fontWeight: 500, color: "var(--accent)", marginBottom: 32 }}>
            <span className="vp-pulse" />
            IT Consulting / Staffing — CallTone BURST
          </div>
          <h1 className="reveal reveal-delay-1" style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.15, marginBottom: 24 }}>
            Your competitor called your consultant{" "}
            <span className="vp-accent">90 seconds before you did. RTR gone.</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px", color: "var(--text-body)" }}>
            In the RTR game, the recruiter who calls first wins the submission. Period. Your team can dial 60 consultants an hour. CallTone BURST dials 500 simultaneously — in under 2 seconds — with a personalized pitch, interest capture, and immediate follow-up. The requirement is filled before your competitor finishes their coffee.
          </p>
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link href="/sign-up" className="vp-btn-primary">Start Free Trial</Link>
            <Link href="/sign-up" className="vp-btn-ghost">See Live Demo</Link>
          </div>

          {/* Live ticker */}
          <div className="reveal reveal-delay-4" style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "20px 32px" }}>
            <span className="vp-pulse" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>RTR opportunities lost to faster competitors today</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>{opportunities} lost</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, lineHeight: 1.5 }}>from firms using BURST outreach</div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 2. PAIN STATS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <p className="reveal" style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 48 }}>The RTR math that decides who fills the req</p>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { num: "91%", label: "of RTRs won by the first firm to call", sub: "Speed is literally the only variable" },
              { num: "60/hr", label: "max calls a human recruiter can make", sub: "Your ceiling. Their floor." },
              { num: "500", label: "simultaneous calls BURST places at once", sub: "8x faster than a 10-person team" },
              { num: "$20–40K", label: "avg gross margin per placement", sub: "One BURST campaign = multiple placements" },
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
              <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--accent)", textTransform: "uppercase", marginBottom: 16 }}>BURST Outreach Technology</p>
              <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.2, marginBottom: 20 }}>
                500 consultants called in 60 seconds.
              </h2>
              <p className="reveal reveal-delay-2" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 24 }}>
                New SAP req hits your inbox. BURST launches 500 simultaneous outbound calls — all personalized with the requirement, rate, location, and duration — captures interest, screens work authorization, and routes warm responses to your recruiters in real time. By the time your competitor finishes dialing call #7, you have 40 interested submissions.
              </p>
              <div className="reveal reveal-delay-3" style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Outreach velocity — <span style={{ color: "var(--accent)", fontWeight: 700 }}>500 simultaneous calls</span>
                </div>
              </div>
            </div>
            <div className="reveal reveal-delay-2">
              <div style={{ marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>Active outreach</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent)" }}>{callCount} calls live</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {CALL_TILES.map((tile) => (
                  <div key={tile.id} className={`vp-call-tile${activeTiles.includes(tile.id) ? " active" : ""}`}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      {activeTiles.includes(tile.id) && <span className="vp-pulse" />}
                      <span style={{ fontSize: 13, fontWeight: 600, color: activeTiles.includes(tile.id) ? "var(--text-head)" : "var(--text-muted)" }}>{tile.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{tile.label}</div>
                    {activeTiles.includes(tile.id) && (
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>— Interested</div>
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
            SAP S/4HANA requirement. Two staffing firms. Same moment.
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="vp-race-card lose reveal">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 20 }}>Your firm — manual dialing</div>
              {[
                "9:14 am — Req received. Recruiter starts calling.",
                "9:14 am — Call #1. No answer. Voicemail.",
                "9:16 am — Call #2. Not interested.",
                "9:18 am — Call #7. Still dialing.",
                "9:16 am — Competitor BURST calls 500 simultaneously.",
                "9:17 am — Competitor has 40 interested submissions.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--text-muted)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--text-muted)" }}>Req already filled</div>
            </div>
            <div className="vp-race-card win reveal reveal-delay-2">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>Your firm — CallTone BURST</div>
              {[
                "9:14 am — Req received. BURST campaign launched.",
                "9:14 am — 500 consultants called simultaneously.",
                "9:15 am — 38 consultants express interest.",
                "9:16 am — Work auth, rate, availability screened.",
                "9:17 am — Top 10 profiles sent to account manager.",
                "9:22 am — Client receives submissions. First in.",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--accent)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>$30K GM captured</div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 5. REAL SCENARIO ───────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Real Scenario</p>
          <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 8 }}>
            TechBridge Staffing — SAP S/4HANA Req, 9:14 am
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: 15, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
            Urgent SAP S/4HANA FICO consultant req. 6-month contract, $110/hr, remote. 500 SAP consultants in the CRM. Without BURST, a recruiter dials 7 by the time a competitor has submitted 40. Here&apos;s the BURST log.
          </p>
          <div className="reveal reveal-delay-2" style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "24px 28px" }}>
            {[
              { time: "09:14:02", event: "BURST campaign launched — SAP S/4HANA FICO req", status: "launched", color: "var(--accent)" },
              { time: "09:14:04", event: "500 consultants called simultaneously — avg 1.8s connect", status: "outreach", color: "var(--accent)" },
              { time: "09:14:48", event: "38 consultants — interested, available, authorized", status: "qualified", color: "var(--accent)" },
              { time: "09:15:22", event: "Work auth, rate flexibility, notice period screened", status: "screened", color: "var(--accent)" },
              { time: "09:16:44", event: "Top 10 profiles ranked by match score — sent to AM", status: "submitted", color: "var(--accent)" },
              { time: "09:22:11", event: "Client receives 10 profiles. First submission in market.", status: "first", color: "var(--accent)" },
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
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>500 calls. 8 minutes. First submission sent.</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>$30K GM</span>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 6. FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Built for Indian IT staffing and RTR workflows
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                num: "01",
                title: "500 simultaneous outbound calls",
                desc: "New req in your inbox. BURST campaign launches instantly. 500 consultants called with personalized pitch. Interested profiles routed to recruiters in real time. Requirement filled before competitors start dialing.",
              },
              {
                num: "02",
                title: "Automated RTR screening",
                desc: "Confirms work authorization, rate expectation, availability, notice period, and location flexibility — all in the same call. Recruiters receive warm, pre-screened profiles only.",
              },
              {
                num: "03",
                title: "Inbound candidate pipeline",
                desc: "BURST handles inbound calls from consultants checking on submissions, following up on interviews, or asking about new reqs — freeing your team to focus on placements, not status calls.",
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
              Every RTR you lose is a placement you&apos;ll never see.
            </h2>
            <p className="reveal reveal-delay-1" style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
              Set up in 15 minutes. Works with your existing CRM and phone numbers. No hardware. No IT. First 14 days free — no credit card required.
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
