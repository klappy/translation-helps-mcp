import React, { useState } from 'react';
import './PerformanceMonitor.css';

/**
 * PerformanceMonitor Component
 * 
 * Displays real-time performance metrics including:
 * - API response times
 * - Cache hit rates
 * - Network status
 * - Resource load statistics
 */
const PerformanceMonitor = ({ stats, isOnline }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate performance indicators
  const getPerformanceLevel = (responseTime) => {
    if (responseTime < 200) return { level: 'excellent', color: '#48bb78', label: 'Excellent' };
    if (responseTime < 500) return { level: 'good', color: '#38b2ac', label: 'Good' };
    if (responseTime < 1000) return { level: 'fair', color: '#ed8936', label: 'Fair' };
    return { level: 'poor', color: '#f56565', label: 'Poor' };
  };

  const getCacheEfficiency = (hitRate) => {
    if (hitRate > 0.8) return { level: 'excellent', color: '#48bb78', label: 'Excellent' };
    if (hitRate > 0.6) return { level: 'good', color: '#38b2ac', label: 'Good' };
    if (hitRate > 0.4) return { level: 'fair', color: '#ed8936', label: 'Fair' };
    return { level: 'poor', color: '#f56565', label: 'Poor' };
  };

  // Default stats if none provided
  const defaultStats = {
    averageResponseTime: 0,
    totalRequests: 0,
    cacheHits: 0,
    errors: 0,
    recentEvents: []
  };

  const currentStats = stats || defaultStats;
  const avgResponseTime = currentStats.averageResponseTime || 0;
  const cacheHitRate = currentStats.totalRequests > 0 
    ? currentStats.cacheHits / currentStats.totalRequests 
    : 0;
  const errorRate = currentStats.totalRequests > 0
    ? currentStats.errors / currentStats.totalRequests
    : 0;

  const performanceLevel = getPerformanceLevel(avgResponseTime);
  const cacheEfficiency = getCacheEfficiency(cacheHitRate);

  const formatTime = (ms) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (ratio) => {
    return `${Math.round(ratio * 100)}%`;
  };

  return (
    <div className="performance-monitor">
      
      {/* Compact Status Display */}
      <div 
        className="monitor-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="status-indicators">
          
          {/* Network Status */}
          <div className={`status-indicator network ${isOnline ? 'online' : 'offline'}`}>
            <span className="indicator-icon">{isOnline ? '🟢' : '🔴'}</span>
            <span className="indicator-label">{isOnline ? 'Online' : 'Offline'}</span>
          </div>

          {/* Performance Status */}
          <div className="status-indicator performance">
            <span className="indicator-icon">⚡</span>
            <span className="indicator-value" style={{ color: performanceLevel.color }}>
              {avgResponseTime > 0 ? formatTime(avgResponseTime) : '--'}
            </span>
          </div>

          {/* Cache Status */}
          <div className="status-indicator cache">
            <span className="indicator-icon">💾</span>
            <span className="indicator-value" style={{ color: cacheEfficiency.color }}>
              {formatPercentage(cacheHitRate)}
            </span>
          </div>

          {/* Expand Toggle */}
          <div className="expand-toggle">
            <span className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>▼</span>
          </div>

        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="monitor-details">
          
          {/* Performance Metrics */}
          <div className="metrics-section">
            <h4>📊 Performance Metrics</h4>
            
            <div className="metrics-grid">
              
              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-icon">⚡</span>
                  <span className="metric-title">Response Time</span>
                </div>
                <div className="metric-value" style={{ color: performanceLevel.color }}>
                  {avgResponseTime > 0 ? formatTime(avgResponseTime) : 'No data'}
                </div>
                <div className="metric-label">{performanceLevel.label}</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-icon">💾</span>
                  <span className="metric-title">Cache Hit Rate</span>
                </div>
                <div className="metric-value" style={{ color: cacheEfficiency.color }}>
                  {formatPercentage(cacheHitRate)}
                </div>
                <div className="metric-label">{cacheEfficiency.label}</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-icon">📡</span>
                  <span className="metric-title">Total Requests</span>
                </div>
                <div className="metric-value">
                  {currentStats.totalRequests.toLocaleString()}
                </div>
                <div className="metric-label">API Calls</div>
              </div>

              <div className="metric-card">
                <div className="metric-header">
                  <span className="metric-icon">❌</span>
                  <span className="metric-title">Error Rate</span>
                </div>
                <div className="metric-value" style={{ 
                  color: errorRate > 0.1 ? '#f56565' : errorRate > 0.05 ? '#ed8936' : '#48bb78' 
                }}>
                  {formatPercentage(errorRate)}
                </div>
                <div className="metric-label">
                  {currentStats.errors} errors
                </div>
              </div>

            </div>
          </div>

          {/* Recent Activity */}
          {currentStats.recentEvents && currentStats.recentEvents.length > 0 && (
            <div className="activity-section">
              <div className="activity-header">
                <h4>🕒 Recent Activity</h4>
                <button 
                  className="details-toggle"
                  onClick={() => setShowDetails(!showDetails)}
                >
                  {showDetails ? 'Hide Details' : 'Show Details'}
                </button>
              </div>
              
              <div className="activity-list">
                {currentStats.recentEvents.slice(0, showDetails ? 10 : 3).map((event, index) => (
                  <div key={index} className={`activity-item ${event.type}`}>
                    <div className="activity-icon">
                      {event.type === 'scripture_load_success' && '✅'}
                      {event.type === 'scripture_load_error' && '❌'}
                      {event.type === 'word_lookup' && '📖'}
                      {event.type === 'language_change' && '🌐'}
                    </div>
                    <div className="activity-content">
                      <div className="activity-description">
                        {event.type === 'scripture_load_success' && `Loaded ${event.data.reference}`}
                        {event.type === 'scripture_load_error' && `Failed to load ${event.data.reference}`}
                        {event.type === 'word_lookup' && `Looked up "${event.data.word}"`}
                        {event.type === 'language_change' && `Changed to ${event.data.language}`}
                      </div>
                      {showDetails && (
                        <div className="activity-details">
                          {event.data.loadTime && `${formatTime(event.data.loadTime)} • `}
                          {event.data.cached && '💾 Cached • '}
                          <span className="activity-time">
                            {new Date(event.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Tips */}
          <div className="tips-section">
            <h4>💡 Performance Tips</h4>
            <div className="tips-list">
              
              {avgResponseTime > 1000 && (
                <div className="tip-item warning">
                  <span className="tip-icon">⚠️</span>
                  <span>Response times are slow. Check your internet connection.</span>
                </div>
              )}
              
              {cacheHitRate < 0.5 && currentStats.totalRequests > 5 && (
                <div className="tip-item info">
                  <span className="tip-icon">💾</span>
                  <span>Low cache hit rate. Consider searching similar passages to improve performance.</span>
                </div>
              )}
              
              {errorRate > 0.1 && (
                <div className="tip-item error">
                  <span className="tip-icon">🔧</span>
                  <span>High error rate detected. Some resources may be temporarily unavailable.</span>
                </div>
              )}
              
              {!isOnline && (
                <div className="tip-item warning">
                  <span className="tip-icon">📱</span>
                  <span>You're offline. Only cached content is available.</span>
                </div>
              )}
              
              {avgResponseTime < 200 && cacheHitRate > 0.8 && (
                <div className="tip-item success">
                  <span className="tip-icon">🚀</span>
                  <span>Excellent performance! Your cache is working efficiently.</span>
                </div>
              )}

            </div>
          </div>

          {/* System Information */}
          <div className="system-section">
            <h4>🔧 System Information</h4>
            <div className="system-info">
              <div className="info-row">
                <span className="info-label">Browser:</span>
                <span className="info-value">{navigator.userAgent.split(' ')[0] || 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Platform:</span>
                <span className="info-value">{navigator.platform || 'Unknown'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Network:</span>
                <span className="info-value">
                  {isOnline ? (
                    navigator.connection ? 
                      `${navigator.connection.effectiveType || 'Unknown'} (${navigator.connection.downlink || '?'}mbps)` :
                      'Connected'
                  ) : 'Offline'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Cache Storage:</span>
                <span className="info-value">
                  {navigator.storage ? 'Available' : 'Not supported'}
                </span>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};

export default PerformanceMonitor;
