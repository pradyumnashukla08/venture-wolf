import express, { type Request, type Response } from 'express';
import { z } from 'zod';
import { db } from '../config/firebase.ts';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.ts';

const router = express.Router();

export const StartupProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().max(100).optional().default(''),
  companyName: z.string().max(100).optional(),
  tagline: z.string().max(250).optional(),
  pitch: z.string().max(1000).optional(),
  category: z.string().max(100).optional(),
  sector: z.string().max(100).optional(),
  stage: z.enum(['Pre-Seed', 'Seed', 'Series-A', 'Series-B']).default('Seed'),
  founder: z.string().max(100).optional(),
  fullName: z.string().max(100).optional(),
  role: z.string().max(100).optional(),
  location: z.string().max(100).optional(),
  website: z.string().max(200).optional(),
  websiteUrl: z.string().max(200).optional(),
  linkedinUrl: z.string().max(200).optional(),
  email: z.string().email().optional().or(z.literal('')),
  targetAsk: z.string().max(50).optional(),
  targetRaise: z.string().max(50).optional(),
  valuation: z.string().max(50).optional(),
  valuationCap: z.string().max(50).optional(),
  equityOffered: z.string().max(20).optional(),
  capitalCommitted: z.string().max(50).optional(),
  mrr: z.string().max(50).optional(),
  currentMrr: z.string().max(50).optional(),
  burn: z.string().max(50).optional(),
  burnRate: z.string().max(50).optional(),
  growth: z.string().max(20).optional(),
  momGrowth: z.string().max(20).optional(),
  fundabilityScore: z.number().min(0).max(100).default(80),
  tam: z.string().max(50).optional(),
  sam: z.string().max(50).optional(),
  som: z.string().max(50).optional(),
  competitor1: z.string().max(200).optional(),
  competitor2: z.string().max(200).optional(),
  competitor3: z.string().max(200).optional(),
  distributionMoat: z.string().max(1000).optional(),
  isRegistered: z.boolean().optional(),
  registrationNo: z.string().max(50).optional(),
  companyType: z.string().max(50).optional(),
  currency: z.string().max(20).optional(),
  team: z.array(z.object({
    name: z.string().max(100),
    role: z.string().max(100),
    linkedin: z.string().max(200).optional(),
  })).optional(),
  grossMargin: z.string().max(20).optional(),
  cac: z.string().max(50).optional(),
  runway: z.string().max(20).optional(),
  verifiedArr: z.string().max(50).optional(),
  churnRate: z.string().max(20).optional(),
  nrr: z.string().max(20).optional(),
  ltvcacRatio: z.string().max(20).optional(),
  cacPayback: z.string().max(20).optional(),
});

/**
 * GET /api/startup/profile
 * Get authenticated user's startup profile
 */
router.get('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const doc = await db.collection('startups').doc(userId).get();

    if (!doc.exists) {
      res.status(200).json({ success: true, profile: null });
      return;
    }

    res.status(200).json({ success: true, profile: doc.data() });
  } catch (error: any) {
    console.error('[Startup Profile Get Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to retrieve startup profile' });
  }
});

/**
 * PUT /api/startup/profile
 * Upsert authenticated user's startup profile (enforcing ownership via userId)
 */
router.put('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    const userEmail = (req as AuthenticatedRequest).userEmail || '';

    const parsed = StartupProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Validation failed', details: parsed.error.format() });
      return;
    }

    const rawData = parsed.data;
    const finalName = rawData.name || rawData.companyName || 'My Startup';
    const finalCompanyName = rawData.companyName || finalName;

    const payload = {
      ...rawData,
      name: finalName,
      companyName: finalCompanyName,
      id: userId,
      founder_id: userId,
      user_email: userEmail,
      updated_at: new Date().toISOString(),
    };

    await db.collection('startups').doc(userId).set(payload, { merge: true });

    res.status(200).json({ success: true, message: 'Startup profile updated successfully', profile: payload });
  } catch (error: any) {
    console.error('[Startup Profile Put Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to update startup profile' });
  }
});

/**
 * DELETE /api/startup/profile
 * Delete authenticated user's startup profile
 */
router.delete('/profile', requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as AuthenticatedRequest).userId;
    await db.collection('startups').doc(userId).delete();
    res.status(200).json({ success: true, message: 'Startup profile deleted successfully' });
  } catch (error: any) {
    console.error('[Startup Profile Delete Error]:', error.message || error);
    res.status(500).json({ error: 'Failed to delete startup profile' });
  }
});

export default router;
