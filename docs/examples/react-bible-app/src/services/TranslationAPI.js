import axios from 'axios';

/**
 * Translation Helps API Client
 * 
 * Provides access to unfoldingWord Bible translation resources including:
 * - ULT/GLT (Literal) and UST/GST (Simplified) Scripture texts
 * - Translation Notes for cultural context
 * - Translation Words for biblical term definitions
 * - Translation Questions for validation
 * - Strategic Language support
 */
export class TranslationAPI {
  constructor(options = {}) {
    this.baseURL = options.baseURL || 'https://api.translation.tools';
    this.timeout = options.timeout || 10000;
    this.cache = new Map();
    this.cacheTimeout = options.cacheTimeout || 300000; // 5 minutes
    
    // Configure axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'React-Bible-Translation-App/1.0.0'
      }
    });

    // Request interceptor for performance tracking
    this.client.interceptors.request.use(
      (config) => {
        config.metadata = { startTime: performance.now() };
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for performance tracking and caching
    this.client.interceptors.response.use(
      (response) => {
        const endTime = performance.now();
        const duration = endTime - response.config.metadata.startTime;
        
        // Add performance metadata
        if (response.data) {
          response.data.metadata = {
            ...response.data.metadata,
            clientResponseTime: Math.round(duration),
            timestamp: new Date().toISOString()
          };
        }
        
        return response;
      },
      (error) => {
        // Handle network errors gracefully
        if (error.code === 'ECONNABORTED') {
          error.message = 'Request timeout - please check your connection';
        } else if (!navigator.onLine) {
          error.message = 'No internet connection - please check your network';
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Get cached data if available and not expired
   */
  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return { ...cached.data, metadata: { ...cached.data.metadata, cached: true } };
    }
    return null;
  }

  /**
   * Store data in cache
   */
  setCachedData(key, data) {
    this.cache.set(key, {
      data: { ...data },
      timestamp: Date.now()
    });
  }

  /**
   * Fetch Scripture text in ULT/GLT (literal) and UST/GST (simplified) translations
   * 
   * @param {string} reference - Scripture reference (e.g., "John 3:16", "Genesis 1:1-5")
   * @param {string} language - Strategic language code (default: "en")
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Scripture data with ULT/UST texts
   */
  async fetchScripture(reference, language = 'en', options = {}) {
    const cacheKey = `scripture:${reference}:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        reference,
        language,
        translation: 'all', // Get both ULT and UST
        includeAlignment: options.includeAlignment !== false,
        includeVerseNumbers: options.includeVerseNumbers !== false
      };

      const response = await this.client.get('/api/fetch-scripture', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Scripture: ${error.message}`);
    }
  }

  /**
   * Fetch Translation Notes for cultural context and explanations
   * 
   * @param {string} reference - Scripture reference
   * @param {string} language - Strategic language code
   * @returns {Promise<Object>} Translation notes data
   */
  async fetchTranslationNotes(reference, language = 'en') {
    const cacheKey = `notes:${reference}:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        reference,
        language,
        includeAcademyLinks: true
      };

      const response = await this.client.get('/api/fetch-translation-notes', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Translation Notes: ${error.message}`);
    }
  }

  /**
   * Get Translation Words for specific biblical terms
   * 
   * @param {string} word - Biblical term to look up
   * @param {string} language - Strategic language code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Translation word data
   */
  async getTranslationWord(word, language = 'en', options = {}) {
    const cacheKey = `word:${word}:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        word,
        language,
        includeReferences: options.includeReferences !== false
      };

      const response = await this.client.get('/api/get-translation-word', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Translation Word: ${error.message}`);
    }
  }

  /**
   * Get Translation Words for a specific Scripture reference
   * 
   * @param {string} reference - Scripture reference
   * @param {string} language - Strategic language code
   * @returns {Promise<Object>} Translation words data for the reference
   */
  async getWordsForReference(reference, language = 'en') {
    const cacheKey = `words-ref:${reference}:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        reference,
        language
      };

      const response = await this.client.get('/api/get-words-for-reference', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch words for reference: ${error.message}`);
    }
  }

  /**
   * Fetch Translation Questions for comprehension validation
   * 
   * @param {string} reference - Scripture reference
   * @param {string} language - Strategic language code
   * @returns {Promise<Object>} Translation questions data
   */
  async fetchTranslationQuestions(reference, language = 'en') {
    const cacheKey = `questions:${reference}:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        reference,
        language
      };

      const response = await this.client.get('/api/fetch-translation-questions', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch Translation Questions: ${error.message}`);
    }
  }

  /**
   * Get available Strategic Languages
   * 
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Available languages data
   */
  async getLanguages(options = {}) {
    const cacheKey = 'languages';
    
    // Check cache first (languages don't change often)
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        includeAlternateNames: options.includeAlternateNames !== false
      };

      const response = await this.client.get('/api/get-languages', { params });
      
      // Cache the response for longer (languages are relatively static)
      this.cache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch languages: ${error.message}`);
    }
  }

  /**
   * Get language coverage matrix showing resource availability
   * 
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Language coverage data
   */
  async getLanguageCoverage(options = {}) {
    const cacheKey = `coverage:${JSON.stringify(options)}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        minCompleteness: options.minCompleteness || 70,
        recommended: options.recommendedOnly !== false
      };

      const response = await this.client.get('/api/language-coverage', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch language coverage: ${error.message}`);
    }
  }

  /**
   * List available translation resources
   * 
   * @param {string} language - Strategic language code
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Available resources data
   */
  async listAvailableResources(language = 'en', options = {}) {
    const cacheKey = `resources:${language}`;
    
    // Check cache first
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const params = {
        language,
        organization: options.organization || 'unfoldingWord',
        query: options.query
      };

      const response = await this.client.get('/api/list-available-resources', { params });
      
      // Cache the response
      this.setCachedData(cacheKey, response.data);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list resources: ${error.message}`);
    }
  }

  /**
   * Health check for API availability
   * 
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const response = await this.client.get('/api/health');
      return response.data;
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  /**
   * Get comprehensive translation helps for a reference
   * Combines Scripture, Notes, Words, and Questions in a single call
   * 
   * @param {string} reference - Scripture reference
   * @param {string} language - Strategic language code
   * @param {Object} options - Options for what to include
   * @returns {Promise<Object>} Comprehensive translation helps data
   */
  async getComprehensiveHelps(reference, language = 'en', options = {}) {
    const {
      includeScripture = true,
      includeNotes = true,
      includeWords = true,
      includeQuestions = true
    } = options;

    try {
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
    } catch (error) {
      throw new Error(`Failed to fetch comprehensive helps: ${error.message}`);
    }
  }

  /**
   * Clear the API cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   * 
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      entries: this.cache.size,
      cacheTimeout: this.cacheTimeout,
      memoryUsage: this.cache.size * 1024 // Rough estimate
    };
  }
}

// Export a default instance for convenience
export const translationAPI = new TranslationAPI();

export default TranslationAPI;
