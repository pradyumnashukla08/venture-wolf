export interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

export interface UserProfile {
  id: string; // Firebase Auth UID
  email: string;
  role: 'founder' | 'investor';
  firstName: string;
  lastName: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StartupProfile {
  id: string;
  founderId: string; // Reference to users collection
  companyName: string;
  oneLiner: string;
  stage: 'Pre-seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C+';
  industry: string;
  website: string;
  
  metrics: {
    mrr: number;
    users: number;
    runwayMonths: number;
  };
  
  socialLinks: {
    linkedin?: string;
    twitter?: string;
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PitchEvaluation {
  id: string;
  startupId: string; // Reference to startups collection
  
  overallScore: number;
  teamScore: number;
  marketScore: number;
  executionScore: number;
  
  redFlags: string[];
  stageAdvice: string;
  
  transcript?: string;
  persuasionScore?: number;
  
  createdAt: Timestamp;
}

export interface DailySprint {
  id: string;
  startupId: string;
  title: string;
  description: string;
  status: 'pending' | 'completed' | 'failed';
  proofText?: string;
  proofImageUrl?: string;
  verifiedByAi?: boolean;
  aiFeedback?: string;
  
  assignedAt: Timestamp;
  completedAt?: Timestamp;
}
