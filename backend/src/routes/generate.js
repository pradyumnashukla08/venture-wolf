import express from 'express';
import { generateAssistText } from '../services/groqService.js';
import { requireAuth } from '../middleware/auth.js';
import { validate, generateRequestSchema } from '../validators/schemas.js';
const router = express.Router();
router.post('/', requireAuth, validate(generateRequestSchema), async (req, res) => {
    try {
        // req.body validated and defaults applied by Zod
        const { fieldLabel, context, instruction } = req.body;
        const generatedText = await generateAssistText(fieldLabel, context, instruction);
        res.status(200).json({ result: generatedText });
    }
    catch (error) {
        console.error('AI Generation Error:', error);
        const status = error.status || 500;
        const message = error.message || 'Internal Server Error';
        res.status(status).json({ error: message });
    }
});
export default router;
//# sourceMappingURL=generate.js.map