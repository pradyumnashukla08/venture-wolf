import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { ForecastRequestSchema } from '../validators/financeSchemas.js';
import { generateMarketAssumptions } from '../services/ai/financeAnalyst.js';
import { extractDataRoomContext } from '../services/ai/documentParser.js';
import { injectAndExtractFinancials } from '../services/finance/excelInjector.js';
import { requireAuth } from '../middleware/auth.js';
import { ZodError } from 'zod';

const router = Router();

// Fixes async express route handler issues
router.post('/forecast', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  (async () => {
    try {
      // Enforce schema compliance validation immediately at routing entrance
      const validatedBody = ForecastRequestSchema.parse(req.body);

      // Phase 1.5: Multi-Modal Data Room parsing
      const documentUrls = validatedBody.documentUrls || [];
      const dataRoomContext = await extractDataRoomContext(documentUrls);
      console.log('[PHASE 1.5] Multi-Modal Data Room parsing complete.');

      // Phase 1: Call context analyst model matching profile scope inputs
      const aiAssumptions = await generateMarketAssumptions(
        validatedBody.description,
        validatedBody.archetype,
        dataRoomContext
      );

      // Phase 2: Inject structures directly down to asset files and parse results
      const executionResults = await injectAndExtractFinancials(
        validatedBody.archetype,
        aiAssumptions,
        validatedBody.companyName
      );

      // Phase 3: Valuation Reality Check
      // If the worst-case scenario exhausts runway (negative EBITDA) by Year 2, flag it for the frontend
      const ebitdaArray = executionResults.summaryData.worstCase['5. EBITDA'];
      const worstCaseYear2Ebitda = (ebitdaArray && ebitdaArray.length > 1 ? ebitdaArray[1] : 0) as number;
      const highRiskOfRuin = worstCaseYear2Ebitda < 0;

      res.status(200).json({
        success: true,
        data: {
          assumptionsGenerated: aiAssumptions,
          projections: executionResults.summaryData,
          downloadUrl: executionResults.downloadUrl,
          highRiskOfRuin
        }
      });
    } catch (error) {
      next(error);
    }
  })();
});

export default router;
