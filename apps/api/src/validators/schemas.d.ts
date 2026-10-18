import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';
/**
 * Schema for POST /api/evaluate
 *
 * Validates the incoming request body before any AI processing or
 * database operations occur. Prevents malformed or malicious payloads
 * from reaching the Gemini/Groq SDKs.
 */
export declare const evaluateRequestSchema: z.ZodObject<{
    stage: z.ZodString;
    pitchDeckPath: z.ZodOptional<z.ZodString>;
    financialsPath: z.ZodOptional<z.ZodString>;
    documents: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        path: z.ZodString;
        format: z.ZodOptional<z.ZodString>;
    }, z.core.$strip>>>>;
}, z.core.$strip>;
export type EvaluateRequestBody = z.infer<typeof evaluateRequestSchema>;
/**
 * Schema for POST /api/generate
 *
 * Validates AI Assist text generation requests. Enforces max length
 * on the instruction field to prevent prompt injection attacks via
 * oversized payloads.
 */
export declare const generateRequestSchema: z.ZodObject<{
    fieldLabel: z.ZodString;
    context: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>>;
    instruction: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type GenerateRequestBody = z.infer<typeof generateRequestSchema>;
/**
 * Schema for POST /api/evaluate/pitch
 */
export declare const pitchRequestSchema: z.ZodObject<{
    audioPath: z.ZodString;
}, z.core.$strip>;
export type PitchRequestBody = z.infer<typeof pitchRequestSchema>;
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
export declare const validate: <T extends z.ZodTypeAny>(schema: T) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=schemas.d.ts.map