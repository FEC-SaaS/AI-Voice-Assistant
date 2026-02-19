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
  { id: 1, name: "Olivia R.", label: "40% off Botox promo" },
  { id: 2, name: "Megan L.", label: "Valentine's filler pkg" },
  { id: 3, name: "Ashley T.", label: "Hydrafacial booking" },
  { id: 4, name: "Brittany K.", label: "Laser hair removal" },
  { id: 5, name: "Natalie S.", label: "Lip filler consult" },
  { id: 6, name: "Chloe W.", label: "New client inquiry" },
  { id: 7, name: "Emma D.", label: "Chemical peel pkg" },
  { id: 8, name: "Jordan M.", label: "Body contouring" },
];

export default function MedspaPage() {
  const pageRef = useScrollReveal();
  const revenue = useLiveCounter(4200, 220, 120000);
  const [activeTiles, setActiveTiles] = useState<number[]>([1, 2, 5, 7]);

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
    }, 2000);
    return () => clearInterval(t);
  }, []);

  return (
    <>
      <style>{`
        .vp-root {
          --accent: #d4a44c;
          --accent-dim: rgba(212,164,76,0.1);
          --accent-border: rgba(212,164,76,0.28);
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
          background: var(--accent); color: #08080b; text-decoration: none;
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
            MedSpa — CallTone BURST
          </div>
          <h1 className="reveal reveal-delay-1" style={{ fontSize: "clamp(32px, 5vw, 60px)", fontWeight: 800, color: "var(--text-head)", lineHeight: 1.15, marginBottom: 24 }}>
            You ran a 40% promo. 300 people called.{" "}
            <span className="vp-accent">Your team answered 18.</span>
          </h1>
          <p className="reveal reveal-delay-2" style={{ fontSize: 18, lineHeight: 1.7, maxWidth: 640, margin: "0 auto 40px", color: "var(--text-body)" }}>
            MedSpa promotions create call surges your front desk can't handle. The 48-hour window closes, the promo ends, and 282 interested clients are gone — not rescheduled, gone. CallTone BURST answers every call simultaneously, books every appointment, and captures every revenue dollar your promo generates.
          </p>
          <div className="reveal reveal-delay-3" style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap", marginBottom: 60 }}>
            <Link href="/sign-up" className="vp-btn-primary">Start Free Trial</Link>
            <Link href="/sign-up" className="vp-btn-ghost">See Live Demo</Link>
          </div>

          {/* Live ticker */}
          <div className="reveal reveal-delay-4" style={{ display: "inline-flex", alignItems: "center", gap: 16, background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "20px 32px" }}>
            <span className="vp-pulse" />
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>Booking revenue missed this month</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "var(--accent)", fontVariantNumeric: "tabular-nums" }}>${revenue.toLocaleString()}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", maxWidth: 120, lineHeight: 1.5 }}>across MedSpas running promos near you</div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 2. PAIN STATS ──────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <p className="reveal" style={{ textAlign: "center", fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 48 }}>The economics your promo is working against</p>
          <div className="reveal" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
            {[
              { num: "$2,800", label: "average MedSpa client lifetime value", sub: "One booking = years of revenue" },
              { num: "94%", label: "won't rebook if their call went unanswered", sub: "First impressions are permanent" },
              { num: "48–72 hrs", label: "typical promo booking window", sub: "Miss it and the urgency is gone" },
              { num: "1,000+", label: "simultaneous calls BURST can handle", sub: "No surge is too large" },
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
                Your promo works. Now capture all of it.
              </h2>
              <p className="reveal reveal-delay-2" style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text-body)", marginBottom: 24 }}>
                You spent money on the promotion. You generated the demand. BURST makes sure every dollar of that demand is converted — not lost to a busy signal, a ringing phone, or a voicemail nobody listened to. Every caller gets a live voice agent, books instantly, and receives a confirmation.
              </p>
              <div className="reveal reveal-delay-3" style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Promo surge capacity — <span style={{ color: "var(--accent)", fontWeight: 700 }}>1,000+ simultaneous calls</span>
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
                      <div style={{ fontSize: 11, color: "var(--accent)", marginTop: 4, fontWeight: 500 }}>— Booking now</div>
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
            Valentine's promo. Two MedSpas. Same Instagram ad spend.
          </h2>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            <div className="vp-race-card lose reveal">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", marginBottom: 20 }}>Without CallTone</div>
              {[
                "10:00 am — Valentine's promo goes live.",
                "10:05 am — 300 calls flood in over 2 hours.",
                "10:06 am — Front desk answers 18. Line jammed.",
                "11:00 am — 282 callers get voicemail or busy tone.",
                "48 hrs later — Promo expires. 282 never rebooked.",
                "Revenue captured from 300 calls: $10,800",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "#ef4444" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "#ef4444" }}>$29,400 forfeited</div>
            </div>
            <div className="vp-race-card win reveal reveal-delay-2">
              <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: 20 }}>With CallTone BURST</div>
              {[
                "10:00 am — Valentine's promo goes live.",
                "10:05 am — 300 calls flood in over 2 hours.",
                "10:05 am — BURST answers all 300 simultaneously.",
                "10:06 am — Bookings flowing. Calendar filling fast.",
                "12:00 pm — 300 booked. Waitlist created for overflow.",
                "Revenue captured from 300 calls: $40,200",
              ].map((line, i) => (
                <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--rule)", fontSize: 14, color: i >= 4 ? "var(--accent)" : "var(--text-body)" }}>
                  <span style={{ color: "var(--text-muted)", minWidth: 16 }}>—</span>
                  {line}
                </div>
              ))}
              <div style={{ marginTop: 20, fontSize: 24, fontWeight: 800, color: "var(--accent)" }}>$40,200 captured</div>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 5. REAL SCENARIO ───────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 760, margin: "0 auto" }}>
          <p className="reveal" style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>Real Scenario</p>
          <h2 className="reveal reveal-delay-1" style={{ fontSize: "clamp(22px, 3vw, 34px)", fontWeight: 800, color: "var(--text-head)", marginBottom: 8 }}>
            Glow Studio MedSpa — Valentine's Day Promo
          </h2>
          <p className="reveal reveal-delay-2" style={{ fontSize: 15, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
            40% off Botox + filler packages for 48 hours. 300 inbound calls. Two front desk staff. Without CallTone, $29K walks out the door. Here's the CallTone log from the same promo run at a BURST-enabled location.
          </p>
          <div className="reveal reveal-delay-2" style={{ background: "var(--card)", border: "1px solid var(--rule)", borderRadius: 12, padding: "24px 28px" }}>
            {[
              { time: "10:04:52", event: "Promo surge — 300 inbound calls over 2 hrs", status: "burst active", color: "var(--accent)" },
              { time: "10:05:01", event: "All callers answered simultaneously — avg 1.8s", status: "answered", color: "var(--accent)" },
              { time: "10:06:14", event: "Bookings processing — services, dates, provider prefs", status: "booking", color: "var(--accent)" },
              { time: "10:14:33", event: "First 60 appointments confirmed. Calendar 20% full.", status: "confirmed", color: "var(--accent)" },
              { time: "11:48:09", event: "280 bookings completed. Waitlist started for overflow.", status: "waitlisted", color: "var(--accent)" },
              { time: "12:00:00", event: "300 callers handled. $40,200 in booking value captured.", status: "complete", color: "var(--accent)" },
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
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>300 calls. 2 hours. Zero missed.</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: "var(--accent)" }}>$40,200 captured</span>
            </div>
          </div>
        </section>

        <hr className="vp-rule" style={{ maxWidth: 900, margin: "0 auto" }} />

        {/* ── 6. FEATURES ────────────────────────────────────────── */}
        <section style={{ padding: "80px 24px", maxWidth: 960, margin: "0 auto" }}>
          <h2 className="reveal" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "var(--text-head)", textAlign: "center", marginBottom: 48 }}>
            Built for MedSpa revenue cycles
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 20 }}>
            {[
              {
                num: "01",
                title: "Promo surge handling — 1,000+ simultaneous",
                desc: "Your promotion drives demand. BURST converts every call into a booking. No busy signal, no voicemail. The 48-hour window stays fully open.",
              },
              {
                num: "02",
                title: "Service selection & provider matching",
                desc: "Asks which service, preferred provider, and time window. Books into your scheduling system. Sends confirmation with prep instructions.",
              },
              {
                num: "03",
                title: "Retention — automated rebooking reminders",
                desc: "Follows up 4 weeks after the appointment with a rebooking prompt. Converts one-time promo clients into $2,800 lifetime value relationships.",
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
              Your next promo deserves to be fully captured.
            </h2>
            <p className="reveal reveal-delay-1" style={{ fontSize: 17, color: "var(--text-body)", marginBottom: 40, lineHeight: 1.6 }}>
              Set up in 15 minutes. Works with your existing number and scheduling system. First 14 days free — no credit card required.
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
