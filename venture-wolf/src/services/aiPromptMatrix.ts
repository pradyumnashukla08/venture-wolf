import { FundingStage } from '../types/schema';

export type AIPromptParameters = {
  persona: string;
  rules: string;
  redFlags: string;
};

export const getAIPromptForStage = (stage: FundingStage | string): AIPromptParameters => {
  if (stage === 'Pre-Seed' || stage === 'Crowdfunding') {
    return {
      persona: 'You are a high-conviction Pre-Seed Angel Investor.',
      rules: 'Revenue is NOT expected. Do not penalize for $0 MRR. Focus 80% of your evaluation on Founder Pedigree, TAM (Total Addressable Market), and early validation (Waitlists/Pilots).',
      redFlags: 'Will heavily penalize valuations over ₹25 Cr ($3M) without a shipped product, or a lack of clear Distribution Moat.',
    };
  }

  if (stage === 'Seed') {
    return {
      persona: 'You are a Seed-Stage Institutional VC.',
      rules: 'The product must be live. Focus evaluation on MRR Growth (MoM), Burn Rate, and Runway. They must have at least 12-18 months of runway remaining.',
      redFlags: 'Will automatically flag high burn rates with low MoM growth (<10%), or no clear path to Series-A metrics.',
    };
  }

  if (stage === 'Series-A' || stage === 'Series-B') {
    return {
      persona: 'You are a ruthless Growth Equity Lead Investor.',
      rules: 'Focus purely on predictable scaling unit economics. You must strictly evaluate Gross Margin (>70% for SaaS), NRR (Net Revenue Retention > 110%), and LTV:CAC Ratio (> 3:1).',
      redFlags: 'Will automatically reject high churn, unpredictable CAC, or heavy founder dependency for sales.',
    };
  }

  // Fallback default
  return {
    persona: 'You are an objective Early-Stage Tech Investor.',
    rules: 'Evaluate the startup based on standard core metrics: Market Size, Team, and Product-Market Fit.',
    redFlags: 'Will penalize an unclear business model or a vague target audience.',
  };
};

export const getAIEvaluationSchema = () => {
  return {
    $schema: "http://json-schema.org/draft-07/schema#",
    type: "object",
    properties: {
      fundability_score: {
        type: "integer",
        description: "A score from 0 to 100 representing the likelihood of securing funding.",
        minimum: 0,
        maximum: 100
      },
      vector_scores: {
        type: "object",
        properties: {
          team: { type: "integer", minimum: 0, maximum: 100 },
          market: { type: "integer", minimum: 0, maximum: 100 },
          execution: { type: "integer", minimum: 0, maximum: 100 }
        },
        required: ["team", "market", "execution"]
      },
      critical_red_flags: {
        type: "array",
        items: { type: "string" },
        description: "List of the highest risk factors identified during evaluation."
      },
      stage_specific_advice: {
        type: "string",
        description: "Actionable feedback tailored to the startup's current funding stage."
      }
    },
    required: ["fundability_score", "vector_scores", "critical_red_flags", "stage_specific_advice"]
  };
};
