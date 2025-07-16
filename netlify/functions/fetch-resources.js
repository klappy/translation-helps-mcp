/**
 * Fetch Resources Endpoint
 * GET /api/fetch-resources
 */

// Simple reference parser
function parseReference(input) {
  if (!input || typeof input !== "string") return null;

  const cleanInput = input.trim();
  const referenceRegex = /^(\d?\s*\w+)[\s\.]*(\d+)(?:[:\.]\s*(\d+)(?:[-–—]\s*(\d+))?)?$/i;

  const match = cleanInput.match(referenceRegex);
  if (!match) return null;

  const [, bookStr, chapterStr, verseStr, verseEndStr] = match;

  // Simple book mapping (just a few for demo)
  const bookMappings = {
    john: { code: "JHN", name: "John" },
    jhn: { code: "JHN", name: "John" },
    jn: { code: "JHN", name: "John" },
    genesis: { code: "GEN", name: "Genesis" },
    gen: { code: "GEN", name: "Genesis" },
    matthew: { code: "MAT", name: "Matthew" },
    matt: { code: "MAT", name: "Matthew" },
    mat: { code: "MAT", name: "Matthew" },
    romans: { code: "ROM", name: "Romans" },
    rom: { code: "ROM", name: "Romans" },
  };

  const normalizedBook = bookStr.toLowerCase().replace(/\s+/g, "").replace(/\./g, "");
  const bookInfo = bookMappings[normalizedBook];

  if (!bookInfo) return null;

  const chapter = parseInt(chapterStr);
  if (isNaN(chapter) || chapter < 1) return null;

  let verse, verseEnd;
  if (verseStr) {
    verse = parseInt(verseStr);
    if (isNaN(verse) || verse < 1) return null;

    if (verseEndStr) {
      verseEnd = parseInt(verseEndStr);
      if (isNaN(verseEnd) || verseEnd < verse) return null;
    }
  }

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

// Simplified resource fetcher
async function fetchBibleText(reference, language = "en", organization = "unfoldingWord") {
  try {
    const baseUrl = process.env.DCS_API_URL || "https://git.door43.org/api/v1";
    const bookNumber = getBookNumber(reference.book);

    // Try to fetch ULT (Unlocked Literal Text)
    const url = `${baseUrl}/repos/${organization}/${language}_ult/raw/${bookNumber}-${reference.book}.usfm`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    const usfm = await response.text();
    const cleanText = extractVerseFromUSFM(usfm, reference);

    if (cleanText) {
      return {
        text: cleanText,
        translation: "ULT",
        language,
        organization,
      };
    }

    return null;
  } catch (error) {
    console.error("Error fetching scripture:", error);
    return null;
  }
}

function getBookNumber(bookCode) {
  const bookNumbers = {
    GEN: "01",
    EXO: "02",
    LEV: "03",
    NUM: "04",
    DEU: "05",
    JOS: "06",
    JDG: "07",
    RUT: "08",
    "1SA": "09",
    "2SA": "10",
    PSA: "19",
    PRO: "20",
    ISA: "23",
    JER: "24",
    MAT: "41",
    MRK: "42",
    LUK: "43",
    JHN: "44",
    ACT: "45",
    ROM: "46",
    "1CO": "47",
    "2CO": "48",
    GAL: "49",
    EPH: "50",
  };
  return bookNumbers[bookCode] || "01";
}

function extractVerseFromUSFM(usfm, reference) {
  try {
    const lines = usfm.split("\n");
    const chapterPattern = new RegExp(`\\\\c ${reference.chapter}\\b`);
    const versePattern = reference.verse ? new RegExp(`\\\\v ${reference.verse}\\b`) : null;

    let inChapter = false;
    let inVerse = !reference.verse;
    let text = "";

    for (const line of lines) {
      if (chapterPattern.test(line)) {
        inChapter = true;
        continue;
      }

      if (inChapter && versePattern && versePattern.test(line)) {
        inVerse = true;
        const verseText = line.replace(/\\v \d+\s*/, "");
        text += verseText + " ";
        continue;
      }

      if (inChapter && inVerse) {
        if (/\\v \d+/.test(line) || /\\c \d+/.test(line)) {
          if (reference.verse) break;
        }

        const cleanLine = line
          .replace(/\\[a-z]+[*]?\s*/g, "")
          .replace(/\s+/g, " ")
          .trim();

        if (cleanLine) {
          text += cleanLine + " ";
        }
      }
    }

    return text.trim();
  } catch (error) {
    console.error("Error extracting verse from USFM:", error);
    return "";
  }
}

exports.handler = async (event, context) => {
  console.log("Fetch resources requested");

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
  };

  // Handle CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        error: "Method not allowed",
        message: "This endpoint only accepts GET requests",
      }),
    };
  }

  try {
    const {
      reference,
      lang = "en",
      org = "unfoldingWord",
      resources = "scripture",
    } = event.queryStringParameters || {};

    if (!reference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Bad request",
          message: "Reference parameter is required (e.g., ?reference=John 3:16)",
        }),
      };
    }

    // Parse the reference
    const parsedReference = parseReference(reference);
    if (!parsedReference) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: "Invalid reference",
          message:
            'Could not parse the Bible reference. Try formats like "John 3:16" or "Genesis 1:1"',
        }),
      };
    }

    // Fetch resources
    const result = {
      reference: parsedReference,
      metadata: {
        language: lang,
        organization: org,
        timestamp: new Date().toISOString(),
        cached: false,
      },
    };

    // Fetch scripture if requested
    if (resources.includes("scripture")) {
      const scripture = await fetchBibleText(parsedReference, lang, org);
      if (scripture) {
        result.scripture = scripture;
      }
    }

    // Add some mock data for other resources
    if (resources.includes("notes")) {
      result.translationNotes = [
        {
          reference: parsedReference.citation,
          quote: "example word",
          note: "This is a sample translation note. In a full implementation, this would come from the DCS API.",
        },
      ];
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result, null, 2),
    };
  } catch (error) {
    console.error("Fetch resources error:", error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: "Internal server error",
        message: "Failed to fetch resources",
        timestamp: new Date().toISOString(),
      }),
    };
  }
};
