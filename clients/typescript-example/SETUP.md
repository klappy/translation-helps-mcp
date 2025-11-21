# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Install OpenAI SDK (if not already installed)

```bash
npm install openai
```

## 3. Configure Your API Key

Create a `.env` file in this directory:

```env
OPENAI_API_KEY=your-actual-openai-api-key-here
```

**Important:** Replace `your-actual-openai-api-key-here` with your actual OpenAI API key.

## 4. Run the Client

```bash
# Using npm start
npm start "What does John 3:16 say?"

# Or using the built version
npm run build
node dist/index.js "What does John 3:16 say?"

# Or in development mode (auto-reloads on changes)
npm run dev "What does John 3:16 say?"
```

## Example Queries

```bash
npm start "What does John 3:16 say?"
npm start "What are the translation notes for Genesis 1:1?"
npm start "Explain the translation considerations for 'love' in 1 Corinthians 13"
```

## Troubleshooting

### "OPENAI_API_KEY environment variable is required"

Make sure you've created a `.env` file with your API key:

```env
OPENAI_API_KEY=sk-your-actual-key-here
```

### "openai package is not installed"

Run:

```bash
npm install openai
```

### Want to use Anthropic instead?

1. Install Anthropic SDK: `npm install @anthropic-ai/sdk`
2. Add to `.env`: `ANTHROPIC_API_KEY=your-key`
3. Set provider: `AI_PROVIDER=anthropic` in `.env` or use `AI_PROVIDER=anthropic npm start "your query"`
