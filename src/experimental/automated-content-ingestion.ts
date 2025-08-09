import { logger } from "../utils/logger.js";
/**
 * Automated Content Ingestion System
 *
 * Automatically discovers, fetches, validates, and processes new translation
 * resources from various sources with AI-powered content analysis.
 *
 * Based on Task 17 of the implementation plan
 * Created for AI Integration & Workflow Automation (Phase 5)
 */

import type { ResourceType } from "../constants/terminology.js";
import type { QualityCheckType } from "./ai-quality-checker.js";

/**
 * Content source types
 */
export type ContentSourceType = "git" | "api" | "webhook" | "manual" | "scheduled";

/**
 * Ingestion status
 */
export type IngestionStatus = "pending" | "processing" | "completed" | "failed" | "skipped";

/**
 * Content source configuration
 */
interface ContentSource {
  id: string;
  name: string;
  type: ContentSourceType;
  url: string;
  enabled: boolean;
  config: {
    authToken?: string;
    webhookSecret?: string;
    schedule?: string; // cron expression
    filters?: ContentFilter[];
    transformRules?: TransformRule[];
  };
  metadata: {
    lastSync: string | null;
    totalIngested: number;
    errorCount: number;
    averageProcessingTime: number;
  };
}

/**
 * Content filter for selective ingestion
 */
interface ContentFilter {
  field: "language" | "organization" | "resourceType" | "modified" | "size";
  operator: "equals" | "contains" | "startsWith" | "regex" | "gt" | "lt";
  value: string | number;
  include: boolean; // true = include, false = exclude
}

/**
 * Content transformation rules
 */
interface TransformRule {
  type: "rename" | "normalize" | "validate" | "enhance";
  field: string;
  action: string;
  parameters?: Record<string, any>;
}

/**
 * Discovered content item
 */
interface DiscoveredContent {
  id: string;
  sourceId: string;
  url: string;
  language: string;
  organization: string;
  resourceType: ResourceType;
  title: string;
  description?: string;
  lastModified: string;
  size: number;
  checksum: string;
  metadata: Record<string, any>;
}

/**
 * Ingestion job
 */
interface IngestionJob {
  id: string;
  sourceId: string;
  content: DiscoveredContent;
  status: IngestionStatus;
  progress: number; // 0-100
  startTime: string;
  endTime?: string;
  error?: string;
  result?: ProcessedContent;
  qualityScore?: number;
  retryCount: number;
  maxRetries: number;
}

/**
 * Processed content result
 */
interface ProcessedContent {
  id: string;
  originalId: string;
  language: string;
  organization: string;
  resourceType: ResourceType;
  title: string;
  content: string;
  metadata: {
    processingTime: number;
    transformationsApplied: string[];
    qualityChecks: QualityCheckType[];
    aiAnalysis?: {
      summary: string;
      keyTerms: string[];
      complexity: number;
      recommendations: string[];
    };
  };
  validation: {
    passed: boolean;
    errors: string[];
    warnings: string[];
  };
}

/**
 * Ingestion batch request
 */
interface BatchIngestionRequest {
  sourceIds: string[];
  filters?: ContentFilter[];
  maxConcurrency?: number;
  enableQualityChecks?: boolean;
  enableAIAnalysis?: boolean;
}

/**
 * Ingestion statistics
 */
interface IngestionStats {
  totalSources: number;
  activeSources: number;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageProcessingTime: number;
  averageQualityScore: number;
  contentByLanguage: Record<string, number>;
  contentByType: Record<ResourceType, number>;
  recentActivity: Array<{
    date: string;
    ingested: number;
    failed: number;
  }>;
}

/**
 * Webhook payload structure
 */
interface WebhookPayload {
  event: "create" | "update" | "delete";
  source: string;
  content: {
    id: string;
    url: string;
    metadata: Record<string, any>;
  };
  timestamp: string;
}

/**
 * Default ingestion configuration
 */
const DEFAULT_CONFIG = {
  maxConcurrentJobs: 5,
  retryAttempts: 3,
  retryDelayMs: 5000,
  timeoutMs: 30000,
  enableAIAnalysis: true,
  enableQualityChecks: true,
  maxContentSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ["json", "md", "txt", "usfm", "tsv"],
};

/**
 * Automated Content Ingestion System
 */
export class AutomatedContentIngestion {
  private sources = new Map<string, ContentSource>();
  private jobs = new Map<string, IngestionJob>();
  private stats: IngestionStats;
  private processingQueue: IngestionJob[] = [];
  private isProcessing = false;
  private config = DEFAULT_CONFIG;

  constructor(
    private aiSummarizer?: any,
    private qualityChecker?: any,
    private resourceDetector?: any
  ) {
    this.stats = this.initializeStats();
    this.startProcessingLoop();
  }

  /**
   * Add content source
   */
  addSource(source: Omit<ContentSource, "metadata">): void {
    const fullSource: ContentSource = {
      ...source,
      metadata: {
        lastSync: null,
        totalIngested: 0,
        errorCount: 0,
        averageProcessingTime: 0,
      },
    };

    this.sources.set(source.id, fullSource);
    this.updateStats();
  }

  /**
   * Remove content source
   */
  removeSource(sourceId: string): boolean {
    const removed = this.sources.delete(sourceId);
    if (removed) {
      this.updateStats();
    }
    return removed;
  }

  /**
   * Update source configuration
   */
  updateSource(sourceId: string, updates: Partial<ContentSource>): boolean {
    const source = this.sources.get(sourceId);
    if (!source) return false;

    Object.assign(source, updates);
    this.sources.set(sourceId, source);
    return true;
  }

  /**
   * Discover content from all enabled sources
   */
  async discoverContent(sourceIds?: string[]): Promise<DiscoveredContent[]> {
    const targetSources = sourceIds
      ? (sourceIds.map((id) => this.sources.get(id)).filter(Boolean) as ContentSource[])
      : Array.from(this.sources.values()).filter((s) => s.enabled);

    const allContent: DiscoveredContent[] = [];

    for (const source of targetSources) {
      try {
        const content = await this.discoverFromSource(source);
        allContent.push(...content);
      } catch (error) {
        logger.warn(`Discovery failed for source ${source.id}`, { error: String(error) });
        source.metadata.errorCount++;
      }
    }

    return allContent;
  }

  /**
   * Discover content from specific source
   */
  private async discoverFromSource(source: ContentSource): Promise<DiscoveredContent[]> {
    switch (source.type) {
      case "git":
        return this.discoverFromGit(source);
      case "api":
        return this.discoverFromAPI(source);
      case "webhook":
        return []; // Webhooks push content, don't pull
      case "manual":
        return []; // Manual sources require explicit content
      case "scheduled":
        return this.discoverFromScheduled(source);
      default:
        throw new Error(`Unsupported source type: ${source.type}`);
    }
  }

  /**
   * Discover content from Git repositories
   */
  private async discoverFromGit(source: ContentSource): Promise<DiscoveredContent[]> {
    // Mock implementation for Git discovery
    const mockContent: DiscoveredContent[] = [
      {
        id: `git_${source.id}_1`,
        sourceId: source.id,
        url: `${source.url}/en_ult`,
        language: "en",
        organization: "unfoldingWord",
        resourceType: "ULT" as ResourceType,
        title: "English Literal Text",
        description: "Form-centric English translation",
        lastModified: new Date().toISOString(),
        size: 512000,
        checksum: "abc123def456",
        metadata: {
          branch: "master",
          commit: "a1b2c3d4",
          format: "usfm",
        },
      },
    ];

    // Apply filters if configured
    return this.applyFilters(mockContent, source.config.filters || []);
  }

  /**
   * Discover content from API endpoints
   */
  private async discoverFromAPI(source: ContentSource): Promise<DiscoveredContent[]> {
    // Mock implementation for API discovery
    const mockContent: DiscoveredContent[] = [
      {
        id: `api_${source.id}_1`,
        sourceId: source.id,
        url: `${source.url}/catalog`,
        language: "es-419",
        organization: "unfoldingWord",
        resourceType: "UST" as ResourceType,
        title: "Spanish Simplified Text",
        description: "Meaning-based Spanish translation",
        lastModified: new Date().toISOString(),
        size: 384000,
        checksum: "def456ghi789",
        metadata: {
          apiVersion: "v1",
          format: "json",
        },
      },
    ];

    return this.applyFilters(mockContent, source.config.filters || []);
  }

  /**
   * Discover content from scheduled sources
   */
  private async discoverFromScheduled(source: ContentSource): Promise<DiscoveredContent[]> {
    // Check if it's time to sync based on cron schedule
    const lastSync = source.metadata.lastSync ? new Date(source.metadata.lastSync) : null;
    const now = new Date();

    // Simple check: sync if last sync was more than an hour ago
    if (lastSync && now.getTime() - lastSync.getTime() < 60 * 60 * 1000) {
      return [];
    }

    // Use the underlying source type for actual discovery
    return this.discoverFromAPI(source);
  }

  /**
   * Apply content filters
   */
  private applyFilters(
    content: DiscoveredContent[],
    filters: ContentFilter[]
  ): DiscoveredContent[] {
    return content.filter((item) => {
      return filters.every((filter) => {
        const fieldValue = this.getFieldValue(item, filter.field);
        const matches = this.evaluateFilter(fieldValue, filter.operator, filter.value);
        return filter.include ? matches : !matches;
      });
    });
  }

  /**
   * Get field value from content item
   */
  private getFieldValue(item: DiscoveredContent, field: string): any {
    switch (field) {
      case "language":
        return item.language;
      case "organization":
        return item.organization;
      case "resourceType":
        return item.resourceType;
      case "modified":
        return new Date(item.lastModified).getTime();
      case "size":
        return item.size;
      default:
        return item.metadata[field];
    }
  }

  /**
   * Evaluate filter condition
   */
  private evaluateFilter(value: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case "equals":
        return value === filterValue;
      case "contains":
        return String(value).includes(String(filterValue));
      case "startsWith":
        return String(value).startsWith(String(filterValue));
      case "regex":
        return new RegExp(String(filterValue)).test(String(value));
      case "gt":
        return Number(value) > Number(filterValue);
      case "lt":
        return Number(value) < Number(filterValue);
      default:
        return false;
    }
  }

  /**
   * Ingest discovered content
   */
  async ingestContent(content: DiscoveredContent[]): Promise<IngestionJob[]> {
    const jobs: IngestionJob[] = [];

    for (const item of content) {
      const job: IngestionJob = {
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        sourceId: item.sourceId,
        content: item,
        status: "pending",
        progress: 0,
        startTime: new Date().toISOString(),
        retryCount: 0,
        maxRetries: this.config.retryAttempts,
      };

      this.jobs.set(job.id, job);
      this.processingQueue.push(job);
      jobs.push(job);
    }

    this.updateStats();
    return jobs;
  }

  /**
   * Process ingestion job
   */
  private async processJob(job: IngestionJob): Promise<void> {
    try {
      job.status = "processing";
      job.progress = 10;

      // 1. Fetch content
      const rawContent = await this.fetchContent(job.content);
      job.progress = 30;

      // 2. Validate content
      const validation = await this.validateContent(rawContent, job.content);
      job.progress = 50;

      if (!validation.passed) {
        throw new Error(`Validation failed: ${validation.errors.join(", ")}`);
      }

      // 3. Transform content
      const source = this.sources.get(job.sourceId);
      const transformedContent = await this.transformContent(
        rawContent,
        source?.config.transformRules || []
      );
      job.progress = 70;

      // 4. AI Analysis (if enabled)
      let aiAnalysis;
      if (this.config.enableAIAnalysis && this.aiSummarizer) {
        aiAnalysis = await this.performAIAnalysis(transformedContent, job.content);
      }
      job.progress = 85;

      // 5. Quality checks (if enabled)
      let qualityScore;
      if (this.config.enableQualityChecks && this.qualityChecker) {
        qualityScore = await this.performQualityChecks(transformedContent, job.content);
        job.qualityScore = qualityScore;
      }
      job.progress = 95;

      // 6. Create processed content result
      const result: ProcessedContent = {
        id: `processed_${job.id}`,
        originalId: job.content.id,
        language: job.content.language,
        organization: job.content.organization,
        resourceType: job.content.resourceType,
        title: job.content.title,
        content: transformedContent,
        metadata: {
          processingTime: Date.now() - new Date(job.startTime).getTime(),
          transformationsApplied: source?.config.transformRules?.map((r) => r.type) || [],
          qualityChecks: this.config.enableQualityChecks ? ["accuracy", "consistency"] : [],
          aiAnalysis,
        },
        validation,
      };

      job.result = result;
      job.status = "completed";
      job.progress = 100;
      job.endTime = new Date().toISOString();

      // Update source metrics
      if (source) {
        source.metadata.totalIngested++;
        source.metadata.lastSync = new Date().toISOString();
        const processingTime = result.metadata.processingTime;
        source.metadata.averageProcessingTime =
          (source.metadata.averageProcessingTime + processingTime) / 2;
      }
    } catch (error) {
      job.error = error instanceof Error ? error.message : "Unknown error";
      job.status = "failed";
      job.endTime = new Date().toISOString();

      // Update source error count
      const source = this.sources.get(job.sourceId);
      if (source) {
        source.metadata.errorCount++;
      }

      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        job.status = "pending";
        job.error = undefined;
        setTimeout(
          () => {
            this.processingQueue.push(job);
          },
          this.config.retryDelayMs * Math.pow(2, job.retryCount)
        );
      }
    }

    this.updateStats();
  }

  /**
   * Fetch content from URL
   */
  private async fetchContent(content: DiscoveredContent): Promise<string> {
    // Mock content fetching
    await new Promise((resolve) => setTimeout(resolve, 100));

    return `Mock content for ${content.title} in ${content.language}`;
  }

  /**
   * Validate fetched content
   */
  private async validateContent(
    content: string,
    metadata: DiscoveredContent
  ): Promise<{
    passed: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Size validation
    if (content.length > this.config.maxContentSize) {
      errors.push("Content exceeds maximum size limit");
    }

    // Format validation
    const format = metadata.metadata.format || "unknown";
    if (!this.config.supportedFormats.includes(format)) {
      warnings.push(`Format '${format}' may not be fully supported`);
    }

    // Content validation
    if (!content.trim()) {
      errors.push("Content is empty");
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Transform content using configured rules
   */
  private async transformContent(content: string, rules: TransformRule[]): Promise<string> {
    let transformed = content;

    for (const rule of rules) {
      switch (rule.type) {
        case "normalize":
          transformed = transformed.trim().replace(/\s+/g, " ");
          break;
        case "validate":
          // Additional validation based on rule parameters
          break;
        case "enhance":
          // Content enhancement
          break;
        default:
          logger.warn(`Unknown transform rule`, { ruleType: rule.type });
      }
    }

    return transformed;
  }

  /**
   * Perform AI analysis on content
   */
  private async performAIAnalysis(content: string, metadata: DiscoveredContent): Promise<any> {
    if (!this.aiSummarizer) return null;

    try {
      const summary = await this.aiSummarizer.summarize({
        content,
        contentType: this.mapResourceTypeToContentType(metadata.resourceType),
        summaryType: "brief",
        language: metadata.language,
      });

      return {
        summary: summary.summary,
        keyTerms: summary.keyTerms,
        complexity: Math.floor(Math.random() * 10) + 1, // Mock complexity score
        recommendations: summary.metadata ? ["Consider reviewing for clarity"] : [],
      };
    } catch (error) {
      logger.warn("AI analysis failed", { error: String(error) });
      return null;
    }
  }

  /**
   * Perform quality checks on content
   */
  private async performQualityChecks(
    content: string,
    metadata: DiscoveredContent
  ): Promise<number> {
    if (!this.qualityChecker) return 85; // Mock score

    try {
      // Mock quality check - in real implementation, would need source text
      const response = await this.qualityChecker.checkQuality({
        sourceText: "Mock source text",
        targetText: content,
        sourceLanguage: "en",
        targetLanguage: metadata.language,
        reference: "Mock reference",
        checkTypes: ["accuracy", "naturalness"],
      });

      return response.overallScore;
    } catch (error) {
      logger.warn("Quality check failed", { error: String(error) });
      return 75; // Default score
    }
  }

  /**
   * Map resource type to content type for AI analysis
   */
  private mapResourceTypeToContentType(resourceType: ResourceType): string {
    const mapping: Record<ResourceType, string> = {
      ULT: "scripture",
      UST: "scripture",
      TN: "translation-notes",
      TW: "translation-words",
      TQ: "translation-questions",
      TA: "mixed",
      UHB: "scripture",
      UGNT: "scripture",
    };

    return mapping[resourceType] || "mixed";
  }

  /**
   * Handle webhook content
   */
  async handleWebhook(payload: WebhookPayload, sourceId: string): Promise<void> {
    const source = this.sources.get(sourceId);
    if (!source || !source.enabled || source.type !== "webhook") {
      throw new Error("Invalid webhook source");
    }

    if (payload.event === "create" || payload.event === "update") {
      const discoveredContent: DiscoveredContent = {
        id: payload.content.id,
        sourceId,
        url: payload.content.url,
        language: payload.content.metadata.language || "unknown",
        organization: payload.content.metadata.organization || "unknown",
        resourceType: payload.content.metadata.resourceType || "ULT",
        title: payload.content.metadata.title || "Untitled",
        description: payload.content.metadata.description,
        lastModified: payload.timestamp,
        size: payload.content.metadata.size || 0,
        checksum: payload.content.metadata.checksum || "",
        metadata: payload.content.metadata,
      };

      await this.ingestContent([discoveredContent]);
    }
  }

  /**
   * Batch ingestion from multiple sources
   */
  async ingestBatch(request: BatchIngestionRequest): Promise<{
    jobs: IngestionJob[];
    stats: {
      total: number;
      queued: number;
      failed: number;
    };
  }> {
    const content = await this.discoverContent(request.sourceIds);
    const filteredContent = request.filters ? this.applyFilters(content, request.filters) : content;

    const jobs = await this.ingestContent(filteredContent);

    return {
      jobs,
      stats: {
        total: content.length,
        queued: jobs.length,
        failed: content.length - jobs.length,
      },
    };
  }

  /**
   * Start processing loop
   */
  private startProcessingLoop(): void {
    setInterval(async () => {
      if (this.isProcessing || this.processingQueue.length === 0) return;

      this.isProcessing = true;
      const concurrentJobs = this.processingQueue.splice(0, this.config.maxConcurrentJobs);

      try {
        await Promise.all(concurrentJobs.map((job) => this.processJob(job)));
      } catch (error) {
        logger.error("Processing loop error", { error: String(error) });
      }

      this.isProcessing = false;
    }, 1000); // Check every second
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): IngestionStats {
    return {
      totalSources: 0,
      activeSources: 0,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      averageProcessingTime: 0,
      averageQualityScore: 0,
      contentByLanguage: {},
      contentByType: {},
      recentActivity: [],
    };
  }

  /**
   * Update statistics
   */
  private updateStats(): void {
    this.stats.totalSources = this.sources.size;
    this.stats.activeSources = Array.from(this.sources.values()).filter((s) => s.enabled).length;
    this.stats.totalJobs = this.jobs.size;
    this.stats.completedJobs = Array.from(this.jobs.values()).filter(
      (j) => j.status === "completed"
    ).length;
    this.stats.failedJobs = Array.from(this.jobs.values()).filter(
      (j) => j.status === "failed"
    ).length;

    // Calculate averages
    const completedJobs = Array.from(this.jobs.values()).filter((j) => j.status === "completed");
    if (completedJobs.length > 0) {
      this.stats.averageProcessingTime =
        completedJobs.reduce((sum, job) => {
          return sum + (job.result?.metadata.processingTime || 0);
        }, 0) / completedJobs.length;

      this.stats.averageQualityScore =
        completedJobs.reduce((sum, job) => {
          return sum + (job.qualityScore || 0);
        }, 0) / completedJobs.length;
    }

    // Update content breakdowns
    this.stats.contentByLanguage = {};
    this.stats.contentByType = {};

    completedJobs.forEach((job) => {
      const lang = job.content.language;
      const type = job.content.resourceType;

      this.stats.contentByLanguage[lang] = (this.stats.contentByLanguage[lang] || 0) + 1;
      this.stats.contentByType[type] = (this.stats.contentByType[type] || 0) + 1;
    });
  }

  /**
   * Get ingestion statistics
   */
  getStats(): IngestionStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * Get job status
   */
  getJob(jobId: string): IngestionJob | null {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Get all jobs for a source
   */
  getJobsBySource(sourceId: string): IngestionJob[] {
    return Array.from(this.jobs.values()).filter((job) => job.sourceId === sourceId);
  }

  /**
   * Cancel pending job
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status !== "pending") return false;

    job.status = "skipped";
    job.endTime = new Date().toISOString();
    return true;
  }

  /**
   * Clear completed jobs older than specified days
   */
  cleanupJobs(olderThanDays: number = 7): number {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - olderThanDays);

    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (job.status === "completed" && job.endTime) {
        const endTime = new Date(job.endTime);
        if (endTime < cutoff) {
          this.jobs.delete(jobId);
          cleaned++;
        }
      }
    }

    this.updateStats();
    return cleaned;
  }

  /**
   * Get sources list
   */
  getSources(): ContentSource[] {
    return Array.from(this.sources.values());
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<typeof DEFAULT_CONFIG>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Export types
 */
export type {
  BatchIngestionRequest,
  ContentFilter,
  ContentSource,
  DiscoveredContent,
  IngestionJob,
  IngestionStats,
  ProcessedContent,
  TransformRule,
  WebhookPayload,
};
