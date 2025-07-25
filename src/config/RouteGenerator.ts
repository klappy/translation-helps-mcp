/**
 * Route Generator
 * 
 * Auto-generates API route handlers from endpoint configurations.
 * Applies transformations and ensures consistent behavior.
 */

import type { EndpointConfig } from './EndpointConfig';
import { EndpointRegistry } from './EndpointRegistry';
import { logger } from '../utils/logger';
import { unifiedCache } from '../functions/unified-cache';
import { DCSApiClient } from '../services/DCSApiClient';
import { parseReference } from '../functions/reference-parser';
import { extractVerseText, extractChapterText } from '../functions/usfm-extractor';

/**
 * Generate route handler from endpoint configuration
 */
export function generateRouteHandler(config: EndpointConfig) {
  return async (request: Request) => {
    const startTime = Date.now();
    
    try {
      // Parse request parameters
      const url = new URL(request.url);
      const params = parseParams(url.searchParams, config.params);
      
      // Validate required parameters
      const validation = validateParams(params, config.params);
      if (!validation.valid) {
        return createErrorResponse(400, validation.error || 'Invalid parameters');
      }
      
      // Generate cache key
      const cacheKey = generateCacheKey(config.name, params);
      
      // Try cache first
      const cached = await unifiedCache.get(cacheKey);
      if (cached.value) {
        logger.info(`Cache hit for ${config.name}`);
        return createSuccessResponse(cached.value, {
          cached: true,
          responseTime: Date.now() - startTime,
        });
      }
      
      // Fetch data based on config
      let data;
      if (config.dataSource.type === 'dcs') {
        data = await fetchFromDCS(params, config);
      } else {
        data = await computeData(params, config);
      }
      
      // Apply transformation if needed
      if (config.dataSource.transformation) {
        data = await applyTransformation(data, config.dataSource.transformation, params);
      }
      
      // Format response according to shape
      const response = formatResponse(data, config.responseShape, params);
      
      // Cache the response
      await unifiedCache.set(cacheKey, response, 'apiResponse');
      
      // Return success response
      return createSuccessResponse(response, {
        cached: false,
        responseTime: Date.now() - startTime,
      });
      
    } catch (error) {
      logger.error(`Error in ${config.name}:`, error);
      return createErrorResponse(500, error instanceof Error ? error.message : 'Internal server error');
    }
  };
}

/**
 * Parse parameters from query string
 */
function parseParams(searchParams: URLSearchParams, paramConfigs: Record<string, any>): Record<string, any> {
  const params: Record<string, any> = {};
  
  for (const [name, config] of Object.entries(paramConfigs)) {
    if (!config) continue;
    
    const value = searchParams.get(name);
    if (value !== null) {
      params[name] = parseParamValue(value, config.type);
    } else if (config.default !== undefined) {
      params[name] = config.default;
    }
  }
  
  return params;
}

/**
 * Parse parameter value based on type
 */
function parseParamValue(value: string, type: string): any {
  switch (type) {
    case 'number':
      return parseInt(value, 10);
    case 'boolean':
      return value === 'true';
    case 'array':
      return value.split(',');
    default:
      return value;
  }
}

/**
 * Validate parameters
 */
function validateParams(params: Record<string, any>, paramConfigs: Record<string, any>): { valid: boolean; error?: string } {
  for (const [name, config] of Object.entries(paramConfigs)) {
    if (!config) continue;
    
    if (config.required && !(name in params)) {
      return { valid: false, error: `Missing required parameter: ${name}` };
    }
    
    if (name in params && config.validation) {
      const value = params[name];
      
      if (config.validation.pattern) {
        const regex = new RegExp(config.validation.pattern);
        if (!regex.test(value)) {
          return { valid: false, error: `Invalid format for parameter: ${name}` };
        }
      }
      
      if (config.validation.enum && !config.validation.enum.includes(value)) {
        return { valid: false, error: `Invalid value for parameter: ${name}. Must be one of: ${config.validation.enum.join(', ')}` };
      }
    }
  }
  
  return { valid: true };
}

/**
 * Generate cache key from endpoint name and params
 */
function generateCacheKey(endpointName: string, params: Record<string, any>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join('&');
  return `${endpointName}:${sortedParams}`;
}

/**
 * Fetch data from DCS
 */
async function fetchFromDCS(params: Record<string, any>, config: EndpointConfig): Promise<any> {
  const client = new DCSApiClient();
  
  // Enable X-ray tracing
  client.enableTracing(config.name);
  
  try {
    // Fetch based on resource type
    const resource = config.dataSource.resource || '';
    const { language = 'en', organization = 'unfoldingWord' } = params;
    
    // Get repository info
    const repoPath = `${organization}/${language}_${resource}`;
    const repo = await client.getRepository(repoPath);
    
    if (!repo.success) {
      throw new Error(`Resource not found: ${repoPath}`);
    }
    
    // Fetch content based on reference
    if (params.reference) {
      const ref = parseReference(params.reference);
      // Implement reference-based fetching
      // This would involve getting the right file from DCS
    }
    
    return repo.data;
    
  } finally {
    client.disableTracing();
  }
}

/**
 * Compute data (for non-DCS endpoints)
 */
async function computeData(params: Record<string, any>, config: EndpointConfig): Promise<any> {
  // Implement computed data logic
  // This would handle endpoints that aggregate or compute data
  return {};
}

/**
 * Apply transformation to data
 */
async function applyTransformation(data: any, transformation: string, params: Record<string, any>): Promise<any> {
  switch (transformation) {
    case 'usfm-to-text':
      // Extract text from USFM
      if (params.reference) {
        const ref = parseReference(params.reference);
        if (ref.verse) {
          return extractVerseText(data, ref.chapter, ref.verse, ref.endVerse);
        } else {
          return extractChapterText(data, ref.chapter);
        }
      }
      return data;
      
    case 'tsv-parse':
      // Parse TSV data
      return parseTSV(data);
      
    case 'markdown-assemble':
      // Assemble markdown sections
      return assembleMarkdown(data);
      
    default:
      return data;
  }
}

/**
 * Parse TSV data
 */
function parseTSV(data: string): any[] {
  const lines = data.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split('\t');
  return lines.slice(1).map(line => {
    const values = line.split('\t');
    const obj: Record<string, string> = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

/**
 * Assemble markdown sections
 */
function assembleMarkdown(data: any): string {
  // Implement markdown assembly logic
  return data;
}

/**
 * Format response according to shape
 */
function formatResponse(data: any, shape: any, params: Record<string, any>): any {
  // Format the response to match the defined shape
  const response: Record<string, any> = {};
  
  for (const [field, config] of Object.entries(shape.fields)) {
    if (field in data) {
      response[field] = data[field];
    } else if (!config.optional) {
      // Provide default value for required fields
      response[field] = config.type === 'array' ? [] : 
                       config.type === 'number' ? 0 : 
                       config.type === 'boolean' ? false : '';
    }
  }
  
  // Add standard fields
  if (params.reference) response.reference = params.reference;
  if (params.language) response.language = params.language;
  
  return response;
}

/**
 * Create success response
 */
function createSuccessResponse(data: any, metadata: any): Response {
  return new Response(JSON.stringify({
    ...data,
    metadata: {
      ...metadata,
      timestamp: new Date().toISOString(),
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'X-Cache': metadata.cached ? 'HIT' : 'MISS',
      'X-Response-Time': `${metadata.responseTime}ms`,
    }
  });
}

/**
 * Create error response
 */
function createErrorResponse(status: number, message: string): Response {
  return new Response(JSON.stringify({
    error: message,
    timestamp: new Date().toISOString(),
  }), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    }
  });
}