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

export interface ForecastResponse {
  success: boolean;
  data?: {
    assumptionsGenerated: Record<string, any>;
    projections: ProjectionsData;
    downloadUrl: string;
    highRiskOfRuin?: boolean;
  };
  errors?: any;
  message?: string;
}
