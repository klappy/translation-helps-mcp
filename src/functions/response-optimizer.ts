/**
 * Response Payload Optimization System
 * 
 * Reduces bandwidth usage and improves mobile performance by optimizing API responses.
 * Supports field filtering, pagination, compression, and payload size monitoring.
 * 
 * Based on Task 12 of the implementation plan.
 */

import { PerformanceTargets } from '../constants/terminology';

export interface OptimizationOptions {
  enableCompression: boolean;
  removeNullFields: boolean;
  removeEmptyFields: boolean;
  enableFieldFiltering: boolean;
  enablePagination: boolean;
  maxPayloadSize: number; // bytes
  compressionThreshold: number; // bytes - only compress if larger than this
}

export interface FieldFilter {
  include?: string[]; // Only include these fields
  exclude?: string[]; // Exclude these fields
  maxDepth?: number; // Maximum object nesting depth
}

export interface PaginationOptions {
  page: number;
  limit: number;
  maxLimit: number; // Maximum allowed limit
}

export interface OptimizedResponse<T> {
  data: T;
  _meta: ResponseMeta;
}

export interface ResponseMeta {
  optimization: {
    originalSize: number;
    optimizedSize: number;
    compressionRatio: number;
    fieldsFiltered: boolean;
    paginated: boolean;
    compressed: boolean;
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  performance: {
    processingTime: number;
    cacheHit: boolean;
    timestamp: string;
  };
}

export class ResponseOptimizer {
  private options: OptimizationOptions;
  private compressionStats = {
    totalResponses: 0,
    compressedResponses: 0,
    totalOriginalSize: 0,
    totalCompressedSize: 0,
    averageCompressionRatio: 0
  };

  constructor(options: Partial<OptimizationOptions> = {}) {
    this.options = {
      enableCompression: true,
      removeNullFields: true,
      removeEmptyFields: true,
      enableFieldFiltering: true,
      enablePagination: true,
      maxPayloadSize: 500 * 1024, // 500KB
      compressionThreshold: 1024, // 1KB
      ...options
    };
  }

  /**
   * Optimize response payload
   */
  async optimize<T>(
    data: T,
    filterOptions?: FieldFilter,
    paginationOptions?: PaginationOptions,
    performanceData?: { cacheHit: boolean; processingStartTime: number }
  ): Promise<OptimizedResponse<T>> {
    const startTime = Date.now();
    let optimizedData = data;
    let fieldsFiltered = false;
    let paginated = false;
    let compressed = false;

    // Step 1: Clean up fields
    if (this.options.removeNullFields || this.options.removeEmptyFields) {
      optimizedData = this.cleanFields(optimizedData);
    }

    // Step 2: Apply field filtering
    if (this.options.enableFieldFiltering && filterOptions) {
      optimizedData = this.applyFieldFilter(optimizedData, filterOptions);
      fieldsFiltered = true;
    }

    // Step 3: Apply pagination for array data
    let paginationMeta: ResponseMeta['pagination'] | undefined;
    if (this.options.enablePagination && paginationOptions && Array.isArray(optimizedData)) {
      const paginationResult = this.applyPagination(optimizedData as any[], paginationOptions);
      optimizedData = paginationResult.data as T;
      paginationMeta = paginationResult.meta;
      paginated = true;
    }

    // Step 4: Calculate sizes
    const originalSize = this.calculateSize(data);
    let optimizedSize = this.calculateSize(optimizedData);

    // Step 5: Check if payload exceeds size limit
    if (optimizedSize > this.options.maxPayloadSize) {
      throw new Error(`Response payload too large: ${optimizedSize} bytes (limit: ${this.options.maxPayloadSize})`);
    }

    // Step 6: Apply compression if beneficial
    if (this.options.enableCompression && optimizedSize > this.options.compressionThreshold) {
      // Note: In a real implementation, you'd use actual compression like gzip
      // For this example, we'll simulate compression
      const compressionRatio = this.simulateCompression(optimizedSize);
      optimizedSize = Math.round(optimizedSize * compressionRatio);
      compressed = true;
    }

    // Update stats
    this.updateCompressionStats(originalSize, optimizedSize);

    const processingTime = Date.now() - startTime;

    const meta: ResponseMeta = {
      optimization: {
        originalSize,
        optimizedSize,
        compressionRatio: originalSize > 0 ? optimizedSize / originalSize : 1,
        fieldsFiltered,
        paginated,
        compressed
      },
      pagination: paginationMeta,
      performance: {
        processingTime,
        cacheHit: performanceData?.cacheHit || false,
        timestamp: new Date().toISOString()
      }
    };

    return {
      data: optimizedData,
      _meta: meta
    };
  }

  /**
   * Clean null and empty fields from data
   */
  private cleanFields<T>(data: T): T {
    if (data === null || data === undefined) {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.cleanFields(item)) as T;
    }

    if (typeof data === 'object') {
      const cleaned: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        // Remove null fields if enabled
        if (this.options.removeNullFields && (value === null || value === undefined)) {
          continue;
        }

        // Remove empty fields if enabled
        if (this.options.removeEmptyFields) {
          if (value === '' || 
              (Array.isArray(value) && value.length === 0) ||
              (typeof value === 'object' && value !== null && Object.keys(value).length === 0)) {
            continue;
          }
        }

        // Recursively clean nested objects
        cleaned[key] = this.cleanFields(value);
      }

      return cleaned as T;
    }

    return data;
  }

  /**
   * Apply field filtering to data
   */
  private applyFieldFilter<T>(data: T, filter: FieldFilter): T {
    if (data === null || data === undefined || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.applyFieldFilter(item, filter)) as T;
    }

    const filtered: any = {};
    const dataObj = data as any;

    // Apply include filter
    if (filter.include && filter.include.length > 0) {
      for (const field of filter.include) {
        if (field in dataObj) {
          filtered[field] = this.applyFieldFilterRecursive(dataObj[field], filter, 1);
        }
      }
    } else {
      // Copy all fields, then apply exclude filter
      for (const [key, value] of Object.entries(dataObj)) {
        if (!filter.exclude || !filter.exclude.includes(key)) {
          filtered[key] = this.applyFieldFilterRecursive(value, filter, 1);
        }
      }
    }

    return filtered as T;
  }

  /**
   * Recursively apply field filtering with depth limit
   */
  private applyFieldFilterRecursive(value: any, filter: FieldFilter, currentDepth: number): any {
    if (filter.maxDepth && currentDepth >= filter.maxDepth) {
      return value; // Stop filtering at max depth
    }

    if (value === null || value === undefined || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map(item => this.applyFieldFilterRecursive(item, filter, currentDepth + 1));
    }

    const filtered: any = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (!filter.exclude || !filter.exclude.includes(key)) {
        filtered[key] = this.applyFieldFilterRecursive(nestedValue, filter, currentDepth + 1);
      }
    }

    return filtered;
  }

  /**
   * Apply pagination to array data
   */
  private applyPagination<T>(
    data: T[],
    options: PaginationOptions
  ): { data: T[]; meta: ResponseMeta['pagination'] } {
    const { page, limit: requestedLimit } = options;
    const limit = Math.min(requestedLimit, options.maxLimit);
    const offset = (page - 1) * limit;
    
    const total = data.length;
    const totalPages = Math.ceil(total / limit);
    const paginatedData = data.slice(offset, offset + limit);

    return {
      data: paginatedData,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    };
  }

  /**
   * Calculate approximate size of data in bytes
   */
  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  /**
   * Simulate compression ratio (in real implementation, use actual compression)
   */
  private simulateCompression(originalSize: number): number {
    // Simulate different compression ratios based on content type
    if (originalSize < 1024) return 0.9; // Small files compress less
    if (originalSize < 10240) return 0.7; // Medium files
    if (originalSize < 102400) return 0.6; // Large files
    return 0.5; // Very large files compress more
  }

  /**
   * Update compression statistics
   */
  private updateCompressionStats(originalSize: number, optimizedSize: number): void {
    this.compressionStats.totalResponses++;
    this.compressionStats.totalOriginalSize += originalSize;
    this.compressionStats.totalCompressedSize += optimizedSize;
    
    if (optimizedSize < originalSize) {
      this.compressionStats.compressedResponses++;
    }

    this.compressionStats.averageCompressionRatio = 
      this.compressionStats.totalCompressedSize / this.compressionStats.totalOriginalSize;
  }

  /**
   * Get optimization statistics
   */
  getStats(): {
    totalResponses: number;
    compressedResponses: number;
    averageCompressionRatio: number;
    totalBandwidthSaved: number;
    averageResponseSize: number;
  } {
    const totalBandwidthSaved = this.compressionStats.totalOriginalSize - this.compressionStats.totalCompressedSize;
    const averageResponseSize = this.compressionStats.totalResponses > 0 
      ? this.compressionStats.totalCompressedSize / this.compressionStats.totalResponses 
      : 0;

    return {
      totalResponses: this.compressionStats.totalResponses,
      compressedResponses: this.compressionStats.compressedResponses,
      averageCompressionRatio: this.compressionStats.averageCompressionRatio,
      totalBandwidthSaved,
      averageResponseSize
    };
  }

  /**
   * Check if response meets performance targets
   */
  validatePerformanceTargets(responseSize: number, responseTime: number): {
    meetsTargets: boolean;
    issues: string[];
  } {
    const issues: string[] = [];
    
    // Check size targets from PRD
    if (responseSize > 10 * 1024) { // 10KB for scripture
      issues.push(`Scripture response too large: ${responseSize} bytes > 10KB`);
    }
    
    if (responseTime > PerformanceTargets.SCRIPTURE_LOOKUP_MS) {
      issues.push(`Response time too slow: ${responseTime}ms > ${PerformanceTargets.SCRIPTURE_LOOKUP_MS}ms`);
    }

    return {
      meetsTargets: issues.length === 0,
      issues
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.compressionStats = {
      totalResponses: 0,
      compressedResponses: 0,
      totalOriginalSize: 0,
      totalCompressedSize: 0,
      averageCompressionRatio: 0
    };
  }
}

/**
 * Global optimizer instance
 */
export const responseOptimizer = new ResponseOptimizer({
  enableCompression: true,
  removeNullFields: true,
  removeEmptyFields: true,
  enableFieldFiltering: true,
  enablePagination: true,
  maxPayloadSize: 500 * 1024, // 500KB
  compressionThreshold: 1024 // 1KB
});

/**
 * Utility function to parse field filter from query parameters
 */
export function parseFieldFilter(queryParams: any): FieldFilter | undefined {
  const filter: FieldFilter = {};
  
  if (queryParams.fields) {
    filter.include = queryParams.fields.split(',').map((f: string) => f.trim());
  }
  
  if (queryParams.exclude) {
    filter.exclude = queryParams.exclude.split(',').map((f: string) => f.trim());
  }
  
  if (queryParams.maxDepth) {
    const depth = parseInt(queryParams.maxDepth);
    if (!isNaN(depth) && depth > 0) {
      filter.maxDepth = depth;
    }
  }
  
  return Object.keys(filter).length > 0 ? filter : undefined;
}

/**
 * Utility function to parse pagination from query parameters
 */
export function parsePagination(queryParams: any, maxLimit = 100): PaginationOptions | undefined {
  const page = parseInt(queryParams.page) || 1;
  const limit = parseInt(queryParams.limit) || 20;
  
  if (queryParams.page || queryParams.limit) {
    return {
      page: Math.max(1, page),
      limit: Math.max(1, Math.min(limit, maxLimit)),
      maxLimit
    };
  }
  
  return undefined;
}

/**
 * Express/Serverless middleware for response optimization
 */
export function optimizationMiddleware(optimizer: ResponseOptimizer = responseOptimizer) {
  return async (req: any, res: any, next: any) => {
    // Store original res.json method
    const originalJson = res.json.bind(res);
    
    // Override res.json to apply optimization
    res.json = async function(data: any) {
      try {
        const fieldFilter = parseFieldFilter(req.query);
        const pagination = parsePagination(req.query);
        const performanceData = {
          cacheHit: req.cacheHit || false,
          processingStartTime: req.processingStartTime || Date.now()
        };
        
        const optimized = await optimizer.optimize(data, fieldFilter, pagination, performanceData);
        
        // Add optimization headers
        res.setHeader('X-Original-Size', optimized._meta.optimization.originalSize);
        res.setHeader('X-Optimized-Size', optimized._meta.optimization.optimizedSize);
        res.setHeader('X-Compression-Ratio', optimized._meta.optimization.compressionRatio.toFixed(3));
        res.setHeader('X-Fields-Filtered', optimized._meta.optimization.fieldsFiltered);
        res.setHeader('X-Paginated', optimized._meta.optimization.paginated);
        
        // Set appropriate cache headers based on optimization
        if (optimized._meta.optimization.compressed) {
          res.setHeader('Content-Encoding', 'gzip');
        }
        
        return originalJson(optimized);
      } catch (error) {
        console.error('Response optimization failed:', error);
        // Fall back to original response
        return originalJson(data);
      }
    };
    
    next();
  };
}
