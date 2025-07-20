/**
 * Bible Reference Parser
 * Parses various Bible reference formats into structured data
 */

export interface Reference {
  book: string;
  bookName: string;
  chapter: number;
  verse?: number;
  verseEnd?: number;
  citation: string;
  original: string;
}

// Book mappings with multiple language support
const BOOK_MAPPINGS: Record<string, { code: string; name: string }> = {
  // Genesis
  genesis: { code: "GEN", name: "Genesis" },
  gen: { code: "GEN", name: "Genesis" },
  ge: { code: "GEN", name: "Genesis" },
  gn: { code: "GEN", name: "Genesis" },

  // Exodus
  exodus: { code: "EXO", name: "Exodus" },
  exo: { code: "EXO", name: "Exodus" },
  ex: { code: "EXO", name: "Exodus" },

  // Leviticus
  leviticus: { code: "LEV", name: "Leviticus" },
  lev: { code: "LEV", name: "Leviticus" },
  le: { code: "LEV", name: "Leviticus" },
  lv: { code: "LEV", name: "Leviticus" },

  // Numbers
  numbers: { code: "NUM", name: "Numbers" },
  num: { code: "NUM", name: "Numbers" },
  nu: { code: "NUM", name: "Numbers" },
  nb: { code: "NUM", name: "Numbers" },

  // Deuteronomy
  deuteronomy: { code: "DEU", name: "Deuteronomy" },
  deu: { code: "DEU", name: "Deuteronomy" },
  deut: { code: "DEU", name: "Deuteronomy" },
  dt: { code: "DEU", name: "Deuteronomy" },

  // Joshua
  joshua: { code: "JOS", name: "Joshua" },
  jos: { code: "JOS", name: "Joshua" },
  josh: { code: "JOS", name: "Joshua" },

  // Judges
  judges: { code: "JDG", name: "Judges" },
  jdg: { code: "JDG", name: "Judges" },
  judg: { code: "JDG", name: "Judges" },

  // Ruth
  ruth: { code: "RUT", name: "Ruth" },
  rut: { code: "RUT", name: "Ruth" },
  ru: { code: "RUT", name: "Ruth" },

  // 1 Samuel
  "1samuel": { code: "1SA", name: "1 Samuel" },
  "1sam": { code: "1SA", name: "1 Samuel" },
  "1sa": { code: "1SA", name: "1 Samuel" },
  "1s": { code: "1SA", name: "1 Samuel" },

  // 2 Samuel
  "2samuel": { code: "2SA", name: "2 Samuel" },
  "2sam": { code: "2SA", name: "2 Samuel" },
  "2sa": { code: "2SA", name: "2 Samuel" },
  "2s": { code: "2SA", name: "2 Samuel" },

  // 1 Kings
  "1kings": { code: "1KI", name: "1 Kings" },
  "1ki": { code: "1KI", name: "1 Kings" },
  "1k": { code: "1KI", name: "1 Kings" },

  // 2 Kings
  "2kings": { code: "2KI", name: "2 Kings" },
  "2ki": { code: "2KI", name: "2 Kings" },
  "2k": { code: "2KI", name: "2 Kings" },

  // Psalms
  psalms: { code: "PSA", name: "Psalms" },
  psalm: { code: "PSA", name: "Psalms" },
  psa: { code: "PSA", name: "Psalms" },
  ps: { code: "PSA", name: "Psalms" },

  // Proverbs
  proverbs: { code: "PRO", name: "Proverbs" },
  prov: { code: "PRO", name: "Proverbs" },
  pro: { code: "PRO", name: "Proverbs" },
  pr: { code: "PRO", name: "Proverbs" },

  // Isaiah
  isaiah: { code: "ISA", name: "Isaiah" },
  isa: { code: "ISA", name: "Isaiah" },
  is: { code: "ISA", name: "Isaiah" },

  // Jeremiah
  jeremiah: { code: "JER", name: "Jeremiah" },
  jer: { code: "JER", name: "Jeremiah" },
  je: { code: "JER", name: "Jeremiah" },

  // Obadiah
  obadiah: { code: "OBA", name: "Obadiah" },
  oba: { code: "OBA", name: "Obadiah" },
  ob: { code: "OBA", name: "Obadiah" },

  // Haggai
  haggai: { code: "HAG", name: "Haggai" },
  hag: { code: "HAG", name: "Haggai" },
  hg: { code: "HAG", name: "Haggai" },

  // Matthew
  matthew: { code: "MAT", name: "Matthew" },
  matt: { code: "MAT", name: "Matthew" },
  mat: { code: "MAT", name: "Matthew" },
  mt: { code: "MAT", name: "Matthew" },

  // Mark
  mark: { code: "MRK", name: "Mark" },
  mrk: { code: "MRK", name: "Mark" },
  mk: { code: "MRK", name: "Mark" },
  mar: { code: "MRK", name: "Mark" },

  // Luke
  luke: { code: "LUK", name: "Luke" },
  luk: { code: "LUK", name: "Luke" },
  lk: { code: "LUK", name: "Luke" },
  lu: { code: "LUK", name: "Luke" },

  // John
  john: { code: "JHN", name: "John" },
  jhn: { code: "JHN", name: "John" },
  jn: { code: "JHN", name: "John" },
  jo: { code: "JHN", name: "John" },

  // Acts
  acts: { code: "ACT", name: "Acts" },
  act: { code: "ACT", name: "Acts" },
  ac: { code: "ACT", name: "Acts" },

  // Romans
  romans: { code: "ROM", name: "Romans" },
  rom: { code: "ROM", name: "Romans" },
  ro: { code: "ROM", name: "Romans" },

  // 1 Corinthians
  "1corinthians": { code: "1CO", name: "1 Corinthians" },
  "1cor": { code: "1CO", name: "1 Corinthians" },
  "1co": { code: "1CO", name: "1 Corinthians" },
  "1c": { code: "1CO", name: "1 Corinthians" },

  // 2 Corinthians
  "2corinthians": { code: "2CO", name: "2 Corinthians" },
  "2cor": { code: "2CO", name: "2 Corinthians" },
  "2co": { code: "2CO", name: "2 Corinthians" },
  "2c": { code: "2CO", name: "2 Corinthians" },

  // Galatians
  galatians: { code: "GAL", name: "Galatians" },
  gal: { code: "GAL", name: "Galatians" },
  ga: { code: "GAL", name: "Galatians" },

  // Ephesians
  ephesians: { code: "EPH", name: "Ephesians" },
  eph: { code: "EPH", name: "Ephesians" },
  ep: { code: "EPH", name: "Ephesians" },

  // Philippians
  philippians: { code: "PHP", name: "Philippians" },
  phil: { code: "PHP", name: "Philippians" },
  php: { code: "PHP", name: "Philippians" },
  pp: { code: "PHP", name: "Philippians" },

  // Colossians
  colossians: { code: "COL", name: "Colossians" },
  col: { code: "COL", name: "Colossians" },

  // 1 Thessalonians
  "1thessalonians": { code: "1TH", name: "1 Thessalonians" },
  "1thess": { code: "1TH", name: "1 Thessalonians" },
  "1th": { code: "1TH", name: "1 Thessalonians" },
  "1t": { code: "1TH", name: "1 Thessalonians" },

  // 2 Thessalonians
  "2thessalonians": { code: "2TH", name: "2 Thessalonians" },
  "2thess": { code: "2TH", name: "2 Thessalonians" },
  "2th": { code: "2TH", name: "2 Thessalonians" },
  "2t": { code: "2TH", name: "2 Thessalonians" },

  // 1 Timothy
  "1timothy": { code: "1TI", name: "1 Timothy" },
  "1tim": { code: "1TI", name: "1 Timothy" },
  "1ti": { code: "1TI", name: "1 Timothy" },

  // 2 Timothy
  "2timothy": { code: "2TI", name: "2 Timothy" },
  "2tim": { code: "2TI", name: "2 Timothy" },
  "2ti": { code: "2TI", name: "2 Timothy" },

  // Philemon
  philemon: { code: "PHM", name: "Philemon" },
  phm: { code: "PHM", name: "Philemon" },
  pm: { code: "PHM", name: "Philemon" },

  // Titus
  titus: { code: "TIT", name: "Titus" },
  tit: { code: "TIT", name: "Titus" },
  ti: { code: "TIT", name: "Titus" },

  // Hebrews
  hebrews: { code: "HEB", name: "Hebrews" },
  heb: { code: "HEB", name: "Hebrews" },
  he: { code: "HEB", name: "Hebrews" },

  // James
  james: { code: "JAS", name: "James" },
  jas: { code: "JAS", name: "James" },
  ja: { code: "JAS", name: "James" },

  // 1 Peter
  "1peter": { code: "1PE", name: "1 Peter" },
  "1pet": { code: "1PE", name: "1 Peter" },
  "1pe": { code: "1PE", name: "1 Peter" },
  "1p": { code: "1PE", name: "1 Peter" },

  // 2 Peter
  "2peter": { code: "2PE", name: "2 Peter" },
  "2pet": { code: "2PE", name: "2 Peter" },
  "2pe": { code: "2PE", name: "2 Peter" },
  "2p": { code: "2PE", name: "2 Peter" },

  // 1 John
  "1john": { code: "1JN", name: "1 John" },
  "1jn": { code: "1JN", name: "1 John" },
  "1jo": { code: "1JN", name: "1 John" },

  // 2 John
  "2john": { code: "2JN", name: "2 John" },
  "2jn": { code: "2JN", name: "2 John" },
  "2jo": { code: "2JN", name: "2 John" },

  // 3 John
  "3john": { code: "3JN", name: "3 John" },
  "3jn": { code: "3JN", name: "3 John" },
  "3jo": { code: "3JN", name: "3 John" },

  // Jude
  jude: { code: "JUD", name: "Jude" },
  jud: { code: "JUD", name: "Jude" },

  // Revelation
  revelation: { code: "REV", name: "Revelation" },
  rev: { code: "REV", name: "Revelation" },
  re: { code: "REV", name: "Revelation" },

  // Spanish mappings
  génesis: { code: "GEN", name: "Genesis" },
  éxodo: { code: "EXO", name: "Exodus" },
  mateo: { code: "MAT", name: "Matthew" },
  marcos: { code: "MRK", name: "Mark" },
  lucas: { code: "LUK", name: "Luke" },
  juan: { code: "JHN", name: "John" },
  romanos: { code: "ROM", name: "Romans" },

  // French mappings
  matthieu: { code: "MAT", name: "Matthew" },
  marc: { code: "MRK", name: "Mark" },
  luc: { code: "LUK", name: "Luke" },
  jean: { code: "JHN", name: "John" },
  romains: { code: "ROM", name: "Romans" },
};

/**
 * Parse a Bible reference string into structured data
 */
export function parseReference(input: string): Reference | null {
  if (!input || typeof input !== "string") return null;

  // Clean the input
  const cleanInput = input.trim();

  // Try book-only pattern first (e.g., "Philemon", "Jude", "Obadiah")
  const bookOnlyRegex = /^(\d?\s*\w+)$/i;
  const bookOnlyMatch = cleanInput.match(bookOnlyRegex);

  if (bookOnlyMatch) {
    const [, bookStr] = bookOnlyMatch;
    const normalizedBook = bookStr.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
    const bookInfo = BOOK_MAPPINGS[normalizedBook];

    if (bookInfo) {
      return {
        book: bookInfo.code,
        bookName: bookInfo.name,
        chapter: 1, // Default to chapter 1 for book-only references
        citation: bookInfo.name,
        original: cleanInput,
      };
    }
  }

  // Try chapter range pattern (e.g., "Titus 1-2", "1 Timothy 1-3")
  const chapterRangeRegex = /^(\d?\s*\w+)[\s\.]*(\d+)[-–—]\s*(\d+)$/i;
  const chapterRangeMatch = cleanInput.match(chapterRangeRegex);

  if (chapterRangeMatch) {
    const [, bookStr, startChapterStr, endChapterStr] = chapterRangeMatch;
    const normalizedBook = bookStr.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
    const bookInfo = BOOK_MAPPINGS[normalizedBook];

    if (bookInfo) {
      const startChapter = parseInt(startChapterStr);
      const endChapter = parseInt(endChapterStr);

      if (
        !isNaN(startChapter) &&
        !isNaN(endChapter) &&
        startChapter >= 1 &&
        endChapter >= startChapter
      ) {
        return {
          book: bookInfo.code,
          bookName: bookInfo.name,
          chapter: startChapter,
          verseEnd: endChapter, // Reuse verseEnd to store end chapter for ranges
          citation: `${bookInfo.name} ${startChapter}-${endChapter}`,
          original: cleanInput,
        };
      }
    }
  }

  // Original regex for standard patterns
  // Supports: "John 3:16", "Jn 3:16-18", "Genesis 1", "1 Corinthians 13:4-7"
  const referenceRegex = /^(\d?\s*\w+)[\s\.]*(\d+)(?:[:\.]\s*(\d+)(?:[-–—]\s*(\d+))?)?$/i;

  const match = cleanInput.match(referenceRegex);
  if (!match) return null;

  const [, bookStr, chapterStr, verseStr, verseEndStr] = match;

  // Normalize book name
  const normalizedBook = bookStr.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  const bookInfo = BOOK_MAPPINGS[normalizedBook];

  if (!bookInfo) return null;

  const chapter = parseInt(chapterStr);
  if (isNaN(chapter) || chapter < 1) return null;

  let verse: number | undefined;
  let verseEnd: number | undefined;

  if (verseStr) {
    verse = parseInt(verseStr);
    if (isNaN(verse) || verse < 1) return null;

    if (verseEndStr) {
      verseEnd = parseInt(verseEndStr);
      if (isNaN(verseEnd) || verseEnd < verse) return null;
    }
  }

  // Create citation
  let citation = `${bookInfo.name} ${chapter}`;
  if (verse) {
    citation += `:${verse}`;
    if (verseEnd && verseEnd !== verse) {
      citation += `-${verseEnd}`;
    }
  }

  return {
    book: bookInfo.code,
    bookName: bookInfo.name,
    chapter,
    verse,
    verseEnd,
    citation,
    original: cleanInput,
  };
}

/**
 * Extract all Bible references from a text
 */
export function extractReferences(text: string): Reference[] {
  if (!text || typeof text !== "string") return [];

  const references: Reference[] = [];

  // Simple regex to find potential references
  const referencePattern = /\b(\d?\s*\w+)\s+(\d+)(?:[:\.]\s*(\d+)(?:[-–—]\s*(\d+))?)?\b/gi;

  let match;
  while ((match = referencePattern.exec(text)) !== null) {
    const potentialRef = match[0];
    const parsed = parseReference(potentialRef);
    if (parsed) {
      references.push(parsed);
    }
  }

  return references;
}

/**
 * Validate if a string could be a Bible reference
 */
export function isValidReference(input: string): boolean {
  return parseReference(input) !== null;
}

/**
 * Get all supported book names and abbreviations
 */
export function getSupportedBooks(): Array<{ code: string; name: string; aliases: string[] }> {
  const books = new Map<string, { code: string; name: string; aliases: string[] }>();

  for (const [alias, info] of Object.entries(BOOK_MAPPINGS)) {
    if (!books.has(info.code)) {
      books.set(info.code, { ...info, aliases: [] });
    }
    books.get(info.code)!.aliases.push(alias);
  }

  return Array.from(books.values());
}
