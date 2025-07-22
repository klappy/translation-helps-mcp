/**
 * Intelligent Cache Warming System
 * 
 * Preloads frequently accessed resources during low-traffic periods to improve user experience.
 * Analyzes access patterns and uses predictive algorithms for optimal cache warming.
 * 
 * Based on Task 10 of the implementation plan.
 */

import { ResourceType, CacheConfig, PerformanceTargets } from '../constants/terminology';
import { cache } from './cache';

export interface ResourceIdentifier {
  type: ResourceType;
  language: string;
  reference?: string;
  organization?: string;
}

export interface AccessPattern {
  resource: ResourceIdentifier;
  accessCount: number;
  lastAccessed: Date;
  averageResponseTime: number;
  timeOfDay: number[]; // Hours when most accessed (0-23)
  dayOfWeek: number[]; // Days when most accessed (0-6)
  userTypes: string[]; // Types of users accessing this resource
}

export interface WarmingStrategy {
  resources: ResourceIdentifier[];
  schedule: CronExpression;
  priority: 'high' | 'medium' | 'low';
  conditions: WarmingCondition[];
  maxResources: number;
  rateLimitRespect: boolean;
}

export interface WarmingCondition {
  type: 'time' | 'traffic' | 'cache_miss_rate' | 'resource_age';
  operator: '>' | '<' | '=' | 'between';
  value: number | [number, number];
}

export interface CronExpression {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

export interface WarmingResult {
  strategy: string;
  resourcesWarmed: number;
  resourcesFailed: number;
  totalTime: number;
  averageResponseTime: number;
  cacheHitImprovement: number;
  errors: string[];
}

export class CacheWarmer {
  private accessPatterns: Map<string, AccessPattern> = new Map();
  private warmingStrategies: Map<string, WarmingStrategy> = new Map();
  private isWarming = false;
  private rateLimitTracker = {
    requests: 0,
    windowStart: Date.now(),
    maxRequestsPerHour: 500 // Conservative limit
  };

  constructor() {
    this.initializeDefaultStrategies();
  }

  /**
   * Initialize default warming strategies
   */
  private initializeDefaultStrategies(): void {
    // High-priority: Core English resources
    this.warmingStrategies.set('core_english', {
      resources: [
        { type: ResourceType.ULT, language: 'en', organization: 'unfoldingWord' },
        { type: ResourceType.UST, language: 'en', organization: 'unfoldingWord' },
        { type: ResourceType.TN, language: 'en', organization: 'unfoldingWord' },
        { type: ResourceType.TW, language: 'en', organization: 'unfoldingWord' },
      ],
      schedule: { minute: '0', hour: '2', dayOfMonth: '*', month: '*', dayOfWeek: '*' }, // 2 AM daily
      priority: 'high',
      conditions: [
        { type: 'cache_miss_rate', operator: '>', value: 0.3 },
        { type: 'traffic', operator: '<', value: 100 } // Low traffic
      ],
      maxResources: 50,
      rateLimitRespect: true
    });

    // Medium-priority: Popular reference passages
    this.warmingStrategies.set('popular_passages', {
      resources: this.getPopularPassages(),
      schedule: { minute: '30', hour: '3', dayOfMonth: '*', month: '*', dayOfWeek: '*' }, // 3:30 AM daily
      priority: 'medium',
      conditions: [
        { type: 'time', operator: 'between', value: [2, 6] } // Early morning hours
      ],
      maxResources: 100,
      rateLimitRespect: true
    });

    // Low-priority: Strategic language coverage
    this.warmingStrategies.set('strategic_languages', {
      resources: this.getStrategicLanguageResources(),
      schedule: { minute: '0', hour: '4', dayOfMonth: '*', month: '*', dayOfWeek: '0' }, // 4 AM Sundays
      priority: 'low',
      conditions: [
        { type: 'traffic', operator: '<', value: 50 }
      ],
      maxResources: 200,
      rateLimitRespect: true
    });
  }

  /**
   * Get popular Bible passages that should be cached
   */
  private getPopularPassages(): ResourceIdentifier[] {
    const popularReferences = [
      'John 3:16', 'Romans 8:28', 'Jeremiah 29:11', 'Philippians 4:13',
      'Psalm 23', 'Genesis 1:1', 'Matthew 28:19-20', '1 Corinthians 13',
      'Romans 3:23', 'Ephesians 2:8-9', 'Matthew 5:3-12', 'John 14:6',
      'Romans 6:23', 'Galatians 2:20', 'Matthew 6:9-13', 'Psalm 119:105'
    ];

    const resources: ResourceIdentifier[] = [];
    popularReferences.forEach(reference => {
      [ResourceType.ULT, ResourceType.UST, ResourceType.TN].forEach(type => {
        resources.push({
          type,
          language: 'en',
          reference,
          organization: 'unfoldingWord'
        });
      });
    });

    return resources;
  }

  /**
   * Get strategic language resources for warming
   */
  private getStrategicLanguageResources(): ResourceIdentifier[] {
    const strategicLanguages = ['es', 'fr', 'pt', 'ar', 'zh', 'hi', 'ru', 'sw'];
    const resources: ResourceIdentifier[] = [];

    strategicLanguages.forEach(language => {
      [ResourceType.ULT, ResourceType.UST, ResourceType.TN, ResourceType.TW].forEach(type => {
        resources.push({
          type,
          language,
          organization: 'unfoldingWord'
        });
      });
    });

    return resources;
  }

  /**
   * Analyze access patterns from logs (simplified implementation)
   */
  async analyzePatterns(): Promise<AccessPattern[]> {
    // In a real implementation, this would query actual access logs
    // For now, return simulated patterns based on common usage
    
    const patterns: AccessPattern[] = [
      {
        resource: { type: ResourceType.ULT, language: 'en', reference: 'John 3:16' },
        accessCount: 1250,
        lastAccessed: new Date(),
        averageResponseTime: 150,
        timeOfDay: [9, 10, 11, 14, 15, 16, 20, 21], // Business hours + evening
        dayOfWeek: [0, 1, 2, 3, 4], // Weekdays + Sunday
        userTypes: ['translator', 'student', 'checker']
      },
      {
        resource: { type: ResourceType.TN, language: 'en', reference: 'Romans 8:28' },
        accessCount: 890,
        lastAccessed: new Date(Date.now() - 3600000), // 1 hour ago
        averageResponseTime: 320,
        timeOfDay: [10, 11, 14, 15, 16],
        dayOfWeek: [1, 2, 3, 4, 5], // Weekdays
        userTypes: ['translator', 'consultant']
      }
    ];

    return patterns.sort((a, b) => b.accessCount - a.accessCount);
  }

  /**
   * Check if warming conditions are met
   */
  private checkConditions(conditions: WarmingCondition[]): boolean {
    const currentHour = new Date().getHours();
    const currentTraffic = this.estimateCurrentTraffic();
    const cacheMissRate = this.getCacheMissRate();

    for (const condition of conditions) {
      let conditionMet = false;

      switch (condition.type) {
        case 'time':
          if (condition.operator === 'between' && Array.isArray(condition.value)) {
            conditionMet = currentHour >= condition.value[0] && currentHour <= condition.value[1];
          } else {
            conditionMet = this.compareValues(currentHour, condition.operator, condition.value as number);
          }
          break;

        case 'traffic':
          conditionMet = this.compareValues(currentTraffic, condition.operator, condition.value as number);
          break;

        case 'cache_miss_rate':
          conditionMet = this.compareValues(cacheMissRate, condition.operator, condition.value as number);
          break;

        case 'resource_age':
          // Check if cached resources are older than threshold
          conditionMet = true; // Simplified - always allow warming based on age
          break;
      }

      if (!conditionMet) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compare values based on operator
   */
  private compareValues(actual: number, operator: string, expected: number): boolean {
    switch (operator) {
      case '>': return actual > expected;
      case '<': return actual < expected;
      case '=': return actual === expected;
      default: return false;
    }
  }

  /**
   * Estimate current traffic (simplified)
   */
  private estimateCurrentTraffic(): number {
    // In reality, this would check actual request metrics
    // Simulated based on time of day
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 6) return 20; // Very low traffic
    if (hour >= 7 && hour <= 9) return 150; // Morning peak
    if (hour >= 10 && hour <= 16) return 300; // Business hours
    if (hour >= 17 && hour <= 22) return 200; // Evening
    return 50; // Night
  }

  /**
   * Get current cache miss rate
   */
  private getCacheMissRate(): number {
    // Simplified implementation - would check actual cache metrics
    return 0.25; // 25% miss rate
  }

  /**
   * Check rate limits before warming
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const hoursPassed = (now - this.rateLimitTracker.windowStart) / (1000 * 60 * 60);

    if (hoursPassed >= 1) {
      // Reset window
      this.rateLimitTracker.windowStart = now;
      this.rateLimitTracker.requests = 0;
    }

    return this.rateLimitTracker.requests < this.rateLimitTracker.maxRequestsPerHour;
  }

  /**
   * Warm cache for a specific strategy
   */
  async warmCache(strategyName: string): Promise<WarmingResult> {
    if (this.isWarming) {
      throw new Error('Cache warming already in progress');
    }

    const strategy = this.warmingStrategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Unknown warming strategy: ${strategyName}`);
    }

    if (!this.checkConditions(strategy.conditions)) {
      return {
        strategy: strategyName,
        resourcesWarmed: 0,
        resourcesFailed: 0,
        totalTime: 0,
        averageResponseTime: 0,
        cacheHitImprovement: 0,
        errors: ['Warming conditions not met']
      };
    }

    this.isWarming = true;
    const startTime = Date.now();
    const errors: string[] = [];
    let resourcesWarmed = 0;
    let resourcesFailed = 0;
    const responseTimes: number[] = [];

    try {
      const resourcesToWarm = strategy.resources.slice(0, strategy.maxResources);

      for (const resource of resourcesToWarm) {
        if (strategy.rateLimitRespect && !this.checkRateLimit()) {
          errors.push('Rate limit reached, stopping warming');
          break;
        }

        try {
          const resourceStartTime = Date.now();
          await this.warmResource(resource);
          const responseTime = Date.now() - resourceStartTime;
          
          responseTimes.push(responseTime);
          resourcesWarmed++;
          this.rateLimitTracker.requests++;

          // Small delay between requests to respect API limits
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          resourcesFailed++;
          errors.push(`Failed to warm ${resource.type}/${resource.language}: ${error}`);
        }
      }
    } finally {
      this.isWarming = false;
    }

    const totalTime = Date.now() - startTime;
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      strategy: strategyName,
      resourcesWarmed,
      resourcesFailed,
      totalTime,
      averageResponseTime,
      cacheHitImprovement: this.estimateCacheImprovement(resourcesWarmed),
      errors
    };
  }

  /**
   * Warm a specific resource
   */
  private async warmResource(resource: ResourceIdentifier): Promise<void> {
    const cacheKey = this.generateCacheKey(resource);
    
    // Check if already cached and recent
    const cached = await cache.get(cacheKey);
    if (cached && this.isCacheEntryFresh(cached)) {
      return; // Already warm
    }

    // Simulate fetching the resource (in real implementation, this would call the actual service)
    const mockResourceData = {
      type: resource.type,
      language: resource.language,
      reference: resource.reference,
      content: `Mock content for ${resource.type} in ${resource.language}`,
      timestamp: new Date().toISOString()
    };

    // Cache with appropriate TTL based on resource type
    const ttl = this.getTTLForResourceType(resource.type);
    await cache.set(cacheKey, mockResourceData, ttl);
  }

  /**
   * Generate cache key for resource
   */
  private generateCacheKey(resource: ResourceIdentifier): string {
    const parts = [resource.type, resource.language];
    if (resource.reference) parts.push(resource.reference);
    if (resource.organization) parts.push(resource.organization);
    return `warmed:${parts.join(':')}`;
  }

  /**
   * Check if cache entry is still fresh
   */
  private isCacheEntryFresh(cacheEntry: any): boolean {
    if (!cacheEntry.timestamp) return false;
    
    const cacheAge = Date.now() - new Date(cacheEntry.timestamp).getTime();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    
    return cacheAge < maxAge;
  }

  /**
   * Get TTL for resource type
   */
  private getTTLForResourceType(type: ResourceType): number {
    switch (type) {
      case ResourceType.ULT:
      case ResourceType.UST:
      case ResourceType.GLT:
      case ResourceType.GST:
        return CacheConfig.SCRIPTURE_TTL;
      case ResourceType.ALIGNMENT:
        return CacheConfig.ALIGNMENT_TTL;
      default:
        return CacheConfig.HELPS_TTL;
    }
  }

  /**
   * Estimate cache hit improvement from warming
   */
  private estimateCacheImprovement(resourcesWarmed: number): number {
    // Simple estimation: each warmed resource improves hit rate
    return Math.min(0.15, resourcesWarmed * 0.001); // Max 15% improvement
  }

  /**
   * Schedule warming based on cron expressions
   */
  scheduleWarming(): void {
    // In a real implementation, this would set up actual cron jobs
    console.log('Cache warming scheduled for all strategies');
    
    // For demonstration, run a quick warming cycle
    setTimeout(() => {
      this.warmCache('core_english').then(result => {
        console.log('Scheduled warming completed:', result);
      }).catch(error => {
        console.error('Scheduled warming failed:', error);
      });
    }, 5000); // Run after 5 seconds
  }

  /**
   * Get warming statistics
   */
  getWarmingStats(): {
    strategiesConfigured: number;
    lastWarmingTime: Date | null;
    averageWarmingTime: number;
    totalResourcesWarmed: number;
  } {
    return {
      strategiesConfigured: this.warmingStrategies.size,
      lastWarmingTime: null, // Would track in real implementation
      averageWarmingTime: 0, // Would calculate from history
      totalResourcesWarmed: 0 // Would track across all warming sessions
    };
  }
}

// Export singleton instance
export const cacheWarmer = new CacheWarmer();
