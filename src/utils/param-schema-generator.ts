/**
 * Parameter Schema Generator
 *
 * Utilities to convert between EndpointConfig.params and Zod schemas.
 * This allows HTTP endpoints and MCP tools to share the same parameter definitions.
 */

import { z } from "zod";
import type { ParamConfig } from "../config/EndpointConfig.js";

/**
 * Convert EndpointConfig ParamConfig to Zod schema
 */
export function paramConfigToZod(
  paramName: string,
  paramConfig: ParamConfig,
): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  // Base type conversion
  switch (paramConfig.type) {
    case "string":
      schema = z.string();
      break;
    case "number":
      schema = z.number();
      break;
    case "boolean":
      schema = z.boolean();
      break;
    case "array":
      schema = z.array(z.string()); // Arrays are typically string arrays in HTTP
      break;
    default:
      schema = z.string(); // Default to string
  }

  // Apply optional/default
  if (!paramConfig.required) {
    schema = schema.optional();
  }

  if (paramConfig.default !== undefined) {
    schema = schema.default(paramConfig.default);
  }

  // Apply validation constraints
  if (paramConfig.type === "string") {
    if (paramConfig.pattern) {
      schema = (schema as z.ZodString).regex(new RegExp(paramConfig.pattern));
    }
    if (paramConfig.minLength !== undefined) {
      schema = (schema as z.ZodString).min(paramConfig.minLength);
    }
    if (paramConfig.maxLength !== undefined) {
      schema = (schema as z.ZodString).max(paramConfig.maxLength);
    }
    if (paramConfig.enum) {
      schema = z.enum(paramConfig.enum as [string, ...string[]]);
    }
  }

  if (paramConfig.type === "number") {
    if (paramConfig.min !== undefined) {
      schema = (schema as z.ZodNumber).min(paramConfig.min);
    }
    if (paramConfig.max !== undefined) {
      schema = (schema as z.ZodNumber).max(paramConfig.max);
    }
  }

  // Add description if available
  if (paramConfig.description) {
    schema = schema.describe(paramConfig.description);
  }

  return schema;
}

/**
 * Generate Zod schema from EndpointConfig.params
 */
export function generateZodSchemaFromParams(
  params: Record<string, ParamConfig>,
): z.ZodObject<any> {
  const shape: z.ZodRawShape = {};

  for (const [paramName, paramConfig] of Object.entries(params)) {
    shape[paramName] = paramConfigToZod(paramName, paramConfig);
  }

  return z.object(shape);
}

/**
 * Convert Zod schema to ParamConfig (reverse direction)
 * Useful for generating endpoint configs from existing Zod schemas
 */
export function zodToParamConfig(
  fieldName: string,
  zodType: z.ZodTypeAny,
): ParamConfig {
  const config: ParamConfig = {
    type: "string", // Default
    required: true,
  };

  // Handle optional/default
  if (zodType instanceof z.ZodOptional) {
    config.required = false;
    zodType = zodType._def.innerType;
  }

  if (zodType instanceof z.ZodDefault) {
    config.default = zodType._def.defaultValue();
    zodType = zodType._def.innerType;
  }

  // Handle base types
  if (zodType instanceof z.ZodString) {
    config.type = "string";

    // Check for enum
    if (zodType instanceof z.ZodEnum) {
      config.enum = zodType._def.values;
    }

    // Check for regex (min/max would need to be extracted from refinements)
    // This is a simplified version - full implementation would need to parse refinements
  } else if (zodType instanceof z.ZodNumber) {
    config.type = "number";
  } else if (zodType instanceof z.ZodBoolean) {
    config.type = "boolean";
  } else if (zodType instanceof z.ZodArray) {
    config.type = "array";
  }

  // Extract description if available
  if (zodType.description) {
    config.description = zodType.description;
  }

  return config;
}

/**
 * Generate EndpointConfig.params from Zod schema
 */
export function generateParamsFromZodSchema(
  schema: z.ZodObject<any>,
): Record<string, ParamConfig> {
  const params: Record<string, ParamConfig> = {};

  for (const [fieldName, fieldSchema] of Object.entries(schema.shape)) {
    params[fieldName] = zodToParamConfig(
      fieldName,
      fieldSchema as z.ZodTypeAny,
    );
  }

  return params;
}
