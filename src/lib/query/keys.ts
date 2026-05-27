export const queryKeys = {
  network: {
    all: ["network"] as const,
  },
  contacts: {
    all: ["contacts"] as const,
    list: ["contacts", "list"] as const,
  },
  vendors: {
    all: ["vendors"] as const,
    list: ["vendors", "list"] as const,
  },
  companies: {
    all: ["companies"] as const,
  },
  projects: {
    all: ["projects"] as const,
  },
  tasks: {
    all: ["tasks"] as const,
  },
  relationships: {
    all: ["relationships"] as const,
  },
  introRequests: {
    all: ["intro-requests"] as const,
  },
  forecast: {
    all: ["forecast"] as const,
  },
} as const;
