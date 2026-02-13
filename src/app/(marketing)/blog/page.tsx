import type { Metadata } from "next";
import { Clock, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog | CallTone",
  description: "Insights, guides, and best practices for voice agents and business communication.",
};

const BLOG_POSTS = [
  {
    title: "The Complete Guide to Voice Agents in 2026",
    excerpt:
      "Voice agents are reshaping business communications across every industry. From handling inbound support calls to running outbound sales campaigns, they operate around the clock without breaks, sick days, or scheduling conflicts. This guide covers how voice agents work, what makes them effective, and how businesses of every size are using them to save time and close more deals.",
    category: "Guide",
    readTime: "8 min read",
    date: "Feb 10, 2026",
  },
  {
    title: "TCPA Compliance for Automated Calling: What You Need to Know",
    excerpt:
      "The Telephone Consumer Protection Act sets strict rules for automated and prerecorded calls. Violations can cost up to $1,500 per call. This guide breaks down DNC list requirements, prior express consent rules, calling hour restrictions (8am-9pm local time), and how CallTone's built-in compliance tools help you stay on the right side of the law.",
    category: "Compliance",
    readTime: "6 min read",
    date: "Feb 5, 2026",
  },
  {
    title: "How Cold Calling Automation Increased Our Client's Pipeline by 340%",
    excerpt:
      "A regional insurance agency was spending 30 hours a week on manual cold calls and booking just 4 meetings. After deploying a CallTone voice agent with a tailored script and automated follow-ups, they booked 18 meetings in the first week alone. Here's exactly how they set it up and what you can learn from their approach.",
    category: "Case Study",
    readTime: "5 min read",
    date: "Jan 28, 2026",
  },
  {
    title: "Measuring ROI on Voice Agents: A Framework for Business Leaders",
    excerpt:
      "How much is a missed call really costing you? The average small business misses 62% of inbound calls, and each missed call represents $200-$1,000 in lost revenue. This article walks through a practical ROI framework: calculate your cost-per-call, compare agent vs. human staffing costs, and track the metrics that matter — answer rate, booking rate, and revenue per call.",
    category: "Business",
    readTime: "7 min read",
    date: "Jan 20, 2026",
  },
  {
    title: "Sentiment Analysis in Voice Calls: Beyond Simple Keywords",
    excerpt:
      "Modern voice analytics go far beyond keyword spotting. CallTone's conversation intelligence analyzes tone, pacing, interruptions, and context to determine caller sentiment in real time. Learn how sentiment scoring works, what the data reveals about your customer interactions, and how to use these insights to coach your team and improve call scripts.",
    category: "Technology",
    readTime: "10 min read",
    date: "Jan 12, 2026",
  },
  {
    title: "Building Effective Voice Agent Scripts: Tips from Top-Performing Campaigns",
    excerpt:
      "The difference between a 5% and a 25% conversion rate often comes down to the script. After analyzing thousands of outbound campaigns on CallTone, we identified the patterns that work: lead with value in the first 10 seconds, handle the top 5 objections naturally, and always offer a clear next step. Here are the specific techniques and example prompts you can use today.",
    category: "Best Practices",
    readTime: "6 min read",
    date: "Jan 5, 2026",
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
            Insights, guides, and best practices for voice technology and business automation.
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
              Get the latest insights on voice technology and automation delivered to your inbox.
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
