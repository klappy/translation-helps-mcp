import React from 'react';
import './ErrorBoundary.css';

/**
 * ErrorBoundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree and displays
 * a fallback UI with helpful error information and recovery options
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true,
      errorId: Date.now().toString(36)
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Report error to monitoring service (if available)
    this.reportError(error, errorInfo);
  }

  reportError = (error, errorInfo) => {
    try {
      // In a real app, you'd send this to your error monitoring service
      const errorReport = {
        errorId: this.state.errorId,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: localStorage.getItem('userId') || 'anonymous'
      };

      // Store error locally for debugging
      const existingErrors = JSON.parse(localStorage.getItem('errorReports') || '[]');
      existingErrors.push(errorReport);
      
      // Keep only last 10 errors
      if (existingErrors.length > 10) {
        existingErrors.splice(0, existingErrors.length - 10);
      }
      
      localStorage.setItem('errorReports', JSON.stringify(existingErrors));

      // Log to console for development
      console.warn('Error reported:', errorReport);
      
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null
    });
  };

  handleReportSend = () => {
    // In a real app, this would send the error to your support team
    const errorDetails = {
      errorId: this.state.errorId,
      error: this.state.error?.message,
      timestamp: new Date().toISOString()
    };

    // Simulate sending report
    navigator.clipboard?.writeText(JSON.stringify(errorDetails, null, 2))
      .then(() => {
        alert('Error details copied to clipboard. Please paste them when contacting support.');
      })
      .catch(() => {
        alert(`Error ID: ${this.state.errorId}\nPlease include this ID when contacting support.`);
      });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      
      return (
        <div className="error-boundary">
          <div className="error-container">
            
            {/* Error Header */}
            <div className="error-header">
              <div className="error-icon">⚠️</div>
              <div className="error-title">
                <h1>Something went wrong</h1>
                <p>We're sorry! The Translation Helper encountered an unexpected error.</p>
              </div>
            </div>

            {/* Error Details */}
            <div className="error-details">
              <div className="error-summary">
                <h3>Error Information</h3>
                <div className="error-info">
                  <div className="info-row">
                    <span className="info-label">Error ID:</span>
                    <span className="info-value error-id">{errorId}</span>
                  </div>
                  <div className="info-row">
                    <span className="info-label">Time:</span>
                    <span className="info-value">{new Date().toLocaleString()}</span>
                  </div>
                  {error && (
                    <div className="info-row">
                      <span className="info-label">Message:</span>
                      <span className="info-value error-message">{error.message}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Details (Expandable) */}
              <details className="technical-details">
                <summary>🔧 Technical Details</summary>
                <div className="tech-content">
                  {error && (
                    <div className="error-section">
                      <h4>Error Stack:</h4>
                      <pre className="error-stack">{error.stack}</pre>
                    </div>
                  )}
                  
                  {errorInfo && (
                    <div className="error-section">
                      <h4>Component Stack:</h4>
                      <pre className="component-stack">{errorInfo.componentStack}</pre>
                    </div>
                  )}

                  <div className="error-section">
                    <h4>Environment:</h4>
                    <div className="env-info">
                      <div>Browser: {navigator.userAgent}</div>
                      <div>URL: {window.location.href}</div>
                      <div>Timestamp: {new Date().toISOString()}</div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* Recovery Actions */}
            <div className="error-actions">
              <h3>What can you do?</h3>
              
              <div className="action-buttons">
                <button 
                  className="action-button primary"
                  onClick={this.handleReset}
                >
                  🔄 Try Again
                </button>
                
                <button 
                  className="action-button secondary"
                  onClick={this.handleReload}
                >
                  🌐 Reload Page
                </button>
                
                <button 
                  className="action-button tertiary"
                  onClick={this.handleReportSend}
                >
                  📧 Report Error
                </button>
              </div>

              <div className="recovery-suggestions">
                <h4>💡 Troubleshooting Tips:</h4>
                <ul>
                  <li>
                    <strong>Refresh the page</strong> - This often resolves temporary issues
                  </li>
                  <li>
                    <strong>Check your internet connection</strong> - Make sure you're connected to the internet
                  </li>
                  <li>
                    <strong>Clear your browser cache</strong> - Old cached data might be causing conflicts
                  </li>
                  <li>
                    <strong>Try a different Scripture reference</strong> - The issue might be specific to certain content
                  </li>
                  <li>
                    <strong>Use a different browser</strong> - Sometimes browser-specific issues occur
                  </li>
                </ul>
              </div>

              <div className="support-info">
                <h4>🆘 Need Help?</h4>
                <p>
                  If the problem persists, please contact our support team with the error ID: 
                  <strong> {errorId}</strong>
                </p>
                <div className="support-links">
                  <a 
                    href="https://github.com/unfoldingword/translation-helps-mcp/issues" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="support-link"
                  >
                    🐛 Report on GitHub
                  </a>
                  <a 
                    href="https://github.com/unfoldingword/translation-helps-mcp/discussions" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="support-link"
                  >
                    💬 Community Support
                  </a>
                </div>
              </div>
            </div>

            {/* Fallback Content */}
            <div className="fallback-content">
              <h3>🔗 Alternative Resources</h3>
              <p>While we fix this issue, you can still access Bible translation resources through:</p>
              <div className="fallback-links">
                <a 
                  href="https://www.unfoldingword.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="fallback-link"
                >
                  📖 unfoldingWord.org
                </a>
                <a 
                  href="https://door43.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="fallback-link"
                >
                  🚪 Door43.org
                </a>
                <a 
                  href="https://git.door43.org/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="fallback-link"
                >
                  �� DCS Repository
                </a>
              </div>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
