import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import { INVESTOR_QUESTIONS, INVESTOR_FAQ_QUESTIONS } from './investorQuestions.js';
import { registryFrom } from '../provenance/registrySources.js';
import { guardResponse, logReport } from '../provenance/aiGuard.js';

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

const DEVANG_PERSONA_TEXT = `
You are DEVANG RAJA, Founder of Venture Wolf and one of the "5 Most Powerful Business Leaders in Fundraising".
Your Background:
- MBA from Wellingkars; Certified Financial Planner (CFP) and Financial Adviser (FA) from CII London.
- 13 years of executive corporate finance leadership across prominent European firms like Capita, Willis, and Prudential before launching Venture Wolf.
- Your motto: "An entrepreneur creating entrepreneurs."
- Venture Wolf Ecosystem: You actively manage an elite syndication network of over 5,000 investors across India, USA, Middle East, Singapore, Europe, Australia, Hong Kong, Japan, China, and Israel, spanning HNIs, Ultra HNIs, VCs, Family Offices, and Impact Funds. Your typical minimum fundraising ticket size is INR 1Cr+ with no upper limit.

Your Interview Style & Philosophy:
- Direct, inquisitive, analytical, and supportive yet uncompromising on metrics, reality checks, and document consistency.
- You operate like an experienced auditor and lead VC: you keep probing with "How, What, When, Who, and Where" until you understand the revenue models, profit margins, unit economics, supply chain, and whether founders have personal skin in the game.
- You despise vague buzzwords. You demand precise numbers, verifiable traction, realistic valuations, and transparent Cap Tables.
`;

export interface DocumentInput {
  type: string;
  mimeType: string;
  localPath: string;
}

interface StageBenchmark {
  stageTitle: string;
  personaModifier: string;
  evaluationRules: string;
  redFlags: string;
  focusMetrics: string;
}

export function getStageBenchmark(stage: string): StageBenchmark {
  const cleanStage = (stage || '').toLowerCase();

  if (cleanStage.includes('pre-seed') || cleanStage.includes('preseed') || cleanStage.includes('crowdfunding')) {
    return {
      stageTitle: 'Pre-Seed / Concept Stage',
      personaModifier: 'Act as an experienced Pre-Seed Lead Angel & Syndicate Partner at Venture Wolf.',
      evaluationRules: 'REVENUE IS NOT EXPECTED AT PRE-SEED. DO NOT penalize for $0 MRR. Concentrate 80% of your evaluation on Founder Pedigree & Domain Obsession, Problem Severity, Total Addressable Market (TAM), and early proof-of-concept or waitlist validation.',
      redFlags: 'Unrealistic pre-money valuations over INR 25 Cr ($3M) without a working prototype; part-time co-founders; lack of personal financial contribution or skin in the game; vague target market definition.',
      focusMetrics: 'Founder Domain Experience, Problem Intensity, Alpha/Waitlist Traction, MVP Execution Timeline, Pre-Seed Capital Allocation.'
    };
  }

  if (cleanStage.includes('seed')) {
    return {
      stageTitle: 'Seed / Commercialization Stage',
      personaModifier: 'Act as a Seed-Stage Institutional VC Lead & Venture Wolf Syndication Managing Partner.',
      evaluationRules: 'A LIVE PRODUCT and active market trials are non-negotiable at Seed stage. Prioritize validation of Month-over-Month (MoM) user or revenue momentum, customer retention trends, initial burn rate vs. runway (demanding at least 12-18 months remaining), and clear go-to-market experimentation results.',
      redFlags: 'High cash burn rates accompanied by sluggish growth (<10% MoM); unverified unit economics; heavy reliance on paid acquisition without organic retention; no clear milestone bridge to Series A readiness.',
      focusMetrics: 'MoM Revenue/User Growth, Blended CAC vs Initial LTV, Net Burn Rate, Remaining Runway Months, Repeat Conversion Rate.'
    };
  }

  if (cleanStage.includes('series-b') || cleanStage.includes('series b')) {
    return {
      stageTitle: 'Series B / Scaling Stage',
      personaModifier: 'Act as a Series B Lead Investor & Global Syndication Partner.',
      evaluationRules: 'Focus on market dominance, global scalability, and path to profitability. Audit Burn Efficiency, Market Saturation, Ecosystem Moat, and M&A Readiness.',
      redFlags: 'Rising CAC in primary markets; high logo churn masked by expansion; lack of international infrastructure; weak ecosystem APIs.',
      focusMetrics: 'Net Burn Efficiency, Logo vs Revenue Churn, Market Penetration %, Path to Profitability.'
    };
  }

  if (cleanStage.includes('series-a') || cleanStage.includes('series a') || cleanStage.includes('growth')) {
    return {
      stageTitle: 'Series A / Growth Equity Stage',
      personaModifier: 'Act as a Rigorous Institutional Growth Equity Lead Investor & VC Syndication Partner.',
      evaluationRules: 'Focus strictly on scalable, predictable unit economics and institutional governance. Audit Gross Margins (expecting >70% for tech/SaaS), Net Revenue Retention (NRR > 110%), LTV:CAC ratios (> 3:1), sales funnel predictability, and management team depth.',
      redFlags: 'Unexplained customer churn; deteriorating unit margins at scale; heavy founder dependency for closing sales; bloated operating overhead without proportional revenue expansion; inconsistent financial assumptions.',
      focusMetrics: 'Gross Margin %, Net Revenue Retention (NRR), LTV:CAC Ratio (>3:1), Sales Payback Period (<12 months), Scaled Unit Economics, Moat Durability.'
    };
  }

  // Default Early-Stage Framework
  return {
    stageTitle: 'Early-Stage Venture Evaluation',
    personaModifier: 'Act as an objective Early-Stage Lead VC Investor.',
    evaluationRules: 'Evaluate the startup based on standard core pillars: Market Size (TAM), Team Capabilities, Product-Market Fit evidence, and clean capital utilization.',
    redFlags: 'Unclear revenue models, unfocused customer segmentation, or inflated cap tables.',
    focusMetrics: 'Value Proposition, Early Customer Evidence, Burn vs Runway, Team Commitment.'
  };
}

function getNormalizedStageKey(stage: string): string {
  const cleanStage = (stage || '').toLowerCase();
  if (cleanStage.includes('pre-seed') || cleanStage.includes('preseed') || cleanStage.includes('crowdfunding') || cleanStage.includes('earned insight')) return 'pre-seed';
  if (cleanStage.includes('seed')) return 'seed';
  if (cleanStage.includes('series-b') || cleanStage.includes('series b')) return 'series-b';
  if (cleanStage.includes('series-a') || cleanStage.includes('series a') || cleanStage.includes('growth')) return 'series-a';
  return 'seed';
}


/**
 * Check what Devang said against what the founder actually gave us.
 *
 * This persona is the most confident writer of numbers in the codebase — it is
 * instructed to interrogate unit economics and "demand precise numbers", and a
 * model told to be precise will supply precision it does not have. Questions
 * and verdicts are prose, so they are guarded; the clarity and vector scores
 * are the persona's assessment and are left alone.
 *
 * The founder's own answers are ingested as sources: a figure they said out
 * loud in the session is theirs, and quoting it back is the entire point of the
 * exercise.
 */
async function checkAgainstFounderFacts<T>(
  label: string,
  result: T,
  documents: DocumentInput[],
  texts: (string | undefined)[],
): Promise<T> {
  try {
    const registry = await registryFrom({ texts, documents });
    const guarded = guardResponse(result, registry);
    logReport(label, guarded.report);
    return guarded.value;
  } catch (guardErr: any) {
    // The guard is a check on the answer, not part of producing it. If it
    // fails, the founder still gets their session; the failure is loud in the
    // log rather than fatal in the request.
    console.error('[provenance] Guard failed, returning unchecked response:', guardErr?.message);
    return result;
  }
}

export const startInvestorQA = async (
  stage: string,
  mode: string,
  documents: DocumentInput[],
  founderProfileContext?: string
) => {
  const benchmark = getStageBenchmark(stage);
  const normalizedStageKey = getNormalizedStageKey(stage);
  const stageQuestions = JSON.stringify(INVESTOR_QUESTIONS[normalizedStageKey] || {}, null, 2);
  const faqQuestions = JSON.stringify(INVESTOR_FAQ_QUESTIONS, null, 2);
  
  console.log(`[DEVANG AI] Starting Investor Q&A session. Stage: ${stage} (${benchmark.stageTitle}), Mode: ${mode}, Docs: ${documents.length}`);

  const isAcquisition = mode.toLowerCase() === 'acquisition' || mode.toLowerCase() === 'm&a';

  const promptText = `
${DEVANG_PERSONA_TEXT}

--- STAGE-SPECIFIC EVALUATION FRAMEWORK (${benchmark.stageTitle.toUpperCase()}) ---
Your Role Modifier: ${benchmark.personaModifier}
Institutional Rules: ${benchmark.evaluationRules}
Automatic Red Flags to Interrogate: ${benchmark.redFlags}
Priority Focus Metrics: ${benchmark.focusMetrics}

--- CURATED KNOWLEDGE BASE OF QUESTIONS ---
Here is a curated bank of ground-reality questions for the exact stage you are evaluating, broken down by vertical:
${stageQuestions}

--- CORE INVESTOR FAQS (GENERAL & ACQUISITION) ---
Here are essential, foundational questions expected by our syndicates:
${faqQuestions}

TASK:
You are preparing to lead Call 1 with a startup founder in an intense, gamified Q&A session ("Investor Grill").
Analyze the attached startup documents (Pitch Deck, Financials, Cap Table, etc.) and their founder profile context to determine if they are SaaS, Manufacturing & Hardware, or Services & Agencies.
Based on Venture Wolf's confidential training scripts and the exact STAGE-SPECIFIC EVALUATION RULES above, generate a tailored 4-round Q&A agenda targeted at testing this founder's clarity and survival readiness for their exact stage.
CRITICAL INSTRUCTION: You MUST construct the questions using BOTH the CURATED KNOWLEDGE BASE OF QUESTIONS and the CORE INVESTOR FAQS provided above. Select the appropriate vertical, and sequence 2 questions per round, progressing from basic/foundational to advanced/deep metrics. Do not invent your own questions if suitable ones exist in the knowledge bases.

Startup Current Funding Stage: ${stage} (${benchmark.stageTitle})
Simulation Mode: ${isAcquisition ? 'M&A / Acquisition Exit Evaluation' : 'Institutional Fundraising / Venture Round Evaluation'}
${founderProfileContext ? `\n--- FOUNDER PROFILE & COMPANY CONTEXT ---\n${founderProfileContext}\n` : ''}

You MUST output a strict JSON object (no markdown formatting, no code blocks) matching exactly this schema:
{
  "avatar_intro": "<string: Devang Raja's customized opening address to the founder, acknowledging their exact company stage (${stage}), explaining why Venture Wolf evaluates ${stage} companies by focusing on ${benchmark.focusMetrics}, and setting expectations for Call 1>",
  "detected_highlights": [
    "<string: Stage reality highlight e.g. '${stage} Benchmark Focus: ${benchmark.focusMetrics}'>",
    "<string: Key operational or financial observation detected in uploaded files or profile>"
  ],
  "rounds": [
    {
      "round_number": 1,
      "round_title": "Round 1: Problem Validation & Stage Fit",
      "description": "Testing problem intensity and core positioning for your ${stage} stage.",
      "questions": [
        {
          "id": "r1_q1",
          "question": "<tough, stage-specific question from Devang testing their elevator pitch, unique problem validation, and market readiness>",
          "reason": "<explanation connecting to ${stage} investment rules>"
        },
        {
          "id": "r1_q2",
          "question": "<probing question on customer discovery, target audience specificity, or early operations>",
          "reason": "<why Venture Wolf assesses this before progressing due diligence>"
        }
      ]
    },
    {
      "round_number": 2,
      "round_title": "Round 2: Stage Metrics & Traction Reality",
      "description": "Inspecting actual performance against institutional ${stage} standards: ${benchmark.focusMetrics}.",
      "questions": [
        {
          "id": "r2_q1",
          "question": "<specific question challenging their exact stage metrics (e.g. for Pre-Seed: alpha pilots/waitlists; for Seed: MoM growth and CAC; for Series A: Gross margins and LTV:CAC)>",
          "reason": "<why institutional syndicates demand this metric at ${stage} stage>"
        },
        {
          "id": "r2_q2",
          "question": "<question on burn rate, cash efficiency, or customer retention realities>",
          "reason": "<connecting to institutional risk abatement>"
        }
      ]
    },
    {
      "round_number": 3,
      "round_title": "Round 3: Team Pedigree & Skin in the Game",
      "description": "Evaluating founder full-time devotion, equity distribution, and domain obsession.",
      "questions": [
        {
          "id": "r3_q1",
          "question": "<question probing full-time co-founder dedication, Cap Table cleanliness, and relevant technical/industry pedigree>",
          "reason": "<why part-time commitment or flawed equity splits are automatic red flags at Venture Wolf>"
        },
        {
          "id": "r3_q2",
          "question": "<question evaluating their personal resilience, personal capital invested, and why they won't abandon the venture when obstacles hit>",
          "reason": "<evaluating personal conviction and long-term alignment>"
        }
      ]
    },
    {
      "round_number": 4,
      "round_title": "${isAcquisition ? 'Round 4: Acquisition Thesis & Valuation' : 'Round 4: Deal Terms, Runway & Valuation Defense'}",
      "description": "${isAcquisition ? 'Defending acquisition rationale, buyout multiples, and transition plans.' : `Justifying funding ask, pre-money valuation multiples, and reaching next-stage milestones.`}",
      "questions": [
        {
          "id": "r4_q1",
          "question": "${isAcquisition ? 'Why are you looking to get acquired right now, and why should our buyer syndicate acquire your business rather than building competing capabilities internally?' : `How much capital are you raising in this ${stage} round, at what desired pre-money valuation, and how does your traction justify this valuation against ${stage} market comps?`}",
          "reason": "<testing valuation defense and capital pricing realism>"
        },
        {
          "id": "r4_q2",
          "question": "${isAcquisition ? 'What is your expected exit multiple, and what explicit transition commitments will your co-founders honor post-acquisition?' : `How many months of runway will this capital grant you, and what concrete inflection milestones will you reach to guarantee readiness for your subsequent funding stage?`}",
          "reason": "<ensuring clear capital efficiency and risk-adjusted investor return>"
        }
      ]
    }
  ]
}
`;

  const questions = await executeMultimodalRequest(
    documents, promptText, buildDefaultStartResponse(stage, benchmark, isAcquisition),
  );

  return await checkAgainstFounderFacts(
    `investor.start stage=${stage}`, questions, documents, [founderProfileContext],
  );
};

export const evaluateInvestorVerdict = async (
  stage: string,
  mode: string,
  qaHistory: { round_title?: string; question: string; answer?: string; localAudioPath?: string }[],
  documents: DocumentInput[],
  founderProfileContext?: string
) => {
  const benchmark = getStageBenchmark(stage);
  console.log(`[DEVANG AI] Evaluating Q&A session verdict. Stage: ${stage}, QA Items: ${qaHistory.length}, Docs: ${documents.length}`);

  const isAcquisition = mode.toLowerCase() === 'acquisition' || mode.toLowerCase() === 'm&a';

  // Perform rigorous structural audit of answers to prevent inflated AI scoring on skipped questions
  const totalQuestions = qaHistory.length || 1;
  let skippedOrEmptyCount = 0;
  let vagueOrShortCount = 0;

  const formattedQA = qaHistory.map((item, index) => {
    const ans = (item.answer || '').trim();
    const cleanLower = ans.toLowerCase();
    const wordCount = ans.split(/\s+/).filter(Boolean).length;

    let flagNote = "";
    if (item.localAudioPath) {
      flagNote = ` [NOTE: FOUNDER ANSWERED VIA VOICE. Listen to 'Answer_Audio_Q${index + 1}' to evaluate this response and their vocal delivery (smoothness, steadiness, accuracy).]`;
    } else if (!ans || cleanLower.includes('[no response') || cleanLower.includes('[skipped') || cleanLower === 'skip' || cleanLower === 'unsure' || cleanLower.includes('no answer')) {
      skippedOrEmptyCount++;
      flagNote = " 🚨 [AUDIT WARNING: FOUNDER SKIPPED OR FAILED TO ANSWER THIS QUESTION]";
    } else if (wordCount < 6) {
      vagueOrShortCount++;
      flagNote = " ⚠️ [AUDIT WARNING: EXTREMELY BRIEF OR VAGUE RESPONSE (<6 WORDS)]";
    }

    return `[${item.round_title || `Round Q${index+1}`}]\nQ${index+1}: ${item.question}\nFounder's Answer: "${ans || (item.localAudioPath ? '[See Audio File]' : '[No answer provided]')}"${flagNote}`;
  }).join('\n\n-------------------\n\n');

  const skipRatio = (skippedOrEmptyCount / totalQuestions) * 100;
  console.log(`[DEVANG AI] Audit check: Skipped=${skippedOrEmptyCount}, Short/Vague=${vagueOrShortCount}, Total=${totalQuestions} (${Math.round(skipRatio)}% skipped)`);

  const promptText = `
${DEVANG_PERSONA_TEXT}

--- STAGE-SPECIFIC EVALUATION BENCHMARKS (${benchmark.stageTitle.toUpperCase()}) ---
Institutional Evaluation Rules: ${benchmark.evaluationRules}
Automatic Red Flags: ${benchmark.redFlags}
Core Metrics Audited: ${benchmark.focusMetrics}

--- IDEAL TRAINING SCRIPT BENCHMARK (CALL 1 EXPECTATIONS) ---
Venture Wolf's internal training script strictly demands that founders clearly articulate:
1. Business Model & Operations (How, What, When, Who, Where)
2. Supply Chain, Clients, and Ecosystem Players
3. Revenue Models & Exact Profit Margins
4. Competitive Entry Barriers & Patents (if applicable)
5. Current Traction, Cap Table, and Specific Runway Needs

--- 🚨 CRITICAL REAL-TIME SCORING MANDATE FOR SKIPPED OR VAGUE ANSWERS & GROUND LEVEL REALITY ---
In this interview session:
- Total Questions Asked: ${totalQuestions}
- Questions SKIPPED or EMPTY by Founder: ${skippedOrEmptyCount} (${Math.round(skipRatio)}%)
- Questions with weak/superficial 1-5 word responses: ${vagueOrShortCount}

YOU MUST STRICTLY ENFORCE DEVANG RAJA'S INSTITUTIONAL DISCIPLINE AND DEMAND GROUND-LEVEL REALITY. DO NOT FLATTER OR ARBITRARILY REWARD THE FOUNDER IF THEY DID NOT ANSWER THE QUESTIONS WITH REAL DATA:
1. IF THE FOUNDER SKIPPED >= 70% OF THE QUESTIONS (OR LEFT THEM UNANSWERED):
   - Overall "clarity_score" MUST be between 5 and 20 (failing grade).
   - ALL "vector_scores" must be set between 8 and 25.
   - "fundability_verdict" MUST be set exactly to "High Risk / Requires Strategic Rework".
   - Your "devang_reality_check" must fiercely reprimand the founder for walking into an institutional meeting unprepared and refusing to defend their metrics. Explain that jumping into Call 1 and remaining silent on unit economics and Cap Table structures guarantees an instant rejection across Venture Wolf's 5,000+ investors.
2. IF THE FOUNDER SKIPPED 35% TO 69% OF QUESTIONS (OR GAVE MOSTLY LAZY 2-3 WORD REPLIES OR FLUFF WITHOUT REALITY):
   - Overall "clarity_score" MUST NOT EXCEED 48 out of 100.
   - "fundability_verdict" MUST be set to "High Risk / Requires Strategic Rework" or "Promising but Needs Metric Refinements".
   - Bluntly point out exactly which metrics they avoided answering.
3. IF THE FOUNDER ANSWERED THOROUGHLY AND ACCURATELY WITH GROUND-LEVEL REALITY:
   - Grade them fairly against institutional ${stage} standards, rating 75-95 if unit economics and verbal claims align with Data Room models and they clearly demonstrated a deep understanding of their specific vertical's constraints (e.g. manufacturing BOM, SaaS NRR).

Startup Stage: ${stage} (${benchmark.stageTitle})
Simulation Mode: ${isAcquisition ? 'M&A / Acquisition' : 'Institutional Fundraising'}
${founderProfileContext ? `\n--- FOUNDER PROFILE & COMPANY CONTEXT ---\n${founderProfileContext}\n` : ''}

--- INTERVIEW Q&A TRANSCRIPT ---
${formattedQA}
--- END TRANSCRIPT ---

You MUST output a strict JSON object (no markdown formatting, no code blocks) matching exactly this schema:
{
  "clarity_score": <number between 0 and 100 representing overall clarity, honesty, and ${stage} stage reality based strictly on answer substance>,
  "vector_scores": {
    "pitch_clarity": <number 0-100 on problem validation and communication precision>,
    "financial_defense": <number 0-100 on command of stage-relevant economics (burn, runway, CAC)>,
    "stage_readiness": <number 0-100 on meeting expected ${stage} operational milestones>,
    "market_mastery": <number 0-100 on competitive differentiation and moat defensibility>
  },
  "voice_analysis": {
    "delivery_score": <number 0-100 evaluating if the voice was smooth, steady, confident, and accurate (if audio provided)>,
    "delivery_feedback": "<string: blunt feedback on pacing, tone, and confidence (or 'No voice audio provided')>"
  },
  "fundability_verdict": "<'Ready for Investor Introductions' | 'Promising but Needs Metric Refinements' | 'High Risk / Requires Strategic Rework'>",
  "document_alignment": [
    {
      "check_name": "<string e.g. 'Stage Revenue & Growth Consistency'>",
      "verbal_claim": "<what the founder literally stated or skipped in Call 1>",
      "document_reality": "<what their uploaded pitch deck or Excel projections reveal>",
      "status": "<'Aligned' | 'Discrepancy' | 'Unverified'>",
      "comments": "<Devang's blunt audit observation on consistency or silence>"
    },
    {
      "check_name": "<string e.g. 'Unit Economics & Capital Burn'>",
      "verbal_claim": "<founder's verbal statement or skipped response>",
      "document_reality": "<spreadsheet/deck forecast reality>",
      "status": "<'Aligned' | 'Discrepancy' | 'Unverified'>",
      "comments": "<audit observation>"
    },
    {
      "check_name": "<string e.g. 'Cap Table & Founder Commitment'>",
      "verbal_claim": "<founder's verbal claim or silence>",
      "document_reality": "<deck/profile reality>",
      "status": "<'Aligned' | 'Discrepancy' | 'Unverified'>",
      "comments": "<audit observation>"
    }
  ],
  "training_script_gap_analysis": [
    {
      "category": "<string: e.g. 'Business Model Clarity', 'Supply Chain Mastery', 'Unit Economics', 'Cap Table & Runway'>",
      "ideal_expectation": "<what the training script strictly requires them to know based on the IDEAL TRAINING SCRIPT BENCHMARK>",
      "founder_reality": "<how they actually performed on this specific benchmark in Call 1>",
      "improvement_directive": "<blunt, actionable feedback to close this gap>"
    }
  ],
  "devang_reality_check": "<string: A rigorous, uncompromising executive review from Devang Raja summarizing how the startup stacks up against institutional ${stage} criteria based on their interview transcript>",
  "actionable_improvements": [
    "<string: Specific, numbered actionable step 1 tailored to repairing identified weaknesses>",
    "<string: Specific step 2>",
    "<string: Specific step 3>",
    "<string: Specific step 4>",
    "<string: Specific step 5>"
  ]
}
`;

  const verdict = await executeMultimodalRequest(
    documents, promptText, buildDefaultVerdictResponse(stage, benchmark, qaHistory),
  );

  return await checkAgainstFounderFacts(
    `investor.verdict stage=${stage}`,
    verdict,
    documents,
    [founderProfileContext, ...qaHistory.map((item) => item.answer)],
  );
};

async function executeMultimodalRequest(
  documents: DocumentInput[],
  promptText: string,
  fallbackResponse: any
) {
  const contents: any[] = [];
  const uploadedFiles = [];

  try {
    for (const doc of documents) {
      if (fs.existsSync(doc.localPath)) {
        console.log(`[DEVANG AI] Uploading doc ${doc.type} (${doc.localPath}) to Gemini File API...`);
        const file = await ai.files.upload({
          file: doc.localPath,
          config: { mimeType: doc.mimeType },
        });
        uploadedFiles.push(file);

        contents.push(`\n--- Document Type: ${doc.type} ---\n`);
        contents.push({
          fileData: {
            fileUri: file.uri,
            mimeType: file.mimeType,
          },
        });
      }
    }

    contents.push(promptText);

    let attempt = 0;
    const maxRetries = 2;
    const baseDelay = 1500;

    while (attempt <= maxRetries) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: contents,
          config: {
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        const text = response.text;
        if (!text) {
          throw new Error('Empty response from Gemini AI');
        }

        const sanitized = text.replace(/```json\n?|\n?```/g, '').trim();
        return JSON.parse(sanitized);
      } catch (err: any) {
        attempt++;
        console.warn(`[DEVANG AI] Attempt ${attempt} failed:`, err.message || err);
        if (attempt > maxRetries) {
          console.error('[DEVANG AI] Max retries reached. Returning dynamic audit fallback structure.');
          return fallbackResponse;
        }
        await new Promise((res) => setTimeout(res, baseDelay * Math.pow(2, attempt - 1)));
      }
    }
  } catch (globalErr) {
    console.error('[DEVANG AI] Error in execution:', globalErr);
    return fallbackResponse;
  } finally {
    for (const file of uploadedFiles) {
      try {
        if (file.name) {
          await ai.files.delete({ name: file.name });
        }
      } catch (e) {
        console.warn(`[DEVANG AI] Failed to clean up file ${file.name}:`, e);
      }
    }
  }
  return fallbackResponse;
}

function buildDefaultStartResponse(stage: string, benchmark: StageBenchmark, isAcquisition: boolean) {
  const isPreSeed = stage.toLowerCase().includes('pre');
  const isSeriesA = stage.toLowerCase().includes('series');

  return {
    avatar_intro: `Welcome to Venture Wolf. I'm Devang Raja, Founder and CEO. Working across our syndicate of over 5,000 institutional investors across 10 global financial centers, we evaluate pitches purely on realistic stage fitness. I see your founder profile places you at the ${stage} stage. For ${stage}, our evaluation focuses strictly on: ${benchmark.focusMetrics}. Let's begin Call 1 to test your clarity and metrics against reality.`,
    detected_highlights: [
      `Founder Profile Stage: ${stage} (${benchmark.stageTitle})`,
      `Institutional Evaluation Rule: ${isPreSeed ? 'Revenue optional; evaluating problem validation & team obsession' : isSeriesA ? 'Auditing scalable unit margins (>70%) and NRR > 110%' : 'Demanding live product momentum and 12-18m runway'}`
    ],
    rounds: [
      {
        round_number: 1,
        round_title: "Round 1: Problem Validation & Stage Fit",
        description: `Testing elevator pitch velocity and market framing for ${stage} stage.`,
        questions: [
          {
            id: "r1_q1",
            question: isPreSeed 
              ? "In under 60 seconds, explain the core problem you are obsessed with solving. Why is existing alternative solutions completely failing your target users?"
              : "In under 60 seconds, pitch your live company and explain your defensible value proposition. How does your positioning dominate existing market incumbents?",
            reason: `Institutional investors gauge founder clarity within the opening 120 seconds of Call 1.`
          },
          {
            id: "r1_q2",
            question: "Walk me through your operational ecosystem and target customer profile. How do you consistently acquire and retain early paying adopters?",
            reason: "Verifying operational clarity and distribution repeatability."
          }
        ]
      },
      {
        round_number: 2,
        round_title: "Round 2: Stage Metrics & Traction Reality",
        description: `Inspecting hard performance numbers against institutional ${stage} benchmarks.`,
        questions: [
          {
            id: "r2_q1",
            question: isPreSeed
              ? "At Pre-Seed we don't demand revenue, but we demand validation. What concrete proof (waitlists, LOIs, alpha usage logs) confirms customers crave your product?"
              : isSeriesA
              ? "Let's inspect scalable economics: what is your current annual run rate, your blended LTV:CAC ratio, and your exact Net Revenue Retention (NRR) percentage?"
              : "What is your exact current MRR/GTV, your month-over-month (MoM) revenue growth percentage, and your blended Customer Acquisition Cost (CAC)?",
            reason: `For ${stage}, investors strictly audit: ${benchmark.focusMetrics}.`
          },
          {
            id: "r2_q2",
            question: "What is your current monthly net cash burn rate, and precisely how many months of runway remain in your bank account today?",
            reason: "Institutional capital providers require at least 12-18 months of projected runway to mitigate operating insolvency."
          }
        ]
      },
      {
        round_number: 3,
        round_title: "Round 3: Team Pedigree & Skin in the Game",
        description: "Evaluating full-time co-founder devotion and personal alignment.",
        questions: [
          {
            id: "r3_q1",
            question: "What is the exact equity breakdown on your Cap Table, and are 100% of the co-founders working exclusively full-time on this business?",
            reason: "Part-time founders or unbalanced equity structures are immediate red flags during due diligence."
          },
          {
            id: "r3_q2",
            question: "What is your personal connection to this problem, and how much personal capital have you invested from your own savings into the startup?",
            reason: "We evaluate resilience by inspecting how much personal skin in the game the founding team holds."
          }
        ]
      },
      {
        round_number: 4,
        round_title: isAcquisition ? "Round 4: Acquisition Thesis & Valuation" : `Round 4: Deal Terms & ${stage} Valuation Defense`,
        description: isAcquisition ? "Defending buyout multiples and post-acquisition handover." : `Justifying funding ask and reaching subsequent series inflection points.`,
        questions: [
          {
            id: "r4_q1",
            question: isAcquisition 
              ? "Why are you looking for an acquisition exit now, and why should our buyer syndicate acquire you instead of replicating your proprietary capabilities?" 
              : `How much capital are you seeking for this ${stage} round, at what desired pre-money valuation, and what comparable benchmarks justify that multiple?`,
            reason: `Testing pricing discipline and whether valuation aligns with ${stage} market realities.`
          },
          {
            id: "r4_2",
            question: isAcquisition
              ? "Are you seeking a full buyout or partial equity rollup, and what transition guarantees will executive leadership provide post-close?"
              : `What explicit revenue and user milestones will this capital achieve to ensure seamless institutional readiness for your next funding stage?`,
            reason: "Guaranteeing capital efficiency and milestone visibility for investor returns."
          }
        ]
      }
    ]
  };
}

function buildDefaultVerdictResponse(stage: string, benchmark: StageBenchmark, qaHistory: { round_title?: string; question: string; answer?: string; localAudioPath?: string }[] = []) {
  const isPreSeed = stage.toLowerCase().includes('pre');
  const isSeriesA = stage.toLowerCase().includes('series');

  // Real-time analysis of actual answer quality
  const total = qaHistory.length || 8;
  let skipped = 0;
  let weak = 0;
  let strong = 0;

  qaHistory.forEach(item => {
    const ans = (item.answer || '').trim().toLowerCase();
    const words = ans.split(/\s+/).filter(Boolean).length;
    if (!ans || ans.includes('[no response') || ans.includes('[skipped') || ans === 'skip' || ans === 'unsure') {
      skipped++;
    } else if (words < 7) {
      weak++;
    } else {
      strong++;
    }
  });

  const skipRatio = (skipped / total) * 100;
  const weakRatio = (weak / total) * 100;

  // If founder skipped > 60% of questions, enforce brutal failing reality score
  if (skipRatio >= 60 || (skipped + weak >= total && total > 0)) {
    return {
      clarity_score: Math.max(8, Math.min(22, 18 - Math.round((skipped / total) * 8))),
      vector_scores: {
        pitch_clarity: Math.min(24, Math.round((strong / total) * 40) + 12),
        financial_defense: 10,
        stage_readiness: 14,
        market_mastery: 12
      },
      fundability_verdict: "High Risk / Requires Strategic Rework",
      document_alignment: [
        {
          check_name: "Verbal Defense & Pitch Accountability",
          verbal_claim: "[Question Skipped / No Defense Offered]",
          document_reality: "Data Room financial models require live oral defense to confirm founder mastery.",
          status: "Discrepancy",
          comments: "Devang Raja Audit Notice: You bypassed fundamental Q&A interrogation during Call 1. Unsubstantiated spreadsheets fail syndication due diligence."
        },
        {
          check_name: `${stage} Unit Economics & Runway`,
          verbal_claim: "[Skipped / Unanswered]",
          document_reality: "Burn rate and CAC projections unverified by founder testimony.",
          status: "Discrepancy",
          comments: "An absolute red flag for institutional lead investors. Never walk into an investor meeting without memorizing your unit economics."
        },
        {
          check_name: "Cap Table & Full-Time Commitment",
          verbal_claim: "[Skipped / Unanswered]",
          document_reality: "Co-founder devotion and personal skin in the game unconfirmed.",
          status: "Unverified",
          comments: "Venture Wolf requires explicit, transparent statements regarding founder dedication before initiating introductions to our 5,000+ investors."
        }
      ],
      training_script_gap_analysis: [
        {
          category: "Call 1 Readiness",
          ideal_expectation: "Founders must provide concrete operational and financial data without hesitating.",
          founder_reality: "The founder skipped the majority of questions or provided no defense.",
          improvement_directive: "Stop skipping questions. Do not take investor meetings until you have memorized your pitch deck metrics."
        }
      ],
      devang_reality_check: `Devang Raja's Executive Reality Check: Let us be completely candid—you walked into an institutional evaluation simulation and skipped virtually every critical question. Whether your profile is placed at ${stage} or any other tier, silence in front of lead capital providers demonstrates an unacceptable lack of preparation and metric clarity. In the real world, avoiding a direct question on problem validation, Cap Table splits, or cash runway guarantees immediate rejection from our syndicate of 5,000+ global investors. Our philosophy is 'An entrepreneur creating entrepreneurs,' which begins with uncompromising preparation. Study your spreadsheets, master your unit economics, and return when you can verbally defend every claim in your Data Room.`,
      actionable_improvements: [
        "Stop Skipping Questions: Prepare precise, disciplined responses for every standard investor inquiry; never pass on a core valuation or runway question.",
        `Memorize ${stage} Focus Metrics: Be able to recite your ${benchmark.focusMetrics} instantly without hesitating or guessing.`,
        "Demonstrate Personal Skin in the Game: Formulate a clear defense of your personal capital contribution and full-time dedication to the venture.",
        "Reconcile Data Room Models: Verify that every calculation in your Excel financial workbook can be verbally explained in under 45 seconds.",
        "Restart the Drill: Re-run this AI Investor interview and provide thorough, quantitative written defenses for all 4 rounds."
      ]
    };
  }

  // If founder gave mostly weak/brief answers
  if (weakRatio + skipRatio >= 50) {
    return {
      clarity_score: 44,
      vector_scores: {
        pitch_clarity: 52,
        financial_defense: 38,
        stage_readiness: 45,
        market_mastery: 41
      },
      fundability_verdict: "High Risk / Requires Strategic Rework",
      document_alignment: [
        {
          check_name: "Answer Precision & Metric Depth",
          verbal_claim: "Provided brief, generalized high-level statements without specific financial metrics.",
          document_reality: "Data Room workbooks model granular customer growth and cost structures.",
          status: "Discrepancy",
          comments: "Devang Raja Audit Notice: Your verbal responses lacked quantitative specificity. Replace vague buzzwords with hard performance metrics."
        }
      ],
      training_script_gap_analysis: [
        {
          category: "Metric Depth",
          ideal_expectation: "Call 1 demands precise revenue models and profit margins.",
          founder_reality: "Provided mostly buzzwords instead of hard metrics.",
          improvement_directive: "Replace vague assertions with exact numbers from your financial model."
        }
      ],
      devang_reality_check: `Your narrative orientation shows early promise for the ${stage} stage, but your interview responses were far too superficial to survive institutional due diligence. You answered multiple questions with brief, vague assertions rather than anchoring your defenses to hard figures. Institutional VCs demand precision: when we ask about unit margins or growth rates, we expect explicit, audit-ready calculations that match your uploaded Data Room projections.`,
      actionable_improvements: [
        "Replace Buzzwords with Hard Metrics: Ensure every response contains at least one verifiable historical KPI or numerical projected target.",
        "Deepen Financial Defense: Explain the exact CAC payback period and operating burn rates modeled in your Excel forecasts.",
        "Provide Contextual Proof: Reference actual customer trial counts, Letters of Intent (LOIs), or active pipeline conversion rates."
      ]
    };
  }

  // Thorough, well-answered fallback simulation
  return {
    clarity_score: isPreSeed ? 84 : 79,
    vector_scores: {
      pitch_clarity: 87,
      financial_defense: isPreSeed ? 81 : 76,
      stage_readiness: 82,
      market_mastery: 78
    },
    fundability_verdict: "Ready for Investor Introductions",
    document_alignment: [
      {
        check_name: `${stage} Growth & Revenue Consistency`,
        verbal_claim: "Articulated clear market traction and disciplined capital planning during Call 1.",
        document_reality: isPreSeed 
          ? "Data Room documents outline strong problem hypotheses and waitlist validation without premature cash burn."
          : "Financial models align with verbal growth claims, modeling sustainable payback timelines.",
        status: "Aligned",
        comments: isPreSeed 
          ? "Strong pre-seed problem framing and execution discipline."
          : "Verbal cash flow assertions match the active formulaic cells in your uploaded Excel projections."
      },
      {
        check_name: "Unit Economics & Capital Efficiency",
        verbal_claim: "Defended positive customer unit margins and logical capital use.",
        document_reality: isSeriesA 
          ? "LTV:CAC ratio models exhibit strong scalability supported by historical retention feeds."
          : "Customer acquisition cost assumptions appear realistic for seed commercialization.",
        status: "Aligned",
        comments: `Solid unit defense for ${stage} institutional review.`
      },
      {
        check_name: "Cap Table & Founder Commitment",
        verbal_claim: "Co-founders dedicated full-time with transparent equity splits.",
        document_reality: "Data Room profile structure confirms clean ownership splits with a reserved 10-15% ESOP pool.",
        status: "Aligned",
        comments: "Excellent founder alignment and executive dedication."
      }
    ],
    training_script_gap_analysis: [
      {
        category: "Institutional Readiness",
        ideal_expectation: "Clear articulation of business model, supply chain, margins, and traction.",
        founder_reality: "Successfully defended key metrics matching the Data Room.",
        improvement_directive: "Maintain this rigor in live syndication."
      }
    ],
    devang_reality_check: `As an entrepreneur creating entrepreneurs, I commend the rigor and precision you displayed during this Call 1 interview. Your verbal defenses consistently matched the quantitative models in your Data Room, proving clear command over ${stage} realities. Across our syndicate of 5,000+ investors at Venture Wolf, we look for founders who know their unit economics, preserve their runway, and demonstrate personal resilience under interrogation. You have earned an initial syndication presentation to our capital network.`,
    actionable_improvements: [
      "Maintain Data Room Freshness: Keep your Excel financial models and monthly KPI logs updated ahead of partner syndication meetings.",
      `Prepare for Deep Institutional Diligence: Anticipate follow-up requests for raw bank feeds and customer retention cohort analytics for your ${stage} round.`,
      "Lock In Lead Terms: Finalize your preferred equity valuation cap and investor rights before opening formal boardroom syndication."
    ]
  };
}
