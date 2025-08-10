# Add Translation Helps to Your App

## What You'll Build

Integrate powerful translation resources into your existing application, adding ULT/UST scripture, translation notes, word definitions, and questions to enhance your users' Bible study experience.

## Prerequisites

- Existing web application (React, Vue, Angular, or vanilla JS)
- Basic API integration knowledge
- Package manager (npm, yarn, or pnpm)

## Step 1: Install the Translation Tools SDK

### Option A: JavaScript SDK (Recommended)

```bash
npm install @translation-tools/sdk
```

### Option B: Direct API Integration

No installation needed - use fetch/axios directly with our REST API.

## Step 2: Initialize the SDK

### JavaScript SDK Approach

```javascript
// translation-client.js
import { TranslationTools } from "@translation-tools/sdk";

const client = new TranslationTools({
  baseUrl: "https://translation.tools/api",
  apiKey: process.env.TRANSLATION_TOOLS_API_KEY, // Optional
  cacheStrategy: "memory", // 'memory', 'localStorage', or 'none'
  defaultLanguage: "en",
});

export default client;
```

### Direct API Approach

```javascript
// api-client.js
class TranslationAPI {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || "https://translation.tools/api";
    this.apiKey = options.apiKey;
    this.cache = new Map();
  }

  async request(endpoint, params = {}) {
    const url = new URL(endpoint, this.baseUrl);
    Object.keys(params).forEach((key) =>
      url.searchParams.append(key, params[key]),
    );

    const headers = {};
    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    return response.json();
  }

  // Core methods
  async getScripture(reference, options = {}) {
    const cacheKey = `scripture:${reference}:${JSON.stringify(options)}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const data = await this.request("/fetch-scripture", {
      reference,
      ...options,
    });

    this.cache.set(cacheKey, data);
    return data;
  }

  async getTranslationNotes(reference, language = "en") {
    return this.request("/fetch-translation-notes", { reference, language });
  }

  async getTranslationQuestions(reference, language = "en") {
    return this.request("/fetch-translation-questions", {
      reference,
      language,
    });
  }

  async getWordDefinition(word, language = "en") {
    return this.request("/get-translation-word", { word, language });
  }

  async browseWords(query = "", limit = 20, offset = 0) {
    return this.request("/browse-translation-words", { query, limit, offset });
  }
}

export default new TranslationAPI();
```

## Step 3: Add Scripture Display Component

### React Component

```jsx
// ScriptureViewer.jsx
import React, { useState, useEffect } from "react";
import translationAPI from "./api-client";

const ScriptureViewer = ({
  reference,
  showNotes = true,
  showQuestions = false,
}) => {
  const [scripture, setScripture] = useState(null);
  const [notes, setNotes] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadScriptureData();
  }, [reference]);

  const loadScriptureData = async () => {
    setLoading(true);
    setError(null);

    try {
      const promises = [translationAPI.getScripture(reference)];

      if (showNotes) {
        promises.push(translationAPI.getTranslationNotes(reference));
      }

      if (showQuestions) {
        promises.push(translationAPI.getTranslationQuestions(reference));
      }

      const results = await Promise.all(promises);

      setScripture(results[0]);
      if (showNotes) setNotes(results[1]?.notes || []);
      if (showQuestions)
        setQuestions(results[showNotes ? 2 : 1]?.questions || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWordClick = async (word) => {
    try {
      const definition = await translationAPI.getWordDefinition(word);
      // Show definition in modal, tooltip, or sidebar
      console.log("Word definition:", definition);
    } catch (err) {
      console.error("Failed to load word definition:", err);
    }
  };

  if (loading) return <div className="loading">Loading scripture...</div>;
  if (error) return <div className="error">Error: {error}</div>;
  if (!scripture) return <div>No scripture found</div>;

  return (
    <div className="scripture-viewer">
      <h2>{reference}</h2>

      <div className="scripture-texts">
        {scripture.scripture?.ult && (
          <div className="translation ult">
            <h3>ULT (Literal)</h3>
            <p>
              {formatTextWithWordLinks(
                scripture.scripture.ult.text,
                handleWordClick,
              )}
            </p>
          </div>
        )}

        {scripture.scripture?.ust && (
          <div className="translation ust">
            <h3>UST (Simplified)</h3>
            <p>
              {formatTextWithWordLinks(
                scripture.scripture.ust.text,
                handleWordClick,
              )}
            </p>
          </div>
        )}
      </div>

      {showNotes && notes.length > 0 && (
        <div className="translation-notes">
          <h3>Translation Notes</h3>
          {notes.map((note, index) => (
            <div key={index} className="note">
              <strong>{note.reference}:</strong> {note.text}
            </div>
          ))}
        </div>
      )}

      {showQuestions && questions.length > 0 && (
        <div className="translation-questions">
          <h3>Translation Questions</h3>
          {questions.map((question, index) => (
            <div key={index} className="question">
              <p>
                <strong>Q:</strong> {question.question}
              </p>
              {question.answer && (
                <p>
                  <strong>A:</strong> {question.answer}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Helper function to make words clickable
function formatTextWithWordLinks(text, onWordClick) {
  const words = text.split(/(\s+)/);
  return words.map((word, index) => {
    const cleanWord = word.replace(/[^\w]/g, "");
    if (cleanWord.length > 2) {
      return (
        <span
          key={index}
          className="clickable-word"
          onClick={() => onWordClick(cleanWord)}
          style={{ cursor: "pointer", color: "#007cba" }}
        >
          {word}
        </span>
      );
    }
    return word;
  });
}

export default ScriptureViewer;
```

### Vue Component

```vue
<!-- ScriptureViewer.vue -->
<template>
  <div class="scripture-viewer">
    <div v-if="loading" class="loading">Loading scripture...</div>
    <div v-else-if="error" class="error">Error: {{ error }}</div>
    <div v-else>
      <h2>{{ reference }}</h2>

      <div class="scripture-texts">
        <div v-if="scripture.scripture?.ult" class="translation ult">
          <h3>ULT (Literal)</h3>
          <p v-html="formatTextWithWordLinks(scripture.scripture.ult.text)"></p>
        </div>

        <div v-if="scripture.scripture?.ust" class="translation ust">
          <h3>UST (Simplified)</h3>
          <p v-html="formatTextWithWordLinks(scripture.scripture.ust.text)"></p>
        </div>
      </div>

      <div v-if="showNotes && notes.length" class="translation-notes">
        <h3>Translation Notes</h3>
        <div v-for="(note, index) in notes" :key="index" class="note">
          <strong>{{ note.reference }}:</strong> {{ note.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import translationAPI from "./api-client";

export default {
  name: "ScriptureViewer",
  props: {
    reference: String,
    showNotes: { type: Boolean, default: true },
    showQuestions: { type: Boolean, default: false },
  },
  data() {
    return {
      scripture: null,
      notes: [],
      loading: true,
      error: null,
    };
  },
  watch: {
    reference: "loadScriptureData",
  },
  mounted() {
    this.loadScriptureData();
  },
  methods: {
    async loadScriptureData() {
      this.loading = true;
      this.error = null;

      try {
        const promises = [translationAPI.getScripture(this.reference)];
        if (this.showNotes) {
          promises.push(translationAPI.getTranslationNotes(this.reference));
        }

        const results = await Promise.all(promises);
        this.scripture = results[0];
        if (this.showNotes) this.notes = results[1]?.notes || [];
      } catch (err) {
        this.error = err.message;
      } finally {
        this.loading = false;
      }
    },

    formatTextWithWordLinks(text) {
      const words = text.split(/(\s+)/);
      return words
        .map((word) => {
          const cleanWord = word.replace(/[^\w]/g, "");
          if (cleanWord.length > 2) {
            return `<span class="clickable-word" @click="handleWordClick('${cleanWord}')">${word}</span>`;
          }
          return word;
        })
        .join("");
    },

    async handleWordClick(word) {
      try {
        const definition = await translationAPI.getWordDefinition(word);
        this.$emit("word-selected", { word, definition });
      } catch (err) {
        console.error("Failed to load word definition:", err);
      }
    },
  },
};
</script>
```

## Step 4: Add CSS Styling

```css
/* translation-helps.css */
.scripture-viewer {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.scripture-texts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 30px;
}

@media (max-width: 768px) {
  .scripture-texts {
    grid-template-columns: 1fr;
  }
}

.translation {
  padding: 20px;
  border-radius: 8px;
  background: #f8f9fa;
  border-left: 4px solid #dee2e6;
}

.translation.ult {
  border-left-color: #28a745;
}

.translation.ust {
  border-left-color: #17a2b8;
}

.translation h3 {
  margin-top: 0;
  color: #495057;
  font-size: 1.1em;
}

.clickable-word {
  cursor: pointer;
  color: #007cba;
  text-decoration: underline;
  transition: background-color 0.2s;
}

.clickable-word:hover {
  background-color: #fff3cd;
  border-radius: 2px;
}

.translation-notes,
.translation-questions {
  margin-top: 30px;
  padding: 20px;
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.note,
.question {
  margin-bottom: 15px;
  padding-bottom: 15px;
  border-bottom: 1px solid #e9ecef;
}

.note:last-child,
.question:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.loading,
.error {
  text-align: center;
  padding: 40px;
  color: #6c757d;
}

.error {
  color: #dc3545;
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
}
```

## Step 5: Advanced Integration Features

### Word Definition Modal

```javascript
// WordDefinitionModal.js
class WordDefinitionModal {
  constructor() {
    this.modal = null;
    this.createModal();
  }

  createModal() {
    this.modal = document.createElement("div");
    this.modal.className = "word-definition-modal";
    this.modal.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-content">
          <div class="modal-header">
            <h3 id="word-title"></h3>
            <button class="close-btn">&times;</button>
          </div>
          <div class="modal-body" id="word-definition"></div>
        </div>
      </div>
    `;

    this.modal.style.display = "none";
    document.body.appendChild(this.modal);

    // Event listeners
    this.modal.querySelector(".close-btn").onclick = () => this.hide();
    this.modal.querySelector(".modal-overlay").onclick = (e) => {
      if (e.target === e.currentTarget) this.hide();
    };
  }

  async show(word) {
    try {
      const definition = await translationAPI.getWordDefinition(word);

      this.modal.querySelector("#word-title").textContent = word;
      this.modal.querySelector("#word-definition").innerHTML = `
        <p><strong>Definition:</strong> ${definition.definition || "No definition available"}</p>
        ${definition.translationHelp ? `<p><strong>Translation Help:</strong> ${definition.translationHelp}</p>` : ""}
        ${definition.examples ? `<p><strong>Examples:</strong> ${definition.examples}</p>` : ""}
      `;

      this.modal.style.display = "block";
    } catch (err) {
      console.error("Failed to show word definition:", err);
    }
  }

  hide() {
    this.modal.style.display = "none";
  }
}

// Usage
const wordModal = new WordDefinitionModal();

// In your word click handler:
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("clickable-word")) {
    const word = e.target.textContent.replace(/[^\w]/g, "");
    wordModal.show(word);
  }
});
```

### Translation Progress Tracker

```javascript
// ProgressTracker.js
class TranslationProgressTracker {
  constructor() {
    this.progress = JSON.parse(
      localStorage.getItem("translation-progress") || "{}",
    );
  }

  markVerseComplete(reference) {
    this.progress[reference] = {
      completed: true,
      timestamp: new Date().toISOString(),
    };
    this.save();
  }

  markVerseInProgress(reference) {
    this.progress[reference] = {
      completed: false,
      inProgress: true,
      timestamp: new Date().toISOString(),
    };
    this.save();
  }

  getProgress(reference) {
    return this.progress[reference] || { completed: false, inProgress: false };
  }

  getBookProgress(book) {
    const verses = Object.keys(this.progress).filter((ref) =>
      ref.startsWith(book),
    );
    const completed = verses.filter(
      (ref) => this.progress[ref].completed,
    ).length;
    return {
      total: verses.length,
      completed,
      percentage: (completed / verses.length) * 100,
    };
  }

  save() {
    localStorage.setItem("translation-progress", JSON.stringify(this.progress));
  }
}

export default new TranslationProgressTracker();
```

## Step 6: Usage Examples

### In your existing React app:

```jsx
// App.jsx
import ScriptureViewer from "./components/ScriptureViewer";

function App() {
  const [currentReference, setCurrentReference] = useState("John 3:16");

  return (
    <div className="app">
      <header>
        <h1>My Bible Study App</h1>
        <input
          value={currentReference}
          onChange={(e) => setCurrentReference(e.target.value)}
          placeholder="Enter scripture reference"
        />
      </header>

      <main>
        <ScriptureViewer
          reference={currentReference}
          showNotes={true}
          showQuestions={true}
        />
      </main>
    </div>
  );
}
```

### In your existing Vue app:

```vue
<template>
  <div id="app">
    <header>
      <h1>My Bible Study App</h1>
      <input
        v-model="currentReference"
        placeholder="Enter scripture reference"
      />
    </header>

    <main>
      <scripture-viewer
        :reference="currentReference"
        :show-notes="true"
        @word-selected="handleWordSelected"
      />
    </main>
  </div>
</template>

<script>
import ScriptureViewer from "./components/ScriptureViewer.vue";

export default {
  components: { ScriptureViewer },
  data() {
    return {
      currentReference: "John 3:16",
    };
  },
  methods: {
    handleWordSelected(event) {
      console.log("Word selected:", event.word, event.definition);
    },
  },
};
</script>
```

## Next Steps

1. **Explore Advanced Features:**
   - Word alignment visualization
   - Cross-reference discovery
   - Translation memory integration

2. **Add More Resources:**
   - Translation Academy articles
   - Resource container links
   - Language coverage checking

3. **Performance Optimization:**
   - Implement request caching
   - Add service worker for offline support
   - Use intersection observer for lazy loading

4. **User Experience:**
   - Add bookmarking functionality
   - Implement reading plans
   - Create collaborative features

## Troubleshooting

**API requests failing?**

- Check CORS configuration
- Verify API endpoints are correct
- Ensure proper error handling

**Performance issues?**

- Implement proper caching
- Use pagination for large datasets
- Consider request debouncing

**Mobile compatibility?**

- Test responsive design
- Optimize for touch interactions
- Consider offline capabilities

---

**You've successfully integrated Translation Helps into your app!** Your users now have access to powerful biblical resources that will enhance their study and translation work.
