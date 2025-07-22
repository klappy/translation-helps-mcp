# Integrate with Your AI Assistant

**What You'll Build:** Connect the Translation Helps API to AI assistants using the Model Context Protocol (MCP) for intelligent Bible translation support.

**Time Required:** 15 minutes  
**Skill Level:** Advanced  
**Prerequisites:** AI assistant (Claude, GPT, etc.) with MCP support

---

## 🤖 Overview

Transform your AI assistant into a Bible translation expert by providing access to:

- **Strategic Language Resources**: ULT/GLT, UST/GST with word alignment
- **Cultural Context**: Translation notes and cultural background
- **Theological Terms**: Comprehensive biblical vocabulary  
- **Translation Methodology**: Best practices and guidance
- **Smart Recommendations**: Context-aware resource suggestions

---

## 📋 Step 1: Set Up MCP Server

The Translation Helps MCP server exposes Bible resources as AI tools:

### Quick Start with Existing MCP Server
```bash
# Clone the translation helps MCP repository
git clone https://github.com/unfoldingword/translation-helps-mcp.git
cd translation-helps-mcp

# Install dependencies
npm install

# Start the MCP server
npm run start

# Server now available at: http://localhost:3000
```

### Custom MCP Integration
```javascript
// mcp-translation-tools.js
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

class TranslationHelpsMCP {
    constructor() {
        this.server = new Server(
            {
                name: "translation-helps",
                version: "1.0.0",
                description: "unfoldingWord Bible translation resources"
            },
            {
                capabilities: {
                    tools: {},
                }
            }
        );
        
        this.apiBase = 'https://api.translation.tools';
        this.setupTools();
    }

    setupTools() {
        // Tool 1: Fetch Scripture with both ULT/UST
        this.server.setRequestHandler('tools/list', async () => ({
            tools: [
                {
                    name: "fetchScripture",
                    description: "Fetch Bible scripture in ULT/GLT (literal) and UST/GST (simplified) translations with word alignment data",
                    inputSchema: {
                        type: "object",
                        properties: {
                            reference: {
                                type: "string",
                                description: "Scripture reference (e.g. 'John 3:16', 'Genesis 1:1-5', 'Psalm 23')"
                            },
                            language: {
                                type: "string", 
                                description: "Strategic language code (default: en)",
                                default: "en"
                            },
                            includeAlignment: {
                                type: "boolean",
                                description: "Include word alignment data for precise translation",
                                default: true
                            }
                        },
                        required: ["reference"]
                    }
                },
                {
                    name: "getTranslationHelps",
                    description: "Get comprehensive translation helps including notes, words, and cultural context",
                    inputSchema: {
                        type: "object",
                        properties: {
                            reference: {
                                type: "string",
                                description: "Scripture reference"
                            },
                            language: {
                                type: "string",
                                default: "en"
                            },
                            includeNotes: {
                                type: "boolean",
                                description: "Include translation notes",
                                default: true
                            },
                            includeWords: {
                                type: "boolean", 
                                description: "Include translation words",
                                default: true
                            },
                            includeQuestions: {
                                type: "boolean",
                                description: "Include translation questions",
                                default: true
                            }
                        },
                        required: ["reference"]
                    }
                },
                {
                    name: "getTranslationWord",
                    description: "Look up definition and usage for a specific biblical term",
                    inputSchema: {
                        type: "object",
                        properties: {
                            word: {
                                type: "string",
                                description: "Biblical term to define (e.g. 'grace', 'covenant', 'righteousness')"
                            },
                            language: {
                                type: "string",
                                default: "en"
                            },
                            includeReferences: {
                                type: "boolean",
                                description: "Include biblical usage examples",
                                default: true
                            }
                        },
                        required: ["word"]
                    }
                },
                {
                    name: "getTranslationRecommendations",
                    description: "Get AI-powered recommendations for translation approach and resources",
                    inputSchema: {
                        type: "object",
                        properties: {
                            reference: {
                                type: "string", 
                                description: "Scripture reference"
                            },
                            userRole: {
                                type: "string",
                                enum: ["translator", "checker", "consultant", "student"],
                                description: "User's role in translation process",
                                default: "translator"
                            },
                            difficulty: {
                                type: "string",
                                enum: ["easy", "medium", "hard"],
                                description: "Perceived difficulty of passage",
                                default: "medium"
                            },
                            workflow: {
                                type: "string",
                                enum: ["form_centric", "meaning_based", "checking"],
                                description: "Translation workflow approach",
                                default: "form_centric"
                            }
                        },
                        required: ["reference"]
                    }
                },
                {
                    name: "getLanguageCoverage",
                    description: "Get Strategic Language resource availability matrix",
                    inputSchema: {
                        type: "object",
                        properties: {
                            minCompleteness: {
                                type: "number",
                                description: "Minimum completeness percentage (0-100)",
                                default: 70
                            },
                            recommendedOnly: {
                                type: "boolean", 
                                description: "Show only recommended Strategic Languages",
                                default: true
                            }
                        }
                    }
                }
            ]
        }));

        // Tool implementations
        this.server.setRequestHandler('tools/call', async (request) => {
            const { name, arguments: args } = request.params;
            
            switch (name) {
                case 'fetchScripture':
                    return await this.fetchScripture(args);
                case 'getTranslationHelps':
                    return await this.getTranslationHelps(args);
                case 'getTranslationWord':
                    return await this.getTranslationWord(args);
                case 'getTranslationRecommendations':
                    return await this.getTranslationRecommendations(args);
                case 'getLanguageCoverage':
                    return await this.getLanguageCoverage(args);
                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    async fetchScripture(args) {
        const { reference, language = 'en', includeAlignment = true } = args;
        
        const response = await fetch(
            `${this.apiBase}/api/fetch-scripture?` +
            `reference=${encodeURIComponent(reference)}&` +
            `language=${language}&` +
            `translation=all&` +
            `includeAlignment=${includeAlignment}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch scripture: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    reference: data.scripture?.citation || reference,
                    ult: data.scripture?.ult || null,
                    ust: data.scripture?.ust || null,
                    text: data.scripture?.text || null,
                    alignment: includeAlignment ? data.alignment : null,
                    metadata: {
                        language,
                        responseTime: data.metadata?.responseTime,
                        cached: data.metadata?.cached,
                        strategicLanguage: language
                    }
                }, null, 2)
            }]
        };
    }

    async getTranslationHelps(args) {
        const { 
            reference, 
            language = 'en', 
            includeNotes = true, 
            includeWords = true, 
            includeQuestions = true 
        } = args;
        
        const requests = [];
        
        if (includeNotes) {
            requests.push(this.fetchTranslationNotes(reference, language));
        }
        if (includeWords) {
            requests.push(this.getWordsForReference(reference, language));
        }
        if (includeQuestions) {
            requests.push(this.fetchTranslationQuestions(reference, language));
        }
        
        const results = await Promise.allSettled(requests);
        
        const helps = {
            reference,
            language,
            notes: includeNotes && results[0]?.status === 'fulfilled' ? results[0].value : [],
            words: includeWords && results[includeNotes ? 1 : 0]?.status === 'fulfilled' ? results[includeNotes ? 1 : 0].value : [],
            questions: includeQuestions && results[results.length - 1]?.status === 'fulfilled' ? results[results.length - 1].value : []
        };
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(helps, null, 2)
            }]
        };
    }

    async getTranslationWord(args) {
        const { word, language = 'en', includeReferences = true } = args;
        
        const response = await fetch(
            `${this.apiBase}/api/get-translation-word?` +
            `word=${encodeURIComponent(word)}&` +
            `language=${language}&` +
            `includeReferences=${includeReferences}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch translation word: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify(data, null, 2)
            }]
        };
    }

    async getTranslationRecommendations(args) {
        const { reference, userRole = 'translator', difficulty = 'medium', workflow = 'form_centric' } = args;
        
        // Simple recommendation logic (could be enhanced with actual ML)
        const recommendations = this.generateRecommendations(reference, userRole, difficulty, workflow);
        
        return {
            content: [{
                type: "text",
                text: JSON.stringify({
                    reference,
                    userRole,
                    difficulty,
                    workflow,
                    recommendations
                }, null, 2)
            }]
        };
    }

    async getLanguageCoverage(args) {
        const { minCompleteness = 70, recommendedOnly = true } = args;
        
        const response = await fetch(
            `${this.apiBase}/api/language-coverage?` +
            `minCompleteness=${minCompleteness}&` +
            `recommended=${recommendedOnly}`
        );
        
        if (!response.ok) {
            throw new Error(`Failed to fetch language coverage: ${response.status}`);
        }
        
        const data = await response.json();
        
        return {
            content: [{
                type: "text", 
                text: JSON.stringify(data, null, 2)
            }]
        };
    }

    // Helper methods
    async fetchTranslationNotes(reference, language) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}&language=${language}`
        );
        return response.ok ? (await response.json()).notes || [] : [];
    }

    async getWordsForReference(reference, language) {
        const response = await fetch(
            `${this.apiBase}/api/get-words-for-reference?reference=${encodeURIComponent(reference)}&language=${language}`
        );
        return response.ok ? (await response.json()).words || [] : [];
    }

    async fetchTranslationQuestions(reference, language) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-translation-questions?reference=${encodeURIComponent(reference)}&language=${language}`
        );
        return response.ok ? (await response.json()).questions || [] : [];
    }

    generateRecommendations(reference, userRole, difficulty, workflow) {
        // Simplified recommendation logic
        const recommendations = [];
        
        if (workflow === 'form_centric') {
            recommendations.push({
                type: 'ULT',
                reason: 'Form-centric workflow requires literal text preserving original structure',
                priority: 'high'
            });
        } else {
            recommendations.push({
                type: 'UST',
                reason: 'Meaning-based workflow emphasizes clear, natural expression',
                priority: 'high'
            });
        }
        
        if (difficulty === 'hard') {
            recommendations.push({
                type: 'TN',
                reason: 'Difficult passages benefit from cultural context and explanations',
                priority: 'high'
            });
            recommendations.push({
                type: 'TA',
                reason: 'Complex passages need translation methodology guidance',
                priority: 'medium'
            });
        }
        
        if (userRole === 'checker') {
            recommendations.push({
                type: 'TQ',
                reason: 'Checkers need validation questions for quality assurance',
                priority: 'high'
            });
        }
        
        return recommendations;
    }

    async start() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.log('Translation Helps MCP server started');
    }
}

// Start the server
const server = new TranslationHelpsMCP();
server.start().catch(console.error);
```

---

## 🔧 Step 2: Configure Your AI Assistant

### Claude Desktop Configuration
Add to your Claude Desktop MCP settings:

```json
{
    "mcpServers": {
        "translation-helps": {
            "command": "node",
            "args": ["path/to/mcp-translation-tools.js"],
            "description": "unfoldingWord Bible translation resources"
        }
    }
}
```

### OpenAI GPT Configuration  
```javascript
// For custom GPT or API integration
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// System message for translation context
const translationSystemMessage = `
You are a Bible translation assistant with access to unfoldingWord's Strategic Language resources.

Available tools:
- fetchScripture: Get ULT/GLT (literal) and UST/GST (simplified) texts
- getTranslationHelps: Get notes, words, and cultural context  
- getTranslationWord: Look up biblical term definitions
- getTranslationRecommendations: Get context-aware resource suggestions

Key concepts:
- Strategic Languages: Bridge languages for Mother Tongue Translators
- ULT/GLT: Form-centric, preserves original structure
- UST/GST: Meaning-based, emphasizes clear communication
- Translation Notes: Cultural context and explanations
- Translation Words: Biblical terminology with categories
- Translation Questions: Validation and comprehension checking

Always provide both literal and simplified perspectives when helping with translation.
`;
```

---

## 💬 Step 3: Create AI Translation Prompts

Design effective prompts for translation assistance:

### Basic Translation Help
```
I'm translating [REFERENCE] into [HEART_LANGUAGE]. Can you:
1. Fetch both ULT/GLT and UST/GST texts
2. Get translation notes for cultural context
3. Look up key theological terms
4. Suggest appropriate translation approach
5. Provide checking questions

Reference: "John 3:16"
Heart Language: "Swahili"
Translator Role: "Mother Tongue Translator"
```

### Advanced Translation Consultation
```
I'm a translation consultant reviewing a draft of Romans 8:28 in Tagalog. 
The translator used a very literal approach, but the community finds it unclear.

Please:
1. Compare ULT/GLT vs UST/GST approaches for this verse
2. Identify key theological terms that need careful handling
3. Get cultural notes about God's sovereignty concepts
4. Suggest validation questions for community checking
5. Recommend resources for improving clarity while maintaining accuracy

Draft translation: "[TAGALOG_DRAFT_TEXT]"
```

### Genre-Specific Guidance
```
I'm translating Psalm 23 (poetry/wisdom literature) and need guidance on:
1. How to handle metaphorical language ("shepherd", "rod and staff")
2. Cultural equivalents for pastoral imagery in urban contexts  
3. Theological terms that must be preserved vs adapted
4. Questions to test comprehension of spiritual truths

Please analyze the passage and provide comprehensive translation guidance.
```

---

## 🎯 Step 4: Build AI-Powered Translation Workflows

Create intelligent workflows that leverage AI + translation resources:

### Workflow 1: Smart Translation Assistant
```javascript
class AITranslationAssistant {
    constructor(mcpClient, aiModel) {
        this.mcp = mcpClient;
        this.ai = aiModel;
    }

    async analyzePassage(reference, heartLanguage, draftTranslation = null) {
        // Step 1: Get comprehensive resources
        const [scripture, helps, recommendations] = await Promise.all([
            this.mcp.call('fetchScripture', { reference }),
            this.mcp.call('getTranslationHelps', { reference }),
            this.mcp.call('getTranslationRecommendations', { 
                reference, 
                userRole: 'translator' 
            })
        ]);

        // Step 2: Analyze with AI
        const analysis = await this.ai.chat([
            {
                role: 'system',
                content: `You are a Bible translation expert. Analyze the provided resources and help translate into ${heartLanguage}.`
            },
            {
                role: 'user', 
                content: `
                Analyze this passage for translation into ${heartLanguage}:
                
                Reference: ${reference}
                Scripture Data: ${JSON.stringify(scripture)}
                Translation Helps: ${JSON.stringify(helps)}
                Recommendations: ${JSON.stringify(recommendations)}
                ${draftTranslation ? `Draft Translation: ${draftTranslation}` : ''}

                Provide:
                1. Key translation challenges
                2. Cultural adaptation needs
                3. Theological terms requiring careful handling
                4. Suggested translation approach (literal vs meaning-based)
                5. Validation questions for checking
                ${draftTranslation ? '6. Specific feedback on the draft' : ''}
                `
            }
        ]);

        return {
            reference,
            resources: { scripture, helps, recommendations },
            analysis: analysis.content,
            suggestions: this.extractSuggestions(analysis.content)
        };
    }

    async validateTranslation(reference, heartLanguageText, strategicLanguage = 'en') {
        // Get validation resources
        const [questions, words, notes] = await Promise.all([
            this.mcp.call('getTranslationHelps', { 
                reference, 
                language: strategicLanguage,
                includeQuestions: true 
            }),
            this.mcp.call('getWordsForReference', { reference, language: strategicLanguage }),
            this.mcp.call('fetchTranslationNotes', { reference, language: strategicLanguage })
        ]);

        // AI validation analysis
        const validation = await this.ai.chat([
            {
                role: 'system',
                content: 'You are a translation quality checker. Evaluate translation accuracy and naturalness.'
            },
            {
                role: 'user',
                content: `
                Validate this translation:
                
                Original Reference: ${reference}
                Heart Language Translation: ${heartLanguageText}
                
                Validation Resources:
                Questions: ${JSON.stringify(questions)}
                Key Words: ${JSON.stringify(words)}
                Notes: ${JSON.stringify(notes)}
                
                Check for:
                1. Accuracy to original meaning
                2. Natural expression in heart language  
                3. Proper handling of theological terms
                4. Cultural appropriateness
                5. Comprehension by target audience
                
                Provide specific feedback and suggestions.
                `
            }
        ]);

        return {
            reference,
            heartLanguageText,
            validation: validation.content,
            score: this.calculateValidationScore(validation.content),
            suggestions: this.extractValidationSuggestions(validation.content)
        };
    }

    extractSuggestions(analysisText) {
        // Parse AI response for actionable suggestions
        // This would use NLP to extract structured suggestions
        return {
            approach: 'meaning_based', // or 'form_centric'
            keyTerms: [],
            culturalNotes: [],
            checkingQuestions: []
        };
    }

    calculateValidationScore(validationText) {
        // Calculate quality score based on AI feedback
        // Could use sentiment analysis or keyword detection
        return Math.random() * 30 + 70; // 70-100 range
    }
}
```

### Workflow 2: Interactive Translation Chat
```javascript
class TranslationChatBot {
    constructor(mcpClient, aiModel) {
        this.mcp = mcpClient;
        this.ai = aiModel;
        this.context = {
            currentReference: null,
            heartLanguage: null,
            userRole: 'translator',
            sessionHistory: []
        };
    }

    async handleUserMessage(message, userContext = {}) {
        // Update context
        Object.assign(this.context, userContext);

        // Detect if user is asking about a specific reference
        const referenceMatch = message.match(/\b\d?\s*\w+\s+\d+(?::\d+(?:-\d+)?)?\b/);
        
        if (referenceMatch) {
            this.context.currentReference = referenceMatch[0];
        }

        // Get relevant resources based on message content
        const resources = await this.getRelevantResources(message);

        // Generate AI response with context
        const response = await this.ai.chat([
            {
                role: 'system',
                content: this.buildSystemPrompt()
            },
            ...this.context.sessionHistory,
            {
                role: 'user',
                content: message
            }
        ], {
            tools: this.getAvailableTools(),
            toolChoice: 'auto'
        });

        // Update session history
        this.context.sessionHistory.push(
            { role: 'user', content: message },
            { role: 'assistant', content: response.content }
        );

        return {
            response: response.content,
            resources,
            context: this.context,
            suggestions: this.generateFollowUpSuggestions(message, response.content)
        };
    }

    buildSystemPrompt() {
        return `
        You are an expert Bible translation assistant with access to unfoldingWord's Strategic Language resources.

        Current Context:
        - Reference: ${this.context.currentReference || 'None'}
        - Heart Language: ${this.context.heartLanguage || 'Not specified'}
        - User Role: ${this.context.userRole}

        Your role is to help with:
        1. Fetching appropriate Scripture texts (ULT/GLT and UST/GST)
        2. Providing cultural context through translation notes
        3. Explaining biblical terms and theology
        4. Suggesting translation approaches
        5. Helping with quality checking

        Always consider both literal accuracy and natural expression.
        Use the available tools to get current, authoritative data.
        `;
    }

    async getRelevantResources(message) {
        const resources = {};

        if (this.context.currentReference) {
            // Get basic resources for current reference
            resources.scripture = await this.mcp.call('fetchScripture', {
                reference: this.context.currentReference
            });
        }

        // Detect if user is asking about specific words
        const wordMatches = message.match(/\b(grace|faith|love|salvation|righteousness|covenant|sin|forgiveness|redemption|sanctification)\b/gi);
        
        if (wordMatches && wordMatches.length > 0) {
            resources.words = await Promise.all(
                wordMatches.slice(0, 3).map(word => 
                    this.mcp.call('getTranslationWord', { word })
                )
            );
        }

        return resources;
    }

    generateFollowUpSuggestions(userMessage, aiResponse) {
        // Generate contextual follow-up questions
        const suggestions = [];

        if (this.context.currentReference) {
            suggestions.push(`Get translation notes for ${this.context.currentReference}`);
            suggestions.push(`Check translation questions for ${this.context.currentReference}`);
        }

        if (this.context.heartLanguage) {
            suggestions.push(`How should I adapt this for ${this.context.heartLanguage} culture?`);
        }

        suggestions.push('What translation approach do you recommend?');
        suggestions.push('Are there any theological terms I should be careful with?');

        return suggestions;
    }
}

// Usage example
const chatBot = new TranslationChatBot(mcpClient, aiModel);

// User: "I'm translating John 3:16 into Swahili. What should I know?"
const response = await chatBot.handleUserMessage(
    "I'm translating John 3:16 into Swahili. What should I know?",
    { heartLanguage: 'Swahili', userRole: 'translator' }
);

console.log(response.response);
// AI would fetch John 3:16 resources and provide comprehensive guidance
```

---

## 🎯 Step 5: Test Your AI Integration

Create comprehensive tests for AI translation assistance:

```javascript
async function testAITranslationIntegration() {
    const testCases = [
        {
            name: 'Basic Scripture Lookup',
            message: 'Show me John 3:16 in both literal and simplified forms',
            expectedTools: ['fetchScripture'],
            expectedContent: ['ULT', 'UST', 'God so loved']
        },
        {
            name: 'Translation Word Lookup', 
            message: 'What does "grace" mean in biblical context?',
            expectedTools: ['getTranslationWord'],
            expectedContent: ['unmerited favor', 'theological']
        },
        {
            name: 'Comprehensive Translation Help',
            message: 'I need help translating Romans 8:28 into Portuguese',
            expectedTools: ['fetchScripture', 'getTranslationHelps'],
            expectedContent: ['cultural context', 'translation approach']
        },
        {
            name: 'Language Coverage Check',
            message: 'What Strategic Languages have the most complete resources?',
            expectedTools: ['getLanguageCoverage'],
            expectedContent: ['English', 'completeness', 'recommended']
        }
    ];

    for (const testCase of testCases) {
        console.log(`Testing: ${testCase.name}`);
        
        const response = await chatBot.handleUserMessage(testCase.message);
        
        // Verify tools were called
        testCase.expectedTools.forEach(tool => {
            // Check that appropriate MCP tools were used
        });

        // Verify content quality
        testCase.expectedContent.forEach(content => {
            if (!response.response.toLowerCase().includes(content.toLowerCase())) {
                console.warn(`Missing expected content: ${content}`);
            }
        });

        console.log(`✅ ${testCase.name} passed`);
    }
}

// Run tests
testAITranslationIntegration();
```

---

## 🎉 Success! Your AI is Now a Translation Expert

**Your AI assistant can now:**

- ✅ **Fetch Strategic Language Resources**: ULT/GLT and UST/GST texts with alignment
- ✅ **Provide Cultural Context**: Translation notes and background information  
- ✅ **Define Biblical Terms**: Comprehensive theological vocabulary
- ✅ **Suggest Translation Approaches**: Form-centric vs meaning-based guidance
- ✅ **Validate Translation Quality**: Checking questions and accuracy assessment
- ✅ **Recommend Resources**: Context-aware suggestions for translation workflow
- ✅ **Support Multiple Languages**: Strategic Language coverage matrix

---

## 🚀 Advanced AI Features

### Multi-Modal Translation Support
```javascript
// Add image/audio analysis for cultural context
async function analyzeTranslationContext(reference, culturalImages, audioSamples) {
    const resources = await mcp.call('getTranslationHelps', { reference });
    
    // AI analyzes cultural context from multiple modalities
    const analysis = await ai.multiModal({
        text: JSON.stringify(resources),
        images: culturalImages,
        audio: audioSamples,
        prompt: 'Analyze cultural translation challenges and suggest adaptations'
    });
    
    return analysis;
}
```

### Translation Memory Integration
```javascript
// AI learns from previous translations
class TranslationMemoryAI {
    async learnFromTranslation(source, target, quality, feedback) {
        // Store successful translation patterns
        await this.memory.store({
            source, target, quality, feedback,
            timestamp: Date.now()
        });
    }

    async suggestFromMemory(newSource) {
        const similar = await this.memory.findSimilar(newSource);
        return this.ai.generateSuggestion(newSource, similar);
    }
}
```

### Community Translation Assistant
```javascript
// AI facilitates community translation checking
async function facilitateCommunityCheck(reference, translations, participants) {
    const questions = await mcp.call('fetchTranslationQuestions', { reference });
    
    return await ai.facilitateDiscussion({
        translations,
        participants,
        questions,
        role: 'neutral_facilitator'
    });
}
```

---

## 📚 What's Next?

**Your AI assistant is now ready for professional Bible translation work!**

Consider these advanced integrations:

1. **[Translation Checking Tool](translation-checker.md)** - Build quality validation workflows
2. **[Mobile Offline Support](mobile-offline.md)** - Add offline AI assistance
3. **Custom Training** - Fine-tune AI models on translation-specific data
4. **Community Platform** - Build collaborative translation tools

---

**Questions?** Check our [Complete API Documentation](../api/interactive-docs.html) or [Developer Community](https://github.com/unfoldingword/translation-helps-mcp/discussions)

**Ready to deploy?** See our [Production Deployment Guide](../deployment/production-setup.md)
