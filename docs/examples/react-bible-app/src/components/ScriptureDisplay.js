import React, { useState } from 'react';
import './ScriptureDisplay.css';

/**
 * ScriptureDisplay Component
 * 
 * Displays Scripture text in both ULT/GLT (literal) and UST/GST (simplified) 
 * translations with clickable words for term lookup
 */
const ScriptureDisplay = ({ scripture, loading, language, onWordClick }) => {
  const [selectedTranslation, setSelectedTranslation] = useState('both');
  const [showAlignment, setShowAlignment] = useState(false);

  if (loading) {
    return (
      <div className="scripture-display loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading Scripture and translation data...</p>
        </div>
      </div>
    );
  }

  if (!scripture) {
    return (
      <div className="scripture-display empty">
        <div className="empty-content">
          <h3>📖 Scripture Display</h3>
          <p>Enter a reference above to load Scripture text with translation helps</p>
        </div>
      </div>
    );
  }

  const scriptureData = scripture.scripture || {};
  const hasUlt = scriptureData.ult;
  const hasUst = scriptureData.ust;
  const fallbackText = scriptureData.text;

  // Make words clickable for translation lookup
  const makeTextClickable = (text) => {
    if (!text || typeof text !== 'string') return text;
    
    // Split text into words while preserving punctuation and spacing
    const words = text.split(/(\s+|[^\w\s])/);
    
    return words.map((word, index) => {
      // Only make actual words clickable (not punctuation or spaces)
      if (/^\w+$/.test(word) && word.length > 2) {
        return (
          <span
            key={index}
            className="clickable-word"
            onClick={() => onWordClick(word.toLowerCase())}
            title={`Look up "${word}" in Translation Words`}
          >
            {word}
          </span>
        );
      }
      return <span key={index}>{word}</span>;
    });
  };

  const renderTranslation = (translation, type, title, description) => {
    if (!translation) return null;
    
    const text = translation.text || translation;
    
    return (
      <div className={`translation-section ${type}`}>
        <div className="translation-header">
          <h4>{title}</h4>
          <p className="translation-description">{description}</p>
        </div>
        <div className="scripture-text">
          {makeTextClickable(text)}
        </div>
        {showAlignment && translation.alignment && (
          <div className="alignment-data">
            <h5>Word Alignment Data</h5>
            <div className="alignment-info">
              <small>Precise word-level connections to original Hebrew/Greek</small>
              <pre>{JSON.stringify(translation.alignment, null, 2)}</pre>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderFallback = () => {
    if (!fallbackText) return null;
    
    return (
      <div className="translation-section fallback">
        <div className="translation-header">
          <h4>📜 Scripture Text</h4>
          <p className="translation-description">Available translation</p>
        </div>
        <div className="scripture-text">
          {makeTextClickable(fallbackText)}
        </div>
      </div>
    );
  };

  return (
    <div className="scripture-display">
      
      {/* Header with citation and controls */}
      <div className="scripture-header">
        <h3 className="scripture-citation">
          {scriptureData.citation || 'Scripture Text'}
        </h3>
        
        <div className="scripture-controls">
          {(hasUlt || hasUst) && (
            <div className="translation-selector">
              <label>View:</label>
              <select 
                value={selectedTranslation} 
                onChange={(e) => setSelectedTranslation(e.target.value)}
              >
                <option value="both">Both Translations</option>
                {hasUlt && <option value="ult">Literal Only (ULT/GLT)</option>}
                {hasUst && <option value="ust">Simplified Only (UST/GST)</option>}
              </select>
            </div>
          )}
          
          {(hasUlt?.alignment || hasUst?.alignment) && (
            <div className="alignment-toggle">
              <label>
                <input
                  type="checkbox"
                  checked={showAlignment}
                  onChange={(e) => setShowAlignment(e.target.checked)}
                />
                Show Word Alignment
              </label>
            </div>
          )}
        </div>
      </div>

      {/* Translation content */}
      <div className="scripture-content">
        
        {/* Dual translation view */}
        {selectedTranslation === 'both' && (hasUlt || hasUst) && (
          <div className="dual-translation">
            {hasUlt && renderTranslation(
              hasUlt,
              'literal',
              '🔤 Literal Text (ULT/GLT)',
              'Form-centric translation preserving original language structure, word order, and idioms'
            )}
            
            {hasUst && renderTranslation(
              hasUst,
              'simplified',
              '💬 Simplified Text (UST/GST)',
              'Meaning-based translation in clear, natural language demonstrating good expression'
            )}
          </div>
        )}

        {/* Single translation view */}
        {selectedTranslation === 'ult' && hasUlt && (
          <div className="single-translation">
            {renderTranslation(
              hasUlt,
              'literal',
              '🔤 Literal Text (ULT/GLT)',
              'Form-centric translation preserving original language structure'
            )}
          </div>
        )}

        {selectedTranslation === 'ust' && hasUst && (
          <div className="single-translation">
            {renderTranslation(
              hasUst,
              'simplified',
              '💬 Simplified Text (UST/GST)',
              'Meaning-based translation for clear communication'
            )}
          </div>
        )}

        {/* Fallback for when ULT/UST not available */}
        {!hasUlt && !hasUst && renderFallback()}

      </div>

      {/* Metadata and performance info */}
      <div className="scripture-metadata">
        <div className="metadata-row">
          <span className="metadata-item">
            🌍 Language: {language.toUpperCase()}
          </span>
          {scripture.metadata?.responseTime && (
            <span className="metadata-item">
              ⚡ {scripture.metadata.responseTime}ms
            </span>
          )}
          {scripture.metadata?.cached && (
            <span className="metadata-item cache-indicator">
              💾 Cached
            </span>
          )}
        </div>
        
        <div className="metadata-row">
          <small className="metadata-help">
            💡 Click on words to look up definitions in Translation Words
          </small>
        </div>
      </div>

    </div>
  );
};

export default ScriptureDisplay;
