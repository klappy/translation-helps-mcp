export const config = {
  runtime: "edge",
};

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  try {
    // Direct fetch from DCS API
    const catalogUrl =
      "https://git.door43.org/api/v1/catalog/search?subject=TSV%20Translation%20Questions&lang=en&owner=unfoldingWord&metadataType=rc&includeMetadata=true";
    const catalogResponse = await fetch(catalogUrl);
    const catalogData = await catalogResponse.json();

    // Direct fetch TSV file
    const tsvUrl =
      "https://git.door43.org/unfoldingWord/en_tq/raw/branch/master/tq_TIT.tsv";
    const tsvResponse = await fetch(tsvUrl);
    const tsvData = await tsvResponse.text();

    // Parse TSV for Titus 1:1
    const lines = tsvData.split("\n");
    const titusQuestions = [];

    for (const line of lines) {
      if (line.startsWith("1:1\t")) {
        const cols = line.split("\t");
        titusQuestions.push({
          reference: cols[0],
          id: cols[1],
          question: cols[5],
          response: cols[6],
        });
      }
    }

    return json({
      debug: {
        catalogResources: catalogData.data?.length || 0,
        firstResource: catalogData.data?.[0],
        tsvLines: lines.length,
        titus11Questions: titusQuestions,
        ingredientsCheck: catalogData.data?.[0]?.ingredients?.find(
          (i: any) => i.identifier?.toLowerCase() === "tit",
        ),
      },
    });
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
};
