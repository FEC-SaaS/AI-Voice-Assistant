import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import type OpenAI from "openai";

export type PendingAction =
  | {
      type: "create_agent";
      data: { name: string; systemPrompt: string; firstMessage?: string };
    }
  | {
      type: "create_campaign";
      data: {
        name: string;
        campaignType: "cold_calling" | "interview";
        description?: string;
        jobTitle?: string;
        jobDescription?: string;
      };
    }
  | {
      type: "create_contact";
      data: { firstName?: string; lastName?: string; phoneNumber?: string };
    };

const SYSTEM_PROMPT = `You are CalTone Assistant, a helpful AI embedded inside the CalTone dashboard — an AI-powered call center platform.

## WHAT YOU CAN DO
1. Answer questions about CalTone features and workflows
2. Navigate the user to any dashboard page
3. Create an AI agent (with user confirmation)
4. Create a campaign — call campaign OR interview campaign (with user confirmation)
5. Create a contact (with user confirmation)
6. For appointments, departments, staff → navigate to the relevant page

## CAMPAIGN TYPES — IMPORTANT
There are TWO distinct campaign types:

**Cold Calling Campaign (type: "cold_calling")**
- Used for sales outreach, lead follow-up, customer check-ins, any general calling
- An AI agent calls a list of contacts automatically
- Example requests: "create a sales campaign", "outbound calling campaign", "follow-up campaign"

**Interview Campaign (type: "interview")**
- Used to conduct AI-powered phone interviews with job candidates
- Requires jobTitle and jobDescription to evaluate candidates properly
- Example requests: "create an interview campaign", "schedule candidate interviews", "hiring campaign"

Always pick the right type based on context. If unclear, ask the user.

## PAGES & WHAT THEY DO

| Path | Purpose |
|------|---------|
| /dashboard | Home overview — stats, recent activity |
| /dashboard/agents | List all AI voice agents |
| /dashboard/agents/new | Create a new AI agent manually |
| /dashboard/campaigns | List calling campaigns |
| /dashboard/campaigns/new | Create a campaign manually |
| /dashboard/contacts | Import and manage contacts |
| /dashboard/calls | Full call history — recordings, transcripts, sentiment |
| /dashboard/live | Real-time monitoring of active calls |
| /dashboard/analytics | Charts — call volume, success rates, sentiment |
| /dashboard/intelligence | AI pattern analysis — objections, topics, signals |
| /dashboard/knowledge | Knowledge base articles agents reference on calls |
| /dashboard/knowledge/new | Create a knowledge base article |
| /dashboard/interviews | AI interview management |
| /dashboard/interviews/new | Create a new interview configuration |
| /dashboard/appointments | Appointments booked by agents during calls |
| /dashboard/leads | Lead pipeline — hot/warm/cold scoring |
| /dashboard/receptionist | Configure inbound AI receptionist, manage departments and staff |
| /dashboard/compliance | Do-Not-Call list management |
| /dashboard/integrations | Connect CRMs, webhooks, third-party tools |
| /dashboard/phone-numbers | Buy and manage phone numbers |
| /dashboard/settings | Account, billing, API keys |
| /dashboard/onboarding | Setup wizard for first-time config |

## TOOL USAGE RULES
- **navigate_to**: navigation requests, and for appointments/departments/staff creation
- **create_agent**: user explicitly asks to CREATE an agent — generate a detailed systemPrompt
- **create_campaign**: user asks to create a campaign of either type — extract name and type
- **create_contact**: user asks to add/create a single contact — extract name and phone
- Never navigate to the page the user is already on`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description: "Navigate the user to a specific dashboard page.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            enum: [
              "/dashboard", "/dashboard/agents", "/dashboard/agents/new",
              "/dashboard/campaigns", "/dashboard/campaigns/new",
              "/dashboard/contacts", "/dashboard/calls", "/dashboard/live",
              "/dashboard/analytics", "/dashboard/intelligence",
              "/dashboard/knowledge", "/dashboard/knowledge/new",
              "/dashboard/interviews", "/dashboard/interviews/new",
              "/dashboard/appointments", "/dashboard/leads",
              "/dashboard/receptionist", "/dashboard/compliance",
              "/dashboard/integrations", "/dashboard/phone-numbers",
              "/dashboard/settings", "/dashboard/onboarding",
            ],
          },
          label: { type: "string" },
        },
        required: ["path", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_agent",
      description:
        "Create a new AI voice agent. Only when user explicitly asks. Generate a detailed, professional systemPrompt (80+ words) based on their description.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          systemPrompt: { type: "string", description: "Detailed agent instructions (80+ words)" },
          firstMessage: { type: "string", description: "Opening line when call connects" },
        },
        required: ["name", "systemPrompt"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_campaign",
      description:
        "Create a calling campaign. Use campaignType='cold_calling' for sales/outreach, 'interview' for hiring/candidate interviews. The user will select the agent from a dropdown.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string", description: "Campaign name" },
          campaignType: {
            type: "string",
            enum: ["cold_calling", "interview"],
            description: "Type of campaign",
          },
          description: { type: "string", description: "Brief description (optional)" },
          jobTitle: { type: "string", description: "Job title — only for interview campaigns" },
          jobDescription: { type: "string", description: "Job description — only for interview campaigns" },
        },
        required: ["name", "campaignType"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_contact",
      description: "Create a single contact. Extract name and phone number from the user's message.",
      parameters: {
        type: "object",
        properties: {
          firstName: { type: "string" },
          lastName: { type: "string" },
          phoneNumber: { type: "string", description: "Phone number in any format" },
        },
        required: [],
      },
    },
  },
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      currentPath: string;
    };

    const { messages, currentPath } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ reply: "No messages provided." });
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `${SYSTEM_PROMPT}\n\nUser's current page: ${currentPath}`,
        },
        ...messages.slice(-12),
      ],
      tools: TOOLS,
      tool_choice: "auto",
      max_tokens: 800,
      temperature: 0.4,
    });

    const message = completion.choices[0]?.message;
    let reply = message?.content ?? "";
    let navigate: { path: string; label: string } | undefined;
    let pendingAction: PendingAction | undefined;

    if (message?.tool_calls?.length) {
      const toolCall = message.tool_calls[0]!;
      if (toolCall.type !== "function") {
        return NextResponse.json({ reply: "I'm not sure how to help with that. Could you rephrase?" });
      }

      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }

      switch (toolCall.function.name) {
        case "navigate_to":
          navigate = { path: args.path as string, label: args.label as string };
          if (!reply) reply = `Taking you to ${navigate.label}…`;
          break;

        case "create_agent":
          pendingAction = {
            type: "create_agent",
            data: {
              name: args.name as string,
              systemPrompt: args.systemPrompt as string,
              firstMessage: args.firstMessage as string | undefined,
            },
          };
          if (!reply)
            reply = "Here's the agent I've drafted. Review and edit anything before confirming:";
          break;

        case "create_campaign":
          pendingAction = {
            type: "create_campaign",
            data: {
              name: args.name as string,
              campaignType: args.campaignType as "cold_calling" | "interview",
              description: args.description as string | undefined,
              jobTitle: args.jobTitle as string | undefined,
              jobDescription: args.jobDescription as string | undefined,
            },
          };
          if (!reply)
            reply =
              args.campaignType === "interview"
                ? "Here's your interview campaign. Select an agent and confirm:"
                : "Here's your call campaign. Select an agent and confirm:";
          break;

        case "create_contact":
          pendingAction = {
            type: "create_contact",
            data: {
              firstName: args.firstName as string | undefined,
              lastName: args.lastName as string | undefined,
              phoneNumber: args.phoneNumber as string | undefined,
            },
          };
          if (!reply) reply = "Fill in the contact details and confirm:";
          break;
      }
    }

    if (!reply) reply = "I'm not sure how to help with that. Could you rephrase?";

    return NextResponse.json({ reply, navigate, pendingAction });
  } catch (err) {
    console.error("[assistant]", err);
    return NextResponse.json({
      reply: "I'm having trouble right now. Please try again in a moment.",
    });
  }
}
