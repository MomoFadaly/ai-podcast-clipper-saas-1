import { PrismaClient } from "@prisma/client";

import { env } from "~/env";

declare global {
  // eslint-disable-next-line no-var
  var cachedPrisma: PrismaClient | undefined;
}

const createPrismaClient = () => {
  const client = new PrismaClient({
    log:
      env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    errorFormat: "pretty",
  });

  // Only attempt connection in server-side environments
  if (typeof window === "undefined") {
    client.$connect().catch((error) => {
      console.error("Failed to connect to database:", error);
    });
  }

  return client;
};

let db: PrismaClient;

if (env.NODE_ENV === "production") {
  db = createPrismaClient();
} else {
  global.cachedPrisma ??= createPrismaClient();
  db = global.cachedPrisma;
}

export { db };
