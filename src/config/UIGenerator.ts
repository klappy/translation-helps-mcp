/**
 * UI Generator for MCP Tools
 *
 * Generates consistent UI components from endpoint configurations
 * for the MCP Tools page.
 */

import type { EndpointConfig, ParamConfig } from "./EndpointConfig";
import { EndpointRegistry } from "./EndpointRegistry";

export interface UIComponent {
  type: "form" | "display" | "metrics";
  config: any;
}

export interface EndpointUI {
  name: string;
  description: string;
  category: "core" | "experimental";
  parameterForm: ParameterFormConfig;
  examples: ExampleConfig[];
  responseDisplay: ResponseDisplayConfig;
  performanceMetrics: MetricsConfig;
}

export interface ParameterFormConfig {
  fields: FormFieldConfig[];
  submitLabel: string;
}

export interface FormFieldConfig {
  name: string;
  label: string;
  type: "text" | "number" | "select" | "checkbox";
  placeholder?: string;
  options?: { value: string; label: string }[];
  required: boolean;
  defaultValue?: any;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
  };
  helpText?: string;
}

export interface ExampleConfig {
  title: string;
  params: Record<string, any>;
  description?: string;
}

export interface ResponseDisplayConfig {
  type: "json" | "text" | "table" | "custom";
  syntaxHighlight: boolean;
  collapsible: boolean;
  fields?: string[]; // Specific fields to display
}

export interface MetricsConfig {
  showResponseTime: boolean;
  showCacheStatus: boolean;
  showDataSource: boolean;
  showRequestSize: boolean;
}

/**
 * Generate UI configuration for an endpoint
 */
export function generateEndpointUI(config: EndpointConfig): EndpointUI {
  return {
    name: config.name,
    description: config.description,
    category: config.category,
    parameterForm: generateParameterForm(config),
    examples: generateExamples(config),
    responseDisplay: generateResponseDisplay(config),
    performanceMetrics: generateMetricsConfig(config),
  };
}

/**
 * Generate parameter form configuration
 */
function generateParameterForm(config: EndpointConfig): ParameterFormConfig {
  const fields: FormFieldConfig[] = [];

  for (const [name, paramConfig] of Object.entries(config.params)) {
    if (!paramConfig) continue;

    fields.push(generateFormField(name, paramConfig));
  }

  return {
    fields,
    submitLabel: "Execute",
  };
}

/**
 * Generate form field configuration
 */
function generateFormField(name: string, param: ParamConfig): FormFieldConfig {
  const field: FormFieldConfig = {
    name,
    label: formatLabel(name),
    type: mapParamTypeToFormType(param.type),
    required: param.required,
    defaultValue: param.default,
    helpText: param.description,
  };

  // Add placeholder for text fields
  if (field.type === "text") {
    field.placeholder = generatePlaceholder(name, param);
  }

  // Add options for enum validation
  if (param.validation?.enum) {
    field.type = "select";
    field.options = param.validation.enum.map((value) => ({
      value,
      label: formatLabel(value),
    }));
  }

  // Add validation rules
  if (param.validation) {
    field.validation = {
      pattern: param.validation.pattern,
      min: param.validation.min,
      max: param.validation.max,
    };
  }

  return field;
}

/**
 * Map parameter type to form field type
 */
function mapParamTypeToFormType(paramType: string): FormFieldConfig["type"] {
  switch (paramType) {
    case "number":
      return "number";
    case "boolean":
      return "checkbox";
    default:
      return "text";
  }
}

/**
 * Generate placeholder text
 */
function generatePlaceholder(name: string, param: ParamConfig): string {
  switch (name) {
    case "reference":
      return "e.g., John 3:16 or Romans 1:1-5";
    case "language":
      return "e.g., en, es, fr";
    case "organization":
      return "e.g., unfoldingWord";
    case "resource":
      return "e.g., ult, ust, tn, tw";
    default:
      return `Enter ${formatLabel(name).toLowerCase()}`;
  }
}

/**
 * Format parameter name as label
 */
function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Generate examples configuration
 */
function generateExamples(config: EndpointConfig): ExampleConfig[] {
  return config.examples.map((example, index) => ({
    title: example.description || `Example ${index + 1}`,
    params: example.params,
    description: generateExampleDescription(example.params),
  }));
}

/**
 * Generate example description
 */
function generateExampleDescription(params: Record<string, any>): string {
  const parts: string[] = [];

  if (params.reference) {
    parts.push(`Reference: ${params.reference}`);
  }
  if (params.language && params.language !== "en") {
    parts.push(`Language: ${params.language}`);
  }
  if (params.resource) {
    parts.push(`Resource: ${params.resource}`);
  }

  return parts.join(", ");
}

/**
 * Generate response display configuration
 */
function generateResponseDisplay(config: EndpointConfig): ResponseDisplayConfig {
  const shapeType = config.responseShape.type;

  switch (shapeType) {
    case "scripture":
      return {
        type: "text",
        syntaxHighlight: false,
        collapsible: true,
        fields: ["text", "reference", "version"],
      };

    case "notes":
    case "questions":
      return {
        type: "table",
        syntaxHighlight: false,
        collapsible: true,
        fields: ["reference", "content"],
      };

    case "words":
      return {
        type: "custom",
        syntaxHighlight: true,
        collapsible: true,
        fields: ["term", "definition"],
      };

    default:
      return {
        type: "json",
        syntaxHighlight: true,
        collapsible: true,
      };
  }
}

/**
 * Generate metrics configuration
 */
function generateMetricsConfig(config: EndpointConfig): MetricsConfig {
  return {
    showResponseTime: true,
    showCacheStatus: true,
    showDataSource: config.dataSource.type === "dcs",
    showRequestSize: true,
  };
}

/**
 * Generate UI for all endpoints
 */
export function generateAllEndpointUIs(): Map<string, EndpointUI> {
  const uis = new Map<string, EndpointUI>();

  for (const config of EndpointRegistry.getAll()) {
    uis.set(config.name, generateEndpointUI(config));
  }

  return uis;
}

/**
 * Generate UI by category
 */
export function generateUIByCategory(category: "core" | "experimental"): EndpointUI[] {
  return EndpointRegistry.getByCategory(category).map((config) => generateEndpointUI(config));
}
