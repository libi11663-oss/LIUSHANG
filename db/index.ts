// Drizzle / Cloudflare D1 mock for AI Studio environment
export * as schema from "./schema";

const noOp = {
  findMany: async () => [],
  findFirst: async () => null,
  findUnique: async () => null,
  create: async (d: { data?: unknown }) => d?.data ?? {},
  update: async (d: { data?: unknown }) => d?.data ?? {},
  delete: async () => ({}),
};

const db = new Proxy({} as Record<string, unknown>, {
  get: (_, prop) => (prop === 'query' ? new Proxy({}, { get: () => noOp }) : async () => []),
});

export function getDb() {
  return db;
}
