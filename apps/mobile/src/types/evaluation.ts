/**
 * Venture Wolf — Strict TypeScript interfaces for the AI Evaluation Response.
 * 
 * These types define the exact contract between the backend (Gemini/Groq AI output)
 * and every frontend screen that consumes evaluation data. When the backend JSON
 * schema changes, a compile-time error surfaces immediately across all consumers.
 */

// ─── Financial Metrics ──────────────────────────────────────────────────────

export interface FinancialMetrics {
  cash_balance: number;
  monthly_burn: number;
  default_runway: number;
  arr: number;
  mrr: number;
  headcount_cost: number;
}

// ─── Go-To-Market Strategy ──────────────────────────────────────────────────

export interface GTMChannel {
  name: string;
  status: 'Scaling' | 'Testing' | 'Saturated';
  cac: number;
}

export interface GTMExperiment {
  title: string;
  description: string;
  status: 'Active' | 'Upcoming';
}

export interface GTMStrategy {
  blended_cac: number;
  ltv: number;
  payback_period: number;
  ltv_cac_ratio: number;
  ltv_cac_growth?: number;
  channels: GTMChannel[];
  experiments: GTMExperiment[];
}

// ─── Financial Forecast (5-Year Projections) ────────────────────────────────

export interface ForecastYears {
  year1: number;
  year2: number;
  year3: number;
  year4: number;
  year5: number;
}

export interface FinancialForecast {
  revenue: Record<string, ForecastYears>;
  cogs: Record<string, ForecastYears>;
  opex: Record<string, ForecastYears>;
}

// ─── Market Landscape ───────────────────────────────────────────────────────

export interface Competitor {
  name: string;
  weakness: string;
}

export interface MarketLandscape {
  tam: string;
  sam: string;
  som: string;
  competitors: Competitor[];
}

// ─── Traction Metrics ───────────────────────────────────────────────────────

export interface TractionMetrics {
  waitlist_count: number;
  waitlist_growth?: number;
  beta_users: number;
  beta_conversion_growth?: number;
  arr?: number;
  arr_mom_growth?: number;
  nrr: number;
  nrr_growth?: number;
  burn_multiple: number;
  burn_growth?: number;
  historical_revenue_6m: number[];
}

// ─── AI Interview Questions ─────────────────────────────────────────────────

export interface InterviewQuestion {
  question: string;
  reason: string;
}

// ─── Root Evaluation Result ─────────────────────────────────────────────────

/**
 * The complete AI Evaluation output returned by the backend `/evaluate` endpoint.
 * Every field matches the Gemini prompt schema defined in geminiService.ts.
 * 
 * Usage:
 *   const { evaluationResult } = useProfileStore();
 *   if (evaluationResult) {
 *     const score: number = evaluationResult.overall_score; // ← fully typed
 *   }
 */
export interface EvaluationResult {
  // ── Core Scores (0–100) ──────────────────────────────────────────────────
  overall_score: number;
  team_score: number;
  market_score: number;
  execution_score: number;
  product_score: number;
  traction_score: number;

  // ── Qualitative AI Output ────────────────────────────────────────────────
  red_flags: string[];
  daily_tasks: string[];
  stage_advice: string;
  questions: InterviewQuestion[];

  // ── Quantitative Models ──────────────────────────────────────────────────
  financial_metrics: FinancialMetrics;
  gtm_strategy: GTMStrategy;
  financial_forecast: FinancialForecast;
  traction_metrics: TractionMetrics;
  market_landscape: MarketLandscape;

  // ── Database Fields (injected by the Supabase insert response) ───────────
  id?: string;
  startup_id?: string;
  created_at?: string;
}
