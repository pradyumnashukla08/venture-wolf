import { z } from 'zod';

export const ForecastRequestSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  archetype: z.enum(['SAAS', 'MANUFACTURING', 'SERVICES']),
  description: z.string().min(10, 'Please provide a more descriptive background'),
  documentUrls: z.array(z.string()).optional(),
});

// A unified schema mapping directly to the row positions in our ASSUMPTIONS grid
export const ScenarioMetricsSchema = z.object({
  // Macro & Tax (Constant tax handled in logic, but holiday/PF are operational inputs)
  dpiitTaxHolidayActive: z.number().describe('1 if highly innovative eligible startup, 0 otherwise'),
  employerPfBurden: z.number().describe('Decimal representation of EPF/Burden (e.g. 0.12)'),
  interestRateOnDebt: z.number().describe('Market debt rate (e.g. 0.12)'),
  annualInflationRate: z.number().describe('Annual inflation rate (e.g. 0.06)'),

  // Archetype specific items (Pass 0 or defaults if not applicable to chosen archetype)
  initialMetric: z.number().describe('SaaS: Starting MRR, Mfg: Installed Capacity, Services: Starting Headcount'),
  growthRateOrYield: z.number().describe('SaaS: MoM Growth, Mfg: Target Yield, Services: Target Utilization'),
  pricingMetric: z.number().describe('SaaS: Churn Rate, Mfg: Price Inflation, Services: Hourly/Monthly Billing Growth'),

  // Cost & OpEx Drivers
  cogsMargin: z.number().describe('Direct product/service delivery cost margin (e.g. 0.30)'),
  annualPayrollIncrease: z.number().describe('Annual increment index (e.g. 0.10)'),
  marketingSpendPct: z.number().describe('Marketing budget as % of total revenue (e.g. 0.10)'),

  // Working Capital
  receivableDays: z.number().describe('Days receivable (e.g. 30)'),
  inventoryDays: z.number().describe('Days inventory held (e.g. 12)'),
  payableDays: z.number().describe('Days payable outstanding (e.g. 30)'),

  // Funding Reality Reality Reality
  estimatedValuation: z.number().describe('Estimated post-money valuation in INR based on this scenario'),
  equityDilutionPct: z.number().describe('Estimated equity dilution percentage (e.g. 0.15 for 15%)'),
});

export const MarketAssumptionsSchema = z.object({
  Worst: ScenarioMetricsSchema,
  Base: ScenarioMetricsSchema,
  Best: ScenarioMetricsSchema,
});

export type ForecastRequest = z.infer<typeof ForecastRequestSchema>;
export type MarketAssumptions = z.infer<typeof MarketAssumptionsSchema>;
