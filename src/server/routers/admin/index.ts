import { router } from "../../trpc";
import { overviewRouter } from "./overview";
import { orgsRouter } from "./orgs";
import { revenueRouter } from "./revenue";
import { plansRouter } from "./plans";
import { featuresRouter } from "./features";
import { adminCallsRouter } from "./calls";
import { acquisitionRouter } from "./acquisition";
import { engagementRouter } from "./engagement";
import { adminIntegrationsRouter } from "./integrations";
import { adminFeedbackRouter } from "./feedback";
import { securityRouter } from "./security";
import { systemRouter } from "./system";
import { activityLogRouter } from "./activity-log";

export const adminRouter = router({
  overview: overviewRouter,
  orgs: orgsRouter,
  revenue: revenueRouter,
  plans: plansRouter,
  features: featuresRouter,
  calls: adminCallsRouter,
  acquisition: acquisitionRouter,
  engagement: engagementRouter,
  integrations: adminIntegrationsRouter,
  feedback: adminFeedbackRouter,
  security: securityRouter,
  system: systemRouter,
  activityLog: activityLogRouter,
});
