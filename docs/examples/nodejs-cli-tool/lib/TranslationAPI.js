/**
 * Translation API Client for Node.js CLI
 * 
 * Provides server-side access to unfoldingWord Bible translation resources
 * with caching, error handling, and performance optimization
 */

const axios = require('axios');
const NodeCache = require('node-cache');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');

class TranslationAPI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || global.cliOptions?.apiUrl || 'https://api.translation.tools';
    this.timeout = options.timeout || global.cliOptions?.timeout || 10000;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;

    // Setup caching
    this.memoryCache = new NodeCache({ 
      stdTTL: 300, // 5 minutes
      checkperiod: 60 // Check for expired keys every minute
    });

    // File cache directory
    this.cacheDir = options.cacheDir || 
                   global.cliOptions?.cacheDir || 
                   path.join(os.homedir(), '.translation-cli', 'cache');

    // Initialize file cache directory
    this.initializeCacheDir();

    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'User-Agent': 'translation-cli/1.0.0 (Node.js)',
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor for retry logic
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const config = error.config;
        
        if (!config.retryCount) {
          config.retryCount = 0;
        }

        if (config.retryCount < this.retryAttempts) {
          config.retryCount++;
          
          // Exponential backoff
          const delay = this.retryDelay * Math.pow(2, config.retryCount - 1);
          await this.sleep(delay);
          
          return this.client(config);
        }

        return Promise.reject(error);
      }
    );
  }

  async initializeCacheDir() {
    try {
      await fs.ensureDir(this.cacheDir);
    } catch (error) {
      console.warn('Warning: Could not create cache directory:', error.message);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Generate cache key
  getCacheKey(method, params) {
    const paramsString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    
    return `${method}:${paramsString}`;
  }

  // Memory cache operations
  getFromMemoryCache(key) {
    return this.memoryCache.get(key);
  }

  setInMemoryCache(key, data, ttl = 300) {
    this.memoryCache.set(key, data, ttl);
  }

  // File cache operations
  async getFromFileCache(key) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      
      if (await fs.pathExists(filePath)) {
        const stats = await fs.stat(filePath);
        const ageInMinutes = (Date.now() - stats.mtime.getTime()) / (1000 * 60);
        
        // File cache TTL: 24 hours
        if (ageInMinutes < 1440) {
          const data = await fs.readJson(filePath);
          return data;
        } else {
          // Remove expired cache file
          await fs.remove(filePath);
        }
      }
    } catch (error) {
      // Ignore cache read errors
    }
    
    return null;
  }

  async setInFileCache(key, data) {
    try {
      const filePath = path.join(this.cacheDir, `${key}.json`);
      await fs.writeJson(filePath, data, { spaces: 2 });
    } catch (error) {
      // Ignore cache write errors
    }
  }

  // Main API request method with caching
  async request(endpoint, params = {}, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, params);
    
    // Try memory cache first
    let cachedData = this.getFromMemoryCache(cacheKey);
    if (cachedData) {
      return { ...cachedData, metadata: { ...cachedData.metadata, cached: true, cacheType: 'memory' } };
    }

    // Try file cache
    cachedData = await this.getFromFileCache(cacheKey);
    if (cachedData) {
      // Promote to memory cache
      this.setInMemoryCache(cacheKey, cachedData);
      return { ...cachedData, metadata: { ...cachedData.metadata, cached: true, cacheType: 'file' } };
    }

    // Make API request
    try {
      const startTime = Date.now();
      const response = await this.client.get(endpoint, { params });
      const endTime = Date.now();

      const data = response.data;
      
      // Add response metadata
      data.metadata = {
        ...data.metadata,
        responseTime: endTime - startTime,
        cached: false,
        timestamp: new Date().toISOString(),
        endpoint,
        params
      };

      // Cache the response
      this.setInMemoryCache(cacheKey, data);
      await this.setInFileCache(cacheKey, data);

      return data;

    } catch (error) {
      // Enhanced error handling
      if (error.response) {
        // API returned an error
        const status = error.response.status;
        const message = error.response.data?.error || error.message;
        
        throw new Error(`API Error (${status}): ${message}`);
      } else if (error.request) {
        // Network error
        throw new Error('Network Error: Unable to reach the API. Check your internet connection.');
      } else {
        // Other error
        throw new Error(`Request Error: ${error.message}`);
      }
    }
  }

  // Fetch Scripture with ULT/GLT and UST/GST translations
  async fetchScripture(reference, language = 'en', options = {}) {
    const params = {
      reference,
      language,
      translation: 'all',
      includeAlignment: options.includeAlignment || false,
      includeVerseNumbers: options.includeVerseNumbers !== false
    };

    return this.request('/api/fetch-scripture', params);
  }

  // Fetch Translation Notes
  async fetchTranslationNotes(reference, language = 'en', options = {}) {
    const params = {
      reference,
      language,
      includeAcademyLinks: options.includeAcademyLinks !== false
    };

    return this.request('/api/fetch-translation-notes', params);
  }

  // Get Translation Word
  async getTranslationWord(word, language = 'en', options = {}) {
    const params = {
      word,
      language,
      includeReferences: options.includeReferences !== false
    };

    return this.request('/api/get-translation-word', params);
  }

  // Get Words for Reference
  async getWordsForReference(reference, language = 'en') {
    const params = { reference, language };
    return this.request('/api/get-words-for-reference', params);
  }

  // Fetch Translation Questions
  async fetchTranslationQuestions(reference, language = 'en') {
    const params = { reference, language };
    return this.request('/api/fetch-translation-questions', params);
  }

  // Get Languages
  async getLanguages(options = {}) {
    const params = {
      includeAlternateNames: options.includeAlternateNames !== false
    };

    return this.request('/api/get-languages', params);
  }

  // Get Language Coverage
  async getLanguageCoverage(options = {}) {
    const params = {
      minCompleteness: options.minCompleteness || 70,
      recommended: options.recommendedOnly !== false
    };

    return this.request('/api/language-coverage', params);
  }

  // List Available Resources
  async listAvailableResources(language = 'en', options = {}) {
    const params = {
      language,
      organization: options.organization || 'unfoldingWord',
      query: options.query
    };

    return this.request('/api/list-available-resources', params);
  }

  // Health Check
  async healthCheck() {
    return this.request('/api/health');
  }

  // Get Comprehensive Helps (multiple resources in parallel)
  async getComprehensiveHelps(reference, language = 'en', options = {}) {
    const {
      includeScripture = true,
      includeNotes = true,
      includeWords = true,
      includeQuestions = true
    } = options;

    const requests = [];
    
    if (includeScripture) {
      requests.push(this.fetchScripture(reference, language));
    }
    if (includeNotes) {
      requests.push(this.fetchTranslationNotes(reference, language).catch(() => ({ notes: [] })));
    }
    if (includeWords) {
      requests.push(this.getWordsForReference(reference, language).catch(() => ({ words: [] })));
    }
    if (includeQuestions) {
      requests.push(this.fetchTranslationQuestions(reference, language).catch(() => ({ questions: [] })));
    }

    const results = await Promise.all(requests);
    
    let resultIndex = 0;
    return {
      reference,
      language,
      scripture: includeScripture ? results[resultIndex++] : null,
      notes: includeNotes ? results[resultIndex++]?.notes || [] : [],
      words: includeWords ? results[resultIndex++]?.words || [] : [],
      questions: includeQuestions ? results[resultIndex++]?.questions || [] : [],
      metadata: {
        fetchTime: Date.now(),
        includedResources: Object.keys(options).filter(key => options[key])
      }
    };
  }

  // Cache management methods
  clearMemoryCache() {
    this.memoryCache.flushAll();
  }

  async clearFileCache() {
    try {
      await fs.emptyDir(this.cacheDir);
    } catch (error) {
      throw new Error(`Failed to clear file cache: ${error.message}`);
    }
  }

  async clearAllCache() {
    this.clearMemoryCache();
    await this.clearFileCache();
  }

  getCacheStats() {
    const memoryStats = this.memoryCache.getStats();
    
    return {
      memory: {
        keys: memoryStats.keys,
        hits: memoryStats.hits,
        misses: memoryStats.misses,
        hitRate: memoryStats.hits / (memoryStats.hits + memoryStats.misses) || 0
      },
      cacheDir: this.cacheDir
    };
  }
}

module.exports = TranslationAPI;
