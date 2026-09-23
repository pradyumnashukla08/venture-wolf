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
import { checkConsistency } from '../domain/consistency/checker.js';
import type { Claim } from '../domain/consistency/types.js';

const router = Router();

const ModuleKeySchema = z.enum(
  Object.keys(MODULE_LABELS) as [keyof typeof MODULE_LABELS, ...(keyof typeof MODULE_LABELS)[]],
);

const ClaimSchema = z.object({
  module: z.string().min(1),
  field: z.string().min(1),
  value: z.number(),
  location: z.string().optional(),
});

const ReadinessRequestSchema = z.object({
  modules: z.array(z.object({
    key: ModuleKeySchema,
    completion: z.number().min(0).max(100),
    quality: z.number().min(0).max(100),
    notes: z.array(z.string()).optional(),
  })).default([]),
  unreviewedAssumptions: z.array(z.string()).optional(),

  // Figures the modules claim. The checker derives the contradictions from
  // these rather than the caller asserting them: a client that decides for
  // itself what counts as a contradiction can quietly suppress one, and the
  // ceiling exists precisely to be un-suppressable.
  claims: z.array(ClaimSchema).optional(),
  marketingSpend: ClaimSchema.optional(),
  newCustomers: ClaimSchema.optional(),
  statedCac: ClaimSchema.optional(),
  cashBalance: ClaimSchema.optional(),
  monthlyBurn: ClaimSchema.optional(),
  statedRunway: ClaimSchema.optional(),
  ltv: ClaimSchema.optional(),
});

type ParsedClaim = z.infer<typeof ClaimSchema>;

/**
 * Drop absent optional properties rather than passing them as `undefined`.
 *
 * `exactOptionalPropertyTypes` distinguishes "no location" from "location is
 * undefined", and Zod produces the latter. Normalising at the boundary keeps
 * the strictness in the domain types where it is useful.
 */
function toClaim(claim: ParsedClaim): Claim {
  return claim.location === undefined
    ? { module: claim.module, field: claim.field, value: claim.value }
    : { module: claim.module, field: claim.field, value: claim.value, location: claim.location };
}

function present(entries: Record<string, ParsedClaim | undefined>): Record<string, Claim> {
  return Object.fromEntries(
    Object.entries(entries)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, toClaim(value as ParsedClaim)]),
  );
}

router.post('/', requireAuth, (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = ReadinessRequestSchema.parse(req.body);

    // Contradictions are computed, not taken on trust. The readiness ceiling
    // is only meaningful if the thing that triggers it cannot be omitted by
    // the caller.
    const consistency = checkConsistency({
      claims: (body.claims ?? []).map(toClaim),
      ...present({
        marketingSpend: body.marketingSpend,
        newCustomers: body.newCustomers,
        statedCac: body.statedCac,
        cashBalance: body.cashBalance,
        monthlyBurn: body.monthlyBurn,
        statedRunway: body.statedRunway,
        ltv: body.ltv,
      }),
    });

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
      criticalContradictions: consistency.criticalSummaries,
      unreviewedAssumptions: body.unreviewedAssumptions ?? [],
    });

    res.status(200).json({ success: true, readiness, consistency });
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
