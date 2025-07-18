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
  titleContent?: string;
  subtitleContent?: string;
  mainContent?: string;
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
    console.log(`🚀 fetchResources called with:`, {
      reference: {
        book: reference.book,
        chapter: reference.chapter,
        verse: reference.verse,
        verseEnd: reference.verseEnd,
        citation: reference.citation,
        original: reference.original,
      },
      options,
    });

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
      console.log(`📝 Fetching translation notes for ${reference.citation}`);

      // Search catalog for Translation Notes using proper endpoint
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Notes&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        console.warn(`❌ Catalog search failed for translation notes: ${catalogResponse.status}`);
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          title: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      console.log(`📋 Found ${catalogData.data?.length || 0} translation notes resources`);

      if (!catalogData.data || catalogData.data.length === 0) {
        console.warn("❌ No translation notes resources found");
        return [];
      }

      // Get the first available TN resource
      const resource = catalogData.data[0];
      console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

      // CRITICAL: Use ingredients array to find the correct file path
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier === reference.book.toLowerCase()
      );

      if (!ingredient) {
        console.warn(
          `❌ No ingredient found for book ${reference.book} in resource ${resource.name}`
        );
        return [];
      }

      console.log(`📁 Found ingredient path: ${ingredient.path}`);

      // Build URL using the proper pattern from docs
      const fileUrl = `https://git.door43.org/${options.organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
      console.log(`🔗 Fetching from: ${fileUrl}`);

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        console.warn(`❌ Failed to fetch TN file: ${fileResponse.status}`);
        return [];
      }

      const tsvData = await fileResponse.text();
      console.log(`📄 Downloaded ${tsvData.length} characters of TSV data`);

      // Parse TSV and include book/chapter intros
      return this.parseTNFromTSV(tsvData, reference, true);
    } catch (error) {
      console.error("❌ Error fetching translation notes:", error);
      return [];
    }
  }

  private async fetchTranslationQuestions(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationQuestion[]> {
    try {
      console.log(`❓ Fetching translation questions for ${reference.citation}`);

      // Search catalog for Translation Questions using proper endpoint
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        console.warn(
          `❌ Catalog search failed for translation questions: ${catalogResponse.status}`
        );
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          title: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      console.log(`📋 Found ${catalogData.data?.length || 0} translation questions resources`);

      if (!catalogData.data || catalogData.data.length === 0) {
        console.warn("❌ No translation questions resources found");
        return [];
      }

      // Get the first available TQ resource
      const resource = catalogData.data[0];
      console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

      // CRITICAL: Use ingredients array to find the correct file path
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier === reference.book.toLowerCase()
      );

      if (!ingredient) {
        console.warn(
          `❌ No ingredient found for book ${reference.book} in resource ${resource.name}`
        );
        return [];
      }

      console.log(`📁 Found ingredient path: ${ingredient.path}`);

      // Build URL using the proper pattern from docs
      const fileUrl = `https://git.door43.org/${options.organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
      console.log(`🔗 Fetching from: ${fileUrl}`);

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        console.warn(`❌ Failed to fetch TQ file: ${fileResponse.status}`);
        return [];
      }

      const tsvData = await fileResponse.text();
      console.log(`📄 Downloaded ${tsvData.length} characters of TSV data`);

      // Parse TSV and include book/chapter intros
      return this.parseTQFromTSV(tsvData, reference, true);
    } catch (error) {
      console.error("❌ Error fetching translation questions:", error);
      return [];
    }
  }

  public async fetchTranslationWords(
    reference: Reference,
    options: ResourceOptions,
    includeSections: {
      title?: boolean;
      subtitle?: boolean;
      content?: boolean;
    } = { title: true, subtitle: true, content: true }
  ): Promise<TranslationWord[]> {
    try {
      console.log(`📖 Fetching translation words for ${reference.citation}`);

      // STEP 1: Get Translation Word Links (TWL) first
      const twlLinks = await this.fetchTranslationWordLinks(reference, options);

      if (!twlLinks || twlLinks.length === 0) {
        console.log(`📭 No translation word links found for ${reference.citation}`);
        return [];
      }

      console.log(`🔗 Found ${twlLinks.length} translation word links`);

      // STEP 2: Extract unique rc:// URIs from the TWL links
      const rcUris = [...new Set(twlLinks.map((link) => link.twlid).filter(Boolean))];

      if (rcUris.length === 0) {
        console.log(`📭 No valid rc:// URIs found in translation word links`);
        return [];
      }

      console.log(`🔗 Extracted ${rcUris.length} unique rc:// URIs:`, rcUris);

      // STEP 3: Fetch Translation Word articles from the rc:// URIs
      const translationWords: TranslationWord[] = [];

      for (const rcUri of rcUris) {
        try {
          const article = await this.fetchTranslationWordArticle(rcUri, options, includeSections);
          if (article) {
            translationWords.push(article);
          }
        } catch (error) {
          console.warn(`❌ Failed to fetch article for ${rcUri}:`, error);
        }
      }

      console.log(`✅ Successfully fetched ${translationWords.length} translation word articles`);
      return translationWords;
    } catch (error) {
      console.error("❌ Error fetching translation words:", error);
      return [];
    }
  }

  /**
   * Fetches a single Translation Word article from an rc:// URI
   */
  private async fetchTranslationWordArticle(
    rcUri: string,
    options: ResourceOptions,
    includeSections: {
      title?: boolean;
      subtitle?: boolean;
      content?: boolean;
    } = { title: true, subtitle: true, content: true }
  ): Promise<TranslationWord | null> {
    try {
      if (!rcUri || !rcUri.startsWith("rc://")) {
        console.warn(`❌ Invalid rc:// URI: ${rcUri}`);
        return null;
      }

      // Parse the rc:// URI
      const parsed = this.parseRcUri(rcUri, options.language);
      if (!parsed) {
        console.warn(`❌ Failed to parse rc:// URI: ${rcUri}`);
        return null;
      }

      // Extract the word term from the rc:// URI
      const wordTerm = rcUri.split("/").pop() || "Unknown";

      // Build URL for the article
      const articleUrl = this.rcUriToUrl(rcUri, options.language, options.organization);

      console.log(`📥 Fetching TW article from: ${articleUrl}`);

      // Fetch the main article content
      const response = await fetch(articleUrl);
      if (!response.ok) {
        console.warn(
          `❌ Failed to fetch article ${rcUri}: ${response.status} ${response.statusText}`
        );
        return null;
      }

      const markdownContent = await response.text();

      // Parse the markdown content to extract different sections
      const parsedContent = this.parseTranslationWordMarkdown(markdownContent);

      // Build the response based on requested sections
      const result: TranslationWord = {
        term: wordTerm,
        definition: parsedContent.title || wordTerm,
        title: parsedContent.title || wordTerm,
        subtitle: parsedContent.subtitle || "Definition:",
        content: markdownContent, // Always include the full content
      };

      // Add section-specific content based on parameters
      if (includeSections.title && parsedContent.title) {
        result.titleContent = parsedContent.title;
      }

      if (includeSections.subtitle && parsedContent.subtitle) {
        result.subtitleContent = parsedContent.subtitle;
      }

      if (includeSections.content) {
        result.mainContent = parsedContent.mainContent || markdownContent;
      }

      return result;
    } catch (error) {
      console.error(`❌ Error fetching TW article ${rcUri}:`, error);
      return null;
    }
  }

  /**
   * Parses translation word markdown to extract title, subtitle, and main content
   */
  private parseTranslationWordMarkdown(markdown: string): {
    title: string;
    subtitle: string;
    mainContent: string;
  } {
    const lines = markdown.split("\n");
    let title = "";
    let subtitle = "";
    let mainContent = "";
    let currentSection = "";

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Extract title (first # heading)
      if (line.startsWith("# ") && !title) {
        title = line.substring(2).trim();
        continue;
      }

      // Extract subtitle (first ## heading)
      if (line.startsWith("## ") && !subtitle) {
        subtitle = line.substring(3).trim();
        currentSection = subtitle;
        continue;
      }

      // Collect main content (everything after the first ## heading)
      if (currentSection) {
        mainContent += line + "\n";
      }
    }

    return {
      title: title,
      subtitle: subtitle,
      mainContent: mainContent.trim(),
    };
  }

  /**
   * Parses an rc:// URI to extract repository and file path information
   */
  private parseRcUri(
    rcUri: string,
    contextLanguage: string = "en"
  ): {
    language: string;
    resource: string;
    path: string;
    fileName: string;
  } | null {
    try {
      // Handle wildcard language code by replacing * with contextLanguage
      let normalizedUri = rcUri;
      if (rcUri.startsWith("rc://*/")) {
        normalizedUri = rcUri.replace("rc://*/", `rc://${contextLanguage}/`);
      }

      // Remove rc:// prefix and split
      const parts = normalizedUri.replace("rc://", "").split("/");

      if (parts.length < 4) {
        throw new Error(`Invalid rc:// URI format: ${rcUri}`);
      }

      const [language, resource, ...pathParts] = parts;

      return {
        language,
        resource,
        path: pathParts.join("/"),
        fileName: pathParts[pathParts.length - 1] + ".md",
      };
    } catch (error) {
      console.error(`❌ Error parsing rc:// URI ${rcUri}:`, error);
      return null;
    }
  }

  /**
   * Converts rc:// URI to DCS raw file URL
   */
  private rcUriToUrl(
    rcUri: string,
    contextLanguage: string = "en",
    contextOrganization: string = "unfoldingWord"
  ): string {
    const parsed = this.parseRcUri(rcUri, contextLanguage);
    if (!parsed) {
      throw new Error(`Invalid rc:// URI: ${rcUri}`);
    }

    const { language, resource, path } = parsed;
    const baseUrl = `https://git.door43.org/${contextOrganization}/${language}_${resource}/raw/branch/master`;

    // For tW URIs, skip the "dict" part in the path
    // rc://en/tw/dict/bible/kt/create -> bible/kt/create.md
    const pathParts = path.split("/");
    let finalPath = path;

    if (resource === "tw" && pathParts[0] === "dict") {
      finalPath = pathParts.slice(1).join("/");
    }

    return `${baseUrl}/${finalPath}.md`;
  }

  /**
   * Parses markdown content to extract title and content
   */
  private parseMarkdown(markdown: string): { title: string; content: string } {
    const lines = markdown.split("\n");
    let title = "";
    let content = "";
    let inFrontMatter = false;
    let contentLines: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip YAML front matter
      if (line === "---") {
        inFrontMatter = !inFrontMatter;
        continue;
      }

      if (inFrontMatter) {
        continue;
      }

      // Extract title from first # heading
      if (!title && line.startsWith("# ")) {
        title = line.replace("# ", "").trim();
        continue;
      }

      // Collect content lines
      contentLines.push(lines[i]);
    }

    content = contentLines.join("\n").trim();

    return {
      title: title || "Translation Word",
      content,
    };
  }

  public async fetchTranslationWordLinks(
    reference: Reference,
    options: ResourceOptions
  ): Promise<TranslationWordLink[]> {
    try {
      console.log(`🔗 Fetching translation word links for ${reference.citation}`);

      // Search catalog for Translation Word Links using proper endpoint
      const catalogUrl = `https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Words%20Links&lang=${options.language}&owner=${options.organization}`;
      console.log(`🔍 Searching catalog: ${catalogUrl}`);

      const catalogResponse = await fetch(catalogUrl);
      if (!catalogResponse.ok) {
        console.warn(
          `❌ Catalog search failed for translation word links: ${catalogResponse.status}`
        );
        return [];
      }

      const catalogData = (await catalogResponse.json()) as {
        data?: Array<{
          name: string;
          title: string;
          ingredients?: Array<{
            identifier: string;
            path: string;
          }>;
        }>;
      };
      console.log(`📋 Found ${catalogData.data?.length || 0} translation word links resources`);

      if (!catalogData.data || catalogData.data.length === 0) {
        console.warn("❌ No translation word links resources found");
        return [];
      }

      // Get the first available TWL resource
      const resource = catalogData.data[0];
      console.log(`📖 Using resource: ${resource.name} (${resource.title})`);

      // CRITICAL: Use ingredients array to find the correct file path
      const ingredient = resource.ingredients?.find(
        (ing: any) => ing.identifier === reference.book.toLowerCase()
      );

      if (!ingredient) {
        console.warn(
          `❌ No ingredient found for book ${reference.book} in resource ${resource.name}`
        );
        return [];
      }

      console.log(`📁 Found ingredient path: ${ingredient.path}`);

      // Build URL using the proper pattern from docs
      const fileUrl = `https://git.door43.org/${options.organization}/${resource.name}/raw/branch/master/${ingredient.path.replace("./", "")}`;
      console.log(`🔗 Fetching from: ${fileUrl}`);

      const fileResponse = await fetch(fileUrl);
      if (!fileResponse.ok) {
        console.warn(`❌ Failed to fetch TWL file: ${fileResponse.status}`);
        return [];
      }

      const tsvData = await fileResponse.text();
      console.log(`📄 Downloaded ${tsvData.length} characters of TSV data`);

      // Parse TSV data
      return this.parseTWLFromTSV(tsvData, reference);
    } catch (error) {
      console.error("❌ Error fetching translation word links:", error);
      return [];
    }
  }

  private extractVerseFromUSFM(usfm: string, reference: Reference): string | null {
    try {
      // Handle different reference types
      if (!reference.verse && reference.verseEnd) {
        // Chapter range - need to extract multiple chapters
        const startChapter = reference.chapter;
        const endChapter = reference.verseEnd;
        let combinedText = "";

        for (let chapter = startChapter; chapter <= endChapter; chapter++) {
          const chapterText = extractChapterText(usfm, chapter);
          if (chapterText) {
            combinedText += chapterText + "\n\n";
          }
        }

        return combinedText.trim() || null;
      } else if (reference.verse && reference.verseEnd) {
        // Verse range within same chapter
        return extractVerseRange(usfm, reference.chapter, reference.verse, reference.verseEnd);
      } else if (reference.verse) {
        // Single verse
        return extractVerseText(usfm, reference.chapter, reference.verse);
      } else if (!reference.verse && !reference.verseEnd) {
        // Full book - extract all chapters
        // For now, let's try chapters 1-10 and see what we get
        let combinedText = "";

        for (let chapter = 1; chapter <= 10; chapter++) {
          const chapterText = extractChapterText(usfm, chapter);
          if (chapterText) {
            combinedText += chapterText + "\n\n";
          } else {
            // No more chapters found
            break;
          }
        }

        return combinedText.trim() || null;
      } else {
        // Full chapter
        return extractChapterText(usfm, reference.chapter);
      }
    } catch (error) {
      console.error("Error extracting verse from USFM:", error);
      return null;
    }
  }

  private parseTNFromTSV(
    tsvData: string,
    reference: Reference,
    includeIntro: boolean = false
  ): TranslationNote[] {
    try {
      console.log(`🔍 Parsing TN TSV for reference: ${reference.citation}`);
      console.log(
        `📋 Reference details: chapter=${reference.chapter}, verse=${reference.verse}, verseEnd=${reference.verseEnd}`
      );

      const lines = tsvData.split("\n");
      const notes: TranslationNote[] = [];

      // Skip header line
      if (lines.length > 0 && lines[0].startsWith("Reference")) {
        lines.shift();
      }

      console.log(`📄 Processing ${lines.length} TSV lines`);
      let skippedIntro = 0;
      let skippedChapter = 0;
      let skippedVerse = 0;
      let included = 0;

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

        // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapterNum = parseInt(refMatch[1]);
        const verseNum = parseInt(refMatch[2]);

        // Enhanced filtering logic to handle different reference types
        let include = false;
        let noteType = "";

        // Always include book intro notes (front:intro) for context
        if (ref === "front:intro") {
          include = includeIntro;
          noteType = "book-intro";
        }
        // Always include chapter intro notes for relevant chapters
        else if (ref.includes(":intro")) {
          const introChapterMatch = ref.match(/(\d+):intro/);
          if (introChapterMatch) {
            const introChapter = parseInt(introChapterMatch[1]);
            // Include chapter intro if it's in our range/selection
            if (!reference.verse && reference.verseEnd) {
              // Chapter range
              const startChapter = reference.chapter;
              const endChapter = reference.verseEnd;
              include = includeIntro && introChapter >= startChapter && introChapter <= endChapter;
            } else if (reference.verse) {
              // Specific verse or verse range - include intro for that chapter
              include = includeIntro && introChapter === reference.chapter;
            } else {
              // Full book or single chapter - include this chapter's intro
              include =
                includeIntro &&
                (reference.chapter === undefined || introChapter === reference.chapter);
            }
            noteType = `chapter-${introChapter}-intro`;
          } else {
            include = false;
            noteType = "unknown-intro";
          }
        }
        // Regular verse notes
        else {
          if (!reference.verse && reference.verseEnd) {
            // Chapter range (no verse specified, but verseEnd contains end chapter)
            const startChapter = reference.chapter;
            const endChapter = reference.verseEnd;
            include = chapterNum >= startChapter && chapterNum <= endChapter;
            noteType = `verse-in-chapters-${startChapter}-${endChapter}`;
          } else if (reference.verse && reference.verseEnd) {
            // Verse range within same chapter
            include =
              chapterNum === reference.chapter &&
              verseNum >= reference.verse &&
              verseNum <= reference.verseEnd;
            noteType = `verse-range-${reference.verse}-${reference.verseEnd}`;
          } else if (reference.verse) {
            // Single verse
            include = chapterNum === reference.chapter && verseNum === reference.verse;
            noteType = `single-verse-${reference.verse}`;
          } else if (!reference.verse && !reference.verseEnd) {
            // Full book (include all chapters)
            include = true;
            noteType = "full-book";
          } else {
            // Full chapter
            include = chapterNum === reference.chapter;
            noteType = `full-chapter-${reference.chapter}`;
          }
        }

        if (!include) {
          if (ref.includes("intro")) {
            skippedIntro++;
          } else if (chapterNum !== reference.chapter) {
            skippedChapter++;
          } else {
            skippedVerse++;
          }
          continue;
        }

        included++;
        console.log(`  ✅ Including ${noteType}: ${ref} - "${noteText.substring(0, 50)}..."`);

        notes.push({
          reference: `${reference.book} ${ref}`,
          quote: quote || "",
          note: noteText || "",
        });
      }

      console.log(`📊 TN Filtering results:`);
      console.log(`  ✅ Included: ${included}`);
      console.log(`  ❌ Skipped intro: ${skippedIntro}`);
      console.log(`  ❌ Skipped wrong chapter: ${skippedChapter}`);
      console.log(`  ❌ Skipped wrong verse: ${skippedVerse}`);
      console.log(`  📝 Total notes returned: ${notes.length}`);

      return notes;
    } catch (error) {
      console.error("Error parsing TN TSV:", error);
      return [];
    }
  }

  private parseTQFromTSV(
    tsvData: string,
    reference: Reference,
    includeIntro: boolean = false
  ): TranslationQuestion[] {
    try {
      console.log(`🔍 Parsing TQ TSV for reference: ${reference.citation}`);
      console.log(
        `📋 Reference details: chapter=${reference.chapter}, verse=${reference.verse}, verseEnd=${reference.verseEnd}`
      );

      const lines = tsvData.split("\n");
      const questions: TranslationQuestion[] = [];

      // Skip header line
      if (lines.length > 0 && lines[0].startsWith("Reference")) {
        lines.shift();
      }

      console.log(`📄 Processing ${lines.length} TSV lines`);
      let skippedIntro = 0;
      let skippedChapter = 0;
      let skippedVerse = 0;
      let included = 0;

      for (const line of lines) {
        if (!line.trim()) continue;

        const columns = line.split("\t");
        if (columns.length < 7) continue; // Expected TQ format has at least 7 columns

        const [
          ref, // e.g., "1:1" or "front:intro"
          id,
          tags,
          quote,
          occurrence,
          question,
          response,
        ] = columns;

        // Skip intro questions if includeIntro is false
        if (!includeIntro && ref.includes("intro")) {
          skippedIntro++;
          continue;
        }

        // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapterNum = parseInt(refMatch[1]);
        const verseNum = parseInt(refMatch[2]);

        // Enhanced filtering logic to handle different reference types
        let include = false;

        if (!reference.verse && reference.verseEnd) {
          // Chapter range (no verse specified, but verseEnd contains end chapter)
          const startChapter = reference.chapter;
          const endChapter = reference.verseEnd;
          include = chapterNum >= startChapter && chapterNum <= endChapter;
          console.log(
            `📖 Chapter range filter: ${chapterNum} in [${startChapter}-${endChapter}] = ${include}`
          );
        } else if (reference.verse && reference.verseEnd) {
          // Verse range within same chapter
          include =
            chapterNum === reference.chapter &&
            verseNum >= reference.verse &&
            verseNum <= reference.verseEnd;
          console.log(
            `📖 Verse range filter: ch${chapterNum}:v${verseNum} in ch${reference.chapter}:v${reference.verse}-${reference.verseEnd} = ${include}`
          );
        } else if (reference.verse) {
          // Single verse
          include = chapterNum === reference.chapter && verseNum === reference.verse;
          console.log(
            `📖 Single verse filter: ch${chapterNum}:v${verseNum} == ch${reference.chapter}:v${reference.verse} = ${include}`
          );
        } else if (!reference.verse && !reference.verseEnd) {
          // Full book (include all chapters)
          include = true;
          console.log(`📖 Full book filter: including all = ${include}`);
        } else {
          // Full chapter
          include = chapterNum === reference.chapter;
          console.log(
            `📖 Full chapter filter: ch${chapterNum} == ch${reference.chapter} = ${include}`
          );
        }

        if (!include) {
          if (ref.includes("intro")) {
            skippedIntro++;
          } else if (chapterNum !== reference.chapter) {
            skippedChapter++;
          } else {
            skippedVerse++;
          }
          continue;
        }

        included++;

        questions.push({
          reference: `${reference.book} ${chapterNum}:${verseNum}`,
          question: question || "",
          answer: response || "",
        });
      }

      console.log(`📊 TQ Filtering results:`);
      console.log(`  ✅ Included: ${included}`);
      console.log(`  ❌ Skipped intro: ${skippedIntro}`);
      console.log(`  ❌ Skipped wrong chapter: ${skippedChapter}`);
      console.log(`  ❌ Skipped wrong verse: ${skippedVerse}`);
      console.log(`  📝 Total questions returned: ${questions.length}`);

      return questions;
    } catch (error) {
      console.error("Error parsing TQ TSV:", error);
      return [];
    }
  }

  private parseTWLFromTSV(tsvData: string, reference: Reference): TranslationWordLink[] {
    try {
      console.log(`🔍 Parsing TWL TSV for reference: ${reference.citation}`);

      const lines = tsvData.split("\n");
      const links: TranslationWordLink[] = [];

      // Skip header line
      if (lines.length > 0 && lines[0].startsWith("Reference")) {
        lines.shift();
      }

      console.log(`📄 Processing ${lines.length} TWL TSV lines`);

      for (const line of lines) {
        if (!line.trim()) continue;

        const parts = line.split("\t");
        if (parts.length < 6) continue; // Expected TWL format: Reference | ID | Tags | OrigWords | Occurrence | TWLink

        const [ref, id, tags, origWords, occurrence, twlid] = parts;

        // Parse the reference (e.g., "1:1" -> chapter 1, verse 1)
        const refMatch = ref.match(/(\d+):(\d+)/);
        if (!refMatch) continue;

        const chapter = parseInt(refMatch[1]);
        const verse = parseInt(refMatch[2]);

        // Enhanced filtering logic to handle different reference types
        let include = false;

        if (!reference.verse && reference.verseEnd) {
          // Chapter range (no verse specified, but verseEnd contains end chapter)
          const startChapter = reference.chapter;
          const endChapter = reference.verseEnd;
          include = chapter >= startChapter && chapter <= endChapter;
        } else if (reference.verse && reference.verseEnd) {
          // Verse range within same chapter
          include =
            chapter === reference.chapter &&
            verse >= reference.verse &&
            verse <= reference.verseEnd;
        } else if (reference.verse) {
          // Single verse
          include = chapter === reference.chapter && verse === reference.verse;
        } else if (!reference.verse && !reference.verseEnd) {
          // Full book (include all chapters)
          include = true;
        } else {
          // Full chapter
          include = chapter === reference.chapter;
        }

        if (!include) continue;

        // Parse the TWL ID to get the word
        const word = twlid?.split("/").pop()?.replace(".md", "") || twlid || "";

        links.push({
          word,
          occurrences: parseInt(occurrence) || 1,
          twlid,
          reference: `${chapter}:${verse}`,
          id: id || "",
          tags: tags || "",
          origWords: origWords || "",
          occurrence: parseInt(occurrence) || 1,
        });
      }

      console.log(`📊 TWL Filtering results: ${links.length} links found`);
      return links;
    } catch (error) {
      console.error("Error parsing TWL TSV:", error);
      return [];
    }
  }
}
