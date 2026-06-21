// 1. STAGE-AWARE SCHEMA RUNTIME
export type FundingStage = 'Pre-Seed' | 'Seed' | 'Series-A' | 'Series-B';

// 2. THE 4-LAYER DATA CONSTRAINTS

// LAYER 1: Trust Score Inputs
export interface TrustScoreData {
  gstinValidated: boolean;
  gstinNumber?: string;
  identityVerified: boolean;
  bankAccountVerified: boolean;
  overallTrustScore: number; // 0-100
}

// LAYER 2: Five-Vector Radar Chart Coordinates
export interface EvaluationVectors {
  productScore: number;
  marketScore: number;
  financeScore: number;
  teamScore: number;
  executionScore: number;
}

// LAYER 3: Fundability Status State Machine
export type FundabilityState = 
  | 'INITIAL_REVIEW' 
  | 'DUE_DILIGENCE_PENDING' 
  | 'AI_COMMITTEE_REVIEW' 
  | 'APPROVED_FOR_SYNDICATE' 
  | 'REJECTED';

// LAYER 4: Investment Committee Outputs (Strict JSON Schema)
export interface AICommitteeVerdict {
  verdictId: string;
  timestamp: string;
  fundabilityState: FundabilityState;
  radarData: EvaluationVectors;
  trustData: TrustScoreData;
  marketAnalysis: {
    tamSamSomValid: boolean;
    moatStrength: 'Weak' | 'Moderate' | 'Strong';
    summary: string;
  };
  financialAnalysis: {
    burnRateHealthy: boolean;
    unitEconomicsValidated: boolean;
    summary: string;
  };
  finalDecision: {
    isInvestable: boolean;
    confidenceScore: number; // 0-100
    vcPartnerFeedback: string;
  };
}

// Component Prop Extension Example
export interface FounderProfileProps {
  startupId: string;
  currentStage: FundingStage; // Drives dynamic rendering
  dataRoomReady: boolean;
}
