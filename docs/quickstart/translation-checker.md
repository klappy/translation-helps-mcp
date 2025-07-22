# Create a Translation Checking Tool

**What You'll Build:** A comprehensive translation validation tool for quality assurance using unfoldingWord resources and validation questions.

**Time Required:** 20 minutes  
**Skill Level:** Intermediate to Advanced  
**Prerequisites:** Basic web development, understanding of translation workflows

---

## 🎯 Overview

Build a professional translation checking tool that provides:

- **Side-by-Side Comparison**: Original vs heart language translation
- **Validation Questions**: Comprehension and accuracy checking
- **Key Term Analysis**: Theological term handling verification
- **Cultural Context**: Translation notes for cultural appropriateness
- **Quality Scoring**: Automated assessment with feedback
- **Team Collaboration**: Multi-reviewer workflow support

---

## 🏗️ Step 1: Create the Checking Interface

Build the foundational HTML structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Translation Checker - Quality Assurance Tool</title>
    <style>
        * { box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', system-ui, sans-serif; 
            margin: 0; 
            background: #f5f7fa; 
            color: #2d3748;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 2rem;
            border-radius: 12px;
            margin-bottom: 2rem;
            text-align: center;
        }
        .checking-panel {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2rem;
            margin-bottom: 2rem;
        }
        .source-panel, .target-panel {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .source-panel { border-left: 4px solid #48bb78; }
        .target-panel { border-left: 4px solid #4299e1; }
        
        .validation-section {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            margin-bottom: 2rem;
        }
        .question-item {
            background: #f7fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 1.5rem;
            margin: 1rem 0;
        }
        .question-text {
            font-weight: 600;
            margin-bottom: 1rem;
            color: #2d3748;
        }
        .answer-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
            margin-top: 1rem;
        }
        .expected-answer, .reviewer-input {
            padding: 1rem;
            border-radius: 6px;
        }
        .expected-answer {
            background: #f0fff4;
            border: 1px solid #9ae6b4;
        }
        .reviewer-input textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #cbd5e0;
            border-radius: 6px;
            resize: vertical;
            min-height: 80px;
        }
        .scoring-panel {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .score-meter {
            background: #edf2f7;
            border-radius: 12px;
            height: 24px;
            margin: 1rem 0;
            overflow: hidden;
        }
        .score-fill {
            height: 100%;
            border-radius: 12px;
            transition: all 0.3s ease;
        }
        .btn {
            background: #4299e1;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 600;
            transition: all 0.3s ease;
        }
        .btn:hover { background: #3182ce; }
        .btn-success { background: #48bb78; }
        .btn-success:hover { background: #38a169; }
        .loading { text-align: center; color: #718096; }
        .error { 
            background: #fed7d7; 
            color: #c53030; 
            padding: 1rem; 
            border-radius: 8px; 
            margin: 1rem 0; 
        }
        @media (max-width: 768px) {
            .checking-panel { grid-template-columns: 1fr; }
            .answer-section { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Translation Checker</h1>
            <p>Quality Assurance Tool for Bible Translation</p>
        </div>

        <div class="input-section">
            <div style="display: grid; grid-template-columns: 2fr 2fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                <input type="text" 
                       id="referenceInput" 
                       placeholder="Scripture Reference (e.g., Romans 8:28)"
                       style="padding: 12px; border: 1px solid #cbd5e0; border-radius: 8px;">
                <input type="text" 
                       id="heartLanguageInput" 
                       placeholder="Heart Language (e.g., Swahili, Tagalog)"
                       style="padding: 12px; border: 1px solid #cbd5e0; border-radius: 8px;">
                <button class="btn" onclick="startChecking()">Start Checking</button>
            </div>
        </div>

        <div id="checkingContent"></div>
    </div>

    <script>
        // Translation checking implementation goes here
    </script>
</body>
</html>
```

---

## ⚙️ Step 2: Build the Translation Checker Engine

Create the core checking functionality:

```javascript
class TranslationChecker {
    constructor() {
        this.apiBase = 'https://api.translation.tools';
        this.currentCheck = null;
        this.checkingScores = {
            accuracy: 0,
            naturalness: 0,
            cultural: 0,
            theological: 0,
            overall: 0
        };
    }

    async startTranslationCheck(reference, heartLanguage, targetText) {
        try {
            this.showLoading('Preparing comprehensive translation check...');

            // Fetch all checking resources in parallel
            const [scripture, questions, notes, words, recommendations] = await Promise.all([
                this.fetchScripture(reference),
                this.fetchTranslationQuestions(reference),
                this.fetchTranslationNotes(reference),
                this.getWordsForReference(reference),
                this.getTranslationRecommendations(reference)
            ]);

            this.currentCheck = {
                reference,
                heartLanguage,
                targetText,
                resources: {
                    scripture,
                    questions: questions.questions || [],
                    notes: notes.notes || [],
                    words: words.words || [],
                    recommendations: recommendations || []
                },
                reviewData: {
                    answers: {},
                    termHandling: {},
                    culturalNotes: {},
                    scores: { ...this.checkingScores }
                }
            };

            this.renderCheckingInterface();
        } catch (error) {
            this.showError(`Failed to load checking resources: ${error.message}`);
        }
    }

    async fetchScripture(reference) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-scripture?reference=${encodeURIComponent(reference)}&translation=all`
        );
        if (!response.ok) throw new Error('Scripture not found');
        return response.json();
    }

    async fetchTranslationQuestions(reference) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-translation-questions?reference=${encodeURIComponent(reference)}`
        );
        return response.ok ? response.json() : { questions: [] };
    }

    async fetchTranslationNotes(reference) {
        const response = await fetch(
            `${this.apiBase}/api/fetch-translation-notes?reference=${encodeURIComponent(reference)}`
        );
        return response.ok ? response.json() : { notes: [] };
    }

    async getWordsForReference(reference) {
        const response = await fetch(
            `${this.apiBase}/api/get-words-for-reference?reference=${encodeURIComponent(reference)}`
        );
        return response.ok ? response.json() : { words: [] };
    }

    async getTranslationRecommendations(reference) {
        // Simplified recommendations - could be enhanced with actual API endpoint
        return [
            { type: 'accuracy', priority: 'high', text: 'Verify theological terms are accurately translated' },
            { type: 'naturalness', priority: 'high', text: 'Ensure natural expression in heart language' },
            { type: 'cultural', priority: 'medium', text: 'Adapt cultural concepts appropriately' }
        ];
    }

    renderCheckingInterface() {
        const { reference, heartLanguage, targetText, resources } = this.currentCheck;
        
        document.getElementById('checkingContent').innerHTML = `
            <!-- Source vs Target Comparison -->
            <div class="checking-panel">
                <div class="source-panel">
                    <h3>📜 Strategic Language Sources</h3>
                    <div class="source-texts">
                        ${resources.scripture.scripture?.ult ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h4 style="color: #38a169; margin: 0 0 0.5rem 0;">🔤 Literal (ULT/GLT)</h4>
                                <div style="padding: 1rem; background: #f0fff4; border-radius: 6px; line-height: 1.6;">
                                    ${resources.scripture.scripture.ult.text || resources.scripture.scripture.ult}
                                </div>
                                <small style="color: #718096; font-style: italic;">Form-centric translation preserving original structure</small>
                            </div>
                        ` : ''}
                        
                        ${resources.scripture.scripture?.ust ? `
                            <div style="margin-bottom: 1.5rem;">
                                <h4 style="color: #3182ce; margin: 0 0 0.5rem 0;">💬 Simplified (UST/GST)</h4>
                                <div style="padding: 1rem; background: #ebf8ff; border-radius: 6px; line-height: 1.6;">
                                    ${resources.scripture.scripture.ust.text || resources.scripture.scripture.ust}
                                </div>
                                <small style="color: #718096; font-style: italic;">Meaning-based translation for clarity</small>
                            </div>
                        ` : ''}
                        
                        ${!resources.scripture.scripture?.ult && !resources.scripture.scripture?.ust ? `
                            <div style="padding: 1rem; background: #f7fafc; border-radius: 6px; line-height: 1.6;">
                                ${resources.scripture.scripture?.text || 'Scripture text not available'}
                            </div>
                        ` : ''}
                    </div>
                </div>

                <div class="target-panel">
                    <h3>🎯 ${heartLanguage} Translation</h3>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Translation to Check:</label>
                        <textarea id="targetTranslation" 
                                  style="width: 100%; min-height: 120px; padding: 1rem; border: 1px solid #cbd5e0; border-radius: 6px; line-height: 1.6;"
                                  placeholder="Paste the ${heartLanguage} translation here...">${targetText || ''}</textarea>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Translation Approach:</label>
                        <select id="translationApproach" style="width: 100%; padding: 0.75rem; border: 1px solid #cbd5e0; border-radius: 6px;">
                            <option value="form_centric">Form-centric (preserves structure)</option>
                            <option value="meaning_based">Meaning-based (emphasizes clarity)</option>
                            <option value="mixed">Mixed approach</option>
                        </select>
                    </div>
                </div>
            </div>

            <!-- Validation Questions Section -->
            ${this.renderValidationQuestions()}

            <!-- Key Terms Analysis -->
            ${this.renderKeyTermsAnalysis()}

            <!-- Cultural Context Check -->
            ${this.renderCulturalContextCheck()}

            <!-- Scoring and Results -->
            ${this.renderScoringPanel()}
        `;

        this.attachEventListeners();
    }

    renderValidationQuestions() {
        const questions = this.currentCheck.resources.questions;
        
        if (questions.length === 0) {
            return `
                <div class="validation-section">
                    <h3>❓ Validation Questions</h3>
                    <p style="color: #718096; font-style: italic;">No validation questions available for this reference.</p>
                </div>
            `;
        }

        return `
            <div class="validation-section">
                <h3>❓ Validation Questions</h3>
                <p style="margin-bottom: 1.5rem; color: #4a5568;">
                    Use these questions to check if the translation accurately conveys the meaning:
                </p>
                
                ${questions.map((question, index) => `
                    <div class="question-item">
                        <div class="question-text">
                            <strong>Q${index + 1}:</strong> ${question.question}
                        </div>
                        
                        <div class="answer-section">
                            <div class="expected-answer">
                                <strong>📋 Expected Answer:</strong>
                                <div style="margin-top: 0.5rem;">
                                    ${question.answer || 'Answer not provided'}
                                </div>
                            </div>
                            
                            <div class="reviewer-input">
                                <strong>🤔 Translation Analysis:</strong>
                                <textarea id="answer_${index}" 
                                          placeholder="Does the translation support this answer? Explain..."
                                          onchange="checker.updateAnswer(${index}, this.value)"></textarea>
                                
                                <div style="margin-top: 0.5rem;">
                                    <label style="display: flex; align-items: center;">
                                        <input type="checkbox" 
                                               id="accurate_${index}" 
                                               onchange="checker.updateAccuracy(${index}, this.checked)"
                                               style="margin-right: 0.5rem;">
                                        Translation supports expected answer
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderKeyTermsAnalysis() {
        const words = this.currentCheck.resources.words;
        
        if (words.length === 0) {
            return `
                <div class="validation-section">
                    <h3>📖 Key Terms Analysis</h3>
                    <p style="color: #718096; font-style: italic;">No key terms identified for this reference.</p>
                </div>
            `;
        }

        return `
            <div class="validation-section">
                <h3>📖 Key Terms Analysis</h3>
                <p style="margin-bottom: 1.5rem; color: #4a5568;">
                    Verify that these theological terms are handled appropriately:
                </p>
                
                ${words.slice(0, 5).map((word, index) => `
                    <div class="question-item">
                        <div class="question-text">
                            <strong>Term:</strong> "${word.term || word.word}"
                        </div>
                        
                        <div style="background: #f0fff4; padding: 1rem; border-radius: 6px; margin: 1rem 0;">
                            <strong>📚 Definition:</strong>
                            <div style="margin-top: 0.5rem;">
                                ${word.definition || word.content || 'Definition not available'}
                            </div>
                        </div>
                        
                        <div class="reviewer-input">
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                                How is this term handled in the translation?
                            </label>
                            <textarea id="term_${index}" 
                                      placeholder="Explain how '${word.term || word.word}' is translated and whether it's appropriate..."
                                      onchange="checker.updateTermHandling(${index}, this.value)"></textarea>
                            
                            <div style="margin-top: 0.5rem;">
                                <select id="termRating_${index}" 
                                        onchange="checker.updateTermRating(${index}, this.value)"
                                        style="padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 4px;">
                                    <option value="">Rate term handling...</option>
                                    <option value="excellent">Excellent - Perfect handling</option>
                                    <option value="good">Good - Appropriate with minor issues</option>
                                    <option value="adequate">Adequate - Acceptable but could improve</option>
                                    <option value="poor">Poor - Needs significant revision</option>
                                </select>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCulturalContextCheck() {
        const notes = this.currentCheck.resources.notes;
        
        return `
            <div class="validation-section">
                <h3>🌍 Cultural Context Check</h3>
                
                ${notes.length > 0 ? `
                    <div style="background: #fffbeb; padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #f59e0b;">
                        <strong>📝 Translation Notes:</strong>
                        <div style="margin-top: 1rem;">
                            ${notes.slice(0, 3).map(note => `
                                <div style="margin: 0.5rem 0; padding: 0.75rem; background: white; border-radius: 4px;">
                                    ${typeof note === 'string' ? note : note.note}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <div class="reviewer-input">
                    <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">
                        Cultural Appropriateness Assessment:
                    </label>
                    <textarea id="culturalAssessment" 
                              placeholder="How well does this translation work in the target culture? Are there any cultural concepts that need different handling?"
                              onchange="checker.updateCulturalAssessment(this.value)"
                              style="min-height: 100px;"></textarea>
                    
                    <div style="margin-top: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">Cultural Adaptation Rating:</label>
                        <select id="culturalRating" 
                                onchange="checker.updateCulturalRating(this.value)"
                                style="padding: 0.5rem; border: 1px solid #cbd5e0; border-radius: 4px;">
                            <option value="">Select rating...</option>
                            <option value="excellent">Excellent - Perfectly adapted to culture</option>
                            <option value="good">Good - Well adapted with minor issues</option>
                            <option value="adequate">Adequate - Understandable but could be more natural</option>
                            <option value="poor">Poor - Cultural barriers to understanding</option>
                        </select>
                    </div>
                </div>
            </div>
        `;
    }

    renderScoringPanel() {
        return `
            <div class="scoring-panel">
                <h3>📊 Translation Quality Assessment</h3>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.5rem; margin: 2rem 0;">
                    ${this.renderScoreCard('Accuracy', 'accuracy', 'Theological and factual correctness')}
                    ${this.renderScoreCard('Naturalness', 'naturalness', 'Natural expression in heart language')}
                    ${this.renderScoreCard('Cultural Fit', 'cultural', 'Cultural appropriateness and adaptation')}
                    ${this.renderScoreCard('Clarity', 'clarity', 'Clear communication to target audience')}
                </div>
                
                <div style="background: #f7fafc; padding: 2rem; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0 0 1rem 0;">Overall Quality Score</h4>
                    <div class="score-meter">
                        <div class="score-fill" id="overallScoreFill" style="width: 0%; background: #4299e1;"></div>
                    </div>
                    <div style="font-size: 2rem; font-weight: bold; color: #2d3748; margin: 1rem 0;">
                        <span id="overallScore">0</span>%
                    </div>
                    <div id="overallRecommendation" style="color: #4a5568; font-style: italic;">
                        Complete the assessment to see recommendations
                    </div>
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn btn-success" onclick="checker.generateReport()">
                        📋 Generate Quality Report
                    </button>
                    <button class="btn" onclick="checker.saveProgress()" style="margin-left: 1rem;">
                        💾 Save Progress
                    </button>
                </div>
                
                <div id="qualityReport" style="margin-top: 2rem;"></div>
            </div>
        `;
    }

    renderScoreCard(title, category, description) {
        return `
            <div style="background: white; padding: 1.5rem; border-radius: 8px; border: 1px solid #e2e8f0;">
                <h5 style="margin: 0 0 0.5rem 0; color: #2d3748;">${title}</h5>
                <p style="font-size: 0.875rem; color: #718096; margin: 0 0 1rem 0;">${description}</p>
                <div class="score-meter">
                    <div class="score-fill" id="${category}ScoreFill" style="width: 0%; background: #48bb78;"></div>
                </div>
                <div style="text-align: center; font-weight: bold; color: #2d3748;">
                    <span id="${category}Score">0</span>%
                </div>
            </div>
        `;
    }

    // Event handlers and scoring logic
    updateAnswer(questionIndex, answer) {
        this.currentCheck.reviewData.answers[questionIndex] = answer;
        this.calculateScores();
    }

    updateAccuracy(questionIndex, isAccurate) {
        this.currentCheck.reviewData.answers[`${questionIndex}_accurate`] = isAccurate;
        this.calculateScores();
    }

    updateTermHandling(termIndex, handling) {
        this.currentCheck.reviewData.termHandling[termIndex] = handling;
        this.calculateScores();
    }

    updateTermRating(termIndex, rating) {
        this.currentCheck.reviewData.termHandling[`${termIndex}_rating`] = rating;
        this.calculateScores();
    }

    updateCulturalAssessment(assessment) {
        this.currentCheck.reviewData.culturalNotes.assessment = assessment;
        this.calculateScores();
    }

    updateCulturalRating(rating) {
        this.currentCheck.reviewData.culturalNotes.rating = rating;
        this.calculateScores();
    }

    calculateScores() {
        const scores = this.currentCheck.reviewData.scores;
        
        // Calculate accuracy score based on validation questions
        const accuracyAnswers = Object.keys(this.currentCheck.reviewData.answers)
            .filter(key => key.includes('_accurate'))
            .map(key => this.currentCheck.reviewData.answers[key]);
        
        scores.accuracy = accuracyAnswers.length > 0 
            ? (accuracyAnswers.filter(Boolean).length / accuracyAnswers.length) * 100 
            : 0;

        // Calculate term handling score
        const termRatings = Object.keys(this.currentCheck.reviewData.termHandling)
            .filter(key => key.includes('_rating'))
            .map(key => this.currentCheck.reviewData.termHandling[key]);
        
        if (termRatings.length > 0) {
            const ratingValues = { excellent: 100, good: 80, adequate: 60, poor: 30 };
            scores.theological = termRatings.reduce((sum, rating) => 
                sum + (ratingValues[rating] || 0), 0) / termRatings.length;
        }

        // Calculate cultural score
        const culturalRating = this.currentCheck.reviewData.culturalNotes.rating;
        if (culturalRating) {
            const ratingValues = { excellent: 100, good: 80, adequate: 60, poor: 30 };
            scores.cultural = ratingValues[culturalRating] || 0;
        }

        // Estimate naturalness (simplified - could be enhanced)
        scores.naturalness = (scores.accuracy + scores.cultural) / 2;

        // Calculate overall score
        scores.overall = (scores.accuracy + scores.naturalness + scores.cultural + scores.theological) / 4;

        this.updateScoreDisplay();
    }

    updateScoreDisplay() {
        const scores = this.currentCheck.reviewData.scores;
        
        Object.keys(scores).forEach(category => {
            const score = Math.round(scores[category]);
            const scoreElement = document.getElementById(`${category}Score`);
            const fillElement = document.getElementById(`${category}ScoreFill`);
            
            if (scoreElement) scoreElement.textContent = score;
            if (fillElement) {
                fillElement.style.width = `${score}%`;
                fillElement.style.background = this.getScoreColor(score);
            }
        });

        // Update recommendation
        const recommendationElement = document.getElementById('overallRecommendation');
        if (recommendationElement) {
            recommendationElement.textContent = this.getOverallRecommendation(scores.overall);
        }
    }

    getScoreColor(score) {
        if (score >= 90) return '#48bb78'; // Green
        if (score >= 70) return '#ed8936'; // Orange  
        if (score >= 50) return '#f56565'; // Red
        return '#a0aec0'; // Gray
    }

    getOverallRecommendation(score) {
        if (score >= 90) return '🌟 Excellent translation - Ready for publication';
        if (score >= 80) return '✅ Good translation - Minor revisions recommended';
        if (score >= 70) return '⚠️ Adequate translation - Some improvements needed';
        if (score >= 50) return '⚠️ Poor translation - Significant revision required';
        return '❌ Unacceptable translation - Major rework needed';
    }

    generateReport() {
        const report = this.buildQualityReport();
        document.getElementById('qualityReport').innerHTML = report;
    }

    buildQualityReport() {
        const { reference, heartLanguage, reviewData } = this.currentCheck;
        const scores = reviewData.scores;
        
        return `
            <div style="background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0;">
                <h3 style="text-align: center; color: #2d3748; margin-bottom: 2rem;">
                    📋 Translation Quality Report
                </h3>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                    <div>
                        <strong>Reference:</strong> ${reference}<br>
                        <strong>Heart Language:</strong> ${heartLanguage}<br>
                        <strong>Assessment Date:</strong> ${new Date().toLocaleDateString()}<br>
                        <strong>Overall Score:</strong> <span style="font-size: 1.25rem; color: ${this.getScoreColor(scores.overall)};">${Math.round(scores.overall)}%</span>
                    </div>
                    <div>
                        <strong>Recommendation:</strong><br>
                        <span style="font-style: italic; color: #4a5568;">
                            ${this.getOverallRecommendation(scores.overall)}
                        </span>
                    </div>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h4>Detailed Scores:</h4>
                    <ul style="list-style: none; padding: 0;">
                        <li>📊 Accuracy: ${Math.round(scores.accuracy)}% - Theological and factual correctness</li>
                        <li>💬 Naturalness: ${Math.round(scores.naturalness)}% - Natural expression in heart language</li>
                        <li>🌍 Cultural Fit: ${Math.round(scores.cultural)}% - Cultural appropriateness</li>
                        <li>📖 Theological Terms: ${Math.round(scores.theological)}% - Key term handling</li>
                    </ul>
                </div>
                
                <div style="margin: 2rem 0;">
                    <h4>Specific Feedback:</h4>
                    ${this.generateSpecificFeedback()}
                </div>
                
                <div style="text-align: center; margin-top: 2rem;">
                    <button class="btn" onclick="checker.exportReport()">📄 Export Report</button>
                    <button class="btn" onclick="checker.shareReport()" style="margin-left: 1rem;">🔗 Share Report</button>
                </div>
            </div>
        `;
    }

    generateSpecificFeedback() {
        const scores = this.currentCheck.reviewData.scores;
        const feedback = [];
        
        if (scores.accuracy < 70) {
            feedback.push('• Consider reviewing theological accuracy - some validation questions indicate potential issues');
        }
        if (scores.cultural < 70) {
            feedback.push('• Cultural adaptation needs improvement - consider how concepts translate to local culture');
        }
        if (scores.theological < 70) {
            feedback.push('• Key theological terms may need better handling - ensure consistency and accuracy');
        }
        if (scores.naturalness < 70) {
            feedback.push('• Expression could be more natural in the heart language - consider meaning-based approach');
        }
        
        if (feedback.length === 0) {
            feedback.push('• Excellent work! This translation meets high quality standards.');
        }
        
        return feedback.join('<br>');
    }

    attachEventListeners() {
        // Event listeners for real-time scoring updates
        document.getElementById('targetTranslation')?.addEventListener('input', () => {
            this.calculateScores();
        });
    }

    showLoading(message) {
        document.getElementById('checkingContent').innerHTML = `
            <div class="loading">
                <div style="text-align: center; padding: 3rem;">
                    <div style="font-size: 2rem; margin-bottom: 1rem;">📚</div>
                    <div>${message}</div>
                </div>
            </div>
        `;
    }

    showError(message) {
        document.getElementById('checkingContent').innerHTML = `
            <div class="error">❌ ${message}</div>
        `;
    }

    exportReport() {
        const reportContent = this.buildQualityReport();
        const blob = new Blob([reportContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `translation-check-${this.currentCheck.reference.replace(/\s+/g, '-')}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    saveProgress() {
        localStorage.setItem('translation-check-progress', JSON.stringify(this.currentCheck));
        alert('Progress saved successfully!');
    }
}

// Initialize the checker
const checker = new TranslationChecker();

// Global functions for the interface
function startChecking() {
    const reference = document.getElementById('referenceInput').value.trim();
    const heartLanguage = document.getElementById('heartLanguageInput').value.trim();
    
    if (!reference) {
        alert('Please enter a Scripture reference');
        return;
    }
    
    if (!heartLanguage) {
        alert('Please specify the heart language');
        return;
    }
    
    checker.startTranslationCheck(reference, heartLanguage, '');
}
```

---

## 🎯 Step 3: Advanced Checking Features

Add advanced validation capabilities:

```javascript
// Add to TranslationChecker class

async performAutomatedChecks(targetText) {
    const checks = {
        length: this.checkTextLength(targetText),
        complexity: this.checkReadingLevel(targetText),
        consistency: await this.checkTermConsistency(targetText),
        completeness: this.checkCompleteness(targetText)
    };
    
    return checks;
}

checkTextLength(targetText) {
    const sourceLength = this.currentCheck.resources.scripture.scripture?.text?.length || 0;
    const targetLength = targetText.length;
    const ratio = targetLength / sourceLength;
    
    return {
        score: ratio > 0.5 && ratio < 2.0 ? 100 : Math.max(0, 100 - Math.abs(ratio - 1) * 50),
        ratio,
        feedback: ratio < 0.5 ? 'Translation seems too short' : 
                 ratio > 2.0 ? 'Translation seems too long' : 'Length appropriate'
    };
}

checkReadingLevel(text) {
    // Simplified readability check
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const avgWordsPerSentence = words.length / sentences.length;
    
    let level = 'Unknown';
    let score = 50;
    
    if (avgWordsPerSentence < 10) {
        level = 'Simple';
        score = 90;
    } else if (avgWordsPerSentence < 20) {
        level = 'Moderate';  
        score = 75;
    } else {
        level = 'Complex';
        score = 40;
    }
    
    return { level, score, avgWordsPerSentence };
}

async checkTermConsistency(targetText) {
    const words = this.currentCheck.resources.words;
    const consistency = [];
    
    for (const word of words.slice(0, 3)) {
        const term = word.term || word.word;
        const occurrences = this.findTermOccurrences(targetText, term);
        consistency.push({
            term,
            occurrences,
            consistent: occurrences.length <= 1 || new Set(occurrences).size === 1
        });
    }
    
    const consistentTerms = consistency.filter(c => c.consistent).length;
    const score = consistency.length > 0 ? (consistentTerms / consistency.length) * 100 : 100;
    
    return { score, details: consistency };
}

findTermOccurrences(text, term) {
    // Simple term finding - could be enhanced with linguistic analysis
    const words = text.toLowerCase().split(/\s+/);
    const termWords = term.toLowerCase().split(/\s+/);
    const occurrences = [];
    
    for (let i = 0; i <= words.length - termWords.length; i++) {
        const match = words.slice(i, i + termWords.length).join(' ');
        if (match.includes(termWords[0])) {
            occurrences.push(match);
        }
    }
    
    return occurrences;
}

// Team collaboration features
createCollaborativeSession(reference, teamMembers) {
    return {
        sessionId: Date.now().toString(),
        reference,
        teamMembers,
        reviews: {},
        consensus: null,
        created: new Date().toISOString()
    };
}

submitTeamReview(sessionId, reviewerId, review) {
    const session = this.getCollaborativeSession(sessionId);
    session.reviews[reviewerId] = {
        ...review,
        timestamp: new Date().toISOString(),
        reviewer: reviewerId
    };
    
    this.calculateTeamConsensus(session);
    return session;
}

calculateTeamConsensus(session) {
    const reviews = Object.values(session.reviews);
    if (reviews.length === 0) return;
    
    const avgScores = {
        accuracy: 0,
        naturalness: 0, 
        cultural: 0,
        theological: 0
    };
    
    Object.keys(avgScores).forEach(category => {
        avgScores[category] = reviews.reduce((sum, review) => 
            sum + (review.scores[category] || 0), 0) / reviews.length;
    });
    
    session.consensus = {
        scores: avgScores,
        overall: Object.values(avgScores).reduce((sum, score) => sum + score, 0) / 4,
        agreement: this.calculateAgreementLevel(reviews),
        recommendation: this.getTeamRecommendation(avgScores)
    };
}

calculateAgreementLevel(reviews) {
    // Calculate how much reviewers agree
    const scores = reviews.map(r => r.scores.overall || 0);
    const variance = this.calculateVariance(scores);
    
    if (variance < 100) return 'High';
    if (variance < 400) return 'Moderate';
    return 'Low';
}

calculateVariance(numbers) {
    const mean = numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
    return numbers.reduce((sum, n) => sum + Math.pow(n - mean, 2), 0) / numbers.length;
}
```

---

## 🎉 Success! You've Built a Professional Translation Checker

**Your translation checking tool now provides:**

- ✅ **Comprehensive Quality Assessment**: Accuracy, naturalness, cultural fit, and theological precision
- ✅ **Validation Questions**: Systematic checking with expected answers
- ✅ **Key Term Analysis**: Theological term handling verification
- ✅ **Cultural Context Check**: Cultural appropriateness evaluation
- ✅ **Automated Scoring**: Objective quality metrics with recommendations
- ✅ **Team Collaboration**: Multi-reviewer workflow support
- ✅ **Detailed Reporting**: Professional quality reports for documentation

---

## 🚀 Advanced Features to Add

### Integration with Translation Memory
```javascript
class TranslationMemoryChecker {
    async checkAgainstMemory(sourceText, targetText) {
        const similarTranslations = await this.findSimilarTranslations(sourceText);
        return this.compareTranslations(targetText, similarTranslations);
    }
}
```

### AI-Powered Suggestions
```javascript
async getAISuggestions(targetText, issues) {
    const prompt = `Suggest improvements for this translation: ${targetText}\nIssues: ${issues.join(', ')}`;
    return await this.aiClient.generateSuggestions(prompt);
}
```

### Mobile Offline Checking
```javascript
class OfflineChecker {
    async syncForOffline(references) {
        for (const ref of references) {
            await this.cacheTranslationResources(ref);
        }
    }
}
```

---

## 📚 What's Next?

**Your translation checking tool is ready for professional use!**

Consider these enhancements:

1. **[Mobile Offline Support](mobile-offline.md)** - Enable checking without internet
2. **AI Assistant Integration** - Add intelligent suggestions and analysis
3. **Team Workflow Management** - Build approval and revision tracking
4. **Quality Analytics** - Track improvement over time

---

**Questions?** Check our [Complete API Documentation](../api/interactive-docs.html) or [Community Support](https://github.com/unfoldingword/translation-helps-mcp/discussions)
