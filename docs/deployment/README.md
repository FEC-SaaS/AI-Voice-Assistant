# Getting Started

Welcome to VoxForge AI. This guide walks you through setting up your account, connecting your tools, and making your first AI-powered call.

---

## 1. Create Your Account

1. Go to [your-domain.com](https://your-domain.com) and click **Get Started**
2. Sign up with your email or Google account
3. Create your **organization** — this is your workspace. Everything (agents, campaigns, calls) lives here
4. Invite teammates if needed from **Settings → Team**

---

## 2. Complete Onboarding

After signing up, you'll see the **Setup Guide** on your dashboard. It walks you through the 6 steps to get fully operational:

| Step | What you'll do |
|------|---------------|
| 1. Create an agent | Build your first AI voice agent |
| 2. Add a phone number | Get a number to call from |
| 3. Upload knowledge | Add documents your agent can reference |
| 4. Set up your calendar | Connect for appointment booking |
| 5. Import contacts | Add the people you want to reach |
| 6. Launch a campaign | Start your first outbound campaign |

You can complete steps in any order, but following the sequence above is the fastest path to your first call.

---

## 3. Create Your First Agent

An agent is the AI personality that handles your calls. To create one:

1. Go to **Dashboard → Agents → Create Agent**
2. Give your agent a **name** (e.g. "Sarah - Sales")
3. Choose a **voice** — preview voices before selecting
4. Write a **system prompt** — this defines the agent's personality and goals

**System prompt tips:**

- Be specific about the agent's role: *"You are a sales representative for Acme Corp..."*
- Define what to do in common scenarios: *"If the prospect asks about pricing, say..."*
- Set boundaries: *"Never discuss competitors. If asked, politely redirect."*
- Include your company name, key product benefits, and call objectives

5. Write the **first message** — exactly what the agent says when the call connects
6. Set **max call duration** — how long before the agent wraps up
7. Click **Save Agent**

---

## 4. Add a Phone Number

Your agent needs a phone number to make and receive calls.

1. Go to **Dashboard → Phone Numbers → Add Number**
2. Search by area code to find a number in your desired region
3. Click **Provision** to purchase and activate it
4. Assign the number to an agent

> **Tip:** Use a local area code matching your target market — local numbers significantly improve answer rates.

---

## 5. Build a Knowledge Base

Give your agent documents to reference during calls — product sheets, FAQs, pricing, objection handlers.

1. Go to **Dashboard → Knowledge**
2. Click **Upload Document**
3. Upload PDF, Word, or text files
4. Assign documents to specific agents

The agent will automatically reference relevant content when a caller asks a question covered in the docs.

---

## 6. Connect Your Calendar

Enable automatic appointment booking during calls.

1. Go to **Settings → Calendar**
2. Click **Connect Google Calendar**
3. Authorize access
4. Set your **availability windows** — when the agent can book appointments
5. Set **buffer time** between appointments

Once connected, your agent can check availability and book appointments in real time during calls.

---

## 7. Import Contacts

Add the people you want to reach.

1. Go to **Dashboard → Contacts**
2. Click **Import** and upload a CSV file

Your CSV should have columns for: `firstName`, `lastName`, `phone`, `email` (optional), and any custom fields.

Or add contacts one at a time with **Add Contact**.

---

## 8. Launch Your First Campaign

A campaign dials your contact list automatically.

1. Go to **Dashboard → Campaigns → New Campaign**
2. Select the **agent** to use
3. Select the **phone number** to call from
4. Add contacts — select from your contact list or upload a new list
5. Set your **call window** — days and hours when calls are allowed (e.g. Mon–Fri, 9am–5pm)
6. Set **max concurrent calls** — how many calls to run at the same time (start with 2–3)
7. Choose **start time** — schedule for later or start immediately
8. Click **Launch Campaign**

Watch progress in real time from **Dashboard → Campaigns**.

---

## 9. Set Up the AI Receptionist (Inbound)

Handle inbound calls automatically when your team is busy.

1. Go to **Dashboard → Receptionist**
2. Set your **business hours** — calls outside these hours go to after-hours mode
3. Add **departments** — e.g. Sales, Support, Billing
4. Add **staff members** with their direct numbers for transfers
5. Customize the **greeting message**
6. Enable **message taking** and **appointment booking**

The receptionist answers calls to your VoxForge number, greets callers, routes to the right person, takes messages, and notifies you via email or SMS.

---

## 10. Enable Missed Call Text-Back

Never lose a lead from a missed call.

1. Go to **Dashboard → Missed Calls**
2. Toggle **Auto Text-Back** on
3. Customize your SMS message
4. Optionally enable **Auto Callback** — schedule an automatic return call
5. Set the **delay** (e.g. respond within 2 minutes)

When someone calls your number and no one answers, VoxForge automatically sends them an SMS and optionally schedules a callback.

---

## 11. Connect Your CRM & Tools

Sync call data with your existing tools.

1. Go to **Dashboard → Integrations**
2. Find the integration you want to connect
3. Click **Connect** — most integrations use one-click OAuth
4. For automation tools (Make, Zapier), paste your webhook URL

See the [Integrations Guide](../integrations/README.md) for full setup instructions for each integration.

---

## Reviewing Results

After calls run, review results in:

| Section | What you'll find |
|---------|-----------------|
| **Calls** | Full call history, transcripts, recordings |
| **Analytics** | Performance charts, sentiment trends, ROI |
| **Intelligence** | Objections surfaced, competitor mentions, coaching |
| **Leads** | AI-scored leads with next-best-action recommendations |
| **Live** | Real-time view of calls in progress |

---

## Tips for Better Results

**Write a great system prompt**
The system prompt is the most important setting. Spend time refining it. Test different approaches and review transcripts to see where the agent can improve.

**Start slow**
Begin with 1–2 concurrent calls per campaign. Review transcripts and tune the agent before scaling up.

**Use local numbers**
Calls from local area codes get answered at significantly higher rates than toll-free or out-of-state numbers.

**Set realistic call windows**
Respect business hours. B2B calls typically perform best Tuesday–Thursday, 10am–4pm local time.

**Review intelligence weekly**
The Conversation Intelligence dashboard surfaces patterns across all your calls — check it regularly to spot objections and coaching opportunities.

**Add knowledge docs**
Agents perform much better when they have product information, FAQs, and objection responses to reference.

---

## Getting Help

- **In-app docs** — click the docs link in any section header for feature-specific help
- **Settings** — manage your account, billing, API keys, and integrations
- **Support** — use the chat widget or email support from your account menu
