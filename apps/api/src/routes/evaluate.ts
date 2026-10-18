import { Router, type Request, type Response } from 'express';
import { db, storage } from '../config/firebase.js';
import { transcribeAndEvaluatePitch } from '../services/geminiService.js';
import { parsePDF, parseExcel } from '../services/documentParser.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate, evaluateRequestSchema, pitchRequestSchema, investorStartRequestSchema, investorVerdictRequestSchema, askAiRequestSchema, verifySprintSchema } from '../validators/schemas.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { startInvestorQA, evaluateInvestorVerdict, type DocumentInput } from '../services/ai/investorService.js';
import { registryFrom } from '../services/provenance/registrySources.js';
import { guardResponse, logReport } from '../services/provenance/aiGuard.js';

const router = Router();

// ... getFounderContext ...
async function getFounderContext(startupId: string) {
  let contextObj: any = { founder: {}, startup: {}, profile_draft: {} };
  try {
    const profileDoc = await db.collection('profiles').doc(startupId).get();
    if (profileDoc.exists) contextObj.founder = profileDoc.data();
    
    const startupDocs = await db.collection('startups').where('founder_id', '==', startupId).limit(1).get();
    if (!startupDocs.empty) contextObj.startup = startupDocs.docs[0]?.data();

    const bucket = storage.bucket();
    const file = bucket.file(`data_room/${startupId}/profile_draft.json`);
    const [exists] = await file.exists();
    if (exists) {
      const [buffer] = await file.download();
      contextObj.profile_draft = JSON.parse(buffer.toString('utf-8'));
    }
  } catch (e) {
    console.warn('Profile fetch warning:', e);
  }
  return JSON.stringify(contextObj, null, 2);
}


router.post('/', requireAuth, validate(evaluateRequestSchema), async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: { type: string; mimeType: string; localPath: string }[] = [];
  try {
    const startupId = (req as AuthenticatedRequest).userId;
    const { stage, pitchDeckPath, financialsPath, documents } = req.body;

    const docsToProcess = documents || [];
    if (pitchDeckPath) docsToProcess.push({ type: 'Pitch Deck', path: pitchDeckPath });
    if (financialsPath) docsToProcess.push({ type: 'Financials', path: financialsPath });

    for (const doc of docsToProcess) {
      if (!doc.path || !doc.path.startsWith(`${startupId}/`)) {
        res.status(400).json({ error: 'Invalid document path' });
        return;
      }
      
      console.log(`Processing Document [${doc.type}]: ${doc.path}`);
      
      let buffer: Buffer;
      let mimeType = doc.format || 'application/octet-stream';
      try {
        const bucket = storage.bucket();
        const file = bucket.file(`data_room/${doc.path}`);
        const [downloadedBuffer] = await file.download();
        buffer = downloadedBuffer;
        
        const [metadata] = await file.getMetadata();
        if (metadata.contentType) {
          mimeType = metadata.contentType;
        }
      } catch (error: any) {
        console.error(`Error downloading ${doc.type}:`, error?.message);
        continue;
      }

      try {
        const tempFilePath = path.join(os.tmpdir(), `upload_${Date.now()}_${path.basename(doc.path)}`);

        if (mimeType.includes('spreadsheetml') || mimeType.includes('excel') || doc.path.endsWith('.xlsx') || doc.path.endsWith('.xls')) {
          console.log(`Converting Excel to CSV for: ${doc.path}`);
          const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
          const csvString = await parseExcel(arrayBuffer);
          await fs.promises.writeFile(tempFilePath + '.csv', csvString);
          rawDocuments.push({
            type: doc.type,
            mimeType: 'text/csv',
            localPath: tempFilePath + '.csv'
          });
        } else {
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

    const founderProfileContext = await getFounderContext(startupId);
    console.log('Successfully fetched founder profile context for AI evaluation.');

    const { evaluateStartupMultimodal } = await import('../services/geminiService.js');
    const evaluation = await evaluateStartupMultimodal(stage, rawDocuments, founderProfileContext);

    const factRegistry = await registryFrom({
      texts: [founderProfileContext],
      documents: rawDocuments,
    });
    const guarded = guardResponse(evaluation, factRegistry);
    logReport(`evaluate startup=${startupId}`, guarded.report);
    const checkedEvaluation = guarded.value;

    try {
      await db.collection('startups').doc(startupId).set({ company_name: 'Pending Profile' }, { merge: true });
    } catch (startupErr: any) {
      console.warn('Warning: Failed to ensure startup row exists:', startupErr.message);
    }

    let savedEvaluation: any;
    try {
      const evalRef = await db.collection('ai_evaluations').add({
        startup_id: startupId,
        overall_score: evaluation.overall_score,
        team_score: evaluation.team_score,
        market_score: evaluation.market_score,
        execution_score: evaluation.execution_score,
        red_flags: checkedEvaluation.red_flags,
        stage_advice: checkedEvaluation.stage_advice,
        created_at: new Date()
      });
      const evalDoc = await evalRef.get();
      savedEvaluation = { id: evalDoc.id, ...evalDoc.data() };
    } catch (dbError: any) {
      console.error('Failed to save evaluation to database:', dbError);
      res.status(500).json({ error: 'Failed to persist evaluation to database', details: dbError.message });
      return;
    }

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
    const userId = (req as AuthenticatedRequest).userId;
    const { audioPath } = req.body;

    if (!audioPath.startsWith(`${userId}/`) && !audioPath.startsWith(`pitches/${userId}/`)) {
      res.status(403).json({ error: 'Unauthorized: Cannot access this audio file' });
      return;
    }

    console.log(`Downloading audio file from Firebase: ${audioPath}`);
    let buffer: Buffer;
    try {
      const bucket = storage.bucket();
      const file = bucket.file(`data_room/${audioPath}`);
      const [downloadedBuffer] = await file.download();
      buffer = downloadedBuffer;
    } catch (error: any) {
      console.error(`Error downloading audio:`, error?.message);
      res.status(404).json({ error: 'Failed to download audio file from storage' });
      return;
    }

    const tempFilePath = path.join(os.tmpdir(), `pitch_${Date.now()}.m4a`);
    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    const result = await transcribeAndEvaluatePitch(tempFilePath);

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
    
    let buffer: Buffer;
    let mimeType = doc.format || 'application/octet-stream';
    try {
      const bucket = storage.bucket();
      const file = bucket.file(`data_room/${doc.path}`);
      const [downloadedBuffer] = await file.download();
      buffer = downloadedBuffer;
      
      const [metadata] = await file.getMetadata();
      if (metadata.contentType) {
        mimeType = metadata.contentType;
      }
      const tempFilePath = path.join(os.tmpdir(), `investor_${Date.now()}_${path.basename(doc.path)}`);
      await fs.promises.writeFile(tempFilePath, buffer);
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

router.post('/investor-start', requireAuth, validate(investorStartRequestSchema), async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: DocumentInput[] = [];
  try {
    const callerId = (req as AuthenticatedRequest).userId;
    const startupId = req.body.startupId || callerId;
    
    // SECURITY FIX: IDOR Prevention
    if (callerId !== startupId) {
      const callerDoc = await db.collection('users').doc(callerId).get();
      if (!callerDoc.exists || callerDoc.data()?.role !== 'investor') {
        res.status(403).json({ error: 'Unauthorized: You can only access your own startup data' });
        return;
      }
    }

    const { stage, mode, documents } = req.body;
    
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

router.post('/investor-verdict', requireAuth, validate(investorVerdictRequestSchema), async (req: Request, res: Response): Promise<void> => {
  let rawDocuments: DocumentInput[] = [];
  try {
    const callerId = (req as AuthenticatedRequest).userId;
    const startupId = req.body.startupId || callerId;
    
    // SECURITY FIX: IDOR Prevention
    if (callerId !== startupId) {
      const callerDoc = await db.collection('users').doc(callerId).get();
      if (!callerDoc.exists || callerDoc.data()?.role !== 'investor') {
        res.status(403).json({ error: 'Unauthorized: You can only access your own startup data' });
        return;
      }
    }

    const { stage, mode, qaHistory, documents } = req.body;
    
    rawDocuments = await prepareDocuments(startupId, documents);

    for (let i = 0; i < qaHistory.length; i++) {
      const qa = qaHistory[i];
      if (qa.audioPath && (qa.audioPath.startsWith(`${startupId}/`) || qa.audioPath.startsWith(`pitches/${startupId}/`))) {
        try {
          const bucket = storage.bucket();
          const file = bucket.file(`data_room/${qa.audioPath}`);
          const [buffer] = await file.download();
          const [metadata] = await file.getMetadata();
          
          const tempFilePath = path.join(os.tmpdir(), `answer_${Date.now()}_${path.basename(qa.audioPath)}`);
          await fs.promises.writeFile(tempFilePath, buffer);
          qa.localAudioPath = tempFilePath;
          qa.mimeType = metadata.contentType || 'audio/m4a';
          rawDocuments.push({ type: `Answer_Audio_Q${i+1}`, mimeType: qa.mimeType, localPath: tempFilePath });
        } catch (err) {
          console.warn('Failed to download audio answer from Firebase:', err);
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

router.post('/ask-ai', requireAuth, validate(askAiRequestSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, evaluationContext, startupStage } = req.body;

    const { askAIReviewQuestion } = await import('../services/geminiService.js');
    const answer = await askAIReviewQuestion(message, evaluationContext, startupStage);

    res.status(200).json({ success: true, answer });
  } catch (error: any) {
    console.error('Ask AI Route Error:', error);
    const status = error.status || 500;
    res.status(status).json({ error: 'Failed to get answer from AI', details: error.message });
  }
});

router.post('/verify-sprint', requireAuth, validate(verifySprintSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { sprintTitle, sprintDesc, proofText, proofImageBase64 } = req.body;

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
