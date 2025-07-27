/**
 * Dynamic Data Pipeline
 * A zero-configuration approach to data handling that preserves structure from source to destination
 */

export interface DynamicResponse {
  _meta: {
    source: string;
    timestamp: string;
    structure: string[];
    hasData: boolean;
  };
  _raw: any;
  _extracted: {
    text?: string;
    items?: any[];
    links?: string[];
  };
}

export class DynamicDataPipeline {
  /**
   * Process any data dynamically without predefined schema
   */
  static process(data: any, source: string): DynamicResponse {
    const structure = this.analyzeStructure(data);
    
    return {
      _meta: {
        source,
        timestamp: new Date().toISOString(),
        structure,
        hasData: this.hasUsefulData(data)
      },
      _raw: data,
      _extracted: {
        text: this.extractAllText(data),
        items: this.extractAllArrays(data),
        links: this.extractAllLinks(data)
      }
    };
  }

  /**
   * Analyze data structure without assumptions
   */
  private static analyzeStructure(data: any, prefix = ''): string[] {
    const paths: string[] = [];
    
    if (data === null || data === undefined) return paths;
    
    if (Array.isArray(data)) {
      paths.push(`${prefix}[]`);
      if (data.length > 0) {
        paths.push(...this.analyzeStructure(data[0], `${prefix}[0]`));
      }
    } else if (typeof data === 'object') {
      for (const key in data) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        paths.push(fullPath);
        
        if (data[key] !== null && typeof data[key] === 'object') {
          paths.push(...this.analyzeStructure(data[key], fullPath));
        }
      }
    }
    
    return paths;
  }

  /**
   * Extract all text content dynamically
   */
  private static extractAllText(data: any, collected: string[] = []): string {
    if (data === null || data === undefined) return '';
    
    // Direct string
    if (typeof data === 'string') {
      collected.push(data);
      return data;
    }
    
    // Array - process each item
    if (Array.isArray(data)) {
      data.forEach(item => this.extractAllText(item, collected));
    } 
    // Object - process all values
    else if (typeof data === 'object') {
      for (const key in data) {
        this.extractAllText(data[key], collected);
      }
    }
    
    return collected.filter(Boolean).join('\n\n');
  }

  /**
   * Extract all arrays dynamically
   */
  private static extractAllArrays(data: any, collected: any[] = []): any[] {
    if (data === null || data === undefined) return collected;
    
    if (Array.isArray(data)) {
      collected.push(...data);
    } else if (typeof data === 'object') {
      for (const key in data) {
        this.extractAllArrays(data[key], collected);
      }
    }
    
    return collected;
  }

  /**
   * Extract all links dynamically
   */
  private static extractAllLinks(data: any, collected: string[] = []): string[] {
    const linkPatterns = [
      /https?:\/\/[^\s)]+/g,
      /rc:\/\/[^\s\])+]+/g,
      /\[\[rc:\/\/[^\]]+\]\]/g
    ];
    
    const text = this.extractAllText(data);
    
    linkPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        collected.push(...matches);
      }
    });
    
    return [...new Set(collected)]; // Remove duplicates
  }

  /**
   * Check if data has useful content
   */
  private static hasUsefulData(data: any): boolean {
    if (!data) return false;
    
    const text = this.extractAllText(data);
    const arrays = this.extractAllArrays(data);
    
    return text.length > 10 || arrays.length > 0;
  }

  /**
   * Format for LLM consumption without losing structure
   */
  static formatForLLM(response: DynamicResponse): string {
    const parts: string[] = [];
    
    // Add metadata context
    parts.push(`[Source: ${response._meta.source}]`);
    
    // Add extracted text if available
    if (response._extracted.text) {
      parts.push(response._extracted.text);
    }
    
    // Add array items if they have text content
    if (response._extracted.items?.length > 0) {
      const itemTexts = response._extracted.items
        .map(item => this.extractAllText(item))
        .filter(Boolean);
      
      if (itemTexts.length > 0) {
        parts.push('\n---\n' + itemTexts.join('\n---\n'));
      }
    }
    
    // Add links section if found
    if (response._extracted.links?.length > 0) {
      parts.push('\n\nRelated Links:');
      response._extracted.links.forEach(link => {
        parts.push(`- ${link}`);
      });
    }
    
    return parts.join('\n\n');
  }

  /**
   * Create a unified handler that works with any endpoint
   */
  static createUniversalHandler() {
    return async (endpoint: string, params: any): Promise<DynamicResponse> => {
      const url = new URL(endpoint, window.location.origin);
      
      // Add all params as query parameters
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.set(key, String(value));
        }
      });
      
      try {
        const response = await fetch(url.toString());
        const data = await response.json();
        
        return this.process(data, endpoint);
      } catch (error) {
        return {
          _meta: {
            source: endpoint,
            timestamp: new Date().toISOString(),
            structure: [],
            hasData: false
          },
          _raw: { error: error instanceof Error ? error.message : 'Unknown error' },
          _extracted: {
            text: `Error fetching from ${endpoint}: ${error}`,
            items: [],
            links: []
          }
        };
      }
    };
  }
}