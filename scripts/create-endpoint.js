#!/usr/bin/env node

/**
 * Endpoint Generator Script
 *
 * Creates new v2 endpoints following our established patterns.
 * Ensures consistency, includes tests, and follows best practices.
 */

import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import readline from "readline";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Terminal interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper to ask questions
const question = (query) =>
  new Promise((resolve) => rl.question(query, resolve));

// Endpoint templates
const templates = {
  scripture: {
    name: "Scripture Endpoint",
    description: "Returns Bible text in various formats",
    responseType: "scripture",
    imports: `import { createScriptureResponse } from '$lib/standardResponses.js';`,
  },
  translationHelps: {
    name: "Translation Helps Endpoint",
    description: "Returns translation notes, words, questions, etc.",
    responseType: "translationHelps",
    imports: `import { createTranslationHelpsResponse } from '$lib/standardResponses.js';`,
  },
  list: {
    name: "List Endpoint",
    description: "Returns a list of items (languages, books, resources)",
    responseType: "list",
    imports: `import { createListResponse } from '$lib/standardResponses.js';`,
  },
  utility: {
    name: "Utility Endpoint",
    description: "Performs a specific action or transformation",
    responseType: "custom",
    imports: ``,
  },
};

// Parameter presets
const _parameterPresets = {
  reference: "COMMON_PARAMS.reference",
  language: "COMMON_PARAMS.language",
  organization: "COMMON_PARAMS.organization",
  custom: "{ name: 'paramName', type: 'string', required: true }",
};

async function main() {
  console.log(
    chalk.bold.cyan("\n🚀 Translation Helps MCP - Endpoint Generator\n"),
  );

  // Get endpoint name
  const endpointName = await question(
    chalk.yellow("Endpoint name (e.g., fetch-commentaries): "),
  );
  if (!endpointName || !endpointName.match(/^[a-z-]+$/)) {
    console.error(
      chalk.red(
        "Invalid endpoint name. Use lowercase letters and hyphens only.",
      ),
    );
    process.exit(1);
  }

  // Select template type
  console.log(chalk.yellow("\nSelect endpoint type:"));
  Object.entries(templates).forEach(([_key, template], index) => {
    console.log(`  ${index + 1}. ${template.name} - ${template.description}`);
  });

  const typeIndex =
    parseInt(await question(chalk.yellow("Enter number: "))) - 1;
  const templateKey = Object.keys(templates)[typeIndex];
  const template = templates[templateKey];

  if (!template) {
    console.error(chalk.red("Invalid selection."));
    process.exit(1);
  }

  // Get description
  const description = await question(chalk.yellow("\nBrief description: "));

  // Get parameters
  console.log(chalk.yellow("\nSelect parameters (comma-separated):"));
  console.log("  1. reference");
  console.log("  2. language");
  console.log("  3. organization");
  console.log("  4. custom");

  const paramChoices = (await question(chalk.yellow("Enter numbers: ")))
    .split(",")
    .map((n) => n.trim());
  const parameters = [];

  for (const choice of paramChoices) {
    switch (choice) {
      case "1":
        parameters.push("reference");
        break;
      case "2":
        parameters.push("language");
        break;
      case "3":
        parameters.push("organization");
        break;
      case "4": {
        const paramName = await question(
          chalk.yellow("Custom parameter name: "),
        );
        const paramType = await question(
          chalk.yellow("Parameter type (string/boolean/number): "),
        );
        const paramRequired =
          (await question(chalk.yellow("Required? (y/n): "))).toLowerCase() ===
          "y";
        parameters.push({
          name: paramName,
          type: paramType,
          required: paramRequired,
        });
        break;
      }
    }
  }

  // Generate the endpoint
  console.log(chalk.cyan("\n📝 Generating endpoint...\n"));

  const endpointPath = path.join(
    __dirname,
    "..",
    "ui",
    "src",
    "routes",
    "api",
    "v2",
    endpointName,
  );
  const endpointFile = path.join(endpointPath, "+server.ts");

  // Create directory
  await fs.mkdir(endpointPath, { recursive: true });

  // Generate endpoint code
  const endpointCode = generateEndpointCode(
    endpointName,
    description,
    template,
    parameters,
  );
  await fs.writeFile(endpointFile, endpointCode);
  console.log(chalk.green(`✅ Created ${endpointFile}`));

  // Generate test file
  const testFile = path.join(
    __dirname,
    "..",
    "tests",
    "endpoints",
    `${endpointName}.test.ts`,
  );
  const testCode = generateTestCode(endpointName, description, parameters);
  await fs.writeFile(testFile, testCode);
  console.log(chalk.green(`✅ Created ${testFile}`));

  // Update contract tests
  await updateContractTests(endpointName, description, parameters);
  console.log(chalk.green(`✅ Updated contract tests`));

  // Success message
  console.log(chalk.bold.green(`\n✨ Endpoint created successfully!\n`));
  console.log(chalk.cyan("Next steps:"));
  console.log(
    `  1. Implement the fetch function in ${chalk.yellow(endpointFile)}`,
  );
  console.log(`  2. Run tests: ${chalk.yellow(`npm test ${endpointName}`)}`);
  console.log(`  3. Update API documentation`);
  console.log(
    `  4. Test the endpoint: ${chalk.yellow(`curl http://localhost:8174/api/v2/${endpointName}`)}`,
  );

  rl.close();
}

function generateEndpointCode(name, description, template, parameters) {
  const paramImports = parameters.some((p) => typeof p === "string")
    ? "import { COMMON_PARAMS } from '$lib/commonValidators.js';"
    : "";

  const paramDefinitions = parameters
    .map((param) => {
      if (typeof param === "string") {
        return `    COMMON_PARAMS.${param}`;
      } else {
        return `    {
      name: '${param.name}',
      type: '${param.type}',
      required: ${param.required}
    }`;
      }
    })
    .join(",\n");

  const responseFunction =
    template.responseType === "custom"
      ? `return {
    // TODO: Implement response structure
    data: [],
    metadata: {
      totalCount: 0
    }
  };`
      : `return create${template.responseType.charAt(0).toUpperCase() + template.responseType.slice(1)}Response(data, {
    // TODO: Add metadata
  });`;

  return `/**
 * ${name} Endpoint v2
 *
 * ${description}
 */

import { createCORSHandler, createSimpleEndpoint } from '$lib/simpleEndpoint.js';
${paramImports}
import { createStandardErrorHandler } from '$lib/commonErrorHandlers.js';
${template.imports}

export const config = {
  runtime: 'edge'
};

/**
 * Fetch data for ${name}
 */
async function fetch${name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")}(
  params: Record<string, any>,
  _request: Request
): Promise<any> {
  const { ${parameters.map((p) => (typeof p === "string" ? p : p.name)).join(", ")} } = params;
  
  // TODO: Implement data fetching logic
  const data = [];
  
  ${responseFunction}
}

// Create the endpoint
export const GET = createSimpleEndpoint({
  name: '${name}-v2',
  
  params: [
${paramDefinitions}
  ],
  
  fetch: fetch${name
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("")},
  
  onError: createStandardErrorHandler({
    // TODO: Add custom error mappings
  })
});

// CORS handler
export const OPTIONS = createCORSHandler();
`;
}

function generateTestCode(name, description, parameters) {
  return `/**
 * Tests for ${name} endpoint
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { startTestServer, stopTestServer, makeRequest } from '../test-utils';

describe('${name} endpoint', () => {
  beforeAll(async () => {
    await startTestServer();
  });
  
  afterAll(async () => {
    await stopTestServer();
  });
  
  it('should return data for valid parameters', async () => {
    const response = await makeRequest('/api/v2/${name}', {
      ${parameters
        .map((p) => {
          const paramName = typeof p === "string" ? p : p.name;
          if (paramName === "reference") return "reference: 'John 3:16'";
          if (paramName === "language") return "language: 'en'";
          if (paramName === "organization")
            return "organization: 'unfoldingWord'";
          return `${paramName}: 'test-value'`;
        })
        .join(",\n      ")}
    });
    
    expect(response.status).toBe(200);
    expect(response.data).toBeDefined();
    expect(response.data.metadata).toBeDefined();
  });
  
  it('should handle missing required parameters', async () => {
    const response = await makeRequest('/api/v2/${name}', {});
    
    expect(response.status).toBe(400);
    expect(response.data.error).toBeDefined();
  });
  
  it('should handle invalid parameters gracefully', async () => {
    const response = await makeRequest('/api/v2/${name}', {
      ${
        parameters.find(
          (p) =>
            p === "reference" ||
            (typeof p === "object" && p.name === "reference"),
        )
          ? "reference: 'Not a valid reference!'"
          : "invalidParam: 'test'"
      }
    });
    
    expect(response.status).toBe(400);
    expect(response.data.error).toBeDefined();
  });
});
`;
}

async function updateContractTests(name, description, parameters) {
  const contractTestPath = path.join(
    __dirname,
    "..",
    "tests",
    "contracts",
    "v2-endpoints.contract.test.ts",
  );
  const contractTest = await fs.readFile(contractTestPath, "utf-8");

  // Find the right place to insert the new test
  const insertPoint = contractTest.lastIndexOf("});") - 1;

  const newTest = `
  describe("${name}", () => {
    it("returns expected data structure", async () => {
      const result = await fetchEndpoint("/${name}", {
        ${parameters
          .map((p) => {
            const paramName = typeof p === "string" ? p : p.name;
            if (paramName === "reference") return 'reference: "John 3:16"';
            if (paramName === "language") return 'language: "en"';
            if (paramName === "organization")
              return 'organization: "unfoldingWord"';
            return `${paramName}: "test"`;
          })
          .join(",\n        ")}
      });
      
      expect(result.status).toBe(200);
      expect(result.data).toMatchSnapshot("${name}-response");
      expect(result.data).toHaveProperty("metadata");
    });
  });
`;

  const updatedTest =
    contractTest.slice(0, insertPoint) +
    newTest +
    contractTest.slice(insertPoint);
  await fs.writeFile(contractTestPath, updatedTest);
}

// Run the script
main().catch((error) => {
  console.error(chalk.red("Error:"), error);
  process.exit(1);
});
