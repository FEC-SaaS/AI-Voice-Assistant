import { router } from "../trpc";
import { agentsRouter } from "./agents";
import { campaignsRouter } from "./campaigns";
import { callsRouter } from "./calls";
import { analyticsRouter } from "./analytics";
import { phoneNumbersRouter } from "./phone-numbers";
import { knowledgeRouter } from "./knowledge";
import { billingRouter } from "./billing";
import { usersRouter } from "./users";
import { contactsRouter } from "./contacts";
import { apiKeysRouter } from "./api-keys";
import { appointmentsRouter } from "./appointments";
import { organizationRouter } from "./organization";
import { liveCallsRouter } from "./live-calls";
import { intelligenceRouter } from "./intelligence";
import { complianceRouter } from "./compliance";
import { receptionistRouter } from "./receptionist";
import { cnamRouter } from "./cnam";
import { interviewsRouter } from "./interviews";

export const appRouter = router({
  agents: agentsRouter,
  campaigns: campaignsRouter,
  contacts: contactsRouter,
  calls: callsRouter,
  analytics: analyticsRouter,
  phoneNumbers: phoneNumbersRouter,
  knowledge: knowledgeRouter,
  billing: billingRouter,
  users: usersRouter,
  apiKeys: apiKeysRouter,
  appointments: appointmentsRouter,
  organization: organizationRouter,
  liveCalls: liveCallsRouter,
  intelligence: intelligenceRouter,
  compliance: complianceRouter,
  receptionist: receptionistRouter,
  cnam: cnamRouter,
  interviews: interviewsRouter,
});

export type AppRouter = typeof appRouter;
