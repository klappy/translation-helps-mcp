/**
 * Resource Aggregator
 * Fetches Bible translation resources from DCS API
 */
import { extractVerseText, extractVerseRange, extractChapterText } from "./usfm-extractor";
export class ResourceAggregator {
    baseUrl;
    constructor() {
        this.baseUrl = process.env.DCS_API_URL || "https://git.door43.org/api/v1";
    }
    async fetchResources(reference, options) {
        const results = {
            language: options.language,
            organization: options.organization,
            timestamp: new Date().toISOString(),
        };
        // Create promises for parallel fetching
        const promises = [];
        const promiseTypes = [];
        if (options.resources.includes("scripture")) {
            promises.push(this.fetchScripture(reference, options));
            promiseTypes.push("scripture");
        }
        if (options.resources.includes("notes")) {
            promises.push(this.fetchTranslationNotes(reference, options));
            promiseTypes.push("notes");
        }
        if (options.resources.includes("questions")) {
            promises.push(this.fetchTranslationQuestions(reference, options));
            promiseTypes.push("questions");
        }
        if (options.resources.includes("words")) {
            promises.push(this.fetchTranslationWords(reference, options));
            promiseTypes.push("words");
        }
        // Wait for all promises to resolve
        const settledResults = await Promise.allSettled(promises);
        // Process results based on type
        settledResults.forEach((result, index) => {
            if (result.status === "fulfilled") {
                const type = promiseTypes[index];
                switch (type) {
                    case "scripture":
                        const scriptureArray = result.value;
                        if (scriptureArray && scriptureArray.length > 0) {
                            results.scriptures = scriptureArray;
                            // Set the first one (usually ULT) as the main scripture
                            results.scripture = scriptureArray[0];
                        }
                        break;
                    case "notes":
                        results.translationNotes = result.value;
                        break;
                    case "questions":
                        results.translationQuestions = result.value;
                        break;
                    case "words":
                        results.translationWords = result.value;
                        break;
                }
            }
        });
        return results;
    }
    async fetchScripture(reference, options) {
        try {
            console.log(`📖 Fetching scripture for ${reference.citation}`);
            // Search catalog for Bible resources
            const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Bible,Aligned%20Bible&lang=${options.language}&owner=${options.organization}&type=text`;
            console.log(`🔍 Searching catalog: ${catalogUrl}`);
            const catalogResponse = await fetch(catalogUrl);
            if (!catalogResponse.ok) {
                console.warn(`❌ Catalog search failed for Bible resources`);
                return undefined;
            }
            const catalogData = (await catalogResponse.json());
            const scriptures = [];
            // Process each Bible resource
            for (const resource of catalogData.data || []) {
                if (!resource.ingredients)
                    continue;
                // Find the correct file from ingredients array
                const ingredient = resource.ingredients.find((ing) => ing.identifier === reference.book.toLowerCase());
                if (!ingredient) {
                    console.warn(`❌ No ingredient found for book ${reference.book} in ${resource.name}`);
                    continue;
                }
                console.log(`✅ Found ingredient: ${ingredient.path} for ${reference.book} in ${resource.name}`);
                // Build the URL using the ingredient path
                const fileName = ingredient.path.replace("./", "");
                const url = `${this.baseUrl}/repos/${options.organization}/${resource.name}/raw/${fileName}`;
                console.log(`📥 Fetching scripture from: ${url}`);
                try {
                    const response = await fetch(url);
                    if (!response.ok) {
                        console.warn(`❌ Failed to fetch scripture: ${response.status}`);
                        continue;
                    }
                    const usfm = await response.text();
                    console.log(`📜 Got USFM text (${usfm.length} chars) from ${resource.name}`);
                    const cleanText = this.extractVerseFromUSFM(usfm, reference);
                    if (cleanText) {
                        console.log(`✨ Extracted text from ${resource.name}: ${cleanText.substring(0, 50)}...`);
                        // Extract translation abbreviation from resource name (e.g., en_ult -> ULT)
                        const translationMatch = resource.name.match(/_([^_]+)$/);
                        const translation = translationMatch
                            ? translationMatch[1].toUpperCase()
                            : resource.name;
                        scriptures.push({
                            text: cleanText,
                            translation: translation,
                        });
                    }
                }
                catch (error) {
                    console.warn(`Failed to fetch ${resource.name}:`, error);
                }
            }
            console.log(`📚 Found ${scriptures.length} scripture translations`);
            return scriptures.length > 0 ? scriptures : undefined;
        }
        catch (error) {
            console.error("Error fetching scripture:", error);
            return undefined;
        }
    }
    async fetchTranslationNotes(reference, options) {
        try {
            console.log(`📚 Fetching translation notes for ${reference.citation}`);
            // Search catalog for Translation Notes
            const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Notes&lang=${options.language}&owner=${options.organization}`;
            console.log(`🔍 Searching catalog: ${catalogUrl}`);
            const catalogResponse = await fetch(catalogUrl);
            if (!catalogResponse.ok) {
                console.warn(`❌ Catalog search failed for translation notes`);
                return [];
            }
            const catalogData = (await catalogResponse.json());
            const resource = catalogData.data?.[0];
            if (!resource) {
                console.warn(`❌ No translation notes resource found for ${options.language}`);
                return [];
            }
            // Find the correct file from ingredients array - THIS IS THE KEY!
            const ingredient = resource.ingredients?.find((ing) => ing.identifier === reference.book.toLowerCase());
            if (!ingredient) {
                console.warn(`❌ No ingredient found for book ${reference.book}`);
                return [];
            }
            console.log(`✅ Found ingredient: ${ingredient.path} for ${reference.book}`);
            // Build the URL using the ingredient path
            const fileName = ingredient.path.replace("./", "");
            const url = `${this.baseUrl}/repos/${options.organization}/${resource.name}/raw/${fileName}`;
            console.log(`📥 Fetching notes from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`❌ Failed to fetch notes: ${response.status}`);
                return [];
            }
            const tsvData = await response.text();
            console.log(`📝 Got TSV data (${tsvData.length} chars)`);
            return this.parseTNFromTSV(tsvData, reference);
        }
        catch (error) {
            console.error("Error fetching translation notes:", error);
            return [];
        }
    }
    async fetchTranslationQuestions(reference, options) {
        try {
            console.log(`❓ Fetching translation questions for ${reference.citation}`);
            // Search catalog for Translation Questions
            const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=${options.language}&owner=${options.organization}`;
            console.log(`🔍 Searching catalog: ${catalogUrl}`);
            const catalogResponse = await fetch(catalogUrl);
            if (!catalogResponse.ok) {
                console.warn(`❌ Catalog search failed for translation questions`);
                return [];
            }
            const catalogData = (await catalogResponse.json());
            const resource = catalogData.data?.[0];
            if (!resource) {
                console.warn(`❌ No translation questions resource found for ${options.language}`);
                return [];
            }
            // Find the correct file from ingredients array
            const ingredient = resource.ingredients?.find((ing) => ing.identifier === reference.book.toLowerCase());
            if (!ingredient) {
                console.warn(`❌ No ingredient found for book ${reference.book}`);
                return [];
            }
            console.log(`✅ Found ingredient: ${ingredient.path} for ${reference.book}`);
            // Build the URL using the ingredient path
            const fileName = ingredient.path.replace("./", "");
            const url = `${this.baseUrl}/repos/${options.organization}/${resource.name}/raw/${fileName}`;
            console.log(`📥 Fetching questions from: ${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`❌ Failed to fetch questions: ${response.status}`);
                return [];
            }
            const tsvData = await response.text();
            console.log(`❓ Got TSV data (${tsvData.length} chars)`);
            return this.parseTQFromTSV(tsvData, reference);
        }
        catch (error) {
            console.error("Error fetching translation questions:", error);
            return [];
        }
    }
    async fetchTranslationWords(reference, options) {
        try {
            console.log(`📖 Fetching translation words for ${reference.citation}`);
            // First, get the Translation Words Links to find which words are in this verse
            const twlCatalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Words%20Links&lang=${options.language}&owner=${options.organization}`;
            console.log(`🔍 Searching catalog for TWL: ${twlCatalogUrl}`);
            const twlCatalogResponse = await fetch(twlCatalogUrl);
            if (!twlCatalogResponse.ok) {
                console.warn(`❌ Catalog search failed for translation word links`);
                return [];
            }
            const twlCatalogData = (await twlCatalogResponse.json());
            const twlResource = twlCatalogData.data?.[0];
            if (!twlResource) {
                console.warn(`❌ No translation word links resource found for ${options.language}`);
                return [];
            }
            // Find the correct TWL file from ingredients array
            const twlIngredient = twlResource.ingredients?.find((ing) => ing.identifier === reference.book.toLowerCase());
            if (!twlIngredient) {
                console.warn(`❌ No TWL ingredient found for book ${reference.book}`);
                return [];
            }
            console.log(`✅ Found TWL ingredient: ${twlIngredient.path} for ${reference.book}`);
            // Fetch the TWL file
            const twlFileName = twlIngredient.path.replace("./", "");
            const twlUrl = `${this.baseUrl}/repos/${options.organization}/${twlResource.name}/raw/${twlFileName}`;
            console.log(`📥 Fetching word links from: ${twlUrl}`);
            const twResponse = await fetch(twlUrl);
            if (!twResponse.ok) {
                console.warn(`❌ Failed to fetch word links: ${twResponse.status}`);
                return [];
            }
            const twData = await twResponse.text();
            console.log(`🔗 Got TWL data (${twData.length} chars)`);
            // Parse TWL data to get word links for this reference
            const wordLinks = this.parseTWLFromTSV(twData, reference);
            // Now fetch the actual Translation Words resource
            const twCatalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=Translation%20Words&lang=${options.language}&owner=${options.organization}`;
            const twCatalogResponse = await fetch(twCatalogUrl);
            if (!twCatalogResponse.ok) {
                console.warn(`❌ Catalog search failed for translation words`);
                // Convert word links to basic translation words
                return wordLinks.map((link) => ({
                    term: link.word,
                    definition: `Translation word: ${link.word}`,
                }));
            }
            const twCatalogData = (await twCatalogResponse.json());
            const twResourceData = twCatalogData.data?.[0];
            if (!twResourceData) {
                console.warn(`❌ No translation words resource found`);
                // Convert word links to basic translation words
                return wordLinks.map((link) => ({
                    term: link.word,
                    definition: `Translation word: ${link.word}`,
                }));
            }
            // For each word link, fetch the actual word content
            const words = [];
            for (const link of wordLinks) {
                try {
                    const wordId = link.twlid?.split("/").pop()?.replace(".md", "") || link.word;
                    const wordUrl = `${this.baseUrl}/repos/${options.organization}/${twResourceData.name}/raw/bible/kt/${wordId}.md`;
                    const wordResponse = await fetch(wordUrl);
                    if (wordResponse.ok) {
                        const content = await wordResponse.text();
                        words.push({
                            term: link.word,
                            definition: content.split("\n")[0] || content, // First line as definition
                            content,
                        });
                    }
                    else {
                        // Try other paths (other/ folder)
                        const otherUrl = `${this.baseUrl}/repos/${options.organization}/${twResourceData.name}/raw/bible/other/${wordId}.md`;
                        const otherResponse = await fetch(otherUrl);
                        if (otherResponse.ok) {
                            const content = await otherResponse.text();
                            words.push({
                                term: link.word,
                                definition: content.split("\n")[0] || content, // First line as definition
                                content,
                            });
                        }
                        else {
                            // Just create a basic word entry without content
                            words.push({
                                term: link.word,
                                definition: `Translation word: ${link.word}`,
                            });
                        }
                    }
                }
                catch (error) {
                    console.warn(`Failed to fetch word content for ${link.word}:`, error);
                    words.push({
                        term: link.word,
                        definition: `Translation word: ${link.word}`,
                    });
                }
            }
            console.log(`📚 Found ${words.length} translation words`);
            return words;
        }
        catch (error) {
            console.error("Error fetching translation words:", error);
            return [];
        }
    }
    async fetchTranslationWordLinks(reference, options) {
        try {
            const url = `${this.baseUrl}/repos/${options.organization}/${options.language}_twl/raw/twl_${reference.book}.tsv`;
            const response = await fetch(url);
            if (!response.ok)
                return [];
            const tsvData = await response.text();
            return this.parseTWLFromTSV(tsvData, reference);
        }
        catch (error) {
            console.warn("Error fetching translation word links:", error);
            return [];
        }
    }
    extractVerseFromUSFM(usfm, reference) {
        try {
            // Handle different reference types
            if (reference.verse && reference.verseEnd) {
                // Verse range
                return extractVerseRange(usfm, reference.chapter, reference.verse, reference.verseEnd);
            }
            else if (reference.verse) {
                // Single verse
                return extractVerseText(usfm, reference.chapter, reference.verse);
            }
            else {
                // Full chapter
                return extractChapterText(usfm, reference.chapter);
            }
        }
        catch (error) {
            console.error("Error extracting verse from USFM:", error);
            return null;
        }
    }
    parseTNFromTSV(tsvData, reference) {
        try {
            const lines = tsvData.split("\n");
            const notes = [];
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const columns = line.split("\t");
                if (columns.length < 9)
                    continue; // Expected TN format
                const [book, chapter, verse, id, supportReference, originalQuote, occurrence, glQuote, tnText,] = columns;
                // Filter by reference
                if (book !== reference.book)
                    continue;
                if (parseInt(chapter) !== reference.chapter)
                    continue;
                if (reference.verse && parseInt(verse) !== reference.verse)
                    continue;
                notes.push({
                    reference: `${book} ${chapter}:${verse}`,
                    quote: originalQuote || glQuote || "",
                    note: tnText || "",
                });
            }
            return notes;
        }
        catch (error) {
            console.error("Error parsing TN TSV:", error);
            return [];
        }
    }
    parseTQFromTSV(tsvData, reference) {
        try {
            const lines = tsvData.split("\n");
            const questions = [];
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const columns = line.split("\t");
                if (columns.length < 5)
                    continue; // Expected TQ format
                const [book, chapter, verse, id, question] = columns;
                // Filter by reference
                if (book !== reference.book)
                    continue;
                if (parseInt(chapter) !== reference.chapter)
                    continue;
                if (reference.verse && parseInt(verse) !== reference.verse)
                    continue;
                questions.push({
                    reference: `${book} ${chapter}:${verse}`,
                    question: question || "",
                });
            }
            return questions;
        }
        catch (error) {
            console.error("Error parsing TQ TSV:", error);
            return [];
        }
    }
    parseTWLFromTSV(tsvData, reference) {
        const lines = tsvData.split("\n");
        const links = [];
        for (const line of lines) {
            const parts = line.split("\t");
            if (parts.length < 9)
                continue;
            const [chapterStr, verseStr, , , , twlid] = parts;
            const chapter = parseInt(chapterStr);
            const verse = parseInt(verseStr);
            if (chapter === reference.chapter && verse === reference.verse) {
                // Parse the TWL ID to get the word
                const word = twlid?.split("/").pop()?.replace(".md", "") || twlid || "";
                links.push({
                    word,
                    occurrences: 1,
                    twlid,
                });
            }
        }
        return links;
    }
}
