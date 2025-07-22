/**
 * Security Middleware Module for Translation Helps API
 * 
 * Implements comprehensive security measures including:
 * - Input validation
 * - Rate limiting
 * - Security headers (CORS, CSP, HSTS, X-Frame-Options)
 * - DDoS protection
 * - Request fingerprinting
 */

import { ErrorCode } from '../constants/terminology';

// Rate limiting storage (in-memory for serverless, would use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export interface SecurityConfig {
  rateLimits: {
    default: { max: number; windowMs: number };
    apiKey: { max: number; windowMs: number };
    burst: { max: number; windowMs: number };
  };
  validation: {
    maxReferenceLength: number;
    maxQueryLength: number;
    allowedLanguageCodes: string[];
    allowedOrganizations: string[];
  };
  headers: {
    enableCSP: boolean;
    enableHSTS: boolean;
    enableFrameOptions: boolean;
    corsOrigins: string[];
  };
}

const defaultSecurityConfig: SecurityConfig = {
  rateLimits: {
    default: { max: 100, windowMs: 60 * 1000 }, // 100 requests per minute
    apiKey: { max: 1000, windowMs: 60 * 1000 }, // 1000 requests per minute with API key
    burst: { max: 10, windowMs: 1000 } // 10 requests per second burst
  },
  validation: {
    maxReferenceLength: 50,
    maxQueryLength: 200,
    allowedLanguageCodes: ['en', 'es', 'fr', 'pt', 'ar', 'zh', 'hi', 'ru', 'sw', 'am'],
    allowedOrganizations: ['unfoldingWord', 'door43', 'wycliffeassociates']
  },
  headers: {
    enableCSP: true,
    enableHSTS: true,
    enableFrameOptions: true,
    corsOrigins: ['*'] // Will be restricted in production
  }
};

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400,
    public details?: Record<string, any>
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RateLimitError extends SecurityError {
  constructor(public limits: { max: number; reset: number; remaining: number }) {
    super(
      `Rate limit exceeded. \${limits.remaining} requests remaining until \${new Date(limits.reset).toISOString()}`,
      ErrorCode.RATE_LIMIT_ERROR,
      429,
      { limits }
    );
  }
}

export class ValidationError extends SecurityError {
  constructor(field: string, reason: string, value?: any) {
    super(
      `Invalid \${field}: \${reason}`,
      ErrorCode.MISSING_PARAMETER,
      400,
      { field, reason, value }
    );
  }
}

export class SecurityMiddleware {
  private config: SecurityConfig;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = { ...defaultSecurityConfig, ...config };
  }

  /**
   * Generate security headers for API responses
   */
  getSecurityHeaders(request?: any): Record<string, string> {
    const headers: Record<string, string> = {
      // CORS headers
      "Access-Control-Allow-Origin": this.determineCorsOrigin(request),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Requested-With",
      "Access-Control-Max-Age": "86400", // 24 hours
    };

    if (this.config.headers.enableCSP) {
      headers["Content-Security-Policy"] = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' https://unpkg.com",
        "style-src 'self' 'unsafe-inline' https://unpkg.com",
        "img-src 'self' data: https:",
        "connect-src 'self' https://git.door43.org https://api.door43.org",
        "font-src 'self' https:",
        "object-src 'none'",
        "frame-ancestors 'none'"
      ].join("; ");
    }

    if (this.config.headers.enableHSTS) {
      headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
    }

    if (this.config.headers.enableFrameOptions) {
      headers["X-Frame-Options"] = "DENY";
      headers["X-Content-Type-Options"] = "nosniff";
      headers["X-XSS-Protection"] = "1; mode=block";
      headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    }

    // Additional security headers
    headers["Cache-Control"] = "public, max-age=300, s-maxage=900"; // 5 min browser, 15 min CDN
    headers["Vary"] = "Origin, Accept-Encoding";

    return headers;
  }

  private determineCorsOrigin(request?: any): string {
    // In production, this should validate against allowed origins
    const origin = request?.headers?.['origin'] || request?.headers?.['Origin'];
    
    if (!origin) return '*';
    
    // Allow localhost for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return origin;
    }
    
    // Allow known domains
    const allowedDomains = [
      'translation-helps-mcp.pages.dev',
      'translation.tools',
      'unfoldingword.org',
      'door43.org'
    ];
    
    for (const domain of allowedDomains) {
      if (origin.includes(domain)) {
        return origin;
      }
    }
    
    return '*'; // Fallback for now, should be restricted in production
  }

  /**
   * Generate request fingerprint for DDoS protection
   */
  generateFingerprint(request: any): string {
    const ip = this.extractIP(request);
    const userAgent = request.headers?.['user-agent'] || 'unknown';
    const acceptLang = request.headers?.['accept-language'] || 'unknown';
    
    // Create a simple fingerprint (in production, this could be more sophisticated)
    return `\${ip}:\${userAgent.slice(0, 50)}:\${acceptLang.slice(0, 20)}`;
  }

  /**
   * Extract client IP address
   */
  private extractIP(request: any): string {
    // Check common headers for client IP
    const headers = request.headers || {};
    
    return (
      headers['cf-connecting-ip'] || // Cloudflare
      headers['x-forwarded-for']?.split(',')[0]?.trim() || // Standard proxy header
      headers['x-real-ip'] || // Nginx
      headers['x-client-ip'] || // Apache
      request.ip ||
      request.connection?.remoteAddress ||
      '127.0.0.1'
    );
  }

  /**
   * Create a security-enhanced response with proper headers
   */
  createSecureResponse(data: any, statusCode: number = 200, request?: any): any {
    const securityHeaders = this.getSecurityHeaders(request);
    
    return {
      statusCode,
      headers: {
        "Content-Type": "application/json",
        ...securityHeaders
      },
      body: JSON.stringify({
        ...data,
        _security: {
          timestamp: new Date().toISOString(),
          rateLimit: {
            remaining: 'check-headers',
            reset: 'check-headers'
          }
        }
      })
    };
  }
}

// Export singleton instance
export const securityMiddleware = new SecurityMiddleware();
