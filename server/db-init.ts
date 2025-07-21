import { db } from "./db";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { log } from "./vite";
import { seedDatabase } from "./db-seed";
import { users, banks, cdProducts, investments, transactions, notifications, userPreferences } from "@shared/schema";

/**
 * Initializes the database by pushing the schema and seeding with initial data
 */
export async function initDatabase() {
  try {
    log("Initializing database...", "db-init");
    
    // Push the schema to the database using migrate
    log("Pushing schema to database using migrate...", "db-init");
    
    try {
      await migrate(db, { migrationsFolder: "./migrations" });
      log("Migration completed successfully", "db-init");
    } catch (migrationError) {
      log(`Migration error: ${migrationError}`, "db-init");
      
      // If migration fails, try db:push as fallback
      log("Trying db:push as fallback...", "db-init");
      const { exec } = await import('child_process');
      
      exec('npm run db:push', (error: any, stdout: any, stderr: any) => {
        if (error) {
          log(`Error executing db:push: ${error}`, "db-init");
          return;
        }
        
        if (stderr) {
          log(`db:push stderr: ${stderr}`, "db-init");
        }
        
        log(`db:push stdout: ${stdout}`, "db-init");
      });
    }
    
    // Check if database has tables (wait a bit for db:push to complete)
    setTimeout(async () => {
      try {
        // Check if the database has been seeded already
        const userCount = await db.select().from(users).limit(1);
        
        if (userCount.length === 0) {
          log("Database is empty, seeding with initial data...", "db-init");
          await seedDatabase();
        } else {
          log("Database already contains data, skipping seeding", "db-init");
        }
        
        log("Database initialization completed", "db-init");
      } catch (error) {
        log(`Error checking/seeding database: ${error}`, "db-init");
        console.error(error);
      }
    }, 3000);
    
  } catch (error) {
    log(`Error initializing database: ${error}`, "db-init");
    console.error(error);
  }
}