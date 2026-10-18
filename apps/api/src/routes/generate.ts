import express from 'express';
import { generateAssistText } from '../services/geminiService.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate, generateRequestSchema } from '../validators/schemas.js';

const router = express.Router();

router.post('/', requireAuth, validate(generateRequestSchema), async (req, res): Promise<void> => {
  try {
    // req.body validated and defaults applied by Zod
    const { fieldLabel, context, instruction } = req.body;

    const generatedText = await generateAssistText(fieldLabel, context, instruction);
    res.status(200).json({ result: generatedText });

  } catch (error: any) {
    console.error('AI Generation Error:', error);
    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  }
});

export default router;
