import { z } from 'zod';
// ─── Evaluate Endpoint Schema ───────────────────────────────────────────────
/**
 * Schema for POST /api/evaluate
 *
 * Validates the incoming request body before any AI processing or
 * database operations occur. Prevents malformed or malicious payloads
 * from reaching the Gemini/Groq SDKs.
 */
export const evaluateRequestSchema = z.object({
    stage: z
        .string({ error: 'stage is required' })
        .min(1, 'stage cannot be empty')
        .refine((val) => ['pre-seed', 'preseed', 'seed', 'series-a', 'series-b', 'series a', 'series b'].includes(val.toLowerCase()), { message: 'stage must be one of: Pre-Seed, Seed, Series-A, Series-B' }),
    pitchDeckPath: z.string().optional(),
    financialsPath: z.string().optional(),
    documents: z
        .array(z.object({
        type: z.string().min(1, 'document type is required'),
        path: z.string().min(1, 'document path is required'),
        format: z.string().optional(),
    }))
        .optional()
        .default([]),
});
// ─── Generate Endpoint Schema ───────────────────────────────────────────────
/**
 * Schema for POST /api/generate
 *
 * Validates AI Assist text generation requests. Enforces max length
 * on the instruction field to prevent prompt injection attacks via
 * oversized payloads.
 */
export const generateRequestSchema = z.object({
    fieldLabel: z
        .string({ error: 'fieldLabel is required' })
        .min(1, 'fieldLabel cannot be empty')
        .max(200, 'fieldLabel must be under 200 characters'),
    context: z.record(z.string(), z.unknown()).optional().default({}),
    instruction: z.string().max(2000, 'instruction must be under 2000 characters').optional(),
});
// ─── Pitch Evaluation Endpoint Schema ───────────────────────────────────────
/**
 * Schema for POST /api/evaluate/pitch
 */
export const pitchRequestSchema = z.object({
    audioPath: z
        .string({ error: 'audioPath is required' })
        .min(1, 'audioPath cannot be empty'),
});
// ─── Reusable Validation Middleware Factory ─────────────────────────────────
/**
 * Creates Express middleware that validates req.body against a Zod schema.
 *
 * On validation failure, returns a 400 response with structured error details.
 * On success, replaces req.body with the parsed (and default-filled) data
 * so downstream handlers always receive clean, typed data.
 *
 * Usage:
 *   router.post('/', requireAuth, validate(evaluateRequestSchema), handler);
 */
export const validate = (schema) => {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.flatten();
            res.status(400).json({
                error: 'Invalid request body',
                details: {
                    fieldErrors: errors.fieldErrors,
                    formErrors: errors.formErrors,
                },
            });
            return;
        }
        // Replace req.body with the parsed, type-safe data (includes defaults)
        req.body = result.data;
        next();
    };
};
//# sourceMappingURL=schemas.js.map