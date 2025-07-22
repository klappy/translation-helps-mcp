import React, { useState } from 'react';
import './LanguageSelector.css';

/**
 * LanguageSelector Component
 * 
 * Allows users to select Strategic Languages with:
 * - Flag icons and native names
 * - Resource availability indicators
 * - Search/filter functionality
 * - Recommendations for complete resource sets
 */
const LanguageSelector = ({ languages, selectedLanguage, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Language metadata with flags and native names
  const languageMetadata = {
    'en': { flag: '🇺🇸', nativeName: 'English', region: 'Global' },
    'es': { flag: '��🇸', nativeName: 'Español', region: 'Latin America' },
    'fr': { flag: '🇫🇷', nativeName: 'Français', region: 'Africa/Europe' },
    'pt': { flag: '🇧🇷', nativeName: 'Português', region: 'Brazil/Africa' },
    'ar': { flag: '🇸🇦', nativeName: 'العربية', region: 'Middle East' },
    'zh': { flag: '🇨🇳', nativeName: '中文', region: 'China' },
    'hi': { flag: '🇮🇳', nativeName: 'हिन्दी', region: 'India' },
    'sw': { flag: '🇹🇿', nativeName: 'Kiswahili', region: 'East Africa' },
    'ru': { flag: '🇷🇺', nativeName: 'Русский', region: 'Eastern Europe' },
    'ko': { flag: '🇰🇷', nativeName: '한국어', region: 'Korea' }
  };

  // Get enhanced language data
  const getEnhancedLanguages = () => {
    return languages.map(lang => ({
      ...lang,
      ...languageMetadata[lang.code],
      flag: languageMetadata[lang.code]?.flag || '🌐',
      nativeName: languageMetadata[lang.code]?.nativeName || lang.name,
      region: languageMetadata[lang.code]?.region || 'Unknown'
    }));
  };

  // Filter languages based on search term
  const getFilteredLanguages = () => {
    const enhanced = getEnhancedLanguages();
    
    if (!searchTerm) return enhanced;
    
    const term = searchTerm.toLowerCase();
    return enhanced.filter(lang =>
      lang.name.toLowerCase().includes(term) ||
      lang.nativeName.toLowerCase().includes(term) ||
      lang.code.toLowerCase().includes(term) ||
      lang.region.toLowerCase().includes(term)
    );
  };

  // Get current language display info
  const getCurrentLanguage = () => {
    const enhanced = getEnhancedLanguages();
    const current = enhanced.find(lang => lang.code === selectedLanguage);
    
    if (current) {
      return current;
    }
    
    // Fallback for unknown language
    return {
      code: selectedLanguage,
      name: selectedLanguage.toUpperCase(),
      flag: '🌐',
      nativeName: selectedLanguage.toUpperCase(),
      isStrategicLanguage: false
    };
  };

  const handleLanguageSelect = (language) => {
    onChange(language.code);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  const currentLang = getCurrentLanguage();
  const filteredLanguages = getFilteredLanguages();
  const strategicLanguages = filteredLanguages.filter(lang => lang.isStrategicLanguage);
  const otherLanguages = filteredLanguages.filter(lang => !lang.isStrategicLanguage);

  return (
    <div className="language-selector">
      
      {/* Current Language Display */}
      <button 
        className="language-toggle"
        onClick={handleToggle}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="current-language">
          <span className="language-flag">{currentLang.flag}</span>
          <span className="language-name">{currentLang.nativeName}</span>
          {currentLang.isStrategicLanguage && (
            <span className="strategic-badge">Strategic</span>
          )}
        </span>
        <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <div className="language-dropdown">
          
          {/* Search Input */}
          <div className="language-search">
            <input
              type="text"
              placeholder="Search languages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              autoFocus
            />
          </div>

          {/* Strategic Languages Section */}
          {strategicLanguages.length > 0 && (
            <div className="language-section">
              <div className="section-header">
                <h4>⭐ Strategic Languages</h4>
                <small>Bridge languages with complete resource sets</small>
              </div>
              
              <div className="language-list">
                {strategicLanguages.map(language => (
                  <div
                    key={language.code}
                    className={`language-option ${language.code === selectedLanguage ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(language)}
                  >
                    <div className="language-info">
                      <span className="language-flag">{language.flag}</span>
                      <div className="language-details">
                        <div className="language-primary">
                          {language.nativeName}
                          {language.nativeName !== language.name && (
                            <span className="language-english">({language.name})</span>
                          )}
                        </div>
                        <div className="language-meta">
                          <span className="language-code">{language.code.toUpperCase()}</span>
                          <span className="language-region">{language.region}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="language-indicators">
                      <span className="strategic-indicator" title="Strategic Language">⭐</span>
                      <span className="resource-indicator complete" title="Complete resources available">📚</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Other Languages Section */}
          {otherLanguages.length > 0 && (
            <div className="language-section">
              <div className="section-header">
                <h4>🌐 Other Languages</h4>
                <small>Additional languages with limited resources</small>
              </div>
              
              <div className="language-list">
                {otherLanguages.map(language => (
                  <div
                    key={language.code}
                    className={`language-option ${language.code === selectedLanguage ? 'selected' : ''}`}
                    onClick={() => handleLanguageSelect(language)}
                  >
                    <div className="language-info">
                      <span className="language-flag">{language.flag}</span>
                      <div className="language-details">
                        <div className="language-primary">
                          {language.nativeName}
                          {language.nativeName !== language.name && (
                            <span className="language-english">({language.name})</span>
                          )}
                        </div>
                        <div className="language-meta">
                          <span className="language-code">{language.code.toUpperCase()}</span>
                          <span className="language-region">{language.region}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="language-indicators">
                      <span className="resource-indicator partial" title="Limited resources available">��</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredLanguages.length === 0 && searchTerm && (
            <div className="no-results">
              <p>No languages found matching "{searchTerm}"</p>
              <small>Try searching by language name, code, or region</small>
            </div>
          )}

          {/* Language Selection Help */}
          <div className="language-help">
            <div className="help-section">
              <h5>💡 Choosing a Strategic Language</h5>
              <ul>
                <li><strong>Strategic Languages</strong> have complete translation resources</li>
                <li>They serve as bridges to translate into your heart language</li>
                <li>English, Spanish, French, and Portuguese are fully supported</li>
                <li>Other languages may have limited resource availability</li>
              </ul>
            </div>
            
            <div className="help-section">
              <h5>📚 Resource Indicators</h5>
              <ul>
                <li><span className="resource-indicator complete">📚</span> Complete resources (ULT, UST, Notes, Words, Questions)</li>
                <li><span className="resource-indicator partial">📖</span> Limited resources available</li>
                <li><span className="strategic-indicator">⭐</span> Strategic Language designation</li>
              </ul>
            </div>
          </div>

        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div 
          className="language-overlay" 
          onClick={() => setIsOpen(false)}
        />
      )}

    </div>
  );
};

export default LanguageSelector;
