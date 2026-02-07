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
        required: ["date", "time", "customer_name"],
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

--- IMPORTANT: CURRENT DATE INFORMATION ---
Today's date is ${formattedDate} (${currentDate}).
ALWAYS use this as your reference for the current date when discussing scheduling.
When a customer says "today", "tomorrow", "next week", etc., calculate the actual date from ${formattedDate}.
--- END CURRENT DATE INFORMATION ---

--- APPOINTMENT SCHEDULING CAPABILITIES ---
You have the ability to check appointment availability and schedule appointments for customers.

When a customer wants to schedule an appointment:
1. Ask what date they prefer
2. Use check_availability to see available time slots
3. Present the available times to the customer
4. Once they choose a time, collect their name and contact information
5. Use schedule_appointment to book the appointment
6. Confirm the appointment details with the customer

When checking availability:
- Always confirm the date with the customer before checking
- Present times in a friendly format (e.g., "2:30 PM" instead of "14:30")
- If no slots are available, offer to check another date
- IMPORTANT: Use the current date (${currentDate}) as your reference point

When scheduling:
- Always collect the customer's name
- Try to get their email for confirmation (optional but recommended)
- Ask about their notification preference: "Would you prefer to receive appointment reminders by email, text message, or both?"
  - "email" = email only
  - "sms" = text message only
  - "both" = both email and text (most common)
  - "none" = no reminders
- Confirm all details before finalizing the booking

IMPORTANT - Updating vs Creating New Appointments:
- If you have ALREADY scheduled an appointment for this customer during this call and they provide their email afterwards, use the update_appointment tool to add their email - DO NOT schedule a new appointment!
- Only use schedule_appointment when creating a NEW appointment, not when adding info to an existing one
- If the customer provides email after booking, say something like "Great, let me add that email to your appointment" and use update_appointment
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
