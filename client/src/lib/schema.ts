import { z } from 'zod';

// User schema
export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  isVerified: z.boolean(),
  createdAt: z.string(),
});

// User insert schema for registration/login
export const insertUserSchema = z.object({
  username: z.string().min(3).max(50),
  password: z.string().min(8),
  email: z.string().email(),
  fullName: z.string().min(2),
});

// Bank schema
export const bankSchema = z.object({
  id: z.number(),
  name: z.string(),
  rating: z.number(),
  fdic_insured: z.boolean(),
  logo_type: z.string(),
  color: z.string(),
});

// CD Product schema
export const cdProductSchema = z.object({
  id: z.number(),
  bankId: z.number(),
  name: z.string(),
  termMonths: z.number(),
  apy: z.number(),
  minimumDeposit: z.number(),
  earlyWithdrawalPenalty: z.string(),
  description: z.string().optional(),
  isFeatured: z.boolean(),
});

// Investment schema
export const investmentSchema = z.object({
  id: z.number(),
  userId: z.number(),
  cdProductId: z.number(),
  amount: z.number(),
  startDate: z.string(),
  maturityDate: z.string(),
  interestEarned: z.number(),
  status: z.string(),
});

// Export types
export type User = z.infer<typeof userSchema>;
export type Bank = z.infer<typeof bankSchema>;
export type CdProduct = z.infer<typeof cdProductSchema>;
export type Investment = z.infer<typeof investmentSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>; 