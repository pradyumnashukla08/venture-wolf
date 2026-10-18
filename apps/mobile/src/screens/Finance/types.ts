export interface ForecastRequest {
  companyName: string;
  archetype: 'SAAS' | 'MANUFACTURING' | 'SERVICES';
  description: string;
}

export interface ProjectionsData {
  baseCase: Record<string, number[]>;
  bestCase: Record<string, number[]>;
  worstCase: Record<string, number[]>;
}

/**
 * A driver the backend had to overrule.
 *
 * The forecast model proposes every assumption; the India guardrails hold it to
 * statutory and market limits. Where the two disagreed, the founder is told,
 * rather than the correction being applied silently.
 */
export interface GuardrailCorrection {
  scenario: 'Worst' | 'Base' | 'Best';
  driver: string;
  proposed: number;
  corrected: number;
  because: string;
}

/** Whether any defensible valuation method supports the proposed figure. */
export interface ValuationAudit {
  supported: boolean;
  comment: string;
  methodsRun: string[];
  missingInputs: { method: string; needs: string[]; unlocks: string }[];
}

export interface ForecastResponse {
  success: boolean;
  data?: {
    assumptionsGenerated: Record<string, any>;
    projections: ProjectionsData;
    downloadUrl: string;
    highRiskOfRuin?: boolean;

    /** Present from the provenance work onward; older cached results lack it. */
    disclosure?: string;
    guardrailCorrections?: GuardrailCorrection[];
    valuationAudit?: ValuationAudit;
  };
  errors?: any;
  message?: string;
}
