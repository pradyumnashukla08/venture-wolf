import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { evaluateStartup, transcribeAndEvaluatePitch } from '../services/groqService.js';
import { parsePDF, parseExcel } from '../services/documentParser.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate, evaluateRequestSchema, pitchRequestSchema } from '../validators/schemas.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startInvestorQA, evaluateInvestorVerdict, type DocumentInput } from '../services/ai/investorService.js';
import { FactRegistry } from '../services/provenance/factRegistry.js';
import { guardResponse, logReport } from '../services/provenance/aiGuard.js';

const router = Router();

async function getFounderContext(startupId: string) {
  let contextObj: any = { founder: {}, startup: {}, profile_draft: {} };
  try {
    const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', startupId).single();
    if (profile) contextObj.founder = profile;
    
    const { data: startup } = await supabaseAdmin.from('startups').select('*').eq('founder_id', startupId).single();
    if (startup) contextObj.startup = startup;

    const { data: draftData, error: draftErr } = await supabaseAdmin.storage.from('data_room').download(`${startupId}/profile_draft.json`);
    if (!draftErr && draftData) {
      const text = Buffer.from(await draftData.arrayBuffer()).toString('utf-8');
      contextObj.profile_draft = JSON.parse(text);
    }
  } catch (e) {
    console.warn('Profile fetch warning:', e);
  }
  return JSON.stringify(contextObj, null, 2);
}


/**
 * Index the numbers the founder actually gave us, so the guard can tell a
 * quoted figure from an invented one.
 *
 * Only text sources can be indexed. A PDF pitch deck reaches Gemini as bytes
 * and is never turned into text on this side, so figures that appear only in a
 * PDF are invisible here and will be reported as unsupported. That is the main
 * reason GUARD_MODE defaults to `report`: the registry is incomplete by
 * construction until deck text extraction is wired in.
 */
async function buildFactRegistry(
  profileContext: string,
  documents: { mimeType: string; localPath: string }[],
): Promise<FactRegistry> {
  const registry = new FactRegistry().ingest(profileContext);

  for (const doc of documents) {
    if (!doc.mimeType.startsWith('text/')) continue;
    try {
      registry.ingest(await fs.promises.readFile(doc.localPath, 'utf-8'));
    } catch (readErr: any) {
      console.warn('[provenance] Could not index', doc.localPath, readErr?.message);
    }
  }
  return registry;
}

router.post('/', requireAuth, validate(evaluateRequestSchema), async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: { type: string; mimeType: string; localPath: string }[] = [];
  try {
    // userId injected by requireAuth middleware
    const startupId = (req as AuthenticatedRequest).userId;

    // Step 1: Data Ingestion & Extraction (req.body validated by Zod)
    const { stage, pitchDeckPath, financialsPath, documents } = req.body;

    // Support legacy paths or new dynamic documents array
    const docsToProcess = documents || [];
    if (pitchDeckPath) docsToProcess.push({ type: 'Pitch Deck', path: pitchDeckPath });
    if (financialsPath) docsToProcess.push({ type: 'Financials', path: financialsPath });

    for (const doc of docsToProcess) {
      // SECURITY FIX: Prevent IDOR / Path Traversal
      if (!doc.path || !doc.path.startsWith(`${startupId}/`)) {
        res.status(400).json({ error: 'Invalid document path' });
        return;
      }
      
      console.log(`Processing Document [${doc.type}]: ${doc.path}`);
      const { data, error } = await supabaseAdmin.storage.from('data_room').download(doc.path);
      
      if (error || !data) {
        console.error(`Error downloading ${doc.type}:`, error?.message);
        continue;
      }

      try {
        const buffer = await data.arrayBuffer();
        const mimeType = data.type || doc.format || 'application/octet-stream';
        
        // Save file to disk to prevent Out-Of-Memory (OOM) on Render
        const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${path.basename(doc.path)}`);

        if (mimeType.includes('spreadsheetml') || mimeType.includes('excel') || doc.path.endsWith('.xlsx') || doc.path.endsWith('.xls')) {
          console.log(`Converting Excel to CSV for: ${doc.path}`);
          const csvString = await parseExcel(buffer);
          // Write CSV string to temp file
          await fs.promises.writeFile(tempFilePath + '.csv', csvString);
          rawDocuments.push({
            type: doc.type,
            mimeType: 'text/csv',
            localPath: tempFilePath + '.csv'
          });
        } else {
          // Write standard file (e.g. PDF) to temp file
          await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
          rawDocuments.push({
            type: doc.type,
            mimeType: mimeType,
            localPath: tempFilePath
          });
        }
      } catch (parseErr: any) {
        console.error(`Parse Error for ${doc.type}:`, parseErr.message);
      }
    }

    // Step 3: Fetch Founder & Startup Profile (including profile_draft.json)
    const founderProfileContext = await getFounderContext(startupId);
    console.log('Successfully fetched founder profile context for AI evaluation.');

    // Step 4: AI Processing
    const { evaluateStartupMultimodal } = await import('../services/geminiService.js');
    const evaluation = await evaluateStartupMultimodal(stage, rawDocuments, founderProfileContext);

    // Step 4.5: Provenance guard. The evaluation's prose is checked against the
    // numbers the founder actually supplied; its scores are the model's own
    // assessment and are deliberately left alone. In the default `report` mode
    // nothing is rewritten — findings are logged and returned so the guard can
    // be measured before it is allowed to withhold anything.
    const factRegistry = await buildFactRegistry(founderProfileContext, rawDocuments);
    const guarded = guardResponse(evaluation, factRegistry);
    logReport(`evaluate startup=${startupId}`, guarded.report);
    const checkedEvaluation = guarded.value;

    // Step 4: Database Persistence
    // Ensure the startup exists in the startups table to satisfy foreign key constraints
    const { error: startupErr } = await supabaseAdmin
      .from('startups')
      .upsert({ id: startupId, company_name: 'Pending Profile' }, { onConflict: 'id', ignoreDuplicates: true });
      
    if (startupErr) {
      console.warn('Warning: Failed to ensure startup row exists:', startupErr.message);
    }

    const { data: savedEvaluation, error: dbError } = await supabaseAdmin
      .from('ai_evaluations')
      .insert({
        startup_id: startupId,
        overall_score: evaluation.overall_score,
        team_score: evaluation.team_score,
        market_score: evaluation.market_score,
        execution_score: evaluation.execution_score,
        red_flags: checkedEvaluation.red_flags,
        stage_advice: checkedEvaluation.stage_advice,
      })
      .select()
      .single();

    if (dbError) {
      console.error('Failed to save evaluation to database:', dbError);
      res.status(500).json({ error: 'Failed to persist evaluation to database', details: dbError.message });
      return;
    }

    // Step 5: Client Response
    res.status(200).json({
      success: true,
      evaluation: {
        ...savedEvaluation,
        product_score: evaluation.product_score,
        traction_score: evaluation.traction_score,
        questions: checkedEvaluation.questions,
        financial_metrics: evaluation.financial_metrics,
        gtm_strategy: evaluation.gtm_strategy,
        financial_forecast: evaluation.financial_forecast,
        traction_metrics: evaluation.traction_metrics,
        market_landscape: evaluation.market_landscape
      },
      provenance: {
        mode: guarded.report.mode,
        proseFieldsChecked: guarded.report.checked,
        untraceableFigures: guarded.report.findings,
      },
    });
  } catch (error: any) {
    console.error('Evaluation Route Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Evaluation Failed', details: error.message });
  } finally {
      // Cleanup temporary files to free up disk space
      for (const doc of rawDocuments) {
        try {
          if (fs.existsSync(doc.localPath)) {
            await fs.promises.unlink(doc.localPath);
          }
        } catch (cleanupErr) {
          console.error('Failed to delete temp file:', doc.localPath, cleanupErr);
        }
      }
    }
});

router.post('/pitch', requireAuth, validate(pitchRequestSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    // userId injected by requireAuth middleware
    const userId = (req as AuthenticatedRequest).userId;

    // audioPath validated by Zod schema
    const { audioPath } = req.body;

    // SECURITY FIX: Prevent IDOR / Path Traversal
    if (!audioPath.startsWith(`${userId}/`) && !audioPath.startsWith(`pitches/${userId}/`)) {
      res.status(403).json({ error: 'Unauthorized: Cannot access this audio file' });
      return;
    }

    console.log(`Downloading audio file from Supabase: ${audioPath}`);
    // Assuming audio is uploaded to 'data_room' bucket. Or maybe a different bucket? We'll use 'data_room' for simplicity.
    const { data, error } = await supabaseAdmin.storage.from('data_room').download(audioPath);
    
    if (error || !data) {
      console.error(`Error downloading audio:`, error?.message);
      res.status(404).json({ error: 'Failed to download audio file from storage' });
      return;
    }

    // Write to temp file
    const buffer = await data.arrayBuffer();
    const tempFilePath = path.join(os.tmpdir(), `pitch_${Date.now()}.m4a`);
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    // Step 3: Process Audio
    const result = await transcribeAndEvaluatePitch(tempFilePath);

    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error('Failed to cleanup temp file:', e);
    }

    res.status(200).json({
      success: true,
      analysis: result
    });
  } catch (error: any) {
    console.error('Pitch Evaluation Error:', error);
    res.status(500).json({ error: 'Pitch Evaluation Failed', details: error.message });
  }
});

async function prepareDocuments(startupId: string, docsToProcess: any[]): Promise<DocumentInput[]> {
  const rawDocuments: DocumentInput[] = [];
  for (const doc of docsToProcess) {
    if (!doc.path || (!doc.path.startsWith(`${startupId}/`) && !doc.path.startsWith(`pitches/${startupId}/`))) {
      continue;
    }
    const { data, error } = await supabaseAdmin.storage.from('data_room').download(doc.path);
    if (error || !data) continue;
    try {
      const buffer = await data.arrayBuffer();
      const mimeType = data.type || doc.format || 'application/octet-stream';
      const tempFilePath = path.join(os.tmpdir(), `investor_${Date.now()}_${path.basename(doc.path)}`);
      await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
      rawDocuments.push({
        type: doc.type || 'Document',
        mimeType: mimeType,
        localPath: tempFilePath
      });
    } catch (err) {
      console.warn('Failed to prepare document for Devang AI:', doc.path, err);
    }
  }
  return rawDocuments;
}

router.post('/investor-start', requireAuth, async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: DocumentInput[] = [];
  try {
    const startupId = (req as AuthenticatedRequest).userId;
    const { stage = 'Seed', mode = 'fundraising', documents = [] } = req.body;
    
    rawDocuments = await prepareDocuments(startupId, documents);
    
    const founderProfileContext = await getFounderContext(startupId);

    const session = await startInvestorQA(stage, mode, rawDocuments, founderProfileContext);
    res.status(200).json({ success: true, qa_session: session });
  } catch (error: any) {
    console.error('Investor QA Start Error:', error);
    res.status(500).json({ error: 'Failed to start AI Investor QA', details: error.message });
  } finally {
    for (const doc of rawDocuments) {
      try { if (fs.existsSync(doc.localPath)) await fs.promises.unlink(doc.localPath); } catch (e) {}
    }
  }
});

router.post('/investor-verdict', requireAuth, async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: DocumentInput[] = [];
  try {
    const startupId = (req as AuthenticatedRequest).userId;
    const { stage = 'Seed', mode = 'fundraising', qaHistory = [], documents = [] } = req.body;
    
    rawDocuments = await prepareDocuments(startupId, documents);

    // Download audio files for answers
    for (let i = 0; i < qaHistory.length; i++) {
      const qa = qaHistory[i];
      if (qa.audioPath && (qa.audioPath.startsWith(`${startupId}/`) || qa.audioPath.startsWith(`pitches/${startupId}/`))) {
        const { data, error } = await supabaseAdmin.storage.from('data_room').download(qa.audioPath);
        if (!error && data) {
          const buffer = await data.arrayBuffer();
          const tempFilePath = path.join(os.tmpdir(), `answer_${Date.now()}_${path.basename(qa.audioPath)}`);
          await fs.promises.writeFile(tempFilePath, Buffer.from(buffer));
          qa.localAudioPath = tempFilePath;
          qa.mimeType = data.type || 'audio/m4a';
          // Push to rawDocuments so it gets cleaned up and uploaded to Gemini if we want to treat it as a generic document
          rawDocuments.push({ type: `Answer_Audio_Q${i+1}`, mimeType: qa.mimeType, localPath: tempFilePath });
        }
      }
    }

    const founderProfileContext = await getFounderContext(startupId);

    const verdict = await evaluateInvestorVerdict(stage, mode, qaHistory, rawDocuments, founderProfileContext);
    res.status(200).json({ success: true, verdict });
  } catch (error: any) {
    console.error('Investor QA Verdict Error:', error);
    res.status(500).json({ error: 'Failed to generate AI Investor Verdict', details: error.message });
  } finally {
    for (const doc of rawDocuments) {
      try { if (fs.existsSync(doc.localPath)) await fs.promises.unlink(doc.localPath); } catch (e) {}
    }
  }
});

router.post('/ask-ai', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, evaluationContext, startupStage } = req.body;

    if (!message || !evaluationContext || !startupStage) {
      res.status(400).json({ error: 'Missing required fields: message, evaluationContext, startupStage' });
      return;
    }

    const { askAIReviewQuestion } = await import('../services/geminiService.js');
    const answer = await askAIReviewQuestion(message, evaluationContext, startupStage);

    res.status(200).json({ success: true, answer });
  } catch (error: any) {
    console.error('Ask AI Route Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Failed to get answer from AI', details: error.message });
  }
});

router.post('/verify-sprint', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { sprintTitle, sprintDesc, proofText, proofImageBase64 } = req.body;

    if (!sprintTitle || !sprintDesc || !proofText) {
      res.status(400).json({ error: 'Missing required fields: sprintTitle, sprintDesc, proofText' });
      return;
    }

    const { verifySprintProof } = await import('../services/geminiService.js');
    const result = await verifySprintProof(sprintTitle, sprintDesc, proofText, proofImageBase64);

    res.status(200).json({ success: true, ...result });
  } catch (error: any) {
    console.error('Verify Sprint Route Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Failed to verify sprint', details: error.message });
  }
});

export default router;
