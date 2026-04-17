import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

function createMissingDbProxy() {
  return new Proxy(
    {},
    {
      get() {
        throw new Error(
          "DATABASE_URL is not configured in the runtime environment. Set it in Vercel project settings.",
        );
      },
    },
  );
}

export const db = databaseUrl
  ? drizzle(neon(databaseUrl), { schema })
  : (createMissingDbProxy() as ReturnType<typeof drizzle<typeof schema>>);

export * from "./schema";
