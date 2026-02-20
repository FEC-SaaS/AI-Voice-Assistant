import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ArrowRight, BookOpen, TrendingUp, Shield, BarChart3, Zap, Star } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | CallTone",
  description: "Insights, guides, and best practices for voice agents and business communication.",
};

const BLOG_POSTS = [
  {
    slug: "complete-guide-voice-agents-2026",
    title: "The Complete Guide to Voice Agents in 2026",
    excerpt:
      "Voice agents are reshaping business communications across every industry. From handling inbound support calls to running outbound sales campaigns, they operate around the clock without breaks, sick days, or scheduling conflicts.",
    category: "Guide",
    readTime: "8 min read",
    date: "Feb 10, 2026",
    icon: BookOpen,
    accent: "#818cf8",
    accentBg: "rgba(129,140,248,0.08)",
    accentBorder: "rgba(129,140,248,0.2)",
    featured: true,
  },
  {
    slug: "tcpa-compliance-automated-calling",
    title: "TCPA Compliance for Automated Calling: What You Need to Know",
    excerpt:
      "The Telephone Consumer Protection Act sets strict rules for automated calls. Violations can cost up to $1,500 per call. Here's everything you need to stay protected.",
    category: "Compliance",
    readTime: "6 min read",
    date: "Feb 5, 2026",
    icon: Shield,
    accent: "#a78bfa",
    accentBg: "rgba(167,139,250,0.08)",
    accentBorder: "rgba(167,139,250,0.2)",
    featured: false,
  },
  {
    slug: "cold-calling-automation-pipeline-340-percent",
    title: "How Cold Calling Automation Increased Our Client's Pipeline by 340%",
    excerpt:
      "A regional insurance agency was spending 30 hours a week on manual cold calls and booking just 4 meetings. After deploying CallTone, they booked 18 meetings in week one.",
    category: "Case Study",
    readTime: "5 min read",
    date: "Jan 28, 2026",
    icon: TrendingUp,
    accent: "#34d399",
    accentBg: "rgba(52,211,153,0.08)",
    accentBorder: "rgba(52,211,153,0.2)",
    featured: false,
  },
  {
    slug: "measuring-roi-voice-agents",
    title: "Measuring ROI on Voice Agents: A Framework for Business Leaders",
    excerpt:
      "How much is a missed call really costing you? The average small business misses 62% of inbound calls. This framework shows you how to calculate and prove the ROI.",
    category: "Business",
    readTime: "7 min read",
    date: "Jan 20, 2026",
    icon: BarChart3,
    accent: "#fb923c",
    accentBg: "rgba(251,146,60,0.08)",
    accentBorder: "rgba(251,146,60,0.2)",
    featured: false,
  },
  {
    slug: "sentiment-analysis-voice-calls",
    title: "Sentiment Analysis in Voice Calls: Beyond Simple Keywords",
    excerpt:
      "Modern voice analytics go far beyond keyword spotting. CallTone's conversation intelligence analyzes tone, pacing, and context to surface insights that drive real decisions.",
    category: "Technology",
    readTime: "10 min read",
    date: "Jan 12, 2026",
    icon: Zap,
    accent: "#38bdf8",
    accentBg: "rgba(56,189,248,0.08)",
    accentBorder: "rgba(56,189,248,0.2)",
    featured: false,
  },
  {
    slug: "building-effective-voice-agent-scripts",
    title: "Building Effective Voice Agent Scripts: Tips from Top-Performing Campaigns",
    excerpt:
      "The difference between a 5% and a 25% conversion rate often comes down to the script. After analyzing thousands of campaigns, here are the patterns that work.",
    category: "Best Practices",
    readTime: "6 min read",
    date: "Jan 5, 2026",
    icon: Star,
    accent: "#f472b6",
    accentBg: "rgba(244,114,182,0.08)",
    accentBorder: "rgba(244,114,182,0.2)",
    featured: false,
  },
];

const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  Guide:           { bg: "rgba(129,140,248,0.12)", text: "#a5b4fc", border: "rgba(129,140,248,0.25)" },
  Compliance:      { bg: "rgba(167,139,250,0.12)", text: "#c4b5fd", border: "rgba(167,139,250,0.25)" },
  "Case Study":    { bg: "rgba(52,211,153,0.12)",  text: "#6ee7b7", border: "rgba(52,211,153,0.25)"  },
  Business:        { bg: "rgba(251,146,60,0.12)",  text: "#fdba74", border: "rgba(251,146,60,0.25)"  },
  Technology:      { bg: "rgba(56,189,248,0.12)",  text: "#7dd3fc", border: "rgba(56,189,248,0.25)"  },
  "Best Practices":{ bg: "rgba(244,114,182,0.12)", text: "#f9a8d4", border: "rgba(244,114,182,0.25)" },
};

export default function BlogPage() {
  const featured = BLOG_POSTS[0]!;
  const rest = BLOG_POSTS.slice(1);

  return (
    <div style={{ background: "#08080f", minHeight: "100vh", color: "#c8c8d8" }}>
      <style>{`
        .blog-root {
          font-family: var(--font-sans, Inter, sans-serif);
        }
        .blog-reveal {
          opacity: 0; transform: translateY(22px);
          animation: blogFadeUp 0.6s ease forwards;
        }
        @keyframes blogFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
        .blog-card:hover { transform: translateY(-4px); }
        .blog-card { transition: transform 0.25s ease, box-shadow 0.25s ease; }
        .blog-card:hover .blog-card-arrow { transform: translateX(4px); }
        .blog-card-arrow { transition: transform 0.2s ease; }
      `}</style>

      <div className="blog-root">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section
          style={{
            background: "linear-gradient(180deg, #0d0d20 0%, #08080f 100%)",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            padding: "80px 24px 64px",
          }}
        >
          <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
            <div
              className="blog-reveal"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.25)",
                borderRadius: 99, padding: "6px 16px", marginBottom: 24,
                fontSize: 12, fontWeight: 600, color: "#a5b4fc", letterSpacing: "0.05em",
              }}
            >
              <BookOpen style={{ width: 13, height: 13 }} />
              INSIGHTS &amp; RESOURCES
            </div>
            <h1
              className="blog-reveal"
              style={{
                fontSize: "clamp(2rem, 5vw, 3.25rem)", fontWeight: 800, lineHeight: 1.15,
                color: "#f0f0fa", letterSpacing: "-0.02em", animationDelay: "0.1s",
              }}
            >
              Voice AI Knowledge{" "}
              <span
                style={{
                  background: "linear-gradient(90deg, #818cf8, #a78bfa, #f472b6)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}
              >
                Hub
              </span>
            </h1>
            <p
              className="blog-reveal"
              style={{
                marginTop: 16, fontSize: 18, color: "#7878a0", maxWidth: 560, margin: "16px auto 0",
                animationDelay: "0.2s",
              }}
            >
              Guides, case studies, and best practices for AI-powered voice automation.
            </p>
          </div>
        </section>

        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "60px 24px 80px" }}>

          {/* ── Featured Post ─────────────────────────────────────────── */}
          <div className="blog-reveal" style={{ marginBottom: 56, animationDelay: "0.15s" }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#6060a0", marginBottom: 16, textTransform: "uppercase" }}>
              Featured Article
            </p>
            <Link href={`/blog/${featured.slug}`} style={{ textDecoration: "none", display: "block" }}>
              <article
                className="blog-card"
                style={{
                  background: "linear-gradient(135deg, #0f0f1e 0%, #13132a 100%)",
                  border: `1px solid ${featured.accentBorder}`,
                  borderRadius: 20,
                  padding: "40px 44px",
                  boxShadow: `0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
                  position: "relative", overflow: "hidden",
                }}
              >
                {/* Ambient glow */}
                <div style={{
                  position: "absolute", top: -40, right: -40, width: 200, height: 200,
                  borderRadius: "50%", background: featured.accentBg, filter: "blur(60px)",
                  pointerEvents: "none",
                }} />
                <div style={{ position: "relative", display: "flex", alignItems: "flex-start", gap: 32, flexWrap: "wrap" }}>
                  <div
                    style={{
                      width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                      background: featured.accentBg, border: `1px solid ${featured.accentBorder}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    <featured.icon style={{ width: 24, height: 24, color: featured.accent }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                      {(() => {
                        const s = CATEGORY_STYLES[featured.category] ?? CATEGORY_STYLES["Guide"]!;
                        return (
                          <span style={{
                            background: s.bg, color: s.text, border: `1px solid ${s.border}`,
                            borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                          }}>
                            {featured.category}
                          </span>
                        );
                      })()}
                      <span style={{ fontSize: 12, color: "#5858a0", display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock style={{ width: 11, height: 11 }} /> {featured.readTime}
                      </span>
                      <span style={{ fontSize: 12, color: "#5858a0" }}>{featured.date}</span>
                    </div>
                    <h2 style={{ fontSize: "clamp(1.2rem,2.5vw,1.6rem)", fontWeight: 800, color: "#f0f0fa", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: 12 }}>
                      {featured.title}
                    </h2>
                    <p style={{ fontSize: 15, color: "#7878a0", lineHeight: 1.65 }}>
                      {featured.excerpt}
                    </p>
                    <div style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6, color: featured.accent, fontWeight: 600, fontSize: 14 }}>
                      Read article <ArrowRight className="blog-card-arrow" style={{ width: 15, height: 15 }} />
                    </div>
                  </div>
                </div>
              </article>
            </Link>
          </div>

          {/* ── Post Grid ─────────────────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 24 }}>
            {rest.map((post, i) => {
              const catStyle = CATEGORY_STYLES[post.category] ?? CATEGORY_STYLES["Guide"]!;
              const Icon = post.icon;
              return (
                <div
                  key={post.slug}
                  className="blog-reveal"
                  style={{ animationDelay: `${0.1 * (i + 1)}s` }}
                >
                  <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", display: "block", height: "100%" }}>
                    <article
                      className="blog-card"
                      style={{
                        height: "100%",
                        background: "linear-gradient(135deg, #0d0d1a 0%, #111120 100%)",
                        border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 18,
                        padding: "28px 28px 24px",
                        boxShadow: "0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.03)",
                        display: "flex", flexDirection: "column", gap: 0,
                        position: "relative", overflow: "hidden",
                      }}
                    >
                      {/* top-right ambient glow */}
                      <div style={{
                        position: "absolute", top: -20, right: -20, width: 100, height: 100,
                        borderRadius: "50%", background: post.accentBg, filter: "blur(30px)", pointerEvents: "none",
                      }} />
                      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column" }}>
                        {/* Icon + category row */}
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: 11, flexShrink: 0,
                            background: post.accentBg, border: `1px solid ${post.accentBorder}`,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <Icon style={{ width: 18, height: 18, color: post.accent }} />
                          </div>
                          <span style={{
                            background: catStyle.bg, color: catStyle.text, border: `1px solid ${catStyle.border}`,
                            borderRadius: 99, padding: "3px 11px", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em",
                          }}>
                            {post.category}
                          </span>
                        </div>

                        <h2 style={{ fontSize: 16, fontWeight: 700, color: "#e8e8f8", lineHeight: 1.35, marginBottom: 10, letterSpacing: "-0.01em" }}>
                          {post.title}
                        </h2>
                        <p style={{ fontSize: 13.5, color: "#6868a0", lineHeight: 1.65, flex: 1 }}>
                          {post.excerpt}
                        </p>

                        {/* Footer */}
                        <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#5050a0" }}>
                            <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                              <Clock style={{ width: 11, height: 11 }} /> {post.readTime}
                            </span>
                            <span>{post.date}</span>
                          </div>
                          <ArrowRight className="blog-card-arrow" style={{ width: 15, height: 15, color: post.accent }} />
                        </div>
                      </div>
                    </article>
                  </Link>
                </div>
              );
            })}
          </div>

          {/* ── Newsletter CTA ────────────────────────────────────────── */}
          <div
            className="blog-reveal"
            style={{
              marginTop: 72,
              borderRadius: 24,
              padding: "52px 48px",
              textAlign: "center",
              background: "linear-gradient(135deg, #0f0f22 0%, #14142e 100%)",
              border: "1px solid rgba(129,140,248,0.2)",
              boxShadow: "0 8px 48px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
              position: "relative", overflow: "hidden",
            }}
          >
            <div style={{
              position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)",
              width: 300, height: 160, background: "rgba(129,140,248,0.08)", filter: "blur(60px)", pointerEvents: "none",
            }} />
            <div style={{ position: "relative" }}>
              <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#a5b4fc", marginBottom: 12, textTransform: "uppercase" }}>Newsletter</p>
              <h2 style={{ fontSize: "clamp(1.4rem,3vw,2rem)", fontWeight: 800, color: "#f0f0fa", marginBottom: 10, letterSpacing: "-0.02em" }}>
                Stay Ahead in Voice AI
              </h2>
              <p style={{ fontSize: 15, color: "#6868a0", marginBottom: 32, maxWidth: 440, margin: "0 auto 32px" }}>
                Get the latest guides, case studies, and product updates delivered to your inbox. No spam — unsubscribe any time.
              </p>
              <div style={{ display: "flex", gap: 10, maxWidth: 420, margin: "0 auto", flexWrap: "wrap", justifyContent: "center" }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  style={{
                    flex: 1, minWidth: 200, height: 46,
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, padding: "0 16px", fontSize: 14, color: "#e0e0f0",
                    outline: "none",
                  }}
                />
                <button
                  style={{
                    height: 46, padding: "0 24px", borderRadius: 10, fontSize: 14,
                    fontWeight: 700, background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    color: "#fff", border: "none", cursor: "pointer",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
                    display: "flex", alignItems: "center", gap: 6,
                  }}
                >
                  Subscribe <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
