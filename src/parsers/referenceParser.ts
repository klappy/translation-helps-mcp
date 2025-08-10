/**
 * Reference Parser
 * Parse Bible references into structured format
 */

export interface ParsedReference {
  book: string;
  chapter?: number;
  verse?: number;
  endChapter?: number;
  endVerse?: number;
  originalText: string;
  isValid: boolean;
}

/**
 * Parse a Bible reference string into structured data
 */
export function parseReference(referenceString: string): ParsedReference {
  const originalText = referenceString;

  if (!referenceString || typeof referenceString !== "string") {
    return {
      book: "",
      originalText,
      isValid: false,
    };
  }

  // Clean the input
  const cleaned = referenceString.trim();
  // Normalize leading book part only, keep chapter/verse suffixes intact
  const split = cleaned.split(/\s+/);
  if (split.length > 0) {
    split[0] = normalizeBookAbbreviation(split[0]);
  }
  const normalizedInput = split.join(" ");

  // Normalize common abbreviations before parsing
  function normalizeBookAbbreviation(raw: string): string {
    if (!raw) return raw;
    const input = raw.trim();
    const lower = input.toLowerCase();

    // Handle numeric prefixes like 1Co, 1 Cor, 1Jn, etc.
    const m = lower.match(/^(\d)\s*([a-z]+)/);
    let numPrefix: string | null = null;
    let base = lower;
    if (m) {
      numPrefix = m[1];
      base = m[2];
    }

    const map: Record<string, string> = {
      gen: "Genesis",
      ge: "Genesis",
      gn: "Genesis",
      ex: "Exodus",
      exo: "Exodus",
      lev: "Leviticus",
      le: "Leviticus",
      num: "Numbers",
      nu: "Numbers",
      deut: "Deuteronomy",
      deu: "Deuteronomy",
      dt: "Deuteronomy",
      jos: "Joshua",
      josh: "Joshua",
      jdgs: "Judges",
      jdg: "Judges",
      rut: "Ruth",
      ru: "Ruth",
      sam: "Samuel",
      ki: "Kings",
      ch: "Chronicles",
      ezr: "Ezra",
      neh: "Nehemiah",
      est: "Esther",
      job: "Job",
      psa: "Psalms",
      ps: "Psalms",
      pro: "Proverbs",
      pr: "Proverbs",
      ecc: "Ecclesiastes",
      sng: "Song of Songs",
      sos: "Song of Songs",
      isa: "Isaiah",
      jer: "Jeremiah",
      lam: "Lamentations",
      ezk: "Ezekiel",
      dan: "Daniel",
      hos: "Hosea",
      jol: "Joel",
      amo: "Amos",
      oba: "Obadiah",
      jon: "Jonah",
      mic: "Micah",
      nam: "Nahum",
      hab: "Habakkuk",
      zep: "Zephaniah",
      hag: "Haggai",
      zec: "Zechariah",
      mal: "Malachi",
      mat: "Matthew",
      mt: "Matthew",
      mrk: "Mark",
      mk: "Mark",
      luk: "Luke",
      lk: "Luke",
      jhn: "John",
      joh: "John",
      // Ensure bare 'jn' maps to Gospel of John, not numbered epistles
      jn: "John",
      act: "Acts",
      rom: "Romans",
      ro: "Romans",
      cor: "Corinthians",
      co: "Corinthians",
      gal: "Galatians",
      eph: "Ephesians",
      php: "Philippians",
      col: "Colossians",
      th: "Thessalonians",
      tim: "Timothy",
      ti: "Titus",
      phm: "Philemon",
      heb: "Hebrews",
      jas: "James",
      pe: "Peter",
      jn1: "1 John",
      jn2: "2 John",
      jn3: "3 John",
      jud: "Jude",
      rev: "Revelation",
      re: "Revelation",
    };

    // Special handling for numbered books (e.g., 1Co -> 1 Corinthians)
    if (numPrefix) {
      if (base.startsWith("co") || base.startsWith("cor"))
        return `${numPrefix} Corinthians`;
      if (base.startsWith("th")) return `${numPrefix} Thessalonians`;
      if (base.startsWith("ti")) return `${numPrefix} Timothy`;
      if (base.startsWith("pe")) return `${numPrefix} Peter`;
      // Only map to numbered John epistles when an explicit number is present
      if (base === "jn" || base === "jhn" || base === "john")
        return `${numPrefix} John`;
      if (base.startsWith("sa")) return `${numPrefix} Samuel`;
      if (base.startsWith("ki")) return `${numPrefix} Kings`;
      if (base.startsWith("ch")) return `${numPrefix} Chronicles`;
    }

    const mapped = map[base] || map[lower] || null;
    if (mapped) return mapped;

    // If nothing matched, capitalize first letter of each word as fallback
    return input.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Pattern to match various reference formats
  const patterns = [
    // Cross-chapter verse range: "Genesis 1:1-2:3"
    /^(.+?)\s+(\d+):(\d+)-(\d+):(\d+)$/,
    // Full reference with verse range: "Genesis 1:1-3"
    /^(.+?)\s+(\d+):(\d+)-(\d+)$/,
    // Full reference single verse: "Genesis 1:1"
    /^(.+?)\s+(\d+):(\d+)$/,
    // Chapter range: "Genesis 1-3"
    /^(.+?)\s+(\d+)-(\d+)$/,
    // Chapter only: "Genesis 1"
    /^(.+?)\s+(\d+)$/,
    // Book only: "Genesis"
    /^(.+)$/,
  ];

  let result: ParsedReference | null = null;

  // Cross-chapter verse range
  const crossChapterMatch = normalizedInput.match(patterns[0]);
  if (crossChapterMatch) {
    const [, book, startChapter, startVerse, endChapter, endVerse] =
      crossChapterMatch;
    result = {
      book: book.trim(),
      chapter: parseInt(startChapter, 10),
      verse: parseInt(startVerse, 10),
      endChapter: parseInt(endChapter, 10),
      endVerse: parseInt(endVerse, 10),
      originalText,
      isValid: true,
    };
  }

  // Try other patterns if no cross-chapter match
  if (!result) {
    for (let i = 1; i < patterns.length; i++) {
      const match = normalizedInput.match(patterns[i]);
      if (match) {
        if (i === 1) {
          // Verse range within same chapter
          const [, book, chapter, verse, endVerse] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse, 10),
            endVerse: parseInt(endVerse, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 2) {
          // Single verse
          const [, book, chapter, verse] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            verse: parseInt(verse, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 3) {
          // Chapter range
          const [, book, startChapter, endChapter] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(startChapter, 10),
            endChapter: parseInt(endChapter, 10),
            originalText,
            isValid: true,
          };
        } else if (i === 4) {
          // Single chapter
          const [, book, chapter] = match;
          result = {
            book: book.trim(),
            chapter: parseInt(chapter, 10),
            originalText,
            isValid: true,
          };
        } else {
          // Book only
          const [, book] = match;
          result = {
            book: book.trim(),
            originalText,
            isValid: true,
          };
        }
        break;
      }
    }
  }

  // Return the result or default
  return (
    result || {
      book: normalizedInput,
      originalText,
      isValid: Boolean(cleaned),
    }
  );
}

/**
 * Validate if a parsed reference is well-formed
 */
export function isValidReference(ref: ParsedReference): boolean {
  if (!ref.book) return false;

  // Chapter should be positive if present
  if (ref.chapter !== undefined && ref.chapter <= 0) return false;

  // Verse should be positive if present
  if (ref.verse !== undefined && ref.verse <= 0) return false;

  // End verse should be >= start verse if present
  if (
    ref.endVerse !== undefined &&
    ref.verse !== undefined &&
    ref.endVerse < ref.verse
  ) {
    return false;
  }

  return true;
}

/**
 * Normalize a reference to a standard format
 */
export function normalizeReference(ref: ParsedReference): string {
  if (!ref.book) return "";

  let normalized = ref.book;

  if (ref.chapter) {
    normalized += ` ${ref.chapter}`;

    if (ref.verse) {
      normalized += `:${ref.verse}`;

      if (ref.endVerse && ref.endVerse !== ref.verse) {
        normalized += `-${ref.endVerse}`;
      }
    }
  }

  return normalized;
}
