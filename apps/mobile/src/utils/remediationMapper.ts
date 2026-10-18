export interface ActionStep {
  id: string;
  title: string;
  task: string;
  type: 'financial' | 'product' | 'team' | 'market';
  isComplete: boolean;
  fix: string;
}

export const generateActionSteps = (redFlags: string[]): ActionStep[] => {
  if (!redFlags || redFlags.length === 0) return [];

  return redFlags.map((flag, index) => {
    const lowerFlag = flag.toLowerCase();
    const id = `task_${index}_${Date.now()}`;

    // Financial heuristics
    if (lowerFlag.includes('cac') || lowerFlag.includes('ltv') || lowerFlag.includes('acquisition') || lowerFlag.includes('margin')) {
      return {
        id,
        title: 'Optimize Unit Economics',
        task: flag,
        type: 'financial',
        isComplete: false,
        fix: 'Review your marketing spend efficiency. Consider shifting budget to organic channels or refining your target audience to lower acquisition costs.',
      };
    }
    
    if (lowerFlag.includes('burn') || lowerFlag.includes('runway') || lowerFlag.includes('spend')) {
      return {
        id,
        title: 'Extend Capital Runway',
        task: flag,
        type: 'financial',
        isComplete: false,
        fix: 'Audit fixed costs and non-essential tools. Consider extending runway by delaying non-critical hires until the next funding milestone.',
      };
    }

    // Team heuristics
    if (lowerFlag.includes('technical') || lowerFlag.includes('cto') || lowerFlag.includes('team') || lowerFlag.includes('founder')) {
      return {
        id,
        title: 'Strengthen Founding Team',
        task: flag,
        type: 'team',
        isComplete: false,
        fix: 'A strong technical foundation is critical. If hiring is too expensive, consider bringing on a fractional CTO or offering equity to a lead engineer.',
      };
    }

    // Market heuristics
    if (lowerFlag.includes('market') || lowerFlag.includes('tam') || lowerFlag.includes('competition') || lowerFlag.includes('competitors')) {
      return {
        id,
        title: 'Defend Market Positioning',
        task: flag,
        type: 'market',
        isComplete: false,
        fix: 'Niche down to a smaller, more focused beachhead market where you have a 10x product advantage before expanding into the broader TAM.',
      };
    }

    // Product heuristics
    if (lowerFlag.includes('product') || lowerFlag.includes('pmf') || lowerFlag.includes('retention') || lowerFlag.includes('churn')) {
      return {
        id,
        title: 'Accelerate Product-Market Fit',
        task: flag,
        type: 'product',
        isComplete: false,
        fix: 'Focus exclusively on speaking to churned users to find product friction points and improve core retention loops before scaling acquisition.',
      };
    }

    // Discrepancy heuristics
    if (lowerFlag.includes('mismatch') || lowerFlag.includes('discrepancy') || lowerFlag.includes('inconsistent')) {
      return {
        id,
        title: 'Resolve Data Inconsistencies',
        task: flag,
        type: 'market',
        isComplete: false,
        fix: 'Review your uploaded pitch deck and profile data to ensure names, numbers, and claims match perfectly across all documents.',
      };
    }

    // Generic fallback
    return {
      id,
      title: 'Address Critical Risk Factor',
      task: flag,
      type: 'market',
      isComplete: false,
      fix: 'Review this risk area with your team and create a concrete 30-day action plan to de-risk it before approaching investors.',
    };
  });
};
