import { z } from "zod";
import { logger } from "./logger.js";

export function softValidate<T>(
  schema: z.ZodTypeAny,
  data: unknown,
  context: string,
) {
  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`,
    );
    logger.warn(`Schema validation warnings for ${context}`, { issues });
    return { ok: false, issues };
  }
  return { ok: true, value: result.data as T };
}
