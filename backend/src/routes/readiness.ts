/**
 * The funding-readiness score, as an endpoint.
 *
 * `ScoreRing.tsx` already exists in the app. This is what it can finally be
 * pointed at: a score that is computed rather than asserted, and that arrives
 * with the single next action attached, because a bare number is not
 * actionable.
 *
 * The score is deliberately computed from module scores the caller supplies
 * rather than inferred here. Working out how complete a founder's data room is
 * belongs to whatever owns that data; this endpoint owns the roll-up, the
 * integrity ceilings and the choice of what to do next.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { requireAuth } from '../middleware/auth.js';
import { MODULE_LABELS, scoreReadiness } from '../domain/readiness/readiness.js';

const router = Router();

const ModuleKeySchema = z.enum(
  Object.keys(MODULE_LABELS) as [keyof typeof MODULE_LABELS, ...(keyof typeof MODULE_LABELS)[]],
);

const ReadinessRequestSchema = z.object({
  modules: z.array(z.object({
    key: ModuleKeySchema,
    completion: z.number().min(0).max(100),
    quality: z.number().min(0).max(100),
    notes: z.array(z.string()).optional(),
  })).default([]),
  criticalContradictions: z.array(z.string()).optional(),
  unreviewedAssumptions: z.array(z.string()).optional(),
});

router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ReadinessRequestSchema.parse(req.body);

    // The schema makes optional fields `T | undefined`, which the domain types
    // refuse under exactOptionalPropertyTypes. Normalising here keeps that
    // strictness in the engine rather than loosening it to suit a parser.
    const readiness = scoreReadiness({
      modules: body.modules.map((module) => ({
        key: module.key,
        completion: module.completion,
        quality: module.quality,
        notes: module.notes ?? [],
      })),
      criticalContradictions: body.criticalContradictions ?? [],
      unreviewedAssumptions: body.unreviewedAssumptions ?? [],
    });

    res.status(200).json({ success: true, readiness });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Invalid readiness request', details: error.issues });
      return;
    }
    next(error);
  }
});

/** The module keys and weights, so a client can render the breakdown. */
router.get('/modules', requireAuth, (_req: Request, res: Response) => {
  res.status(200).json({ modules: MODULE_LABELS });
});

export default router;
