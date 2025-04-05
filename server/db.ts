import { drizzle } from "drizzle-orm/postgres-js";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { log } from "./vite";
import { supabase } from "./supabase-client";

// We'll keep the direct postgres connection for migrations
// but use Supabase for actual database operations
const connectionString = process.env.DATABASE_URL!;
export const queryClient = postgres(connectionString);

try {
  log("Database connection established", "db");
} catch (e) {
  log(`Error connecting to database: ${e}`, "db");
  process.exit(1);
}

// Create drizzle client using the Supabase connection
// This is still a PostgreSQL database, just managed by Supabase
export const db = drizzle(queryClient);