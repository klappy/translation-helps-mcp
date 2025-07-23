# Create a Translation Checking Tool

## What You'll Build

A comprehensive translation checking application that helps Mother Tongue Translators (MTTs) verify their translations against source texts, access contextual helps, and ensure accuracy using ULT, UST, Translation Notes, and Questions.

## Prerequisites

- Web development knowledge (HTML/CSS/JavaScript)
- Understanding of translation workflows
- Basic API integration skills

## Step 1: Understanding Translation Checking

Translation checking involves several phases:

1. **Accuracy Check** - Does the translation convey the same meaning?
2. **Clarity Check** - Is the translation clear in the target language?
3. **Cultural Check** - Is the translation appropriate for the target culture?
4. **Style Check** - Does the translation fit the intended register?

Our tool will provide resources for each phase.

## Step 2: Set Up the Project Structure

```bash
mkdir translation-checker
cd translation-checker

# Create project structure
mkdir src css js assets
touch index.html css/styles.css js/app.js js/api-client.js

# Initialize package.json for dependencies
npm init -y
npm install express cors axios
```

## Step 3: Create the Core API Client

```javascript
// js/api-client.js
class TranslationAPI {
  constructor() {
    this.baseUrl = "https://translation.tools/api";
    this.cache = new Map();
  }

  async request(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseUrl);
    Object.keys(params).forEach((key) => url.searchParams.append(key, params[key]));

    const cacheKey = url.toString();
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      this.cache.set(cacheKey, data);
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Core translation checking methods
  async getSourceTexts(reference, language = "en") {
    const scripture = await this.request("/fetch-scripture", { reference });
    return {
      ult: scripture.scripture?.ult?.text || "",
      ust: scripture.scripture?.ust?.text || "",
      reference: reference,
      alignment: scripture.scripture?.alignment || [],
    };
  }

  async getTranslationHelps(reference, language = "en") {
    const [notes, questions] = await Promise.all([
      this.request("/fetch-translation-notes", { reference, language }),
      this.request("/fetch-translation-questions", { reference, language }),
    ]);

    return {
      notes: notes.notes || [],
      questions: questions.questions || [],
      reference: reference,
    };
  }

  async analyzeWords(reference, language = "en") {
    const words = await this.request("/get-words-for-reference", { reference, language });
    return words.words || [];
  }

  async checkWordDefinition(word, language = "en") {
    return await this.request("/get-translation-word", { word, language });
  }

  async findCrossReferences(text) {
    return await this.request("/extract-references", { text });
  }
}

const translationAPI = new TranslationAPI();
```

## Step 4: Build the Main Interface

```html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Translation Checking Tool</title>
    <link rel="stylesheet" href="css/styles.css" />
  </head>
  <body>
    <div class="app-container">
      <header class="app-header">
        <h1>Translation Checking Tool</h1>
        <p>Verify accuracy, clarity, and cultural appropriateness</p>
      </header>

      <div class="main-content">
        <!-- Reference Input Section -->
        <section class="reference-section">
          <div class="input-group">
            <label for="referenceInput">Scripture Reference:</label>
            <input
              type="text"
              id="referenceInput"
              placeholder="e.g., John 3:16"
              value="John 3:16"
            />
            <button onclick="loadReference()" class="primary-btn">Load</button>
          </div>
        </section>

        <!-- Translation Input Section -->
        <section class="translation-section">
          <div class="translation-input">
            <label for="userTranslation">Your Translation:</label>
            <textarea
              id="userTranslation"
              rows="4"
              placeholder="Enter your translation here..."
            ></textarea>
            <div class="translation-controls">
              <button onclick="runChecks()" class="check-btn">Run Checks</button>
              <button onclick="clearTranslation()" class="secondary-btn">Clear</button>
            </div>
          </div>
        </section>

        <!-- Source Texts Panel -->
        <section class="source-panel">
          <h2>Source Texts</h2>
          <div class="source-texts">
            <div class="source-text ult-text">
              <h3>ULT (Literal)</h3>
              <div id="ultText" class="text-content">Loading...</div>
            </div>
            <div class="source-text ust-text">
              <h3>UST (Simplified)</h3>
              <div id="ustText" class="text-content">Loading...</div>
            </div>
          </div>
        </section>

        <!-- Checking Results Panel -->
        <section class="results-panel" id="resultsPanel" style="display: none;">
          <h2>Checking Results</h2>

          <!-- Accuracy Check -->
          <div class="check-category">
            <h3>Accuracy Check</h3>
            <div id="accuracyResults" class="check-results"></div>
          </div>

          <!-- Clarity Check -->
          <div class="check-category">
            <h3>Clarity Check</h3>
            <div id="clarityResults" class="check-results"></div>
          </div>

          <!-- Cultural Check -->
          <div class="check-category">
            <h3>Cultural Check</h3>
            <div id="culturalResults" class="check-results"></div>
          </div>

          <!-- Word Analysis -->
          <div class="check-category">
            <h3>Key Words Analysis</h3>
            <div id="wordResults" class="check-results"></div>
          </div>
        </section>

        <!-- Translation Helps Panel -->
        <section class="helps-panel">
          <h2>Translation Helps</h2>

          <div class="helps-tabs">
            <button class="tab-btn active" onclick="showHelp('notes')">Translation Notes</button>
            <button class="tab-btn" onclick="showHelp('questions')">Questions</button>
            <button class="tab-btn" onclick="showHelp('words')">Key Words</button>
          </div>

          <div id="notesHelp" class="help-content active">
            <div id="translationNotes">Loading translation notes...</div>
          </div>

          <div id="questionsHelp" class="help-content">
            <div id="translationQuestions">Loading questions...</div>
          </div>

          <div id="wordsHelp" class="help-content">
            <div id="keyWords">Loading key words...</div>
          </div>
        </section>

        <!-- Progress Tracking -->
        <section class="progress-section">
          <h2>Progress Tracking</h2>
          <div class="progress-info">
            <div class="progress-item">
              <label>Accuracy:</label>
              <div class="progress-bar">
                <div id="accuracyProgress" class="progress-fill"></div>
              </div>
              <span id="accuracyScore">-</span>
            </div>
            <div class="progress-item">
              <label>Clarity:</label>
              <div class="progress-bar">
                <div id="clarityProgress" class="progress-fill"></div>
              </div>
              <span id="clarityScore">-</span>
            </div>
            <div class="progress-item">
              <label>Overall:</label>
              <div class="progress-bar">
                <div id="overallProgress" class="progress-fill"></div>
              </div>
              <span id="overallScore">-</span>
            </div>
          </div>
        </section>
      </div>
    </div>

    <script src="js/api-client.js"></script>
    <script src="js/app.js"></script>
  </body>
</html>
```

## Step 5: Implement the Core Checking Logic

```javascript
// js/app.js
class TranslationChecker {
  constructor() {
    this.currentReference = "";
    this.sourceTexts = null;
    this.translationHelps = null;
    this.keyWords = [];
    this.checkResults = {};
  }

  async loadReference() {
    const reference = document.getElementById("referenceInput").value.trim();
    if (!reference) return;

    this.currentReference = reference;

    try {
      // Show loading state
      this.showLoading();

      // Load source texts and helps in parallel
      const [sourceTexts, helps, words] = await Promise.all([
        translationAPI.getSourceTexts(reference),
        translationAPI.getTranslationHelps(reference),
        translationAPI.analyzeWords(reference),
      ]);

      this.sourceTexts = sourceTexts;
      this.translationHelps = helps;
      this.keyWords = words;

      // Update UI
      this.displaySourceTexts();
      this.displayTranslationHelps();
      this.displayKeyWords();
    } catch (error) {
      this.showError("Failed to load reference data: " + error.message);
    }
  }

  displaySourceTexts() {
    document.getElementById("ultText").innerHTML = this.formatTextWithHighlights(
      this.sourceTexts.ult
    );
    document.getElementById("ustText").innerHTML = this.formatTextWithHighlights(
      this.sourceTexts.ust
    );
  }

  formatTextWithHighlights(text) {
    // Highlight key theological terms
    const keyTerms = [
      "God",
      "Lord",
      "Jesus",
      "Christ",
      "Spirit",
      "faith",
      "grace",
      "love",
      "righteousness",
    ];
    let formatted = text;

    keyTerms.forEach((term) => {
      const regex = new RegExp(`\\b${term}\\b`, "gi");
      formatted = formatted.replace(
        regex,
        `<span class="key-term" onclick="lookupWord('${term}')">${term}</span>`
      );
    });

    return formatted;
  }

  async runChecks() {
    const userTranslation = document.getElementById("userTranslation").value.trim();
    if (!userTranslation) {
      alert("Please enter your translation first.");
      return;
    }

    if (!this.sourceTexts) {
      alert("Please load a scripture reference first.");
      return;
    }

    // Show results panel
    document.getElementById("resultsPanel").style.display = "block";

    // Run all checks
    await Promise.all([
      this.runAccuracyCheck(userTranslation),
      this.runClarityCheck(userTranslation),
      this.runCulturalCheck(userTranslation),
      this.runWordAnalysis(userTranslation),
    ]);

    // Update progress
    this.updateProgress();
  }

  async runAccuracyCheck(translation) {
    const results = document.getElementById("accuracyResults");
    results.innerHTML = '<div class="checking">Running accuracy check...</div>';

    try {
      // Compare with source texts
      const accuracyIssues = [];

      // Check for missing key concepts
      const sourceWords = this.extractKeyWords(this.sourceTexts.ult);
      const translationWords = this.extractKeyWords(translation);

      sourceWords.forEach((word) => {
        if (!this.hasEquivalent(word, translationWords)) {
          accuracyIssues.push({
            type: "missing_concept",
            word: word,
            suggestion: `Consider including the concept of "${word}" in your translation.`,
          });
        }
      });

      // Check for extra concepts not in source
      translationWords.forEach((word) => {
        if (!this.hasEquivalent(word, sourceWords) && this.isSignificantWord(word)) {
          accuracyIssues.push({
            type: "extra_concept",
            word: word,
            suggestion: `Consider if "${word}" is necessary or might be adding meaning not in the source.`,
          });
        }
      });

      this.displayAccuracyResults(accuracyIssues);
      this.checkResults.accuracy = this.calculateAccuracyScore(accuracyIssues);
    } catch (error) {
      results.innerHTML = '<div class="error">Error running accuracy check</div>';
    }
  }

  async runClarityCheck(translation) {
    const results = document.getElementById("clarityResults");
    results.innerHTML = '<div class="checking">Running clarity check...</div>';

    const clarityIssues = [];

    // Check sentence length
    const sentences = translation.split(/[.!?]+/).filter((s) => s.trim());
    sentences.forEach((sentence, index) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length > 25) {
        clarityIssues.push({
          type: "long_sentence",
          sentence: sentence.trim(),
          wordCount: words.length,
          suggestion: "Consider breaking this sentence into shorter parts for better clarity.",
        });
      }
    });

    // Check for complex words (simplified check)
    const complexWords = translation.match(/\b\w{10,}\b/g) || [];
    if (complexWords.length > 0) {
      clarityIssues.push({
        type: "complex_words",
        words: complexWords,
        suggestion: "Consider if these long words could be replaced with simpler alternatives.",
      });
    }

    this.displayClarityResults(clarityIssues);
    this.checkResults.clarity = this.calculateClarityScore(clarityIssues);
  }

  async runCulturalCheck(translation) {
    const results = document.getElementById("culturalResults");
    results.innerHTML = '<div class="checking">Running cultural check...</div>';

    // Use translation notes to identify cultural issues
    const culturalNotes = this.translationHelps.notes.filter(
      (note) =>
        note.text.toLowerCase().includes("cultur") ||
        note.text.toLowerCase().includes("custom") ||
        note.text.toLowerCase().includes("metaphor")
    );

    const culturalIssues = [];

    culturalNotes.forEach((note) => {
      culturalIssues.push({
        type: "cultural_note",
        reference: note.reference,
        note: note.text,
        suggestion: "Consider how this cultural element should be handled in your target culture.",
      });
    });

    this.displayCulturalResults(culturalIssues);
    this.checkResults.cultural = culturalNotes.length;
  }

  async runWordAnalysis(translation) {
    const results = document.getElementById("wordResults");
    results.innerHTML = '<div class="checking">Analyzing key words...</div>';

    const wordAnalysis = [];

    // Analyze each key word
    for (const keyWord of this.keyWords.slice(0, 5)) {
      // Limit to 5 words
      try {
        const definition = await translationAPI.checkWordDefinition(keyWord.word);

        // Check if word appears in translation
        const regex = new RegExp(`\\b${keyWord.word}\\b`, "i");
        const appearsInTranslation = regex.test(translation);

        wordAnalysis.push({
          word: keyWord.word,
          definition: definition.definition,
          appearsInTranslation: appearsInTranslation,
          suggestion: appearsInTranslation
            ? "Good - this key word is represented in your translation."
            : "Consider how to represent this concept in your translation.",
        });
      } catch (error) {
        console.error("Error analyzing word:", keyWord.word, error);
      }
    }

    this.displayWordAnalysis(wordAnalysis);
    this.checkResults.words = wordAnalysis;
  }

  displayAccuracyResults(issues) {
    const container = document.getElementById("accuracyResults");

    if (issues.length === 0) {
      container.innerHTML = '<div class="success">✓ No major accuracy issues detected!</div>';
      return;
    }

    let html = '<div class="issues-list">';
    issues.forEach((issue) => {
      html += `
        <div class="issue-item ${issue.type}">
          <div class="issue-type">${issue.type.replace("_", " ").toUpperCase()}</div>
          <div class="issue-word"><strong>${issue.word}</strong></div>
          <div class="issue-suggestion">${issue.suggestion}</div>
        </div>
      `;
    });
    html += "</div>";

    container.innerHTML = html;
  }

  displayClarityResults(issues) {
    const container = document.getElementById("clarityResults");

    if (issues.length === 0) {
      container.innerHTML = '<div class="success">✓ Translation appears clear and readable!</div>';
      return;
    }

    let html = '<div class="issues-list">';
    issues.forEach((issue) => {
      html += `
        <div class="issue-item ${issue.type}">
          <div class="issue-type">${issue.type.replace("_", " ").toUpperCase()}</div>
          <div class="issue-suggestion">${issue.suggestion}</div>
        </div>
      `;
    });
    html += "</div>";

    container.innerHTML = html;
  }

  displayCulturalResults(issues) {
    const container = document.getElementById("culturalResults");

    if (issues.length === 0) {
      container.innerHTML =
        '<div class="success">✓ No specific cultural notes for this passage.</div>';
      return;
    }

    let html = '<div class="cultural-notes">';
    issues.forEach((issue) => {
      html += `
        <div class="cultural-note">
          <div class="note-reference">${issue.reference}</div>
          <div class="note-text">${issue.note}</div>
          <div class="note-suggestion">${issue.suggestion}</div>
        </div>
      `;
    });
    html += "</div>";

    container.innerHTML = html;
  }

  displayWordAnalysis(analysis) {
    const container = document.getElementById("wordResults");

    let html = '<div class="word-analysis">';
    analysis.forEach((item) => {
      html += `
        <div class="word-item ${item.appearsInTranslation ? "present" : "missing"}">
          <div class="word-name">${item.word}</div>
          <div class="word-definition">${item.definition || "Definition not available"}</div>
          <div class="word-status">${item.appearsInTranslation ? "✓ Present" : "⚠ Check needed"}</div>
          <div class="word-suggestion">${item.suggestion}</div>
        </div>
      `;
    });
    html += "</div>";

    container.innerHTML = html;
  }

  // Helper methods
  extractKeyWords(text) {
    // Simple word extraction - in real implementation, use NLP
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3)
      .filter(
        (word) =>
          ![
            "that",
            "with",
            "have",
            "this",
            "will",
            "your",
            "from",
            "they",
            "know",
            "want",
            "been",
            "good",
            "much",
            "some",
            "time",
            "very",
            "when",
            "come",
            "here",
            "just",
            "like",
            "long",
            "make",
            "many",
            "over",
            "such",
            "take",
            "than",
            "them",
            "well",
            "were",
          ].includes(word)
      );
  }

  hasEquivalent(word, wordList) {
    // Simple check - could be enhanced with synonyms
    return wordList.some((w) => w === word || w.includes(word) || word.includes(w));
  }

  isSignificantWord(word) {
    const insignificant = ["very", "really", "quite", "also", "just", "even", "still"];
    return !insignificant.includes(word.toLowerCase());
  }

  calculateAccuracyScore(issues) {
    const maxIssues = 10;
    const score = Math.max(0, 100 - (issues.length * 100) / maxIssues);
    return Math.round(score);
  }

  calculateClarityScore(issues) {
    const maxIssues = 5;
    const score = Math.max(0, 100 - (issues.length * 100) / maxIssues);
    return Math.round(score);
  }

  updateProgress() {
    const accuracy = this.checkResults.accuracy || 0;
    const clarity = this.checkResults.clarity || 0;
    const overall = Math.round((accuracy + clarity) / 2);

    this.setProgress("accuracyProgress", "accuracyScore", accuracy);
    this.setProgress("clarityProgress", "clarityScore", clarity);
    this.setProgress("overallProgress", "overallScore", overall);
  }

  setProgress(barId, scoreId, value) {
    document.getElementById(barId).style.width = value + "%";
    document.getElementById(scoreId).textContent = value + "%";

    // Color coding
    const bar = document.getElementById(barId);
    if (value >= 80) bar.className = "progress-fill good";
    else if (value >= 60) bar.className = "progress-fill okay";
    else bar.className = "progress-fill needs-work";
  }

  displayTranslationHelps() {
    // Display translation notes
    const notesContainer = document.getElementById("translationNotes");
    if (this.translationHelps.notes.length > 0) {
      let notesHtml = '<div class="notes-list">';
      this.translationHelps.notes.forEach((note) => {
        notesHtml += `
          <div class="note-item">
            <div class="note-reference">${note.reference || this.currentReference}</div>
            <div class="note-text">${note.text}</div>
          </div>
        `;
      });
      notesHtml += "</div>";
      notesContainer.innerHTML = notesHtml;
    } else {
      notesContainer.innerHTML =
        '<div class="no-content">No translation notes available for this passage.</div>';
    }

    // Display translation questions
    const questionsContainer = document.getElementById("translationQuestions");
    if (this.translationHelps.questions.length > 0) {
      let questionsHtml = '<div class="questions-list">';
      this.translationHelps.questions.forEach((q) => {
        questionsHtml += `
          <div class="question-item">
            <div class="question-text"><strong>Q:</strong> ${q.question}</div>
            ${q.answer ? `<div class="answer-text"><strong>A:</strong> ${q.answer}</div>` : ""}
          </div>
        `;
      });
      questionsHtml += "</div>";
      questionsContainer.innerHTML = questionsHtml;
    } else {
      questionsContainer.innerHTML =
        '<div class="no-content">No translation questions available for this passage.</div>';
    }
  }

  displayKeyWords() {
    const wordsContainer = document.getElementById("keyWords");
    if (this.keyWords.length > 0) {
      let wordsHtml = '<div class="words-list">';
      this.keyWords.slice(0, 10).forEach((word) => {
        wordsHtml += `
          <div class="word-item-help">
            <span class="word-term" onclick="lookupWord('${word.word}')">${word.word}</span>
            <span class="word-frequency">(${word.frequency || 1}x)</span>
          </div>
        `;
      });
      wordsHtml += "</div>";
      wordsContainer.innerHTML = wordsHtml;
    } else {
      wordsContainer.innerHTML =
        '<div class="no-content">No key words identified for this passage.</div>';
    }
  }

  showLoading() {
    document.getElementById("ultText").innerHTML = '<div class="loading">Loading ULT...</div>';
    document.getElementById("ustText").innerHTML = '<div class="loading">Loading UST...</div>';
  }

  showError(message) {
    const errorDiv = `<div class="error">${message}</div>`;
    document.getElementById("ultText").innerHTML = errorDiv;
    document.getElementById("ustText").innerHTML = errorDiv;
  }
}

// Global functions
const checker = new TranslationChecker();

async function loadReference() {
  await checker.loadReference();
}

async function runChecks() {
  await checker.runChecks();
}

function clearTranslation() {
  document.getElementById("userTranslation").value = "";
  document.getElementById("resultsPanel").style.display = "none";
}

function showHelp(type) {
  // Hide all help content
  document.querySelectorAll(".help-content").forEach((el) => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach((el) => el.classList.remove("active"));

  // Show selected help content
  document.getElementById(type + "Help").classList.add("active");
  event.target.classList.add("active");
}

async function lookupWord(word) {
  try {
    const definition = await translationAPI.checkWordDefinition(word);
    alert(`${word}: ${definition.definition || "Definition not available"}`);
  } catch (error) {
    alert(`Could not look up "${word}": ${error.message}`);
  }
}

// Load default reference on page load
window.addEventListener("load", () => {
  loadReference();
});
```

## Step 6: Add Comprehensive Styling

```css
/* css/styles.css */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  background: #f5f7fa;
}

.app-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.app-header {
  text-align: center;
  margin-bottom: 40px;
  padding: 30px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 20px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  color: #2c3e50;
  margin-bottom: 10px;
  font-size: 2.5em;
}

.app-header p {
  color: #7f8c8d;
  font-size: 1.1em;
}

.main-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 1200px) {
  .main-content {
    grid-template-columns: 1fr;
  }
}

/* Reference Section */
.reference-section {
  grid-column: 1 / -1;
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  margin-bottom: 20px;
}

.input-group {
  display: flex;
  gap: 15px;
  align-items: center;
}

.input-group label {
  font-weight: 600;
  color: #2c3e50;
  min-width: 150px;
}

.input-group input {
  flex: 1;
  padding: 12px 16px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
}

.input-group input:focus {
  outline: none;
  border-color: #3498db;
}

/* Buttons */
.primary-btn,
.check-btn {
  padding: 12px 24px;
  background: #3498db;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: background 0.3s;
}

.primary-btn:hover,
.check-btn:hover {
  background: #2980b9;
}

.secondary-btn {
  padding: 12px 24px;
  background: #95a5a6;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background 0.3s;
}

.secondary-btn:hover {
  background: #7f8c8d;
}

/* Translation Section */
.translation-section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
}

.translation-input label {
  display: block;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 8px;
}

.translation-input textarea {
  width: 100%;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  min-height: 120px;
  transition: border-color 0.3s;
}

.translation-input textarea:focus {
  outline: none;
  border-color: #3498db;
}

.translation-controls {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

/* Source Panel */
.source-panel {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
}

.source-panel h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 3px solid #3498db;
  padding-bottom: 10px;
}

.source-texts {
  display: grid;
  gap: 20px;
}

.source-text {
  padding: 20px;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.ult-text {
  background: #f8f9fa;
  border-left-color: #28a745;
}

.ust-text {
  background: #f1f8ff;
  border-left-color: #17a2b8;
}

.source-text h3 {
  color: #495057;
  margin-bottom: 12px;
  font-size: 1.1em;
}

.text-content {
  font-size: 16px;
  line-height: 1.8;
}

.key-term {
  background: #fff3cd;
  padding: 2px 4px;
  border-radius: 3px;
  cursor: pointer;
  border-bottom: 2px solid #ffc107;
  transition: background 0.2s;
}

.key-term:hover {
  background: #ffeaa7;
}

/* Results Panel */
.results-panel {
  grid-column: 1 / -1;
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.results-panel h2 {
  color: #2c3e50;
  margin-bottom: 25px;
  border-bottom: 3px solid #e74c3c;
  padding-bottom: 10px;
}

.check-category {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
}

.check-category h3 {
  color: #34495e;
  margin-bottom: 15px;
  font-size: 1.2em;
}

.checking {
  color: #f39c12;
  font-style: italic;
  padding: 20px;
  text-align: center;
}

.success {
  color: #27ae60;
  background: #d5e8d4;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #27ae60;
}

.error {
  color: #e74c3c;
  background: #f8d7da;
  padding: 15px;
  border-radius: 6px;
  border-left: 4px solid #e74c3c;
}

.issues-list {
  space-y: 15px;
}

.issue-item {
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 10px;
}

.issue-item.missing_concept {
  border-left: 4px solid #e74c3c;
  background: #fdf2f2;
}

.issue-item.extra_concept {
  border-left: 4px solid #f39c12;
  background: #fef9e7;
}

.issue-type {
  font-weight: 600;
  font-size: 0.8em;
  text-transform: uppercase;
  color: #6c757d;
  margin-bottom: 5px;
}

.issue-word {
  font-size: 1.1em;
  margin-bottom: 8px;
}

.issue-suggestion {
  color: #495057;
  font-style: italic;
}

/* Progress Section */
.progress-section {
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
}

.progress-section h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 3px solid #9b59b6;
  padding-bottom: 10px;
}

.progress-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
  gap: 15px;
}

.progress-item label {
  min-width: 80px;
  font-weight: 600;
  color: #2c3e50;
}

.progress-bar {
  flex: 1;
  height: 20px;
  background: #ecf0f1;
  border-radius: 10px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 10px;
}

.progress-fill.good {
  background: linear-gradient(90deg, #27ae60, #2ecc71);
}

.progress-fill.okay {
  background: linear-gradient(90deg, #f39c12, #e67e22);
}

.progress-fill.needs-work {
  background: linear-gradient(90deg, #e74c3c, #c0392b);
}

/* Helps Panel */
.helps-panel {
  grid-column: 1 / -1;
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 15px rgba(0, 0, 0, 0.1);
  margin-top: 20px;
}

.helps-panel h2 {
  color: #2c3e50;
  margin-bottom: 20px;
  border-bottom: 3px solid #16a085;
  padding-bottom: 10px;
}

.helps-tabs {
  display: flex;
  margin-bottom: 20px;
  border-bottom: 1px solid #ddd;
}

.tab-btn {
  padding: 12px 24px;
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #7f8c8d;
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
}

.tab-btn.active {
  color: #2c3e50;
  border-bottom-color: #16a085;
  font-weight: 600;
}

.tab-btn:hover {
  color: #2c3e50;
}

.help-content {
  display: none;
  padding: 20px 0;
}

.help-content.active {
  display: block;
}

.note-item,
.question-item {
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  margin-bottom: 15px;
}

.note-reference {
  font-weight: 600;
  color: #3498db;
  margin-bottom: 8px;
}

.note-text,
.question-text,
.answer-text {
  line-height: 1.6;
  color: #495057;
}

.answer-text {
  margin-top: 10px;
  padding-left: 20px;
  border-left: 3px solid #16a085;
}

.word-item-help {
  display: inline-block;
  margin: 5px 10px 5px 0;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 20px;
  border: 1px solid #dee2e6;
}

.word-term {
  cursor: pointer;
  color: #3498db;
  font-weight: 600;
}

.word-term:hover {
  text-decoration: underline;
}

.word-frequency {
  color: #6c757d;
  font-size: 0.9em;
  margin-left: 5px;
}

.no-content {
  text-align: center;
  color: #7f8c8d;
  font-style: italic;
  padding: 40px;
}

/* Word Analysis */
.word-analysis {
  display: grid;
  gap: 15px;
}

.word-item {
  padding: 15px;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  border-left: 4px solid #6c757d;
}

.word-item.present {
  border-left-color: #28a745;
  background: #f8fff4;
}

.word-item.missing {
  border-left-color: #ffc107;
  background: #fffbf0;
}

.word-name {
  font-weight: 600;
  font-size: 1.1em;
  color: #2c3e50;
  margin-bottom: 8px;
}

.word-definition {
  color: #495057;
  margin-bottom: 10px;
  line-height: 1.5;
}

.word-status {
  font-weight: 600;
  margin-bottom: 8px;
}

.word-item.present .word-status {
  color: #28a745;
}

.word-item.missing .word-status {
  color: #e67e22;
}

.word-suggestion {
  color: #6c757d;
  font-style: italic;
  font-size: 0.9em;
}

/* Loading states */
.loading {
  text-align: center;
  color: #7f8c8d;
  padding: 20px;
  font-style: italic;
}

/* Responsive design */
@media (max-width: 768px) {
  .app-container {
    padding: 10px;
  }

  .input-group {
    flex-direction: column;
    align-items: stretch;
  }

  .input-group label {
    min-width: auto;
    margin-bottom: 5px;
  }

  .translation-controls {
    flex-direction: column;
  }

  .progress-item {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .helps-tabs {
    flex-direction: column;
  }

  .tab-btn {
    text-align: left;
    border-bottom: 1px solid #ddd;
    border-right: 3px solid transparent;
  }

  .tab-btn.active {
    border-bottom-color: #ddd;
    border-right-color: #16a085;
  }
}
```

## Step 7: Testing and Usage

1. **Load the application** in your browser
2. **Enter a scripture reference** (e.g., "John 3:16")
3. **Review the source texts** (ULT and UST)
4. **Enter your translation** in the text area
5. **Click "Run Checks"** to analyze your translation
6. **Review the results** for accuracy, clarity, and cultural considerations
7. **Use the translation helps** tabs for additional context

## Step 8: Advanced Features (Optional)

### Save Translation Progress

```javascript
// Add to TranslationChecker class
saveProgress() {
  const progress = {
    reference: this.currentReference,
    translation: document.getElementById('userTranslation').value,
    checkResults: this.checkResults,
    timestamp: new Date().toISOString()
  };

  localStorage.setItem(`translation_${this.currentReference}`, JSON.stringify(progress));
}

loadProgress(reference) {
  const saved = localStorage.getItem(`translation_${reference}`);
  if (saved) {
    const progress = JSON.parse(saved);
    document.getElementById('userTranslation').value = progress.translation;
    // Restore check results if needed
  }
}
```

### Export Translation Report

```javascript
exportReport() {
  const report = {
    reference: this.currentReference,
    translation: document.getElementById('userTranslation').value,
    sourceTexts: this.sourceTexts,
    checkResults: this.checkResults,
    timestamp: new Date().toISOString()
  };

  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `translation_check_${this.currentReference.replace(/[^\w]/g, '_')}.json`;
  a.click();

  URL.revokeObjectURL(url);
}
```

## Troubleshooting

**Checks not running?**

- Ensure you've loaded a scripture reference first
- Check browser console for errors
- Verify API connectivity

**Source texts not loading?**

- Check internet connection
- Verify the scripture reference format
- Try a simpler reference like "John 1:1"

**Translation helps not appearing?**

- Some passages may have limited helps available
- Try well-known passages like "John 3:16" or "Romans 3:23"

---

**Congratulations!** You've built a comprehensive translation checking tool that helps Mother Tongue Translators verify accuracy, ensure clarity, and handle cultural considerations in their translation work.
