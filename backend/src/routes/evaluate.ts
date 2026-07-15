import { Router, type Request, type Response } from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { evaluateStartup, transcribeAndEvaluatePitch } from '../services/groqService.js';
import { parsePDF, parseExcel } from '../services/documentParser.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate, evaluateRequestSchema, pitchRequestSchema } from '../validators/schemas.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const router = Router();

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

    // Step 3: Fetch Founder & Startup Profile
    let founderProfileContext = '';
    try {
      const { data: profile } = await supabaseAdmin.from('profiles').select('*').eq('id', startupId).single();
      const { data: startup } = await supabaseAdmin.from('startups').select('*').eq('founder_id', startupId).single();
      
      if (profile || startup) {
        founderProfileContext = JSON.stringify({ founder: profile || {}, startup: startup || {} }, null, 2);
        console.log('Successfully fetched founder profile context for AI evaluation.');
      }
    } catch (e) {
      console.error('Failed to fetch founder profile for context:', e);
    }

    // Step 4: AI Processing
    const { evaluateStartupMultimodal } = await import('../services/geminiService.js');
    const evaluation = await evaluateStartupMultimodal(stage, rawDocuments, founderProfileContext);

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
        red_flags: evaluation.red_flags,
        stage_advice: evaluation.stage_advice,
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
        questions: evaluation.questions,
        financial_metrics: evaluation.financial_metrics,
        gtm_strategy: evaluation.gtm_strategy,
        financial_forecast: evaluation.financial_forecast,
        traction_metrics: evaluation.traction_metrics,
        market_landscape: evaluation.market_landscape
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

export default router;
