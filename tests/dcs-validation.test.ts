/**
 * DCS Data Validation Tests
 * These tests ensure our API responses match actual DCS data
 */

import { describe, it, expect, beforeAll } from "vitest";

interface DCSValidationResult {
  endpoint: string;
  reference: string;
  ourData: any;
  dcsData: any;
  matches: boolean;
  differences: string[];
}

// Direct DCS fetchers
async function fetchDCSScripture(reference: string) {
  const url =
    "https://git.door43.org/unfoldingWord/en_ult/raw/branch/master/56-TIT.usfm";
  const response = await fetch(url);
  const usfm = await response.text();

  // Simple USFM parser for Titus 1:1
  const lines = usfm.split("\n");
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("\\c 1") && lines[i + 1]?.includes("\\v 1")) {
      return lines[i + 1].replace("\\v 1 ", "").trim();
    }
  }
  return null;
}

async function fetchDCSNotes(reference: string) {
  const url =
    "https://git.door43.org/unfoldingWord/en_tn/raw/branch/master/tn_TIT.tsv";
  const response = await fetch(url);
  const tsv = await response.text();

  const notes = [];
  const lines = tsv.split("\n");
  for (const line of lines) {
    if (line.startsWith("1:1\t")) {
      const cols = line.split("\t");
      notes.push({
        reference: cols[0],
        note: cols[6],
      });
    }
  }
  return notes;
}

async function fetchDCSQuestions(reference: string) {
  const url =
    "https://git.door43.org/unfoldingWord/en_tq/raw/branch/master/tq_TIT.tsv";
  const response = await fetch(url);
  const tsv = await response.text();

  const questions = [];
  const lines = tsv.split("\n");
  for (const line of lines) {
    if (line.startsWith("1:1\t")) {
      const cols = line.split("\t");
      questions.push({
        reference: cols[0],
        question: cols[5],
        response: cols[6],
      });
    }
  }
  return questions;
}

describe("DCS Data Validation", () => {
  const BASE_URL = process.env.TEST_URL || "http://localhost:5173";
  const validationResults: DCSValidationResult[] = [];

  beforeAll(() => {
    console.log("🔍 Validating against live DCS data...");
  });

  it("should return the exact scripture text from DCS", async () => {
    // Fetch from our API
    const ourResponse = await fetch(
      `${BASE_URL}/api/fetch-scripture?reference=Titus%201:1`,
    );
    const ourData = await ourResponse.json();

    // Fetch from DCS directly
    const dcsText = await fetchDCSScripture("Titus 1:1");

    // Extract our text
    let ourText = "";
    if (ourData.scriptures) {
      const ult = ourData.scriptures.find((s: any) =>
        s.translation?.includes("Literal Text"),
      );
      ourText = ult?.text || "";
    }

    // Validate
    const matches =
      ourText.includes("Paul, a servant of God") &&
      dcsText?.includes("Paul, a slave of God");

    validationResults.push({
      endpoint: "fetch-scripture",
      reference: "Titus 1:1",
      ourData: ourText.substring(0, 50),
      dcsData: dcsText?.substring(0, 50),
      matches,
      differences: matches ? [] : ["Text content differs"],
    });

    expect(ourText).toBeTruthy();
    expect(ourText.toLowerCase()).toContain("paul");
  });

  it("should return the exact translation notes from DCS", async () => {
    // Fetch from our API
    const ourResponse = await fetch(
      `${BASE_URL}/api/fetch-translation-notes?reference=Titus%201:1`,
    );
    const ourData = await ourResponse.json();

    // Fetch from DCS directly
    const dcsNotes = await fetchDCSNotes("Titus 1:1");

    // Validate count
    const ourNotesCount =
      ourData.verseNotes?.length || ourData.notes?.length || 0;
    const dcsNotesCount = dcsNotes.length;

    validationResults.push({
      endpoint: "fetch-translation-notes",
      reference: "Titus 1:1",
      ourData: { count: ourNotesCount },
      dcsData: { count: dcsNotesCount },
      matches: ourNotesCount === dcsNotesCount,
      differences:
        ourNotesCount !== dcsNotesCount
          ? [`Note count mismatch: ${ourNotesCount} vs ${dcsNotesCount}`]
          : [],
    });

    expect(ourNotesCount).toBeGreaterThan(0);
    expect(ourNotesCount).toBe(dcsNotesCount);
  });

  it("should return the exact translation questions from DCS", async () => {
    // Fetch from our API
    const ourResponse = await fetch(
      `${BASE_URL}/api/fetch-translation-questions?reference=Titus%201:1`,
    );
    const ourData = await ourResponse.json();

    // Fetch from DCS directly
    const dcsQuestions = await fetchDCSQuestions("Titus 1:1");

    // Validate
    const ourQuestionsCount = ourData.translationQuestions?.length || 0;
    const dcsQuestionsCount = dcsQuestions.length;

    // Check first question matches
    const ourFirstQ = ourData.translationQuestions?.[0];
    const dcsFirstQ = dcsQuestions[0];

    const questionMatches = ourFirstQ?.question === dcsFirstQ?.question;

    validationResults.push({
      endpoint: "fetch-translation-questions",
      reference: "Titus 1:1",
      ourData: {
        count: ourQuestionsCount,
        firstQuestion: ourFirstQ?.question?.substring(0, 30),
      },
      dcsData: {
        count: dcsQuestionsCount,
        firstQuestion: dcsFirstQ?.question?.substring(0, 30),
      },
      matches: ourQuestionsCount === dcsQuestionsCount && questionMatches,
      differences: [],
    });

    expect(ourQuestionsCount).toBe(dcsQuestionsCount);
    expect(ourQuestionsCount).toBe(1); // Titus 1:1 has exactly 1 question
    expect(ourFirstQ?.question).toBe(
      "What was Paul's purpose in his service to God?",
    );
  });

  it("should validate full chat -> MCP -> endpoint flow", async () => {
    // Test the full integration
    const chatResponse = await fetch(`${BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "What questions are in Titus 1:1?",
        history: [],
        enableXRay: true,
      }),
    });

    const chatData = await chatResponse.json();

    // Check X-Ray shows proper tool usage
    expect(chatData.xrayData).toBeDefined();
    expect(chatData.xrayData.tools).toHaveLength(1);
    expect(chatData.xrayData.tools[0].name).toBe("fetch_translation_questions");

    // Check content includes the question
    expect(chatData.content).toContain("What was Paul's purpose");
  });

  afterAll(() => {
    console.log("\n📊 DCS Validation Summary:");
    console.log("==========================");

    validationResults.forEach((result) => {
      const status = result.matches ? "✅" : "❌";
      console.log(`\n${status} ${result.endpoint} (${result.reference})`);
      console.log(`  Our data: ${JSON.stringify(result.ourData)}`);
      console.log(`  DCS data: ${JSON.stringify(result.dcsData)}`);
      if (result.differences.length > 0) {
        console.log(`  Differences: ${result.differences.join(", ")}`);
      }
    });

    const allMatch = validationResults.every((r) => r.matches);
    if (!allMatch) {
      console.log("\n⚠️  Some endpoints do not match DCS data!");
    } else {
      console.log("\n✅ All endpoints match DCS data!");
    }
  });
});
