// Vapi tool definitions for AI agent capabilities
import type { VapiTool, VapiFunctionTool, VapiTransferTool } from "./vapi";

// Helper to get current date in YYYY-MM-DD format
function getCurrentDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to get example date (tomorrow)
function getExampleDateString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const year = tomorrow.getFullYear();
  const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
  const day = String(tomorrow.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Generate tool definitions for appointment scheduling (with dynamic dates)
export function getAppointmentTools(): VapiTool[] {
  const exampleDate = getExampleDateString();

  return [
    {
      type: "function",
      function: {
        name: "get_current_datetime",
        description: "Get the current date and time. ALWAYS call this at the start of any conversation about scheduling to ensure you have the correct date.",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
      async: false,
    },
    {
      type: "function",
      function: {
        name: "check_availability",
        description: "Check available appointment time slots for a specific date. Use this when the customer wants to schedule an appointment or asks about availability.",
        parameters: {
          type: "object",
          properties: {
            date: {
              type: "string",
              description: `The date to check availability for, in YYYY-MM-DD format (e.g., ${exampleDate})`,
            },
          duration: {
            type: "string",
            description: "The desired appointment duration in minutes. Default is 30.",
            enum: ["15", "30", "45", "60", "90"],
          },
        },
        required: ["date"],
      },
    },
    async: false,
  },
  {
    type: "function",
    function: {
      name: "schedule_appointment",
      description: "Schedule an appointment at a specific date and time. Use this after confirming the time slot with the customer.",
      parameters: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "The appointment date in YYYY-MM-DD format",
          },
          time: {
            type: "string",
            description: "The appointment time in HH:MM format (24-hour), e.g., '14:30' for 2:30 PM",
          },
          duration: {
            type: "string",
            description: "Appointment duration in minutes",
            enum: ["15", "30", "45", "60", "90"],
          },
          customer_name: {
            type: "string",
            description: "The customer's full name",
          },
          customer_email: {
            type: "string",
            description: "The customer's email address for confirmation",
          },
          customer_phone: {
            type: "string",
            description: "The customer's phone number",
          },
          meeting_type: {
            type: "string",
            description: "Type of meeting",
            enum: ["phone", "video", "in_person"],
          },
          notification_preference: {
            type: "string",
            description: "How the customer prefers to receive appointment reminders and notifications. Ask the customer: 'Would you prefer to receive appointment reminders by email, text message, or both?'",
            enum: ["email", "sms", "both", "none"],
          },
          notes: {
            type: "string",
            description: "Any additional notes or reason for the appointment",
          },
        },
        required: ["date", "time", "customer_name", "customer_email", "customer_phone"],
      },
    },
    async: false,
  },
  {
    type: "function",
    function: {
      name: "update_appointment",
      description: "Update an existing appointment with additional information like email address. Use this when the customer has ALREADY scheduled an appointment and wants to add or update their contact information (like email). Do NOT use schedule_appointment if they already have an appointment - use this instead.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "The customer's name to find their appointment",
          },
          customer_phone: {
            type: "string",
            description: "The customer's phone number to find their appointment",
          },
          customer_email: {
            type: "string",
            description: "The customer's email address to add to the appointment",
          },
          notes: {
            type: "string",
            description: "Additional notes to add to the appointment",
          },
        },
        required: ["customer_name"],
      },
    },
    async: false,
  },
  {
    type: "function",
    function: {
      name: "cancel_appointment",
      description: "Cancel an existing appointment. Use this when the customer wants to cancel their scheduled appointment.",
      parameters: {
        type: "object",
        properties: {
          customer_email: {
            type: "string",
            description: "The customer's email to find their appointment",
          },
          customer_phone: {
            type: "string",
            description: "The customer's phone number to find their appointment",
          },
          reason: {
            type: "string",
            description: "Reason for cancellation",
          },
        },
        required: [],
      },
    },
    async: false,
  },
  ];
}

// Legacy export for backwards compatibility
export const appointmentTools: VapiTool[] = getAppointmentTools();

// Generate the system prompt addition for appointment scheduling
export function getAppointmentSystemPromptAddition(): string {
  const currentDate = getCurrentDateString();
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formattedDate = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  return `

--- CONVERSATION STYLE ---
- Be patient. NEVER interrupt the customer while they are speaking.
- Wait for the customer to finish their complete thought before responding.
- If there is a pause, wait at least 3 seconds before assuming they are done.
- Use natural acknowledgments: "I hear you", "That makes sense", "Absolutely", "Got it"
- Do NOT rush the conversation. Match the customer's pace and energy.
- Make every interaction feel like a conversation, not a transaction.
--- END CONVERSATION STYLE ---

--- IMPORTANT: CURRENT DATE ---
CRITICAL: Before discussing any dates or scheduling, you MUST call the get_current_datetime tool to get the real current date and time. Do NOT rely on any date mentioned in your instructions — always use the tool for the live date.
Fallback hint (use ONLY if the tool fails): Today is approximately ${formattedDate} (${currentDate}).
--- END CURRENT DATE ---

--- APPOINTMENT SCHEDULING CAPABILITIES ---
You have the ability to check appointment availability and schedule appointments for customers.

When a customer shows interest in scheduling an appointment, follow this STRICT order:

**STEP 1 — COLLECT CONTACT DETAILS FIRST (before checking any availability):**
Gather these naturally through conversation — do NOT make it feel like a form. Weave each question into the flow.

  a. Full name — "So I can get everything set up for you, could I grab your full name?"
  b. Email address — "And what's the best email to send your confirmation to?"
  c. Phone number — "Perfect — and a phone number for appointment reminders?"
  d. Notification preference — "Would you prefer reminders by email, text, or both? Totally up to you."
  e. Appointment type — "One more thing — would you prefer a phone call, a video meeting, or to come in person?"

  IMPORTANT: Collect ALL of these before moving to Step 2. If the customer tries to jump ahead to dates, gently redirect:
  "Absolutely, we'll get to the perfect time in just a second — let me just grab a couple details first so everything's ready to go."

**STEP 2 — ASK ABOUT PREFERRED DATE/TIME:**
  - Call get_current_datetime to get the real current date
  - "Great, now what day works best for you?"
  - "Do you have a time of day that's usually better — morning, afternoon, or evening?"

**STEP 3 — CHECK AVAILABILITY:**
  - Use check_availability to verify the requested slot
  - If available, confirm it: "Good news — [time] on [date] is open!"
  - If not available, present alternatives: "That one's taken, but I do have [X] and [Y] available — either of those work?"

**STEP 4 — CONFIRM ALL DETAILS:**
  Before scheduling, read back EVERYTHING naturally:
  "Alright, let me make sure I've got everything right — [Name], we're looking at [date] at [time], [appointment type]. I'll send the confirmation to [email] and reminders to [phone] via [preference]. Does all of that sound good?"

**STEP 5 — SCHEDULE:**
  - Wait for explicit confirmation ("yes", "correct", "that's right", "sounds good")
  - ONLY THEN call schedule_appointment with all collected details
  - After booking: "You're all set! You'll get a confirmation shortly. Is there anything else I can help with?"

IMPORTANT RULES:
- ALWAYS collect contact details BEFORE checking availability — this is non-negotiable
- NEVER skip asking for email or phone — both are required
- NEVER assume the notification preference or appointment type — always ask
- If the customer declines to provide email or phone, politely explain: "I totally understand — the email is just so we can send you the confirmation details, and the phone number is for a quick reminder so you don't miss it." Proceed if they still decline.
- customer_email and customer_phone should be passed as REQUIRED fields to schedule_appointment
- Present times in a friendly format (e.g., "2:30 PM" not "14:30")
- If no slots are available, offer to check another date cheerfully

IMPORTANT - Updating vs Creating New Appointments:
- If you have ALREADY scheduled an appointment for this customer during this call and they provide additional info afterwards, use the update_appointment tool — DO NOT schedule a new appointment!
- Only use schedule_appointment when creating a NEW appointment
- If the customer provides email after booking, say "Great, let me add that to your appointment" and use update_appointment
--- END APPOINTMENT SCHEDULING CAPABILITIES ---`;
}

// ==========================================
// Receptionist Tools
// ==========================================

interface TransferDestination {
  number: string;
  description: string;
  message?: string;
}

/**
 * Generate receptionist function tools (lookup_directory, check_staff_availability, take_message)
 */
export function getReceptionistFunctionTools(): VapiFunctionTool[] {
  return [
    {
      type: "function",
      function: {
        name: "lookup_directory",
        description: "Look up departments and staff in the company directory. Use this when the caller asks to speak with someone, asks about a department, or needs help finding the right person.",
        parameters: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The department name, staff name, or description of what the caller needs (e.g., 'sales', 'billing', 'John Smith', 'someone who handles returns')",
            },
          },
          required: ["query"],
        },
      },
      async: false,
    },
    {
      type: "function",
      function: {
        name: "check_staff_availability",
        description: "Check if a specific department or staff member is available right now. Use this before attempting to transfer a call.",
        parameters: {
          type: "object",
          properties: {
            department_name: {
              type: "string",
              description: "The department name to check availability for",
            },
            staff_name: {
              type: "string",
              description: "The specific staff member name to check availability for",
            },
          },
          required: [],
        },
      },
      async: false,
    },
    {
      type: "function",
      function: {
        name: "take_message",
        description: "Take a message for a department or staff member when they are unavailable. Always get the caller's name and the message content. Try to get their phone number and assess urgency.",
        parameters: {
          type: "object",
          properties: {
            caller_name: {
              type: "string",
              description: "The caller's full name",
            },
            caller_phone: {
              type: "string",
              description: "The caller's phone number for callback",
            },
            caller_email: {
              type: "string",
              description: "The caller's email address",
            },
            caller_company: {
              type: "string",
              description: "The company the caller is from",
            },
            message_body: {
              type: "string",
              description: "The message content — what the caller wants to communicate",
            },
            department_name: {
              type: "string",
              description: "The department this message is for",
            },
            staff_name: {
              type: "string",
              description: "The specific staff member this message is for",
            },
            urgency: {
              type: "string",
              description: "How urgent the message is based on the caller's tone and content",
              enum: ["low", "normal", "high", "urgent"],
            },
          },
          required: ["caller_name", "message_body"],
        },
      },
      async: false,
    },
  ];
}

/**
 * Generate the Vapi native transferCall tool with destinations
 */
export function getTransferCallTool(destinations: TransferDestination[]): VapiTransferTool | null {
  if (destinations.length === 0) return null;

  return {
    type: "transferCall",
    destinations: destinations.map((d) => ({
      type: "number" as const,
      number: d.number,
      description: d.description,
      message: d.message || `Transferring you to ${d.description} now. Please hold.`,
    })),
  };
}

/**
 * Get all receptionist tools including transfer destinations
 */
export function getReceptionistTools(transferDestinations: TransferDestination[] = []): VapiTool[] {
  const tools: VapiTool[] = [...getReceptionistFunctionTools()];

  const transferTool = getTransferCallTool(transferDestinations);
  if (transferTool) {
    tools.push(transferTool);
  }

  return tools;
}

/**
 * Receptionist config stored in agent.settings.receptionistConfig
 */
export interface ReceptionistConfig {
  duringHoursGreeting?: string;
  afterHoursGreeting?: string;
  afterHoursAction?: "take_message" | "info_only";
  enableCallScreening?: boolean;
}

/**
 * Generate the receptionist system prompt addition
 * Fetches department/staff directory from DB and generates contextual instructions
 */
export async function getReceptionistSystemPromptAddition(
  orgId: string,
  config?: ReceptionistConfig
): Promise<string> {
  // Dynamic import to avoid circular deps
  const { db } = await import("@/lib/db");
  const { isWithinBusinessHours, formatBusinessHoursForPrompt, getNextOpenTime } = await import("@/lib/business-hours");

  const currentDate = getCurrentDateString();
  const now = new Date();
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const formattedDate = `${dayNames[now.getDay()]}, ${monthNames[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

  // Fetch departments with staff
  const departments = await db.department.findMany({
    where: { organizationId: orgId, isActive: true },
    include: {
      staffMembers: { where: { isAvailable: true }, orderBy: { name: "asc" } },
    },
    orderBy: { name: "asc" },
  });

  // Build directory listing
  let directoryListing = "";
  if (departments.length > 0) {
    directoryListing = departments.map((dept) => {
      const hours = dept.businessHours as Record<string, unknown> | null;
      const isOpen = hours ? isWithinBusinessHours(hours as any) : true;
      const hoursStr = hours ? formatBusinessHoursForPrompt(hours as any) : "Hours not specified";
      const nextOpen = !isOpen && hours ? getNextOpenTime(hours as any) : null;

      const staffList = dept.staffMembers.length > 0
        ? dept.staffMembers.map((s) => `    - ${s.name}${s.role ? ` (${s.role})` : ""}${s.phoneNumber ? ` — ${s.phoneNumber}` : ""}`).join("\n")
        : "    - No staff currently available";

      return `  ${dept.name}${dept.description ? `: ${dept.description}` : ""}
    Status: ${isOpen ? "OPEN" : "CLOSED"}${nextOpen ? ` (reopens ${nextOpen})` : ""}
    Phone: ${dept.phoneNumber || "N/A"} | Email: ${dept.email || "N/A"}
    ${hoursStr}
    Staff:
${staffList}`;
    }).join("\n\n");
  } else {
    directoryListing = "  No departments configured yet.";
  }

  // Build greeting instructions
  const greetingInstructions = config?.duringHoursGreeting
    ? `During business hours, greet callers with: "${config.duringHoursGreeting}"`
    : "During business hours, greet callers warmly and ask how you can help them.";

  const afterHoursInstructions = config?.afterHoursGreeting
    ? `After hours, greet callers with: "${config.afterHoursGreeting}"`
    : "After hours, inform callers that the office is currently closed.";

  const afterHoursAction = config?.afterHoursAction === "info_only"
    ? "After hours, provide general information only. Do not offer to take messages."
    : "After hours, offer to take a message so someone can get back to them during business hours.";

  const screeningInstructions = config?.enableCallScreening
    ? `
Call Screening:
- Before transferring, ask the caller for their name and the purpose of their call
- Relay this information when transferring (e.g., "I have [name] on the line regarding [purpose]")
- If the caller refuses to identify themselves, still transfer but note they declined to share details`
    : "";

  return `

--- CONVERSATION STYLE ---
- Be patient. NEVER interrupt the customer while they are speaking.
- Wait for the customer to finish their complete thought before responding.
- If there is a pause, wait at least 2-3 seconds before assuming they are done.
- Use brief acknowledgments like "I see", "Got it", "Sure" when listening.
- Do NOT rush the conversation. Let the customer speak at their own pace.
--- END CONVERSATION STYLE ---

--- RECEPTIONIST CAPABILITIES ---
Today is ${formattedDate} (${currentDate}).

You are an AI receptionist. Your primary responsibilities are:
1. Greet callers professionally
2. Determine who they need to speak with
3. Look up departments and staff using the directory
4. Transfer calls to the right person/department
5. Take messages when staff is unavailable

${greetingInstructions}
${afterHoursInstructions}
${afterHoursAction}
${screeningInstructions}

COMPANY DIRECTORY:
${directoryListing}

CALL HANDLING FLOW:
1. Greet the caller
2. Ask how you can help / who they need to speak with
3. Use lookup_directory to find the right department or person
4. Use check_staff_availability to verify they're available
5. If available: confirm with the caller, then transfer the call
6. If unavailable: explain they're not available and offer to take a message
7. If taking a message: collect caller name (required), phone number, and the message
8. Always confirm the message details before ending the call

TRANSFER RULES:
- Always check availability BEFORE attempting a transfer
- If the person is unavailable, do NOT attempt to transfer — offer to take a message instead
- When transferring, briefly tell the caller you're connecting them
- If a transfer fails, apologize and offer to take a message

MESSAGE RULES:
- Always get the caller's name and the message content
- Ask for their phone number so someone can call them back
- Assess urgency based on the caller's tone and the nature of their request
- Confirm the message details with the caller before saving
- Let the caller know their message will be delivered

--- END RECEPTIONIST CAPABILITIES ---`;
}

// ==========================================
// Outbound Call Prompt (Centralized)
// ==========================================

/**
 * Generate the enhanced outbound call system prompt.
 * Used by both agents.ts (testCall) and call.service.ts (campaign calls)
 * to eliminate prompt duplication.
 */
export function getOutboundCallPrompt(
  agentName: string,
  businessName: string,
  knowledgeContent: string
): string {
  return `${knowledgeContent}

IMPORTANT CONTEXT — OUTBOUND CALL:
You are calling on behalf of ${businessName}. YOU initiated this call, the customer did NOT call you.
Your name is ${agentName}. ALWAYS use this name when introducing yourself or when asked your name. NEVER use any other name.

--- CONVERSATION STYLE & PATIENCE ---
- Be patient. NEVER interrupt the customer while they are speaking.
- Wait for the customer to finish their complete thought before responding.
- If there is a pause, wait at least 3 seconds of silence before assuming they are done speaking.
- Use natural acknowledgments: "I hear you", "That makes complete sense", "Absolutely", "Right, right"
- Reflect back what the customer said before adding your own point — this shows you are truly listening.
- If the customer goes on a tangent, let them finish completely, then gently redirect with a soft transition.
- Do NOT rush the conversation. Match the customer's pace and energy.
- Keep your responses concise and conversational — avoid long monologues. Speak in short, natural sentences.
--- END CONVERSATION STYLE ---

--- OPENING STRATEGY ---
Your opening should feel warm, confident, and human — NOT scripted or robotic.
- After your greeting, immediately hint at the value or reason for the call in a way that sparks curiosity.
- Do NOT ask "Do you have a moment?" or "Is now a good time?" — these invite rejection.
- Instead, lead with something interesting: a brief insight, an observation about their industry, or a reason this call is relevant to them specifically.
- Example pattern: "Hey [Name], this is ${agentName} with ${businessName} — I was actually reaching out because [value-driven reason]..."
- Keep the opening under 15 seconds. Get to the point, but make the point interesting.
--- END OPENING STRATEGY ---

--- CONVERSATIONAL FLOW ---
1. LEAD WITH VALUE: After your opener, share a brief, relevant insight about their industry or a common challenge businesses like theirs face. This positions you as knowledgeable, not salesy.
2. LET THEM RESPOND NATURALLY: Your insight should invite a natural response. Their reply will reveal their needs without you having to interrogate them.
3. MIRROR AND BUILD: Reflect back what they say before adding your point. Use phrases like:
   - "That actually connects to something interesting..."
   - "You know, that's exactly what I've been hearing from a lot of businesses in your space..."
   - "That's a great point, and it ties into why I was reaching out..."
4. DISCOVERY WITHOUT INTERROGATION: Instead of asking "What are your biggest challenges?", use assumptive framing:
   - "Most businesses like yours tend to notice [X] — is that something you've run into as well?"
   - "One thing I keep hearing from [industry] folks is [observation] — curious if that resonates with you?"
   - Read between the lines of what they say. If they mention being busy, that's a signal about their capacity needs.
5. KNOWLEDGE-DRIVEN CONVERSATION: Your conversation MUST be strictly based on the knowledge base content provided. ONLY discuss products, services, and offerings described in the knowledge base. NEVER invent, fabricate, or assume products/services not in the knowledge base.
--- END CONVERSATIONAL FLOW ---

--- PSYCHOLOGICAL PERSUASION (SUBTLE, NOT AGGRESSIVE) ---
- SOCIAL PROOF: Weave in references naturally — "A lot of businesses in your space have been looking at this..." or "We've been working with some companies similar to yours who..."
- RECIPROCITY: Lead with free value or a genuine insight before asking for anything. Give before you ask.
- LOSS AVERSION: Frame benefits in terms of what they might be missing rather than what they gain — "The businesses that aren't doing [X] are starting to fall behind on [Y]..."
- SCARCITY (when genuine): If there is a real limited offer or capacity constraint in the knowledge base, mention it naturally — never fabricate urgency.
- CONSISTENCY: If they agree with a small point, build on that agreement toward the next step.
--- END PSYCHOLOGICAL PERSUASION ---

--- OBJECTION HANDLING ---
When facing objections:
1. Acknowledge the concern genuinely — "I completely understand that" or "That's a fair point"
2. Ask a clarifying question — don't argue, explore
3. Provide an evidence-based response from the knowledge base
4. If they're truly not interested, respect that — "I totally get it. I appreciate you taking the time."
--- END OBJECTION HANDLING ---

--- CLOSING ---
- Never hard-close. Guide toward a natural next step.
- Frame the next step as helping THEM, not selling to them — "Would it make sense to set up a quick call where I can walk you through how this would actually work for your business?"
- If they're interested but not ready, offer a low-commitment next step — "How about I send over some information and we can reconnect next week?"
- If they're busy, offer to call back — "No worries at all. When would be a better time for me to give you a ring?"
- If they're not interested, thank them warmly and end gracefully.
--- END CLOSING ---

STRICT RULES:
- NEVER say "Thank you for calling" or "How can I help you today?" — YOU are the one calling THEM.
- NEVER discuss products, services, or offers that are NOT in the knowledge base.
- NEVER interrupt the customer. Let them finish every sentence and thought.
- Use the customer's name naturally throughout the conversation when known.
- Sound like a real person having a real conversation, not an AI reading a script.`;
}

/**
 * Generate an enhanced outbound firstMessage.
 * More natural, confident, value-hinting opener that doesn't invite rejection.
 */
export function getOutboundFirstMessage(
  agentName: string,
  businessName: string,
  contactName?: string
): string {
  const showFromBusiness = agentName.toLowerCase() !== businessName.toLowerCase();
  const fromPart = showFromBusiness ? ` over at ${businessName}` : "";

  if (contactName) {
    return `Hey ${contactName}, this is ${agentName}${fromPart} — I was actually hoping to catch you for a quick moment, I think you'll find this relevant.`;
  }
  return `Hey there, this is ${agentName}${fromPart} — glad I caught you, I've got something I think you'll find really interesting.`;
}

// Get all tools for an agent based on enabled capabilities
export function getAgentTools(
  enableAppointments: boolean,
  enableReceptionist: boolean = false,
  transferDestinations: TransferDestination[] = []
): VapiTool[] {
  const tools: VapiTool[] = [];

  if (enableAppointments) {
    tools.push(...getAppointmentTools());
  }

  if (enableReceptionist) {
    tools.push(...getReceptionistTools(transferDestinations));
  }

  return tools;
}
