import { NextRequest, NextResponse } from "next/server";
import { openai } from "@/lib/openai";
import type OpenAI from "openai";

export type PendingAction = {
  type: "create_agent";
  data: {
    name: string;
    systemPrompt: string;
    firstMessage?: string;
  };
};

const SYSTEM_PROMPT = `You are CalTone Assistant, a helpful AI embedded inside the CalTone dashboard — an AI-powered call center platform for outbound and inbound calling.

## WHAT YOU CAN DO
1. Answer questions about CalTone features and workflows
2. Navigate the user to any dashboard page
3. Create a new AI agent on behalf of the user (with their confirmation)
4. For campaign creation — navigate to /dashboard/campaigns/new (too many fields that need UI pickers like agent selection)

## PAGES & WHAT THEY DO

| Path | Purpose |
|------|---------|
| /dashboard | Home overview — stats, recent activity |
| /dashboard/agents | List all AI voice agents |
| /dashboard/agents/new | Create a new AI agent manually |
| /dashboard/campaigns | List calling campaigns |
| /dashboard/campaigns/new | Create a campaign — pick agent, set schedule |
| /dashboard/contacts | Import and manage contacts (CSV/Excel/PDF/DOCX) |
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
| /dashboard/receptionist | Configure inbound AI receptionist |
| /dashboard/compliance | Do-Not-Call list management |
| /dashboard/integrations | Connect CRMs, webhooks, third-party tools |
| /dashboard/phone-numbers | Buy and manage phone numbers |
| /dashboard/settings | Account, billing, API keys |
| /dashboard/onboarding | Setup wizard for first-time config |

## COMMON WORKFLOWS

**First campaign setup:** Create agent → Get phone number → Import contacts → Create campaign → Launch

**Import contacts:** Contacts page → "Import Contacts" → upload CSV/Excel/PDF → AI extracts automatically

**Monitor calls:** Live page for real-time; Calls page for full history

## TOOL USAGE RULES

- Use **navigate_to** when: user says "take me to", "open", "go to", "show me", or wants to create a campaign
- Use **create_agent** when: user explicitly asks to CREATE an agent. Generate a professional systemPrompt (minimum 80 words) based on their description. Make it specific, not generic.
- For campaign creation: always use navigate_to /dashboard/campaigns/new — never create_agent for campaigns
- Never call a tool to navigate to the page the user is already on
- Always respond with helpful text alongside or instead of a tool call`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "navigate_to",
      description:
        "Navigate the user to a specific dashboard page. Use for navigation requests and campaign creation.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The dashboard path",
            enum: [
              "/dashboard",
              "/dashboard/agents",
              "/dashboard/agents/new",
              "/dashboard/campaigns",
              "/dashboard/campaigns/new",
              "/dashboard/contacts",
              "/dashboard/calls",
              "/dashboard/live",
              "/dashboard/analytics",
              "/dashboard/intelligence",
              "/dashboard/knowledge",
              "/dashboard/knowledge/new",
              "/dashboard/interviews",
              "/dashboard/interviews/new",
              "/dashboard/appointments",
              "/dashboard/leads",
              "/dashboard/receptionist",
              "/dashboard/compliance",
              "/dashboard/integrations",
              "/dashboard/phone-numbers",
              "/dashboard/settings",
              "/dashboard/onboarding",
            ],
          },
          label: {
            type: "string",
            description: "Human-readable page name",
          },
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
        "Create a new AI voice agent for the user. Only use when the user explicitly asks to create an agent. Generate a detailed, professional systemPrompt based on their description.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "A clear, descriptive agent name",
          },
          systemPrompt: {
            type: "string",
            description:
              "Detailed instructions for the agent — what it should say, its tone, goals, how to handle objections, and when to close. Minimum 80 words.",
          },
          firstMessage: {
            type: "string",
            description:
              "The opening line the agent says when a call connects. Should be natural and match the agent's purpose.",
          },
        },
        required: ["name", "systemPrompt"],
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
      // narrow to standard function tool call (not custom tool call)
      if (toolCall.type !== "function") {
        return NextResponse.json({ reply: "I'm not sure how to help with that. Could you rephrase?" });
      }
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
      } catch {
        args = {};
      }

      if (toolCall.function.name === "navigate_to") {
        navigate = {
          path: args.path as string,
          label: args.label as string,
        };
        if (!reply) reply = `Taking you to ${navigate.label}…`;
      } else if (toolCall.function.name === "create_agent") {
        pendingAction = {
          type: "create_agent",
          data: {
            name: args.name as string,
            systemPrompt: args.systemPrompt as string,
            firstMessage: args.firstMessage as string | undefined,
          },
        };
        if (!reply)
          reply =
            "Here's the agent I've drafted based on your description. Review the details and edit anything before confirming:";
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
