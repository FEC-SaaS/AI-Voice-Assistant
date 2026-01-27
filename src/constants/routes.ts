export const ROUTES = {
  // Public routes
  home: "/",
  pricing: "/pricing",
  features: "/features",
  blog: "/blog",
  contact: "/contact",

  // Auth routes
  signIn: "/sign-in",
  signUp: "/sign-up",

  // Dashboard routes
  dashboard: "/dashboard",
  onboarding: "/dashboard/onboarding",

  // Agents
  agents: "/dashboard/agents",
  agentNew: "/dashboard/agents/new",
  agentDetail: (id: string) => `/dashboard/agents/${id}`,
  agentEdit: (id: string) => `/dashboard/agents/${id}/edit`,

  // Campaigns
  campaigns: "/dashboard/campaigns",
  campaignNew: "/dashboard/campaigns/new",
  campaignDetail: (id: string) => `/dashboard/campaigns/${id}`,

  // Calls
  calls: "/dashboard/calls",
  callDetail: (id: string) => `/dashboard/calls/${id}`,

  // Other sections
  analytics: "/dashboard/analytics",
  knowledge: "/dashboard/knowledge",
  knowledgeNew: "/dashboard/knowledge/new",
  phoneNumbers: "/dashboard/phone-numbers",
  integrations: "/dashboard/integrations",

  // Settings
  settings: "/dashboard/settings",
  settingsBilling: "/dashboard/settings/billing",
  settingsTeam: "/dashboard/settings/team",
  settingsApiKeys: "/dashboard/settings/api-keys",
} as const;

export const PUBLIC_ROUTES = [
  ROUTES.home,
  ROUTES.pricing,
  ROUTES.features,
  ROUTES.blog,
  ROUTES.contact,
  "/api/webhooks/(.*)",
];

export const AUTH_ROUTES = [ROUTES.signIn, ROUTES.signUp];

export const DASHBOARD_ROUTES = Object.values(ROUTES).filter(
  (route) => typeof route === "string" && route.startsWith("/dashboard")
);

// Navigation items for sidebar
export const NAV_ITEMS = [
  {
    title: "Dashboard",
    href: ROUTES.dashboard,
    icon: "LayoutDashboard",
  },
  {
    title: "Agents",
    href: ROUTES.agents,
    icon: "Bot",
  },
  {
    title: "Campaigns",
    href: ROUTES.campaigns,
    icon: "Megaphone",
  },
  {
    title: "Calls",
    href: ROUTES.calls,
    icon: "Phone",
  },
  {
    title: "Analytics",
    href: ROUTES.analytics,
    icon: "BarChart3",
  },
  {
    title: "Knowledge Base",
    href: ROUTES.knowledge,
    icon: "BookOpen",
  },
  {
    title: "Phone Numbers",
    href: ROUTES.phoneNumbers,
    icon: "Hash",
  },
  {
    title: "Integrations",
    href: ROUTES.integrations,
    icon: "Plug",
  },
] as const;

export const SETTINGS_NAV_ITEMS = [
  {
    title: "General",
    href: ROUTES.settings,
  },
  {
    title: "Billing",
    href: ROUTES.settingsBilling,
  },
  {
    title: "Team",
    href: ROUTES.settingsTeam,
  },
  {
    title: "API Keys",
    href: ROUTES.settingsApiKeys,
  },
] as const;
