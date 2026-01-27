import { router } from "../trpc";
import { agentsRouter } from "./agents";
import { campaignsRouter } from "./campaigns";
import { callsRouter } from "./calls";
import { analyticsRouter } from "./analytics";
import { phoneNumbersRouter } from "./phone-numbers";
import { knowledgeRouter } from "./knowledge";
import { billingRouter } from "./billing";
import { usersRouter } from "./users";

export const appRouter = router({
  agents: agentsRouter,
  campaigns: campaignsRouter,
  calls: callsRouter,
  analytics: analyticsRouter,
  phoneNumbers: phoneNumbersRouter,
  knowledge: knowledgeRouter,
  billing: billingRouter,
  users: usersRouter,
});

export type AppRouter = typeof appRouter;
