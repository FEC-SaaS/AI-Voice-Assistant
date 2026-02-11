import type { Metadata } from "next";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog | CallTone",
  description: "Insights, guides, and best practices for AI voice agents and business communication.",
};

const BLOG_POSTS = [
  {
    title: "The Complete Guide to AI Voice Agents in 2025",
    excerpt:
      "Learn how AI voice agents are transforming business communications, from cold calling to customer support, and how to get started with your first agent.",
    category: "Guide",
    readTime: "8 min read",
    date: "Jan 15, 2025",
  },
  {
    title: "TCPA Compliance for Automated Calling: What You Need to Know",
    excerpt:
      "Stay compliant with telemarketing regulations. This guide covers DNC lists, consent requirements, calling hour restrictions, and best practices for AI-powered outreach.",
    category: "Compliance",
    readTime: "6 min read",
    date: "Jan 8, 2025",
  },
  {
    title: "How Cold Calling Automation Increased Our Client's Pipeline by 340%",
    excerpt:
      "A case study on how one SaaS company used CallTone to automate their outbound calling and dramatically increase their sales pipeline within 90 days.",
    category: "Case Study",
    readTime: "5 min read",
    date: "Dec 20, 2024",
  },
  {
    title: "Measuring ROI on AI Voice Agents: A Framework for Business Leaders",
    excerpt:
      "How to calculate the return on investment for AI voice technology. Includes cost comparisons, KPI tracking, and a downloadable ROI calculator.",
    category: "Business",
    readTime: "7 min read",
    date: "Dec 12, 2024",
  },
  {
    title: "Sentiment Analysis in Voice Calls: Beyond Simple Keywords",
    excerpt:
      "How modern NLP models analyze tone, context, and emotion in real-time conversations to provide actionable insights for sales and support teams.",
    category: "Technology",
    readTime: "10 min read",
    date: "Nov 28, 2024",
  },
  {
    title: "Building Effective AI Agent Scripts: Tips from Top-Performing Campaigns",
    excerpt:
      "Best practices for crafting conversation flows that sound natural, handle objections gracefully, and drive higher conversion rates in automated campaigns.",
    category: "Best Practices",
    readTime: "6 min read",
    date: "Nov 15, 2024",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Guide: "bg-blue-500/10 text-blue-400",
  Compliance: "bg-purple-500/10 text-purple-400",
  "Case Study": "bg-green-500/10 text-green-400",
  Business: "bg-orange-500/10 text-orange-400",
  Technology: "bg-indigo-500/10 text-indigo-400",
  "Best Practices": "bg-teal-500/10 text-teal-400",
};

export default function BlogPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-b from-secondary to-background py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Blog & Resources
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Insights, guides, and best practices for AI voice technology and business automation.
          </p>
        </div>
      </section>

      {/* Blog Grid */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-3">
            {BLOG_POSTS.map((post) => (
              <article
                key={post.title}
                className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Image placeholder */}
                <div className="aspect-[16/9] bg-gradient-to-br from-secondary to-secondary/50" />

                <div className="flex flex-1 flex-col p-6">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        CATEGORY_COLORS[post.category] || "bg-secondary text-foreground/80"
                      }`}
                    >
                      {post.category}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Coming Soon
                    </Badge>
                  </div>

                  <h2 className="mt-3 text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>

                  <p className="mt-2 flex-1 text-sm text-muted-foreground line-clamp-3">
                    {post.excerpt}
                  </p>

                  <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{post.date}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Newsletter CTA */}
          <div className="mx-auto mt-16 max-w-2xl rounded-2xl bg-gray-900 p-8 text-center text-white md:p-12">
            <h2 className="text-2xl font-bold">Stay Updated</h2>
            <p className="mt-3 text-gray-400">
              Get the latest insights on AI voice technology and automation delivered to your inbox.
            </p>
            <div className="mt-6 flex gap-3 sm:mx-auto sm:max-w-md">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-lg border-0 bg-card/10 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/30"
              />
              <button className="inline-flex items-center gap-1 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-gray-900 hover:bg-gray-100 transition-colors">
                Subscribe
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              No spam. Unsubscribe anytime.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
