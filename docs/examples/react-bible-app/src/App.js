import React, { useState, useEffect } from 'react';
import './App.css';

// Components
import ScriptureSearch from './components/ScriptureSearch';
import ScriptureDisplay from './components/ScriptureDisplay';
import TranslationHelps from './components/TranslationHelps';
import LanguageSelector from './components/LanguageSelector';
import PerformanceMonitor from './components/PerformanceMonitor';
import ErrorBoundary from './components/ErrorBoundary';

// Services
import { TranslationAPI } from './services/TranslationAPI';

// Hooks
import { useLocalStorage } from './hooks/useLocalStorage';
import { usePerformanceTracking } from './hooks/usePerformanceTracking';

function App() {
  // State management
  const [currentReference, setCurrentReference] = useState('John 3:16');
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage('selectedLanguage', 'en');
  const [scripture, setScripture] = useState(null);
  const [translationHelps, setTranslationHelps] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [availableLanguages, setAvailableLanguages] = useState([]);

  // Performance tracking
  const { trackEvent, getPerformanceStats } = usePerformanceTracking();

  // API instance
  const api = new TranslationAPI();

  // Load available languages on component mount
  useEffect(() => {
    loadAvailableLanguages();
  }, []);

  // Load default scripture on component mount
  useEffect(() => {
    if (currentReference) {
      loadScriptureAndHelps(currentReference, selectedLanguage);
    }
  }, [selectedLanguage]);

  const loadAvailableLanguages = async () => {
    try {
      const languages = await api.getLanguages();
      setAvailableLanguages(languages.languages || []);
    } catch (error) {
      console.warn('Failed to load languages:', error);
      // Fallback to common languages
      setAvailableLanguages([
        { code: 'en', name: 'English', isStrategicLanguage: true },
        { code: 'es', name: 'Español', isStrategicLanguage: true },
        { code: 'fr', name: 'Français', isStrategicLanguage: true },
        { code: 'pt', name: 'Português', isStrategicLanguage: true }
      ]);
    }
  };

  const loadScriptureAndHelps = async (reference, language) => {
    const startTime = performance.now();
    setLoading(true);
    setError(null);

    try {
      // Track the request
      trackEvent('scripture_load_start', { reference, language });

      // Load scripture and translation helps in parallel
      const [scriptureData, notesData, wordsData, questionsData] = await Promise.all([
        api.fetchScripture(reference, language),
        api.fetchTranslationNotes(reference, language).catch(() => ({ notes: [] })),
        api.getWordsForReference(reference, language).catch(() => ({ words: [] })),
        api.fetchTranslationQuestions(reference, language).catch(() => ({ questions: [] }))
      ]);

      // Update state with loaded data
      setScripture(scriptureData);
      setTranslationHelps({
        notes: notesData.notes || [],
        words: wordsData.words || [],
        questions: questionsData.questions || []
      });

      const endTime = performance.now();
      const loadTime = endTime - startTime;

      // Track successful load
      trackEvent('scripture_load_success', {
        reference,
        language,
        loadTime,
        cached: scriptureData.metadata?.cached,
        helpsCounts: {
          notes: notesData.notes?.length || 0,
          words: wordsData.words?.length || 0,
          questions: questionsData.questions?.length || 0
        }
      });

    } catch (error) {
      console.error('Failed to load scripture and helps:', error);
      setError(error.message);
      
      // Track error
      trackEvent('scripture_load_error', {
        reference,
        language,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReferenceChange = (reference) => {
    setCurrentReference(reference);
    loadScriptureAndHelps(reference, selectedLanguage);
  };

  const handleLanguageChange = (language) => {
    setSelectedLanguage(language);
    trackEvent('language_change', { language, previousLanguage: selectedLanguage });
  };

  const handleWordLookup = async (word) => {
    try {
      trackEvent('word_lookup', { word, language: selectedLanguage });
      const wordData = await api.getTranslationWord(word, selectedLanguage);
      
      // Display word definition in a modal or expand translation helps
      setTranslationHelps(prev => ({
        ...prev,
        selectedWord: wordData
      }));
    } catch (error) {
      console.error('Failed to lookup word:', error);
    }
  };

  const strategicLanguages = availableLanguages.filter(lang => lang.isStrategicLanguage);

  return (
    <ErrorBoundary>
      <div className="app">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <h1>📖 Bible Translation Helper</h1>
            <p>Powered by unfoldingWord Strategic Language Resources</p>
            
            <div className="header-controls">
              <LanguageSelector
                languages={strategicLanguages}
                selectedLanguage={selectedLanguage}
                onChange={handleLanguageChange}
              />
              
              <PerformanceMonitor
                stats={getPerformanceStats()}
                isOnline={navigator.onLine}
              />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="app-main">
          <div className="main-content">
            
            {/* Search Section */}
            <section className="search-section">
              <ScriptureSearch
                currentReference={currentReference}
                onReferenceChange={handleReferenceChange}
                loading={loading}
              />
            </section>

            {/* Error Display */}
            {error && (
              <section className="error-section">
                <div className="error-card">
                  <h3>❌ Error Loading Scripture</h3>
                  <p>{error}</p>
                  <button 
                    className="retry-button"
                    onClick={() => loadScriptureAndHelps(currentReference, selectedLanguage)}
                  >
                    🔄 Retry
                  </button>
                </div>
              </section>
            )}

            {/* Content Grid */}
            {!error && (
              <div className="content-grid">
                
                {/* Scripture Display */}
                <section className="scripture-section">
                  <ScriptureDisplay
                    scripture={scripture}
                    loading={loading}
                    language={selectedLanguage}
                    onWordClick={handleWordLookup}
                  />
                </section>

                {/* Translation Helps */}
                <section className="helps-section">
                  <TranslationHelps
                    helps={translationHelps}
                    loading={loading}
                    language={selectedLanguage}
                    onWordLookup={handleWordLookup}
                  />
                </section>

              </div>
            )}

          </div>
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <div className="footer-content">
            <p>
              Built with the unfoldingWord Translation Helps API • 
              Strategic Languages for Mother Tongue Translators • 
              <a 
                href="https://github.com/unfoldingword/translation-helps-mcp" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View Source
              </a>
            </p>
          </div>
        </footer>

      </div>
    </ErrorBoundary>
  );
}

export default App;
