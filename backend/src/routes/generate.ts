import express from 'express';
import { generateAssistText } from '../services/groqService.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = express.Router();

router.post('/', async (req, res): Promise<void> => {
  try {
    // SECURITY FIX: Enforce Authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid Authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !userData?.user) {
      console.error('Auth verification failed in generate:', authError?.message);
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    const { fieldLabel, context, instruction } = req.body;

    if (!fieldLabel || typeof fieldLabel !== 'string') {
      res.status(400).json({ error: 'Missing or invalid fieldLabel' });
      return;
    }

    const generatedText = await generateAssistText(fieldLabel, context || {}, instruction);
    res.status(200).json({ result: generatedText });
  } catch (error: any) {
    console.error('AI Generation Error:', error);
    const status = error.status || 500;
    const message = error.message || 'Internal Server Error';
    res.status(status).json({ error: message });
  }
});

export default router;
