import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import globals from "globals";
import ts from "typescript-eslint";

export default ts.config(
  js.configs.recommended,
  ...ts.configs.recommended,
  prettierConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    rules: {
      "no-undef": "off", // TypeScript handles this better
      "@typescript-eslint/no-explicit-any": "off", // We know what we're doing
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // TERMINOLOGY ENFORCEMENT RULES
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/[Gg]ate" + "way [Ll]ang" + "uage/]",
          message:
            'Use "Strategic Language" instead of the deprecated GL term per UW guidelines',
        },
        {
          selector: "Identifier[name=/.*[Gg]ate" + "way[Ll]ang" + "uage.*/]",
          message:
            'Use "StrategicLanguage" instead of the deprecated GL identifier per UW guidelines',
        },
        {
          selector: 'Property[key.name="is' + "Gateway" + 'Language"]',
          message:
            'Use "isStrategicLanguage" instead of the deprecated isGL property',
        },
      ],

      "no-restricted-properties": [
        "error",
        {
          object: "*",
          property: "is" + "Gateway" + "Language",
          message:
            'Use "isStrategicLanguage" instead of the deprecated isGL property',
        },
      ],

      // ENCOURAGE PROPER UW TERMINOLOGY
      "prefer-const": "error",
      "no-var": "error",

      // Custom rule to encourage UW resource types
      "no-restricted-globals": [
        "warn",
        {
          name: "scripture",
          message:
            "Consider using specific UW resource types: ULT, UST, TN, TW, TWL, TQ, TA",
        },
      ],
    },
  },
  {
    // Specific rules for API handlers
    files: ["src/functions/handlers/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'Property[key.name="description"] Literal[value=/Bible texts/]',
          message:
            'Use UW-specific descriptions: "ULT/GLT (Literal)" or "UST/GST (Simplified)"',
        },
        {
          selector:
            'Property[key.name="description"] Literal[value=/various translations/]',
          message:
            'Be specific about UW resource types instead of generic "translations"',
        },
      ],
    },
  },
  {
    // Specific rules for types
    files: ["src/types/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TSPropertySignature[key.name="is' + "Gateway" + 'Language"]',
          message:
            'Use "isStrategicLanguage" instead of the deprecated isGL property',
        },
      ],
    },
  },
  {
    // Allow console in development files
    files: ["**/*.test.ts", "scripts/**/*.js"],
    rules: {
      "no-console": "off",
    },
  },
  {
    // Ignore generated files and external dependencies
    ignores: [
      "node_modules/**",
      "dist/**",
      "build/**",
      ".next/**",
      ".svelte-kit/**",
      "coverage/**",
      "*.min.js",
      "ui/build/**",
      "ui/dist/**",
      "ui/.svelte-kit/**",
      "**/build/**",
      "**/dist/**",
      "**/*.min.js",
      "**/vite.config.ts.timestamp-*",
    ],
  },
);
