import React, { useState, useRef, useEffect } from 'react';
import './ScriptureSearch.css';

/**
 * ScriptureSearch Component
 * 
 * Provides intelligent search input for Scripture references with:
 * - Auto-complete suggestions
 * - Popular passage shortcuts
 * - Format validation
 * - Search history
 */
const ScriptureSearch = ({ currentReference, onReferenceChange, loading }) => {
  const [inputValue, setInputValue] = useState(currentReference || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);
  const [isValid, setIsValid] = useState(true);
  
  const inputRef = useRef(null);
  const suggestionsRef = useRef(null);

  // Popular passages for quick access
  const popularPassages = [
    { ref: 'John 3:16', description: 'God\'s love for the world' },
    { ref: 'Romans 8:28', description: 'All things work together for good' },
    { ref: 'Psalm 23', description: 'The Lord is my shepherd' },
    { ref: 'Matthew 5:3-12', description: 'The Beatitudes' },
    { ref: 'John 14:6', description: 'Jesus is the way, truth, and life' },
    { ref: 'Romans 3:23', description: 'All have sinned' },
    { ref: 'Ephesians 2:8-9', description: 'Salvation by grace' },
    { ref: '1 John 4:8', description: 'God is love' },
    { ref: 'Philippians 4:13', description: 'I can do all things' },
    { ref: 'Genesis 1:1', description: 'In the beginning' }
  ];

  // Bible books for auto-complete
  const bibleBooks = [
    // Old Testament
    'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
    'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings',
    '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther',
    'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
    'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel',
    'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum',
    'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
    // New Testament
    'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans',
    '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians',
    'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
    '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews',
    'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
    'Jude', 'Revelation'
  ];

  // Load search history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('scripture-search-history');
    if (saved) {
      try {
        setSearchHistory(JSON.parse(saved));
      } catch (error) {
        console.warn('Failed to load search history:', error);
      }
    }
  }, []);

  // Update input when currentReference changes externally
  useEffect(() => {
    setInputValue(currentReference || '');
  }, [currentReference]);

  // Validate reference format
  const validateReference = (reference) => {
    if (!reference.trim()) return false;
    
    // Basic pattern: Book Chapter:Verse or Book Chapter
    const pattern = /^(\d?\s*\w+(\s+\w+)*)\s+\d+(?::\d+(?:-\d+)?)?$/;
    return pattern.test(reference.trim());
  };

  // Generate suggestions based on input
  const generateSuggestions = (input) => {
    if (!input || input.length < 2) return [];
    
    const inputLower = input.toLowerCase();
    const suggestions = [];

    // Search in popular passages
    popularPassages.forEach(passage => {
      if (passage.ref.toLowerCase().includes(inputLower) || 
          passage.description.toLowerCase().includes(inputLower)) {
        suggestions.push({
          type: 'popular',
          reference: passage.ref,
          description: passage.description
        });
      }
    });

    // Search in bible books
    bibleBooks.forEach(book => {
      if (book.toLowerCase().startsWith(inputLower)) {
        suggestions.push({
          type: 'book',
          reference: book,
          description: `Book of ${book}`
        });
      }
    });

    // Search in history
    searchHistory.forEach(historyItem => {
      if (historyItem.reference.toLowerCase().includes(inputLower)) {
        suggestions.push({
          type: 'history',
          reference: historyItem.reference,
          description: 'From your search history',
          timestamp: historyItem.timestamp
        });
      }
    });

    return suggestions.slice(0, 10); // Limit to 10 suggestions
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);
    
    // Validate as user types
    setIsValid(value === '' || validateReference(value));
    
    // Generate suggestions
    const newSuggestions = generateSuggestions(value);
    setSuggestions(newSuggestions);
    setShowSuggestions(newSuggestions.length > 0);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = (e) => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      if (!suggestionsRef.current?.contains(document.activeElement)) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const reference = inputValue.trim();
    
    if (!reference) return;
    
    if (!validateReference(reference)) {
      setIsValid(false);
      return;
    }
    
    // Add to search history
    addToSearchHistory(reference);
    
    // Submit the reference
    onReferenceChange(reference);
    setShowSuggestions(false);
  };

  const handleSuggestionClick = (suggestion) => {
    const reference = suggestion.reference;
    setInputValue(reference);
    setIsValid(true);
    setShowSuggestions(false);
    
    // Add to search history
    addToSearchHistory(reference);
    
    // Submit the reference
    onReferenceChange(reference);
  };

  const addToSearchHistory = (reference) => {
    const newHistory = [
      { reference, timestamp: Date.now() },
      ...searchHistory.filter(item => item.reference !== reference)
    ].slice(0, 10); // Keep only last 10
    
    setSearchHistory(newHistory);
    localStorage.setItem('scripture-search-history', JSON.stringify(newHistory));
  };

  const clearSearchHistory = () => {
    setSearchHistory([]);
    localStorage.removeItem('scripture-search-history');
  };

  const renderSuggestion = (suggestion, index) => {
    const icon = {
      popular: '⭐',
      book: '📖',
      history: '🕒'
    }[suggestion.type] || '📝';

    return (
      <div
        key={index}
        className={`suggestion-item ${suggestion.type}`}
        onClick={() => handleSuggestionClick(suggestion)}
        onMouseDown={(e) => e.preventDefault()} // Prevent input blur
      >
        <div className="suggestion-content">
          <span className="suggestion-icon">{icon}</span>
          <div className="suggestion-text">
            <div className="suggestion-reference">{suggestion.reference}</div>
            <div className="suggestion-description">{suggestion.description}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="scripture-search">
      
      {/* Search Form */}
      <form onSubmit={handleSubmit} className="search-form">
        <div className="search-input-container">
          <input
            ref={inputRef}
            type="text"
            className={`search-input ${!isValid ? 'invalid' : ''}`}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Enter Scripture reference (e.g., John 3:16, Genesis 1:1-5, Psalm 23)"
            disabled={loading}
          />
          
          <button 
            type="submit" 
            className="search-button"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? (
              <span className="loading-spinner small"></span>
            ) : (
              '🔍'
            )}
          </button>
        </div>
        
        {!isValid && (
          <div className="validation-error">
            ❌ Please enter a valid Scripture reference (e.g., "John 3:16" or "Genesis 1:1-5")
          </div>
        )}
      </form>

      {/* Suggestions Dropdown */}
      {showSuggestions && (
        <div ref={suggestionsRef} className="suggestions-dropdown">
          <div className="suggestions-content">
            {suggestions.map((suggestion, index) => renderSuggestion(suggestion, index))}
          </div>
        </div>
      )}

      {/* Popular Passages Quick Access */}
      <div className="quick-access-section">
        <h4>⭐ Popular Passages</h4>
        <div className="popular-passages">
          {popularPassages.slice(0, 6).map((passage, index) => (
            <button
              key={index}
              className="popular-passage-button"
              onClick={() => handleSuggestionClick({ reference: passage.ref })}
              disabled={loading}
            >
              <span className="passage-ref">{passage.ref}</span>
              <span className="passage-desc">{passage.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search History */}
      {searchHistory.length > 0 && (
        <div className="search-history-section">
          <div className="history-header">
            <h4>🕒 Recent Searches</h4>
            <button 
              className="clear-history-button"
              onClick={clearSearchHistory}
            >
              Clear
            </button>
          </div>
          <div className="search-history">
            {searchHistory.slice(0, 5).map((item, index) => (
              <button
                key={index}
                className="history-item"
                onClick={() => handleSuggestionClick({ reference: item.reference })}
                disabled={loading}
              >
                {item.reference}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Reference Format Help */}
      <div className="format-help">
        <details>
          <summary>📋 Reference Format Examples</summary>
          <div className="format-examples">
            <div className="example-group">
              <strong>Single Verses:</strong>
              <code>John 3:16</code>
              <code>Genesis 1:1</code>
              <code>Romans 8:28</code>
            </div>
            <div className="example-group">
              <strong>Verse Ranges:</strong>
              <code>Matthew 5:3-12</code>
              <code>Genesis 1:1-5</code>
              <code>Ephesians 2:8-9</code>
            </div>
            <div className="example-group">
              <strong>Chapters:</strong>
              <code>Psalm 23</code>
              <code>1 Corinthians 13</code>
              <code>Matthew 5</code>
            </div>
          </div>
        </details>
      </div>

    </div>
  );
};

export default ScriptureSearch;
