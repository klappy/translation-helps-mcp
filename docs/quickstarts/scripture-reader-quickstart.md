# Build a Scripture Reader in 5 Minutes

## What You'll Build

A simple web app that displays Scripture with translation helps, showcasing ULT/UST texts side-by-side with integrated translation notes and word definitions.

## Prerequisites

- Node.js 18+
- Basic JavaScript knowledge
- Text editor or IDE
- API key (optional for higher rate limits - get one at [Developer Portal])

## Step 1: Set Up Project

```bash
mkdir my-scripture-reader
cd my-scripture-reader
npm init -y
npm install express axios cors
```

## Step 2: Create the Server

Create `server.js`:

```javascript
const express = require("express");
const axios = require("axios");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.static("public"));

// Scripture endpoint
app.get("/api/scripture/:reference", async (req, res) => {
  try {
    const response = await axios.get(
      "https://translation.tools/api/fetch-scripture",
      {
        params: {
          reference: req.params.reference,
          format: "json",
        },
      },
    );
    res.json(response.data);
  } catch (error) {
    console.error("Scripture fetch error:", error.message);
    res.status(500).json({
      error: "Failed to fetch scripture",
      details: error.message,
    });
  }
});

// Translation notes endpoint
app.get("/api/notes/:reference", async (req, res) => {
  try {
    const response = await axios.get(
      "https://translation.tools/api/fetch-translation-notes",
      {
        params: {
          reference: req.params.reference,
          language: "en",
        },
      },
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch translation notes",
      details: error.message,
    });
  }
});

// Word definition endpoint
app.get("/api/word/:term", async (req, res) => {
  try {
    const response = await axios.get(
      "https://translation.tools/api/get-translation-word",
      {
        params: {
          word: req.params.term,
          language: "en",
        },
      },
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({
      error: "Failed to fetch word definition",
      details: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Scripture Reader running on http://localhost:${PORT}`);
});
```

## Step 3: Create the Frontend

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Scripture Reader</title>
    <style>
      body {
        font-family: Arial, sans-serif;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }
      .header {
        text-align: center;
        margin-bottom: 30px;
      }
      .reference-input {
        text-align: center;
        margin-bottom: 30px;
      }
      .reference-input input {
        padding: 10px;
        font-size: 16px;
        border: 2px solid #ddd;
        border-radius: 4px;
        margin-right: 10px;
      }
      .reference-input button {
        padding: 10px 20px;
        font-size: 16px;
        background: #007cba;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
      }
      .scripture-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 20px;
        margin-bottom: 30px;
      }
      .scripture-text {
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
        background: #f9f9f9;
      }
      .ult {
        border-left: 4px solid #28a745;
      }
      .ust {
        border-left: 4px solid #17a2b8;
      }
      .notes-section {
        margin-top: 30px;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 8px;
      }
      .word-link {
        color: #007cba;
        cursor: pointer;
        text-decoration: underline;
      }
      .word-definition {
        margin-top: 10px;
        padding: 10px;
        background: #e9ecef;
        border-radius: 4px;
      }
      .loading {
        text-align: center;
        color: #666;
      }
      .error {
        color: #dc3545;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>Scripture Reader</h1>
      <p>Compare ULT and UST translations with integrated translation helps</p>
    </div>

    <div class="reference-input">
      <input
        type="text"
        id="referenceInput"
        placeholder="Enter reference (e.g., John 3:16)"
        value="John 3:16"
      />
      <button onclick="loadScripture()">Load Scripture</button>
    </div>

    <div id="content"></div>

    <script>
      async function loadScripture() {
        const reference = document.getElementById("referenceInput").value;
        const content = document.getElementById("content");

        if (!reference.trim()) {
          content.innerHTML =
            '<div class="error">Please enter a scripture reference</div>';
          return;
        }

        content.innerHTML = '<div class="loading">Loading scripture...</div>';

        try {
          // Fetch scripture and notes in parallel
          const [scriptureResponse, notesResponse] = await Promise.all([
            fetch(`/api/scripture/${encodeURIComponent(reference)}`),
            fetch(`/api/notes/${encodeURIComponent(reference)}`),
          ]);

          const scriptureData = await scriptureResponse.json();
          const notesData = await notesResponse.json();

          if (!scriptureResponse.ok) {
            throw new Error(scriptureData.error || "Failed to load scripture");
          }

          displayScripture(scriptureData, notesData, reference);
        } catch (error) {
          content.innerHTML = `<div class="error">Error: ${error.message}</div>`;
        }
      }

      function displayScripture(scriptureData, notesData, reference) {
        const content = document.getElementById("content");

        let html = `
                <h2>${reference}</h2>
                <div class="scripture-container">
                    <div class="scripture-text ult">
                        <h3>ULT (Literal Translation)</h3>
                        <p>${formatTextWithLinks(scriptureData.scripture?.ult?.text || "Text not available")}</p>
                    </div>
                    <div class="scripture-text ust">
                        <h3>UST (Simplified Translation)</h3>
                        <p>${formatTextWithLinks(scriptureData.scripture?.ust?.text || "Text not available")}</p>
                    </div>
                </div>
            `;

        if (notesData.notes && notesData.notes.length > 0) {
          html += `
                    <div class="notes-section">
                        <h3>Translation Notes</h3>
                        ${notesData.notes
                          .map(
                            (note) => `
                            <div style="margin-bottom: 15px;">
                                <strong>${note.reference || reference}</strong>: ${note.text}
                            </div>
                        `,
                          )
                          .join("")}
                    </div>
                `;
        }

        content.innerHTML = html;
      }

      function formatTextWithLinks(text) {
        // Simple word linking - look for common biblical terms
        const terms = [
          "God",
          "Lord",
          "Jesus",
          "Christ",
          "Spirit",
          "Father",
          "Son",
          "righteousness",
          "faith",
          "grace",
          "love",
          "salvation",
        ];
        let formattedText = text;

        terms.forEach((term) => {
          const regex = new RegExp(`\\b${term}\\b`, "gi");
          formattedText = formattedText.replace(
            regex,
            `<span class="word-link" onclick="lookupWord('${term}')">${term}</span>`,
          );
        });

        return formattedText;
      }

      async function lookupWord(word) {
        try {
          const response = await fetch(`/api/word/${encodeURIComponent(word)}`);
          const data = await response.json();

          if (response.ok && data.definition) {
            // Create a simple popup or add to page
            const existing = document.querySelector(".word-definition");
            if (existing) existing.remove();

            const definition = document.createElement("div");
            definition.className = "word-definition";
            definition.innerHTML = `
                        <strong>${word}</strong>: ${data.definition.text || data.definition}
                        <button onclick="this.parentElement.remove()" style="float: right;">×</button>
                    `;

            document.getElementById("content").appendChild(definition);
          } else {
            alert(`Definition not found for "${word}"`);
          }
        } catch (error) {
          alert(`Error looking up "${word}": ${error.message}`);
        }
      }

      // Load default scripture on page load
      window.onload = () => loadScripture();
    </script>
  </body>
</html>
```

## Step 4: Run and Test

```bash
node server.js
```

Open your browser to `http://localhost:3000`

You should see:

- ✅ Scripture reference input field
- ✅ ULT and UST translations side-by-side
- ✅ Translation notes below the text
- ✅ Clickable words that show definitions
- ✅ Clean, responsive design

## Step 5: Enhance (Optional)

Add these features to make it even better:

### Add Verse Range Support

```javascript
// In your reference input, try:
// "John 3:16-17" for multiple verses
// "Matthew 5" for a whole chapter
```

### Add Language Selection

```javascript
app.get("/api/languages", async (req, res) => {
  try {
    const response = await axios.get(
      "https://translation.tools/api/get-languages",
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch languages" });
  }
});
```

### Add Offline Support

```javascript
// Add service worker for caching
// Store frequently accessed verses locally
```

## Next Steps

- Explore the [Full API Reference](../API_DOCUMENTATION_GUIDE.md)
- Try the [Translation Workflow Guide](translation-workflow-quickstart.md)
- Check out [Advanced Integration Patterns](../IMPLEMENTATION_GUIDE.md)

## Troubleshooting

**Scripture not loading?**

- Check your internet connection
- Verify the reference format (Book Chapter:Verse)
- Try a simpler reference like "John 1:1"

**Word definitions not working?**

- Some words may not have definitions available
- Try common biblical terms like "God", "grace", "faith"

**Server errors?**

- Check the console for detailed error messages
- Ensure you're using the correct API endpoints
- Verify your API key if using one

## Performance Tips

- Cache frequently accessed verses
- Use pagination for long passages
- Implement request debouncing for word lookups
- Consider using a CDN for static assets

---

**Congratulations!** You've built a functional Scripture reader with translation helps in just 5 minutes. This foundation can be extended with more advanced features like user accounts, bookmarking, study plans, and collaborative translation tools.
