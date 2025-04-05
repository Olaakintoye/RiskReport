import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { log } from "./vite";

// Create postgres connection
const connectionString = process.env.DATABASE_URL!;
export const queryClient = postgres(connectionString);

try {
  log("Database connection established", "db");
} catch (e) {
  log(`Error connecting to database: ${e}`, "db");
  process.exit(1);
}

// Create drizzle client
export const db = drizzle(queryClient);