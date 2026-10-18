import { z } from 'zod';

// ─── AI Request Schemas ──────────────────────────────────────────────────────

export const ChatRequestSchema = z.object({
  question: z.string().min(1, 'Question is required').max(2000, 'Question too long'),
  startupContext: z.record(z.string(), z.any()).optional().default({}),
});

export const GenerateFieldRequestSchema = z.object({
  fieldLabel: z.string().min(1, 'Field label is required').max(100),
  context: z.record(z.string(), z.any()).optional().default({}),
  instruction: z.string().max(500).optional(),
});

export const ExtractDocumentsRequestSchema = z.object({
  files: z.array(z.object({
    id: z.string().optional(),
    name: z.string().min(1),
    size: z.number().nonnegative(),
    type: z.string().default('application/octet-stream'),
  })).min(1, 'At least one file metadata entry is required').max(20),
});

export const EvaluateGrillRequestSchema = z.object({
  qaPairs: z.array(z.object({
    question: z.string().min(1),
    answer: z.string().default(''),
  })).min(1, 'At least one QA pair is required'),
  startupContext: z.record(z.string(), z.any()).optional(),
});

export const EvaluateDeckRequestSchema = z.object({
  fileName: z.string().min(1).max(255),
  fileSize: z.string().default('5.0 MB'),
  stage: z.string().default('Seed'),
});

// ─── Startup Profile Schema ──────────────────────────────────────────────────

export const StartupProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Company name is required').max(100),
  companyName: z.string().max(100).optional(),
  tagline: z.string().max(250).optional(),
  pitch: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  stage: z.enum(['Pre-Seed', 'Seed', 'Series-A', 'Series-B']).default('Seed'),
  founder: z.string().max(100).optional(),
  fullName: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
  websiteUrl: z.string().max(200).optional(),
  linkedinUrl: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  targetAsk: z.string().max(50).optional(),
  targetRaise: z.string().max(50).optional(),
  valuation: z.string().max(50).optional(),
  valuationCap: z.string().max(50).optional(),
  equityOffered: z.string().max(20).optional(),
  capitalCommitted: z.string().max(50).optional(),
  mrr: z.string().max(50).optional(),
  currentMrr: z.string().max(50).optional(),
  burn: z.string().max(50).optional(),
  burnRate: z.string().max(50).optional(),
  growth: z.string().max(20).optional(),
  momGrowth: z.string().max(20).optional(),
  fundabilityScore: z.number().min(0).max(100).default(80),
  tam: z.string().max(50).optional(),
  sam: z.string().max(50).optional(),
  som: z.string().max(50).optional(),
  competitor1: z.string().max(200).optional(),
  competitor2: z.string().max(200).optional(),
  competitor3: z.string().max(200).optional(),
  distributionMoat: z.string().max(1000).optional(),
  isRegistered: z.boolean().optional(),
  registrationNo: z.string().max(50).optional(),
  companyType: z.string().max(50).optional(),
  currency: z.string().max(20).optional(),
  team: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(100),
    linkedin: z.string().max(200).optional(),
  })).optional(),
  grossMargin: z.string().max(20).optional(),
  cac: z.string().max(50).optional(),
  runway: z.string().max(20).optional(),
  verifiedArr: z.string().max(50).optional(),
  churnRate: z.string().max(20).optional(),
  nrr: z.string().max(20).optional(),
  ltvcacRatio: z.string().max(20).optional(),
  cacPayback: z.string().max(20).optional(),
});

// ─── Evaluation & Financial Schemas ──────────────────────────────────────────

export const documentSchema = z.object({
  type: z.enum(['Pitch Deck', 'Financials', 'Cap Table', 'Other']),
  path: z.string(),
  format: z.string().optional(),
});

export const evaluateRequestSchema = z.object({
  stage: z.enum(['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+']),
  pitchDeckPath: z.string().optional(),
  financialsPath: z.string().optional(),
  documents: z.array(documentSchema).optional().default([]),
});

export const pitchRequestSchema = z.object({
  audioPath: z.string(),
  deckPath: z.string().optional(),
});

export const ForecastRequestSchema = z.object({
  archetype: z.enum(['SaaS', 'B2B Commerce', 'Agency', 'Custom']),
  assumptions: z.object({
    startingMrr: z.number().nonnegative(),
    growthRateMoM: z.number().min(-100).max(1000),
    grossMarginPercent: z.number().min(0).max(100),
    burnRateMonthly: z.number().nonnegative(),
    runwayMonths: z.number().int().positive(),
  }),
  historicalData: z.array(z.object({
    month: z.string(),
    revenue: z.number(),
    expenses: z.number(),
  })).optional().default([]),
});
