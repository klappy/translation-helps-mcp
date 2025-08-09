import { z } from "zod";

// Shared metadata fields (soft)
export const metadataSchema = z
  .object({
    cached: z.boolean().optional(),
    responseTime: z.number().optional(),
    timestamp: z.string().optional(),
  })
  .passthrough();

// Citation (soft)
export const citationSchema = z
  .object({
    resource: z.string().optional(),
    organization: z.string().optional(),
    language: z.string().optional(),
    url: z.string().optional(),
    version: z.string().optional(),
  })
  .passthrough();

// Scripture item shape (soft)
export const scriptureItemSchema = z
  .object({
    text: z.string().optional(),
    translation: z.string().optional(),
    citation: citationSchema.optional(),
    usfm: z.string().optional(),
  })
  .passthrough();

// Preferred array-based scripture response
export const scriptureArrayResponseSchema = z.object({
  scriptures: z.array(scriptureItemSchema),
  language: z.string().optional(),
  organization: z.string().optional(),
  metadata: metadataSchema.optional(),
});

// Backward-compatible single scripture response
export const scriptureSingleResponseSchema = z.object({
  scripture: scriptureItemSchema.nullish(),
  scriptures: z.array(scriptureItemSchema).nullish(),
  language: z.string().optional(),
  organization: z.string().optional(),
  metadata: metadataSchema.optional(),
});

// Union accepts either shape during migration
export const scriptureResponseSchema = z.union([
  scriptureArrayResponseSchema,
  scriptureSingleResponseSchema,
]);

export type ScriptureResponse = z.infer<typeof scriptureResponseSchema>;

// Languages response (soft)
export const languageItemSchema = z
  .object({ code: z.string().optional(), name: z.string().optional() })
  .passthrough();

export const languagesResponseSchema = z.object({
  languages: z.array(languageItemSchema),
  organization: z.string().optional(),
  metadata: metadataSchema.optional(),
});

// Questions response (soft)
export const questionItemSchema = z
  .object({
    reference: z.string().optional(),
    question: z.string().optional(),
    answer: z.string().optional(),
  })
  .passthrough();

export const questionsResponseSchema = z.object({
  questions: z.array(questionItemSchema).optional(),
  citation: citationSchema.optional(),
  metadata: metadataSchema.optional(),
});
