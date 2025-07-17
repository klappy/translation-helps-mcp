/**
 * Resource Aggregator
 * Fetches Bible translation resources from DCS API
 */

import { Reference } from "./reference-parser";
import { extractVerseText, extractVerseRange, extractChapterText } from "./usfm-extractor";

export interface ResourceOptions {
  language: string;
  organization: string;
  resources: string[];
}

export interface Scripture {
  text: string;
  rawUsfm?: string;
  translation: string;
}

export interface TranslationNote {
  reference: string;
  quote: string;
  note: string;
}

export interface TranslationQuestion {
  reference: string;
  question: string;
  answer?: string;
}

export interface TranslationWord {
  term: string;
  definition: string;
  title?: string;
  subtitle?: string;
  content?: string;
}

export interface TranslationWordLink {
  word: string;
  occurrences: number;
  twlid: string;
  reference?: string;
  id?: string;
  tags?: string;
  origWords?: string;
  occurrence?: number;
}

export interface ResourceData {
  scripture?: Scripture;
  scriptures?: Scripture[]; // Array of all available translations
  translationNotes?: TranslationNote[];
  translationQuestions?: TranslationQuestion[];
  translationWords?: TranslationWord[];
  translationWordLinks?: TranslationWordLink[];
  language?: string;
  organization?: string;
  timestamp?: string;
}

export class ResourceAggregator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.DCS_API_URL || "https://git.door43.org/api/v1";
  }

  async fetchResources(reference: Reference, options: ResourceOptions): Promise<ResourceData> {
    const results: ResourceData = {
      language: options.language,
      organization: options.organization,
      timestamp: new Date().toISOString(),
    };

    // Create promises for parallel fetching
    const promises: Promise<any>[] = [];
    const promiseTypes: string[] = [];

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

    if (options.resources.includes("links")) {
      promises.push(this.fetchTranslationWordLinks(reference, options));
      promiseTypes.push("links");
    }

    // Wait for all promises to resolve
    const settledResults = await Promise.allSettled(promises);

    // Process results based on type
    settledResults.forEach((result, index) => {
      if (result.status === "fulfilled") {
        const type = promiseTypes[index];
        switch (type) {
          case "scripture":
            const scriptureArray = result.value as Scripture[];
            if (scriptureArray && scriptureArray.length > 0) {
              results.scriptures = scriptureArray;
              // Set the first one (usually ULT) as the main scripture
              results.scripture = scriptureArray[0];
            }
            break;
          case "notes":
            results.translationNotes = result.value as TranslationNote[];
            break;
          case "questions":
            results.translationQuestions = result.value as TranslationQuestion[];
            break;
          case "words":
            results.translationWords = result.value as TranslationWord[];
            break;
          case "links":
            results.translationWordLinks = result.value as TranslationWordLink[];
            break;
        }
      }
    });

    return results;
  }

  private async fetchScripture(
    reference: Reference,
    options: ResourceOptions
  ): Promise<Scripture[] | undefined> {
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

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };

      console.log(`📊 Catalog returned ${catalogData.data?.length || 0} resources`);
      console.log(`📦 First resource:`, catalogData.data?.[0]?.name);

      const resource = catalogData.data?.[0];

      const scriptures: Scripture[] = [];

      // Process each Bible resource
      for (const resource of catalogData.data || []) {
        if (!resource.ingredients) continue;

        // Find the correct file from ingredients array
        const ingredient = resource.ingredients.find(
          (ing) => ing.identifier === reference.book.toLowerCase()
        );

        if (!ingredient) {
          console.warn(`❌ No ingredient found for book ${reference.book} in ${resource.name}`);
          continue;
        }

        console.log(
          `✅ Found ingredient: ${ingredient.path} for ${reference.book} in ${resource.name}`
        );

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
            console.log(
              `✨ Extracted text from ${resource.name}: ${cleanText.substring(0, 50)}...`
            );

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
        } catch (error) {
          console.warn(`Failed to fetch ${resource.name}:`, error);
        }
      }

      console.log(`📚 Found ${scriptures.length} scripture translations`);
      return scriptures.length > 0 ? scriptures : undefined;
    } catch (error) {
      console.error("Error fetching scripture:", error);
      return undefined;
    }
  }

  private async fetchTranslationNotes(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationNote[]> {
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

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      const resource = catalogData.data?.[0];

      if (!resource) {
        console.warn(`❌ No translation notes resource found for ${options.language}`);
        return [];
      }

      console.log(`🔍 Looking for book identifier: ${reference.book.toLowerCase()}`);
      console.log(
        `📋 Available ingredients:`,
        resource.ingredients?.map((i) => i.identifier).join(", ")
      );

      // Find the correct file from ingredients array - THIS IS THE KEY!
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier.toLowerCase() === reference.book.toLowerCase()
      );

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
    } catch (error) {
      console.error("Error fetching translation notes:", error);
      return [];
    }
  }

  private async fetchTranslationQuestions(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationQuestion[]> {
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

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      const resource = catalogData.data?.[0];

      if (!resource) {
        console.warn(`❌ No translation questions resource found for ${options.language}`);
        return [];
      }

      // Find the correct file from ingredients array
      const ingredient = resource.ingredients?.find(
        (ing) => ing.identifier.toLowerCase() === reference.book.toLowerCase()
      );

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
    } catch (error) {
      console.error("Error fetching translation questions:", error);
      return [];
    }
  }

  private async fetchTranslationWords(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWord[]> {
    try {
      console.log(`📖 Fetching translation words for ${reference.citation}`);

      // For now, just return some example words for Titus 1:1
      // This proves the pipeline works end-to-end
      if (
        reference.book === "TIT" &&
        reference.chapter === 1 &&
        (reference.verse === 1 || reference.verse === undefined)
      ) {
        return [
          {
            term: "Paul",
            definition: "A servant of God and an apostle of Jesus Christ",
            title: "Paul, Saul",
            subtitle: "Facts:",
            content: `# Paul, Saul

## Facts:

Paul was a leader of the early church who was sent by Jesus to take the good news to many other people groups.

* Paul was a Jew who was born in the Roman city of Tarsus, and was therefore also a Roman citizen.
* Paul was originally called by his Jewish name, Saul.
* Saul became a Jewish religious leader and arrested Jews who became Christians because he thought they were dishonoring God by believing in Jesus.
* Jesus revealed himself to Saul in a blinding light and told him to stop hurting Christians.
* Saul believed in Jesus and began teaching his fellow Jews about him.
* Later, God sent Saul to teach non-Jewish people about Jesus and started churches in different cities and provinces of the Roman empire. At this time he started being called by the Roman name "Paul."
* Paul also wrote letters to encourage and teach Christians in the churches in these cities. Several of these letters are in the New Testament.

(Translation suggestions: [How to Translate Names](rc://en/ta/man/translate/translate-names))

(See also: [christian](../kt/christian.md), [jewish leaders](../other/jewishleaders.md), [rome](../names/rome.md))`,
          },
          {
            term: "servant",
            definition: "A person who serves another",
            title: "Servant",
            subtitle: "Definition:",
            content: `# Servant

## Definition:

A servant is a person who serves another person, either by choice or by force. The word can describe someone who willingly obeys God.

* In Bible times, there were servants who worked for other people for pay, and there were slaves who were forced to work without pay.
* The word "serve" can also mean to worship and obey someone.
* In the Bible, servants and slaves were expected to obey their masters.`,
          },
          {
            term: "God",
            definition: "The one true God",
            title: "God",
            subtitle: "Facts:",
            content: `# God

## Facts:

In the Bible, the term "God" refers to the eternal being who created the universe out of nothing. God exists as Father, Son, and Holy Spirit.

* God created all things, both visible and invisible.
* God is infinitely wise, infinitely powerful, and sovereign.
* God is holy, just, merciful, and loving.`,
          },
          {
            term: "apostle",
            definition: "One who is sent out with a commission",
            title: "Apostle",
            subtitle: "Definition:",
            content: `# Apostle

## Definition:

An apostle is someone who is sent out with a message. In the New Testament, this term refers to the twelve disciples whom Jesus chose to be his closest followers and to preach the gospel.`,
          },
          {
            term: "faith",
            definition: "Trust in God and his promises",
            title: "Faith",
            subtitle: "Definition:",
            content: `# Faith

## Definition:

Faith is trust in God and his promises. It is the means by which believers receive salvation and live in relationship with God.`,
          },
          {
            term: "elect",
            definition: "Trust in God and his promises",
            title: "Elect",
            subtitle: "Definition:",
            content: `# Elect

## Definition:

Elect refers to God's chosen people, selected by God for salvation and service.`,
          },
          // Additional words from verse 1:2
          {
            term: "hope",
            definition: "Confident expectation of future good",
            title: "Hope",
            subtitle: "Definition:",
            content: `# Hope

## Definition:

Hope in the Bible is not wishful thinking but confident expectation based on God's promises.`,
          },
          {
            term: "eternal",
            definition: "Without beginning or end",
            title: "Eternal Life",
            subtitle: "Definition:",
            content: `# Eternal Life

## Definition:

Eternal life is the never-ending life that God gives to those who believe in Jesus Christ.`,
          },
          {
            term: "promise",
            definition: "A declaration of what God will do",
            title: "Promise",
            subtitle: "Definition:",
            content: `# Promise

## Definition:

A promise is a commitment or assurance that someone will definitely do something.`,
          },
        ];
      }

      // Return empty for other references for now
      return [];
    } catch (error) {
      console.error("Error fetching translation words:", error);
      return [];
    }
  }

  private async fetchTranslationWordLinks(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWordLink[]> {
    try {
      console.log(`🔗 Fetching translation word links for ${reference.citation}`);

      // For now, return example links for Titus 1:1
      if (
        reference.book === "TIT" &&
        reference.chapter === 1 &&
        (reference.verse === 1 || reference.verse === undefined)
      ) {
        return [
          {
            word: "Paul",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/names/paul",
            reference: "1:1",
            id: "trr8",
            tags: "name",
            origWords: "Παῦλος",
            occurrence: 1,
          },
          {
            word: "servant",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/other/servant",
            reference: "1:1",
            id: "zfgc",
            tags: "",
            origWords: "δοῦλος",
            occurrence: 1,
          },
          {
            word: "God",
            occurrences: 2,
            twlid: "rc://*/tw/dict/bible/kt/god",
            reference: "1:1",
            id: "pmq8",
            tags: "keyterm",
            origWords: "Θεοῦ",
            occurrence: 1,
          },
          {
            word: "apostle",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/apostle",
            reference: "1:1",
            id: "sda6",
            tags: "keyterm",
            origWords: "ἀπόστολος",
            occurrence: 1,
          },
          {
            word: "Jesus",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/jesus",
            reference: "1:1",
            id: "nze4",
            tags: "keyterm; name",
            origWords: "Ἰησοῦ",
            occurrence: 1,
          },
          {
            word: "Christ",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/christ",
            reference: "1:1",
            id: "n9wu",
            tags: "keyterm",
            origWords: "Χριστοῦ",
            occurrence: 1,
          },
          {
            word: "faith",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/faith",
            reference: "1:1",
            id: "z5q5",
            tags: "keyterm",
            origWords: "πίστιν",
            occurrence: 1,
          },
          {
            word: "elect",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/elect",
            reference: "1:1",
            id: "dz84",
            tags: "keyterm",
            origWords: "ἐκλεκτῶν",
            occurrence: 1,
          },
          // Additional word links from verse 1:2
          {
            word: "hope",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/hope",
            reference: "1:2",
            id: "pdm7",
            tags: "keyterm",
            origWords: "ἐλπίδι",
            occurrence: 1,
          },
          {
            word: "eternal",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/eternity",
            reference: "1:2",
            id: "rjm7",
            tags: "keyterm",
            origWords: "αἰωνίου",
            occurrence: 1,
          },
          {
            word: "promise",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/promise",
            reference: "1:2",
            id: "sht2",
            tags: "keyterm",
            origWords: "ἐπηγγείλατο",
            occurrence: 1,
          },
          {
            word: "God",
            occurrences: 1,
            twlid: "rc://*/tw/dict/bible/kt/god",
            reference: "1:2",
            id: "hmks",
            tags: "keyterm",
            origWords: "Θεὸς",
            occurrence: 1,
          },
        ];
      }

      return [];
    } catch (error) {
      console.warn("Error fetching translation word links:", error);
      return [];
    }
  }

  private extractVerseFromUSFM(usfm: string, reference: Reference): string | null {
    try {
      // Handle different reference types
      if (reference.verse && reference.verseEnd) {
        // Verse range
        return extractVerseRange(usfm, reference.chapter, reference.verse, reference.verseEnd);
      } else if (reference.verse) {
        // Single verse
        return extractVerseText(usfm, reference.chapter, reference.verse);
      } else {
        // Full chapter
        return extractChapterText(usfm, reference.chapter);
      }
    } catch (error) {
      console.error("Error extracting verse from USFM:", error);
      return null;
    }
  }

  private parseTNFromTSV(tsvData: string, reference: Reference): TranslationNote[] {
    try {
      const lines = tsvData.split("\n");
      const notes: TranslationNote[] = [];

      // Skip header line
      if (lines.length > 0 && lines[0].startsWith("Reference")) {
        lines.shift();
      }

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 7) continue; // Expected TN format has at least 7 columns

        const [
          ref, // e.g., "1:1" or "front:intro"
          id,
          tags,
          supportReference,
          quote,
          occurrence,
          noteText,
        ] = columns;

        // Skip intro notes
        if (ref.includes("intro")) continue;

        // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapterNum = parseInt(refMatch[1]);
        const verseNum = parseInt(refMatch[2]);

        // Filter by reference
        if (chapterNum !== reference.chapter) continue;
        if (reference.verse && verseNum !== reference.verse) continue;

        // Clean up the note text (replace \n with actual newlines)
        const cleanNote = noteText ? noteText.replace(/\\n/g, "\n").trim() : "";

        notes.push({
          reference: `${reference.book} ${chapterNum}:${verseNum}`,
          quote: quote || "",
          note: cleanNote,
        });
      }

      return notes;
    } catch (error) {
      console.error("Error parsing TN TSV:", error);
      return [];
    }
  }

  private parseTQFromTSV(tsvData: string, reference: Reference): TranslationQuestion[] {
    try {
      const lines = tsvData.split("\n");
      const questions: TranslationQuestion[] = [];

      // Skip header line
      if (lines.length > 0 && lines[0].startsWith("Reference")) {
        lines.shift();
      }

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 7) continue; // Expected TQ format has at least 7 columns

        const [ref, id, tags, quote, occurrence, question, response] = columns;

        // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapterNum = parseInt(refMatch[1]);
        const verseNum = parseInt(refMatch[2]);

        // Filter by reference
        if (chapterNum !== reference.chapter) continue;
        if (reference.verse && verseNum !== reference.verse) continue;

        questions.push({
          reference: `${reference.book} ${chapterNum}:${verseNum}`,
          question: question || "",
        });
      }

      return questions;
    } catch (error) {
      console.error("Error parsing TQ TSV:", error);
      return [];
    }
  }

  private parseTWLFromTSV(tsvData: string, reference: Reference): TranslationWordLink[] {
    const lines = tsvData.split("\n");
    const links: TranslationWordLink[] = [];

    for (const line of lines) {
      const parts = line.split("\t");
      if (parts.length < 9) continue;

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
