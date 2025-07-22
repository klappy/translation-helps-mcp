import { useState, useCallback, useRef } from 'react';

/**
 * usePerformanceTracking Hook
 * 
 * Provides performance tracking capabilities for API calls, user interactions,
 * and application metrics
 */
export const usePerformanceTracking = () => {
  const [stats, setStats] = useState({
    totalRequests: 0,
    averageResponseTime: 0,
    cacheHits: 0,
    errors: 0,
    recentEvents: []
  });

  const requestTimes = useRef([]);
  const eventHistory = useRef([]);

  // Track an event with optional data
  const trackEvent = useCallback((eventType, data = {}) => {
    const timestamp = Date.now();
    const event = {
      type: eventType,
      data,
      timestamp
    };

    // Add to event history (keep last 50 events)
    eventHistory.current.push(event);
    if (eventHistory.current.length > 50) {
      eventHistory.current.shift();
    }

    // Update stats based on event type
    setStats(prevStats => {
      const newStats = { ...prevStats };

      switch (eventType) {
        case 'scripture_load_start':
          // Request started
          break;

        case 'scripture_load_success':
          newStats.totalRequests += 1;
          
          if (data.loadTime) {
            requestTimes.current.push(data.loadTime);
            
            // Keep only last 100 request times for average calculation
            if (requestTimes.current.length > 100) {
              requestTimes.current.shift();
            }
            
            // Recalculate average response time
            newStats.averageResponseTime = requestTimes.current.reduce((sum, time) => sum + time, 0) / requestTimes.current.length;
          }
          
          if (data.cached) {
            newStats.cacheHits += 1;
          }
          break;

        case 'scripture_load_error':
          newStats.totalRequests += 1;
          newStats.errors += 1;
          break;

        case 'word_lookup':
        case 'language_change':
          // These don't affect request stats but are tracked for user behavior
          break;

        default:
          // Unknown event type
          break;
      }

      // Update recent events (keep last 20)
      newStats.recentEvents = [...eventHistory.current].reverse().slice(0, 20);

      return newStats;
    });
  }, []);

  // Get current performance statistics
  const getPerformanceStats = useCallback(() => {
    return {
      ...stats,
      cacheHitRate: stats.totalRequests > 0 ? stats.cacheHits / stats.totalRequests : 0,
      errorRate: stats.totalRequests > 0 ? stats.errors / stats.totalRequests : 0,
      requestsPerMinute: calculateRequestsPerMinute(),
      performanceGrade: calculatePerformanceGrade()
    };
  }, [stats]);

  // Calculate requests per minute based on recent activity
  const calculateRequestsPerMinute = useCallback(() => {
    const oneMinuteAgo = Date.now() - 60000;
    const recentRequests = eventHistory.current.filter(
      event => event.timestamp > oneMinuteAgo && 
      (event.type === 'scripture_load_success' || event.type === 'scripture_load_error')
    );
    return recentRequests.length;
  }, []);

  // Calculate overall performance grade
  const calculatePerformanceGrade = useCallback(() => {
    const { averageResponseTime, errors, totalRequests } = stats;
    
    if (totalRequests === 0) return 'N/A';

    let score = 100;

    // Deduct points for slow response times
    if (averageResponseTime > 1000) score -= 30;
    else if (averageResponseTime > 500) score -= 15;
    else if (averageResponseTime > 200) score -= 5;

    // Deduct points for errors
    const errorRate = errors / totalRequests;
    if (errorRate > 0.1) score -= 25;
    else if (errorRate > 0.05) score -= 15;
    else if (errorRate > 0.02) score -= 5;

    // Bonus points for good cache utilization
    const cacheHitRate = stats.cacheHits / totalRequests;
    if (cacheHitRate > 0.8) score += 5;

    score = Math.max(0, Math.min(100, score));

    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }, [stats]);

  // Clear all tracking data
  const clearStats = useCallback(() => {
    setStats({
      totalRequests: 0,
      averageResponseTime: 0,
      cacheHits: 0,
      errors: 0,
      recentEvents: []
    });
    requestTimes.current = [];
    eventHistory.current = [];
  }, []);

  // Get detailed event history
  const getEventHistory = useCallback(() => {
    return [...eventHistory.current].reverse();
  }, []);

  // Get performance insights and recommendations
  const getPerformanceInsights = useCallback(() => {
    const insights = [];
    const { averageResponseTime, cacheHits, totalRequests, errors } = stats;

    if (totalRequests === 0) {
      insights.push({
        type: 'info',
        message: 'Start using the app to see performance insights'
      });
      return insights;
    }

    // Response time insights
    if (averageResponseTime > 1000) {
      insights.push({
        type: 'warning',
        message: 'Response times are slow. Check your internet connection or try again later.',
        action: 'Check connection'
      });
    } else if (averageResponseTime < 200) {
      insights.push({
        type: 'success',
        message: 'Excellent response times! Your connection is working great.',
        action: null
      });
    }

    // Cache insights
    const cacheHitRate = cacheHits / totalRequests;
    if (cacheHitRate < 0.3 && totalRequests > 5) {
      insights.push({
        type: 'info',
        message: 'Low cache utilization. Searching for similar passages again will be faster.',
        action: 'Use cache'
      });
    } else if (cacheHitRate > 0.7) {
      insights.push({
        type: 'success',
        message: 'Great cache utilization! Your frequently accessed content loads quickly.',
        action: null
      });
    }

    // Error insights
    const errorRate = errors / totalRequests;
    if (errorRate > 0.1) {
      insights.push({
        type: 'error',
        message: 'High error rate detected. Some resources may be temporarily unavailable.',
        action: 'Try different content'
      });
    }

    // Usage insights
    const requestsPerMinute = calculateRequestsPerMinute();
    if (requestsPerMinute > 10) {
      insights.push({
        type: 'info',
        message: 'High activity detected. Consider bookmarking frequently used passages.',
        action: 'Bookmark passages'
      });
    }

    return insights;
  }, [stats, calculateRequestsPerMinute]);

  // Export tracking data (for debugging or analytics)
  const exportTrackingData = useCallback(() => {
    return {
      stats: getPerformanceStats(),
      eventHistory: getEventHistory(),
      insights: getPerformanceInsights(),
      exportTime: new Date().toISOString()
    };
  }, [getPerformanceStats, getEventHistory, getPerformanceInsights]);

  return {
    trackEvent,
    getPerformanceStats,
    clearStats,
    getEventHistory,
    getPerformanceInsights,
    exportTrackingData,
    stats: getPerformanceStats()
  };
};

export default usePerformanceTracking;
