// Vapi tool definitions for AI agent capabilities
import type { VapiTool } from "./vapi";

// Tool definitions for appointment scheduling
export const appointmentTools: VapiTool[] = [
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
            description: "The date to check availability for, in YYYY-MM-DD format (e.g., 2024-01-15)",
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

// Generate the system prompt addition for appointment scheduling
export function getAppointmentSystemPromptAddition(): string {
  return `

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

When scheduling:
- Always collect the customer's name
- Try to get their email for confirmation (optional but recommended)
- Confirm all details before finalizing the booking
--- END APPOINTMENT SCHEDULING CAPABILITIES ---`;
}

// Get all tools for an agent that has appointment scheduling enabled
export function getAgentTools(enableAppointments: boolean): VapiTool[] {
  const tools: VapiTool[] = [];

  if (enableAppointments) {
    tools.push(...appointmentTools);
  }

  return tools;
}
