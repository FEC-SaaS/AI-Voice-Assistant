import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../trpc";

// For now, this is a placeholder for future integrations
// (HubSpot, Salesforce, Zapier, etc.)

export const integrationsRouter = router({
  // List available integrations
  list: protectedProcedure.query(async () => {
    // Return available integrations and their status
    return [
      {
        id: "hubspot",
        name: "HubSpot",
        description: "Sync contacts and log calls to HubSpot CRM",
        icon: "hubspot",
        status: "coming_soon",
        connected: false,
      },
      {
        id: "salesforce",
        name: "Salesforce",
        description: "Sync leads and opportunities with Salesforce",
        icon: "salesforce",
        status: "coming_soon",
        connected: false,
      },
      {
        id: "zapier",
        name: "Zapier",
        description: "Connect to 5000+ apps via Zapier",
        icon: "zapier",
        status: "coming_soon",
        connected: false,
      },
      {
        id: "google_calendar",
        name: "Google Calendar",
        description: "Sync appointments and availability",
        icon: "google",
        status: "coming_soon",
        connected: false,
      },
      {
        id: "slack",
        name: "Slack",
        description: "Get call notifications in Slack",
        icon: "slack",
        status: "coming_soon",
        connected: false,
      },
    ];
  }),

  // Connect an integration (placeholder)
  connect: adminProcedure
    .input(
      z.object({
        integrationId: z.string(),
        config: z.record(z.string()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      // TODO: Implement actual integration connection
      console.log("Connecting integration:", input.integrationId);
      return {
        success: false,
        message: "Integration coming soon",
      };
    }),

  // Disconnect an integration (placeholder)
  disconnect: adminProcedure
    .input(z.object({ integrationId: z.string() }))
    .mutation(async ({ input }) => {
      // TODO: Implement actual disconnection
      console.log("Disconnecting integration:", input.integrationId);
      return { success: true };
    }),
});
