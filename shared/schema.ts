import { pgTable, text, serial, integer, boolean, numeric, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  fullName: true,
});

// Banks table
export const banks = pgTable("banks", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rating: numeric("rating").notNull(),
  fdic_insured: boolean("fdic_insured").default(true).notNull(),
  logo_type: text("logo_type").notNull(), // Font Awesome icon class
  color: text("color").notNull(), // Color for UI presentation
});

export const insertBankSchema = createInsertSchema(banks).pick({
  name: true,
  rating: true,
  fdic_insured: true,
  logo_type: true,
  color: true,
});

// CD Products table
export const cdProducts = pgTable("cd_products", {
  id: serial("id").primaryKey(),
  bankId: integer("bank_id").notNull(),
  name: text("name").notNull(),
  termMonths: integer("term_months").notNull(),
  apy: numeric("apy").notNull(),
  minimumDeposit: numeric("minimum_deposit").notNull(),
  earlyWithdrawalPenalty: text("early_withdrawal_penalty").notNull(),
  description: text("description"),
  isFeatured: boolean("is_featured").default(false).notNull(),
});

export const insertCdProductSchema = createInsertSchema(cdProducts).pick({
  bankId: true,
  name: true,
  termMonths: true,
  apy: true,
  minimumDeposit: true,
  earlyWithdrawalPenalty: true,
  description: true,
  isFeatured: true,
});

// Investments table
export const investments = pgTable("investments", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  cdProductId: integer("cd_product_id").notNull(),
  amount: numeric("amount").notNull(),
  startDate: timestamp("start_date").defaultNow().notNull(),
  maturityDate: timestamp("maturity_date").notNull(),
  interestEarned: numeric("interest_earned").default("0").notNull(),
  status: text("status").notNull().default("active"), // active, matured, redeemed
});

export const insertInvestmentSchema = createInsertSchema(investments).pick({
  userId: true,
  cdProductId: true,
  amount: true,
  startDate: true,
  maturityDate: true,
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // deposit, withdrawal, interest, redemption
  amount: numeric("amount").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  relatedInvestmentId: integer("related_investment_id"),
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  type: true,
  amount: true,
  description: true,
  relatedInvestmentId: true,
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  type: text("type").notNull(), // maturity, newOffer, interestPaid, etc.
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  relatedInvestmentId: integer("related_investment_id"),
  relatedCdProductId: integer("related_cd_product_id"),
});

export const insertNotificationSchema = createInsertSchema(notifications).pick({
  userId: true,
  type: true,
  message: true,
  relatedInvestmentId: true,
  relatedCdProductId: true,
});

// UserPreferences table
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  darkMode: boolean("dark_mode").default(false).notNull(),
  pushNotifications: boolean("push_notifications").default(true).notNull(),
  emailNotifications: boolean("email_notifications").default(true).notNull(),
  maturityPreference: text("maturity_preference").default("notify").notNull(), // notify, autoRenew, withdraw
});

export const insertUserPreferencesSchema = createInsertSchema(userPreferences).pick({
  userId: true,
  darkMode: true,
  pushNotifications: true,
  emailNotifications: true,
  maturityPreference: true,
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Bank = typeof banks.$inferSelect;
export type InsertBank = z.infer<typeof insertBankSchema>;

export type CdProduct = typeof cdProducts.$inferSelect;
export type InsertCdProduct = z.infer<typeof insertCdProductSchema>;

export type Investment = typeof investments.$inferSelect;
export type InsertInvestment = z.infer<typeof insertInvestmentSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = z.infer<typeof insertUserPreferencesSchema>;
