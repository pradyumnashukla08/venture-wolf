import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

const getAiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured in backend environment');
  }
  return new GoogleGenAI({ apiKey });
};

// ─── Input Validation Schemas ──────────────────────────────────────────────

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

// ─── Routes ────────────────────────────────────────────────────────────────

/**
 * POST /api/ai/chat
 * Secure AI Investment Partner advisor chat
 */
router.post('/chat', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = ChatRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { question, startupContext } = parsed.data;
    const ai = getAiClient();

    const systemPrompt = `You are the Lead Investment Partner at WaouFund, an institutional venture fund.
Advise the founder on their actual startup metrics with high conviction, sharp venture acumen, and clear numbers.
Context on this founder's startup:
- Company: ${startupContext.companyName || startupContext.name || 'Startup'}
- Founder: ${startupContext.fullName || startupContext.founder || 'Founder'}
- Stage: ${startupContext.stage || 'Seed'}
- Sector: ${startupContext.sector || startupContext.category || 'Technology'}
- Target Raise: ${startupContext.currency || '₹'} ${startupContext.targetRaise || startupContext.targetAsk || 'N/A'}
- Valuation Cap: ${startupContext.currency || '₹'} ${startupContext.valuationCap || startupContext.valuation || 'N/A'}
- MRR: ${startupContext.currency || '₹'} ${startupContext.currentMrr || startupContext.mrr || 'N/A'}
- Monthly Burn: ${startupContext.currency || '₹'} ${startupContext.burnRate || startupContext.burn || 'N/A'}
- MoM Growth: ${startupContext.momGrowth || startupContext.growth || 'N/A'}%
- TAM: ${startupContext.tam || 'N/A'}
- Moat: ${startupContext.distributionMoat || 'N/A'}

Keep responses concise (2-4 punchy paragraphs max), data-driven, and focused on institutional diligence standards.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { text: `${systemPrompt}\n\nFounder Question: "${question}"` }
      ],
      config: {
        temperature: 0.3,
      }
    });

    const answer = response.text?.trim() || 'No response generated from AI engine.';
    res.status(200).json({ success: true, answer });
  } catch (error: any) {
    console.error('[AI Chat Error]:', error.message || error);
    res.status(500).json({ error: 'AI advisor failed to generate response' });
  }
});

/**
 * POST /api/ai/generate-field
 * Sparkle Assist: generates pitch, TAM, SAM, SOM, and moat text
 */
router.post('/generate-field', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = GenerateFieldRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { fieldLabel, context, instruction } = parsed.data;
    const ai = getAiClient();

    const prompt = `You are an elite VC partner assisting a founder with writing their official fundraising profile.
Field to write: "${fieldLabel}".
Instruction: ${instruction || 'Provide institutional grade content for this field.'}
Startup context:
${JSON.stringify(context, null, 2)}

Respond ONLY with the requested text or number. Do not add markdown backticks, quotes, or conversational preamble.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.3,
      }
    });

    const result = (response.text || '').trim().replace(/^"|"$/g, '');
    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('[AI Generate Field Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to generate field content' });
  }
});

/**
 * POST /api/ai/extract-documents
 * Server-side document intelligence synthesis
 */
router.post('/extract-documents', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = ExtractDocumentsRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { files } = parsed.data;
    const fileListText = files.map(f => `${f.name} (${(f.size / (1024 * 1024)).toFixed(1)} MB, ${f.type})`).join(', ');
    const ai = getAiClient();

    const prompt = `You are an elite VC analyst evaluating startup diligence materials.
Analyze the uploaded document names, formats, and context:
${fileListText}

Extract and synthesize the startup profile as a JSON object with this exact structure:
{
  "companyName": "<clean startup name derived from the file names>",
  "tagline": "<compelling 1-sentence value proposition>",
  "stage": "<Pre-Seed | Seed | Series-A | Series-B>",
  "sector": "<Industry vertical, e.g. B2B SaaS, FinTech, HealthTech, DeepTech>",
  "askAmount": "<e.g. ₹3–5 Cr ($400K–$600K)>",
  "mrr": "<e.g. ₹15,00,000>",
  "arr": "<e.g. ₹1.8 Cr>",
  "tam": "<e.g. ₹35,000 Cr>",
  "sam": "<e.g. ₹7,200 Cr>",
  "som": "<e.g. ₹1,100 Cr>",
  "fundingReadiness": <integer score between 65 and 94>,
  "fundingReadinessBreakdown": {
    "teamScore": <integer 70-96>,
    "marketScore": <integer 70-96>,
    "tractionScore": <integer 65-92>,
    "financialScore": <integer 65-92>,
    "productScore": <integer 70-96>
  },
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "redFlags": ["<risk 1>", "<risk 2>"],
  "investorRecommendation": "<1-2 sentence recommendation for angel/VC partners committee>",
  "summary": "<short executive summary>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    const sanitized = (response.text || '').replace(/```json\n?|\n?```/g, '').trim();
    const data = JSON.parse(sanitized);

    res.status(200).json({ success: true, data });
  } catch (error: any) {
    console.error('[AI Extract Documents Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to extract document intelligence' });
  }
});

/**
 * POST /api/ai/evaluate-grill
 * Partner Devang interrogation response evaluation
 */
router.post('/evaluate-grill', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = EvaluateGrillRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { qaPairs, startupContext } = parsed.data;
    const transcript = qaPairs.map((p, i) => `Q${i + 1}: ${p.question}\nA${i + 1}: ${p.answer}`).join('\n\n');
    const ai = getAiClient();

    const prompt = `You are Devang, Senior Partner at an elite institutional venture fund.
You just completed a high-stakes interrogation grill with a founder.
Analyze their verbatim answers across unit economics, distribution, customer concentration, and defensive moats.

Founder Transcript:
${transcript}

${startupContext ? `Startup: ${startupContext.name} (${startupContext.stage})` : ''}

Provide strict JSON output with this exact schema:
{
  "clarity_score": <number between 55 and 96>,
  "vector_scores": {
    "pitch_clarity": <number between 60 and 98>,
    "financial_defense": <number between 60 and 96>,
    "stage_readiness": <number between 60 and 96>,
    "market_mastery": <number between 60 and 98>
  },
  "fundability_verdict": "<verdict string>",
  "devang_reality_check": "<2-3 sentence candid partner feedback>",
  "actionable_improvements": ["<rec 1>", "<rec 2>", "<rec 3>"]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    const sanitized = (response.text || '').replace(/```json\n?|\n?```/g, '').trim();
    const verdict = JSON.parse(sanitized);

    res.status(200).json({ success: true, verdict });
  } catch (error: any) {
    console.error('[AI Evaluate Grill Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to evaluate investor grill responses' });
  }
});

/**
 * POST /api/ai/evaluate-deck
 * Pitch deck diagnostic evaluation
 */
router.post('/evaluate-deck', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const parsed = EvaluateDeckRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const { fileName, fileSize, stage } = parsed.data;
    const ai = getAiClient();

    const prompt = `You are an elite Silicon Valley Venture Capitalist evaluating a startup pitch deck: "${fileName}" (${fileSize}) for a ${stage} stage startup.
Evaluate the deck and output strict JSON with this exact schema:
{
  "overall_score": <number between 65 and 95>,
  "team_score": <number between 65 and 95>,
  "market_score": <number between 65 and 95>,
  "execution_score": <number between 65 and 95>,
  "product_score": <number between 65 and 95>,
  "traction_score": <number between 65 and 95>,
  "red_flags": ["<risk 1>", "<risk 2>"],
  "daily_tasks": ["<task 1>", "<task 2>", "<task 3>", "<task 4>", "<task 5>", "<task 6>", "<task 7>"],
  "stage_advice": "<specific advice for ${stage} stage fundraising>"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [{ text: prompt }],
      config: {
        temperature: 0.2,
        responseMimeType: 'application/json',
      }
    });

    const sanitized = (response.text || '').replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(sanitized);

    res.status(200).json({ success: true, result });
  } catch (error: any) {
    console.error('[AI Evaluate Deck Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to evaluate deck' });
  }
});

export default router;
