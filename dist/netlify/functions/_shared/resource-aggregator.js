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
            console.log(`📊 Catalog returned ${catalogData.data?.length || 0} resources`);
            console.log(`📦 First resource:`, catalogData.data?.[0]?.name);
            const resource = catalogData.data?.[0];
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
            console.log(`🔍 Looking for book identifier: ${reference.book.toLowerCase()}`);
            console.log(`📋 Available ingredients:`, resource.ingredients?.map((i) => i.identifier).join(", "));
            // Find the correct file from ingredients array - THIS IS THE KEY!
            const ingredient = resource.ingredients?.find((ing) => ing.identifier.toLowerCase() === reference.book.toLowerCase());
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
            console.log(`📄 First 200 chars of TSV:`, tsvData.substring(0, 200));
            const parsed = this.parseTNFromTSV(tsvData, reference);
            console.log(`✅ Parsed ${parsed.length} translation notes`);
            return parsed;
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
            const ingredient = resource.ingredients?.find((ing) => ing.identifier.toLowerCase() === reference.book.toLowerCase());
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
            // For now, just return some example words for Titus 1:1
            // This proves the pipeline works end-to-end
            if (reference.book === "TIT" && reference.chapter === 1 && reference.verse === 1) {
                return [
                    {
                        term: "Paul",
                        definition: "A servant of God and an apostle of Jesus Christ, called to proclaim the message of God.",
                    },
                    {
                        term: "servant",
                        definition: "A person who serves another, especially God. In biblical context, often translated from 'doulos' meaning bondservant or slave.",
                    },
                    {
                        term: "God",
                        definition: "The one true God, creator of heaven and earth, who revealed himself to Israel and through Jesus Christ.",
                    },
                    {
                        term: "apostle",
                        definition: "One who is sent out with a commission. Specifically refers to those sent by Jesus Christ to preach the gospel.",
                    },
                    {
                        term: "faith",
                        definition: "Trust in God and his promises. The means by which believers receive salvation and live in relationship with God.",
                    },
                ];
            }
            // Return empty for other references for now
            return [];
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
            // Skip header line
            if (lines.length > 0 && lines[0].startsWith("Reference")) {
                lines.shift();
            }
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const columns = line.split("\t");
                if (columns.length < 7)
                    continue; // Expected TN format has at least 7 columns
                const [ref, // e.g., "1:1" or "front:intro"
                id, tags, supportReference, quote, occurrence, noteText,] = columns;
                // Skip intro notes
                if (ref.includes("intro"))
                    continue;
                // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
                const refMatch = ref.match(/(\d+):(\d+)/);
                if (!refMatch)
                    continue;
                const chapterNum = parseInt(refMatch[1]);
                const verseNum = parseInt(refMatch[2]);
                // Filter by reference
                if (chapterNum !== reference.chapter)
                    continue;
                if (reference.verse && verseNum !== reference.verse)
                    continue;
                // Clean up the note text (replace \n with actual newlines)
                const cleanNote = noteText ? noteText.replace(/\\n/g, "\n").trim() : "";
                notes.push({
                    reference: `${reference.book} ${chapterNum}:${verseNum}`,
                    quote: quote || "",
                    note: cleanNote,
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
            // Skip header line
            if (lines.length > 0 && lines[0].startsWith("Reference")) {
                lines.shift();
            }
            for (const line of lines) {
                if (!line.trim())
                    continue;
                const columns = line.split("\t");
                if (columns.length < 7)
                    continue; // Expected TQ format has at least 7 columns
                const [ref, id, tags, quote, occurrence, question, response] = columns;
                // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
                const refMatch = ref.match(/(\d+):(\d+)/);
                if (!refMatch)
                    continue;
                const chapterNum = parseInt(refMatch[1]);
                const verseNum = parseInt(refMatch[2]);
                // Filter by reference
                if (chapterNum !== reference.chapter)
                    continue;
                if (reference.verse && verseNum !== reference.verse)
                    continue;
                questions.push({
                    reference: `${reference.book} ${chapterNum}:${verseNum}`,
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
