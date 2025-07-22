import React, { useState } from 'react';
import './TranslationHelps.css';

/**
 * TranslationHelps Component
 * 
 * Displays comprehensive translation resources including:
 * - Translation Notes for cultural context
 * - Translation Words for biblical terms
 * - Translation Questions for validation
 */
const TranslationHelps = ({ helps, loading, language, onWordLookup }) => {
  const [activeTab, setActiveTab] = useState('notes');
  const [expandedNote, setExpandedNote] = useState(null);
  const [selectedWordCategory, setSelectedWordCategory] = useState('all');

  if (loading) {
    return (
      <div className="translation-helps loading">
        <div className="loading-content">
          <div className="loading-spinner"></div>
          <p>Loading translation helps...</p>
        </div>
      </div>
    );
  }

  if (!helps) {
    return (
      <div className="translation-helps empty">
        <div className="empty-content">
          <h3>📚 Translation Helps</h3>
          <p>Translation resources will appear here when Scripture is loaded</p>
        </div>
      </div>
    );
  }

  const { notes = [], words = [], questions = [], selectedWord } = helps;
  
  // Count available resources for tab labels
  const tabCounts = {
    notes: notes.length,
    words: words.length,
    questions: questions.length
  };

  // Group words by category
  const groupWordsByCategory = (words) => {
    const categories = { kt: [], names: [], other: [] };
    
    words.forEach(word => {
      const category = word.category || 'other';
      if (categories[category]) {
        categories[category].push(word);
      } else {
        categories.other.push(word);
      }
    });

    return categories;
  };

  const wordCategories = groupWordsByCategory(words);
  const categoryNames = {
    kt: 'Key Terms (Theological)',
    names: 'Names & Places',
    other: 'General Terms'
  };

  // Filter words by selected category
  const getFilteredWords = () => {
    if (selectedWordCategory === 'all') {
      return words;
    }
    return wordCategories[selectedWordCategory] || [];
  };

  const renderTabButton = (tabId, label, count) => (
    <button
      key={tabId}
      className={`tab-button ${activeTab === tabId ? 'active' : ''}`}
      onClick={() => setActiveTab(tabId)}
    >
      {label} {count > 0 && <span className="count">({count})</span>}
    </button>
  );

  const renderNotes = () => {
    if (notes.length === 0) {
      return (
        <div className="empty-tab-content">
          <p>📝 No translation notes available for this reference</p>
          <small>Translation notes provide cultural context and explanations for difficult passages</small>
        </div>
      );
    }

    return (
      <div className="notes-content">
        <div className="notes-header">
          <h4>📝 Translation Notes</h4>
          <p>Cultural context and explanations for difficult passages</p>
        </div>
        
        <div className="notes-list">
          {notes.map((note, index) => {
            const noteText = typeof note === 'string' ? note : note.note;
            const noteLinks = note.links || [];
            const isExpanded = expandedNote === index;
            
            return (
              <div key={index} className="note-item">
                <div className="note-content">
                  <div className="note-text">
                    {noteText.length > 200 && !isExpanded ? (
                      <>
                        {noteText.substring(0, 200)}...
                        <button 
                          className="expand-button"
                          onClick={() => setExpandedNote(index)}
                        >
                          Read more
                        </button>
                      </>
                    ) : (
                      <>
                        {noteText}
                        {noteText.length > 200 && (
                          <button 
                            className="collapse-button"
                            onClick={() => setExpandedNote(null)}
                          >
                            Show less
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  
                  {noteLinks.length > 0 && (
                    <div className="note-links">
                      <strong>Related:</strong>
                      {noteLinks.map((link, linkIndex) => (
                        <span key={linkIndex} className="academy-link">
                          {link}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderWords = () => {
    if (words.length === 0) {
      return (
        <div className="empty-tab-content">
          <p>📖 No translation words available for this reference</p>
          <small>Translation words provide definitions for key biblical terms</small>
        </div>
      );
    }

    const filteredWords = getFilteredWords();

    return (
      <div className="words-content">
        <div className="words-header">
          <h4>📖 Translation Words</h4>
          <p>Definitions for key biblical terms and concepts</p>
          
          <div className="word-filters">
            <label>Category:</label>
            <select 
              value={selectedWordCategory}
              onChange={(e) => setSelectedWordCategory(e.target.value)}
            >
              <option value="all">All Categories ({words.length})</option>
              {Object.entries(wordCategories).map(([category, categoryWords]) => 
                categoryWords.length > 0 && (
                  <option key={category} value={category}>
                    {categoryNames[category]} ({categoryWords.length})
                  </option>
                )
              )}
            </select>
          </div>
        </div>
        
        <div className="words-list">
          {filteredWords.map((word, index) => {
            const term = word.term || word.word;
            const definition = word.definition || word.content;
            const category = word.category || 'other';
            const references = word.references || [];
            
            return (
              <div key={index} className={`word-item category-${category}`}>
                <div className="word-header">
                  <h5 className="word-term">{term}</h5>
                  <span className="word-category">{categoryNames[category] || 'General'}</span>
                </div>
                
                <div className="word-definition">
                  {definition || 'Definition not available'}
                </div>
                
                {references.length > 0 && (
                  <div className="word-references">
                    <strong>Also appears in:</strong>
                    <span>{references.slice(0, 3).join(', ')}</span>
                    {references.length > 3 && <span> and {references.length - 3} more</span>}
                  </div>
                )}
                
                <div className="word-actions">
                  <button 
                    className="lookup-button"
                    onClick={() => onWordLookup(term)}
                  >
                    🔍 Lookup Full Definition
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderQuestions = () => {
    if (questions.length === 0) {
      return (
        <div className="empty-tab-content">
          <p>❓ No translation questions available for this reference</p>
          <small>Translation questions help validate translation accuracy and comprehension</small>
        </div>
      );
    }

    return (
      <div className="questions-content">
        <div className="questions-header">
          <h4>❓ Translation Questions</h4>
          <p>Use these questions to check translation accuracy and comprehension</p>
        </div>
        
        <div className="questions-list">
          {questions.map((question, index) => (
            <div key={index} className="question-item">
              <div className="question-text">
                <strong>Q{index + 1}:</strong> {question.question}
              </div>
              
              {question.answer && (
                <details className="question-answer">
                  <summary>Show Expected Answer</summary>
                  <div className="answer-text">
                    <strong>A:</strong> {question.answer}
                  </div>
                </details>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSelectedWord = () => {
    if (!selectedWord) return null;

    const wordData = selectedWord.word || {};
    
    return (
      <div className="selected-word-modal">
        <div className="modal-overlay" onClick={() => setSelectedWord(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h4>📖 {wordData.term}</h4>
              <button 
                className="close-button"
                onClick={() => setSelectedWord(null)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              <div className="word-definition">
                {wordData.definition || wordData.content || 'Definition not available'}
              </div>
              
              {selectedWord.references && (
                <div className="word-references">
                  <h5>Biblical References:</h5>
                  <ul>
                    {selectedWord.references.slice(0, 10).map((ref, index) => (
                      <li key={index}>{ref}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="translation-helps">
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        {renderTabButton('notes', '📝 Notes', tabCounts.notes)}
        {renderTabButton('words', '📖 Words', tabCounts.words)}
        {renderTabButton('questions', '❓ Questions', tabCounts.questions)}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'notes' && renderNotes()}
        {activeTab === 'words' && renderWords()}
        {activeTab === 'questions' && renderQuestions()}
      </div>

      {/* Resource Summary */}
      <div className="helps-summary">
        <div className="summary-stats">
          <span>📊 Available Resources:</span>
          <span>{tabCounts.notes} Notes</span>
          <span>{tabCounts.words} Words</span>
          <span>{tabCounts.questions} Questions</span>
        </div>
        
        <div className="summary-info">
          <small>
            💡 These resources support Mother Tongue Translators in creating accurate, 
            culturally appropriate translations into heart languages
          </small>
        </div>
      </div>

      {/* Selected Word Modal */}
      {selectedWord && renderSelectedWord()}

    </div>
  );
};

export default TranslationHelps;
