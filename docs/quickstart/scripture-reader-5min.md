# Build a Scripture Reader in 5 Minutes

**What You'll Build:** A simple web app that displays Scripture with translation helps using unfoldingWord's Strategic Language resources.

**Time Required:** 5 minutes  
**Skill Level:** Beginner  
**Prerequisites:** Basic HTML/JavaScript knowledge

---

## 📚 What You'll Learn

- How to fetch ULT/GLT (literal) and UST/GST (simplified) Scripture texts
- Display translation notes for cultural context
- Look up biblical term definitions
- Build a responsive, mobile-friendly interface

---

## 🚀 Step 1: Set Up Project (1 minute)

Create a new directory and basic HTML file:

```bash
mkdir scripture-reader
cd scripture-reader
```

Create `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Scripture Reader - Translation Helps</title>
    <style>
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background: #f8f9fa;
        }
        .container { 
            background: white; 
            padding: 30px; 
            border-radius: 10px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .verse-input { 
            width: 100%; 
            padding: 12px; 
            font-size: 16px; 
            border: 2px solid #e9ecef; 
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .scripture-text { 
            font-size: 18px; 
            line-height: 1.6; 
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
        .translation-type {
            font-weight: bold;
            color: #495057;
            margin-bottom: 10px;
        }
        .notes { 
            background: #fff3cd; 
            padding: 15px; 
            border-radius: 8px; 
            margin: 20px 0;
            border-left: 4px solid #ffc107;
        }
        .loading { 
            text-align: center; 
            color: #6c757d; 
            font-style: italic;
        }
        .error { 
            background: #f8d7da; 
            color: #721c24; 
            padding: 15px; 
            border-radius: 8px;
            border-left: 4px solid #dc3545;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📖 Scripture Reader</h1>
        <p>Enter a Bible reference to see ULT/GLT (literal) and UST/GST (simplified) translations with translation helps.</p>
        
        <input type="text" 
               class="verse-input" 
               id="referenceInput" 
               placeholder="Enter reference (e.g., John 3:16, Romans 8:28, Psalm 23)"
               value="John 3:16">
        <button class="btn" onclick="loadScripture()">Get Scripture & Helps</button>
        
        <div id="content"></div>
    </div>

    <script>
        // We'll add the JavaScript in the next step
    </script>
</body>
</html>
```

---

## ⚡ Step 2: Add API Integration (2 minutes)

Replace the empty `<script>` section with this Translation Helps API client:

```javascript
<script>
class ScriptureReader {
    constructor() {
        this.apiBase = 'https://api.translation.tools';
        this.contentDiv = document.getElementById('content');
    }

    async loadScripture() {
        const reference = document.getElementById('referenceInput').value.trim();
        
        if (!reference) {
            this.showError('Please enter a Bible reference');
            return;
        }

        this.showLoading();

        try {
            // Fetch scripture and translation helps in parallel
            const [scripture, notes] = await Promise.all([
                this.fetchScripture(reference),
                this.fetchTranslationNotes(reference)
            ]);

            this.displayContent(scripture, notes);
        } catch (error) {
            this.showError(`Failed to load scripture: ${error.message}`);
        }
    }

    async fetchScripture(reference) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&language=en`
        );
        
        if (!response.ok) {
            throw new Error(`Scripture not found: ${response.status}`);
        }
        
        return response.json();
    }

    async fetchTranslationNotes(reference) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=en`
        );
        
        if (!response.ok) {
            return { notes: [] }; // Notes optional - don't fail if unavailable
        }
        
        return response.json();
    }

    displayContent(scripture, notes) {
        const scriptureText = scripture.scripture?.text || 'Scripture text not available';
        const citation = scripture.scripture?.citation || 'Unknown reference';
        const notesArray = notes.notes || [];

        this.contentDiv.innerHTML = `
            <h2>${citation}</h2>
            
            <div class="scripture-text">
                <div class="translation-type">📜 Scripture Text</div>
                ${scriptureText}
            </div>

            ${notesArray.length > 0 ? `
                <div class="notes">
                    <div class="translation-type">📝 Translation Notes</div>
                    ${notesArray.map(note => `<p>${note.note || note}</p>`).join('')}
                </div>
            ` : ''}

            <p><small>
                Response time: ${scripture.metadata?.responseTime || 0}ms | 
                Cached: ${scripture.metadata?.cached ? 'Yes' : 'No'} |
                Powered by unfoldingWord Strategic Language resources
            </small></p>
        `;
    }

    showLoading() {
        this.contentDiv.innerHTML = '<div class="loading">📚 Loading Scripture and translation helps...</div>';
    }

    showError(message) {
        this.contentDiv.innerHTML = `<div class="error">❌ ${message}</div>`;
    }
}

// Initialize the app
const app = new ScriptureReader();

// Make loadScripture available globally for the button
function loadScripture() {
    app.loadScripture();
}

// Load default verse on page load
document.addEventListener('DOMContentLoaded', () => {
    app.loadScripture();
});

// Allow Enter key to trigger search
document.getElementById('referenceInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        app.loadScripture();
    }
});
</script>
```

---

## 🎯 Step 3: Add Translation Words Lookup (1 minute)

Enhance the app to look up biblical terms. Add this method to the `ScriptureReader` class:

```javascript
async fetchTranslationWord(word) {
    const response = await fetch(
        `${this.apiBase}/api/get-translation-word?word=${encodeURIComponent(word)}&language=en`
    );
    
    if (!response.ok) {
        return null;
    }
    
    return response.json();
}
```

Update the `displayContent` method to make words clickable:

```javascript
displayContent(scripture, notes) {
    const scriptureText = scripture.scripture?.text || 'Scripture text not available';
    const citation = scripture.scripture?.citation || 'Unknown reference';
    const notesArray = notes.notes || [];

    // Make common biblical terms clickable
    const clickableText = this.makeWordsClickable(scriptureText);

    this.contentDiv.innerHTML = `
        <h2>${citation}</h2>
        
        <div class="scripture-text">
            <div class="translation-type">📜 Scripture Text</div>
            ${clickableText}
        </div>

        ${notesArray.length > 0 ? `
            <div class="notes">
                <div class="translation-type">📝 Translation Notes</div>
                ${notesArray.map(note => `<p>${note.note || note}</p>`).join('')}
            </div>
        ` : ''}

        <div id="wordDefinition"></div>

        <p><small>
            Response time: ${scripture.metadata?.responseTime || 0}ms | 
            Cached: ${scripture.metadata?.cached ? 'Yes' : 'No'} |
            Powered by unfoldingWord Strategic Language resources<br>
            💡 Click on words like "God", "love", "grace", "faith" to see definitions
        </small></p>
    `;
}

makeWordsClickable(text) {
    const biblicalTerms = ['God', 'Lord', 'Jesus', 'Christ', 'love', 'grace', 'faith', 
                          'salvation', 'righteousness', 'covenant', 'sin', 'forgiveness'];
    
    let clickableText = text;
    
    biblicalTerms.forEach(term => {
        const regex = new RegExp(`\\b${term}\\b`, 'gi');
        clickableText = clickableText.replace(regex, 
            `<span class="clickable-word" onclick="lookupWord('${term.toLowerCase()}')" 
                   style="color: #007bff; cursor: pointer; text-decoration: underline;">$&</span>`);
    });
    
    return clickableText;
}
```

Add the word lookup function:

```javascript
async function lookupWord(word) {
    const wordDiv = document.getElementById('wordDefinition');
    wordDiv.innerHTML = '<div class="loading">🔍 Looking up word definition...</div>';
    
    try {
        const wordData = await app.fetchTranslationWord(word);
        
        if (wordData && wordData.word) {
            wordDiv.innerHTML = `
                <div class="notes">
                    <div class="translation-type">📖 Definition: ${wordData.word.term || word}</div>
                    <p>${wordData.word.definition || wordData.word.content || 'Definition not available'}</p>
                </div>
            `;
        } else {
            wordDiv.innerHTML = `<div class="notes">📖 No definition found for "${word}"</div>`;
        }
    } catch (error) {
        wordDiv.innerHTML = `<div class="error">Failed to load definition for "${word}"</div>`;
    }
}
```

---

## 🎉 Step 4: Test Your Scripture Reader (1 minute)

1. **Open `index.html` in your browser**
2. **Try different references:**
   - `John 3:16` - Most famous verse
   - `Romans 8:28` - God's sovereignty
   - `Psalm 23` - Full chapter
   - `Matthew 5:3-12` - Verse range
   - `Genesis 1:1` - Creation account

3. **Click on highlighted words** to see definitions
4. **Check the network tab** to see API calls in action

---

## 🚀 What You've Built

**In just 5 minutes, you've created a Scripture reader that:**

- ✅ Fetches Scripture from unfoldingWord's Strategic Language resources
- ✅ Displays translation notes for cultural context
- ✅ Looks up biblical term definitions on demand
- ✅ Shows performance metrics (response time, caching)
- ✅ Works on mobile devices
- ✅ Handles errors gracefully

---

## 🔥 Next Steps

**Want to make it even better?** Here are some enhancements:

### Add ULT/UST Comparison
```javascript
// Fetch both literal (ULT) and simplified (UST) texts
const response = await fetch(
    `${this.apiBase}/api/fetch-scripture?reference=${reference}&translation=all`
);

// Display side-by-side comparison
if (scripture.ult && scripture.ust) {
    content += `
        <div class="translation-comparison">
            <div class="translation-column">
                <h4>🔤 Literal (ULT/GLT)</h4>
                <p>${scripture.ult.text}</p>
            </div>
            <div class="translation-column">
                <h4>💬 Simplified (UST/GST)</h4>
                <p>${scripture.ust.text}</p>
            </div>
        </div>
    `;
}
```

### Add Translation Questions
```javascript
// Fetch validation questions for checking
const questions = await this.fetchTranslationQuestions(reference);

// Display as interactive checklist
questions.questions?.forEach(q => {
    content += `
        <div class="question">
            <p><strong>Q:</strong> ${q.question}</p>
            <details>
                <summary>Show Answer</summary>
                <p><strong>A:</strong> ${q.answer}</p>
            </details>
        </div>
    `;
});
```

### Add Language Selection
```javascript
// Fetch available Strategic Languages
const languages = await fetch(`${this.apiBase}/api/get-languages`);

// Add language dropdown
<select onchange="changeLanguage(this.value)">
    <option value="en">English</option>
    <option value="es">Español</option>
    <option value="fr">Français</option>
</select>
```

---

## 🎯 Success!

**Congratulations!** You've built a working Scripture reader using the Translation Helps API. Your app now provides Mother Tongue Translators with access to unfoldingWord's comprehensive Strategic Language resources.

**Ready for more?** Check out our other quickstart guides:
- [Add Translation Helps to Your App](translation-helps-integration.md)
- [Integrate with Your AI Assistant](ai-assistant-integration.md)
- [Create a Translation Checking Tool](translation-checker.md)
- [Build Offline-First Mobile Apps](mobile-offline.md)

---

**Questions or issues?** 
- 📖 [Full API Documentation](../api/interactive-docs.html)
- 💬 [Community Support](https://github.com/unfoldingword/translation-helps-mcp/discussions)
- 🐛 [Report Issues](https://github.com/unfoldingword/translation-helps-mcp/issues)
