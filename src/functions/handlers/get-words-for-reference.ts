/**
 * Platform-agnostic Get Words for Reference Handler
 * Can be used by both Netlify and SvelteKit/Cloudflare
 */

import { Errors } from "../../utils/errorEnvelope.js";
import type {
  PlatformHandler,
  PlatformRequest,
  PlatformResponse,
} from "../platform-adapter";
import { fetchWordLinks } from "../word-links-service";

export const getWordsForReferenceHandler: PlatformHandler = async (
  request: PlatformRequest,
): Promise<PlatformResponse> => {
  const startTime = Date.now();

  // Handle CORS
  if (request.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Content-Type, Cache-Control, X-Cache-Bypass, X-Force-Refresh",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      },
      body: "",
    };
  }

  try {
    const referenceParam = request.queryStringParameters.reference;
    const language = request.queryStringParameters.language || "en";
    const organization =
      request.queryStringParameters.organization || "unfoldingWord";

    if (!referenceParam) {
      return {
        statusCode: 400,
        body: JSON.stringify(Errors.missingParameter("reference")),
      };
    }

    // Get word links for the reference
    const result = await fetchWordLinks({
      reference: referenceParam,
      language,
      organization,
    });

    // Derive simplified words array from TWL links for convenience
    const rows = Array.isArray(
      (result as unknown as { links?: unknown[] }).links,
    )
      ? (result as unknown as { links: Array<Record<string, string>> }).links ||
        []
      : [];

    const aggregate: Record<
      string,
      { term: string; path: string; occurrences: number; category?: string }
    > = {};

    for (const row of rows) {
      const twLink = row.TWLink || row["TWLink"] || "";
      // Accept any category under bible/* and derive term
      // rc://*/tw/dict/bible/<category>/<term>
      const str = String(twLink);
      let rel: string | null = null;
      const m = str.match(/rc:\/\/\*\/tw\/dict\/(bible\/[\^\s]+)$/i);
      if (m) {
        rel = m[1];
      } else if (str.includes("/tw/dict/")) {
        // Fallback: take the last two segments after /tw/dict/
        const after = str.split("/tw/dict/")[1] || "";
        const segs = after.split("/").filter(Boolean);
        if (segs.length >= 2)
          rel = `bible/${segs[segs.length - 2]}/${segs[segs.length - 1]}`;
      }
      if (!rel) continue;
      const parts = rel.split("/");
      const category = parts[1];
      const term = parts[2];
      const path = `${rel}.md`;
      const key = rel.toLowerCase();
      const occ =
        Number((row as any).Occurrence || (row as any)["Occurrence"] || 1) || 1;
      if (!aggregate[key]) {
        aggregate[key] = { term, path, occurrences: occ, category };
      } else {
        aggregate[key].occurrences += occ;
      }
    }

    const words = Object.values(aggregate);

    const duration = Date.now() - startTime;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify({
        ...result,
        words,
      }),
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "X-Response-Time": `${duration}ms`,
      },
      body: JSON.stringify(Errors.internal()),
    };
  }
};
