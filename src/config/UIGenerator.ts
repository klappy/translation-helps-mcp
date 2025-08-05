/**
 * UI Generator
 * 
 * Auto-generates consistent UI components from endpoint configurations
 * for the MCP Tools page, ensuring uniform parameter inputs, examples,
 * response displays, and error handling across all endpoints.
 */

import type { 
  EndpointConfig, 
  ParamConfig, 
  RealDataExample,
  UIComponentConfig 
} from './EndpointConfig.js';

/**
 * Generated UI component structure
 */
export interface GeneratedUIComponent {
  /** Component type identifier */
  type: 'parameter-form' | 'example-selector' | 'response-display' | 'performance-metrics';
  
  /** Component configuration */
  config: UIComponentConfig | ParameterFormConfig | ExampleSelectorConfig | ResponseDisplayConfig;
  
  /** Associated endpoint configuration */
  endpointConfig: EndpointConfig;
  
  /** Generated at timestamp */
  generatedAt: string;
}

/**
 * Parameter form configuration
 */
export interface ParameterFormConfig {
  /** Form field configurations */
  fields: FormFieldConfig[];
  
  /** Form-level validation rules */
  validation: {
    /** Required field combinations */
    requiredCombinations?: string[][];
    
    /** Conditional requirements */
    conditionalRequirements?: ConditionalRequirement[];
    
    /** Cross-field validations */
    crossFieldValidations?: CrossFieldValidation[];
  };
  
  /** Default values */
  defaults: Record<string, unknown>;
  
  /** Form submission endpoint */
  submitEndpoint: string;
}

/**
 * Individual form field configuration
 */
export interface FormFieldConfig {
  /** Field name (matches parameter name) */
  name: string;
  
  /** Display label */
  label: string;
  
  /** Field type for UI rendering */
  type: 'text' | 'number' | 'select' | 'multiselect' | 'boolean' | 'textarea' | 'tags';
  
  /** Help text or description */
  description: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Whether field is required */
  required: boolean;
  
  /** Default value */
  defaultValue?: unknown;
  
  /** Select options (for select/multiselect types) */
  options?: Array<{ value: string; label: string; description?: string }>;
  
  /** Validation configuration */
  validation?: {
    /** Regex pattern for validation */
    pattern?: string;
    
    /** Minimum/maximum values or lengths */
    min?: number;
    max?: number;
    
    /** Custom validation message */
    message?: string;
  };
  
  /** Conditional display rules */
  conditional?: {
    /** Show only when this field has these values */
    showWhen?: Record<string, unknown[]>;
    
    /** Hide when this field has these values */
    hideWhen?: Record<string, unknown[]>;
  };
  
  /** UI styling hints */
  styling?: {
    /** Width class (e.g., 'full', 'half', 'third') */
    width?: string;
    
    /** Additional CSS classes */
    className?: string;
    
    /** Icon to display */
    icon?: string;
  };
}

/**
 * Conditional requirement definition
 */
export interface ConditionalRequirement {
  /** When this field has these values */
  when: Record<string, unknown[]>;
  
  /** These fields become required */
  require: string[];
  
  /** Human-readable explanation */
  message: string;
}

/**
 * Cross-field validation definition
 */
export interface CrossFieldValidation {
  /** Fields involved in validation */
  fields: string[];
  
  /** Validation function name */
  validator: string;
  
  /** Error message for validation failure */
  message: string;
}

/**
 * Example selector configuration
 */
export interface ExampleSelectorConfig {
  /** Available examples */
  examples: ProcessedExample[];
  
  /** Default selected example */
  defaultExample?: string;
  
  /** Whether to show example descriptions */
  showDescriptions: boolean;
  
  /** Whether to allow custom parameters */
  allowCustom: boolean;
}

/**
 * Processed example for UI display
 */
export interface ProcessedExample {
  /** Unique identifier */
  id: string;
  
  /** Display name */
  name: string;
  
  /** Human-readable description */
  description: string;
  
  /** Parameter values for this example */
  parameters: Record<string, unknown>;
  
  /** Expected response characteristics */
  expectedResponse: {
    /** Response time estimate */
    estimatedMs: number;
    
    /** Content validation hints */
    contentHints: string[];
    
    /** Fields that should be present */
    expectedFields: string[];
  };
  
  /** Tags for categorization */
  tags: string[];
}

/**
 * Response display configuration
 */
export interface ResponseDisplayConfig {
  /** Response structure definition */
  structure: ResponseStructureConfig;
  
  /** Performance display settings */
  performance: PerformanceDisplayConfig;
  
  /** Error handling display */
  errorHandling: ErrorDisplayConfig;
  
  /** Content formatting options */
  formatting: ContentFormattingConfig;
}

/**
 * Response structure display configuration
 */
export interface ResponseStructureConfig {
  /** Primary data fields to highlight */
  primaryFields: string[];
  
  /** Metadata fields to display */
  metadataFields: string[];
  
  /** Fields to expand by default */
  expandedFields: string[];
  
  /** Fields to hide initially */
  collapsedFields: string[];
  
  /** Field display customizations */
  fieldCustomizations: Record<string, FieldDisplayCustomization>;
}

/**
 * Field display customization
 */
export interface FieldDisplayCustomization {
  /** Custom label for field */
  label?: string;
  
  /** Custom formatter function name */
  formatter?: string;
  
  /** Icon to show next to field */
  icon?: string;
  
  /** Color coding for field value */
  colorScheme?: 'default' | 'success' | 'warning' | 'error' | 'info';
  
  /** Whether field is copyable */
  copyable?: boolean;
}

/**
 * Performance display configuration
 */
export interface PerformanceDisplayConfig {
  /** Show response time */
  showResponseTime: boolean;
  
  /** Show cache status */
  showCacheStatus: boolean;
  
  /** Show performance metrics graph */
  showMetricsGraph: boolean;
  
  /** Performance thresholds for color coding */
  thresholds: {
    /** Good performance threshold (ms) */
    good: number;
    
    /** Warning threshold (ms) */
    warning: number;
    
    /** Error threshold (ms) */
    error: number;
  };
}

/**
 * Error display configuration
 */
export interface ErrorDisplayConfig {
  /** Show detailed error information */
  showDetails: boolean;
  
  /** Show suggested solutions */
  showSuggestions: boolean;
  
  /** Show retry options */
  showRetry: boolean;
  
  /** Custom error message mappings */
  customMessages: Record<string, string>;
}

/**
 * Content formatting configuration
 */
export interface ContentFormattingConfig {
  /** Default JSON formatting options */
  json: {
    /** Indentation spaces */
    indent: number;
    
    /** Whether to sort keys */
    sortKeys: boolean;
    
    /** Maximum display length before truncation */
    maxLength?: number;
  };
  
  /** Text formatting options */
  text: {
    /** Whether to preserve whitespace */
    preserveWhitespace: boolean;
    
    /** Maximum lines before truncation */
    maxLines?: number;
  };
  
  /** Array formatting options */
  arrays: {
    /** Maximum items to show initially */
    maxInitialItems: number;
    
    /** Whether to show array length */
    showLength: boolean;
  };
}

/**
 * UI Generator Class
 */
export class UIGenerator {
  
  /**
   * Generate parameter form configuration from endpoint config
   */
  generateParameterForm(config: EndpointConfig): ParameterFormConfig {
    const fields: FormFieldConfig[] = [];
    const defaults: Record<string, unknown> = {};

    // Process each parameter configuration
    for (const [paramName, paramConfig] of Object.entries(config.params)) {
      const field = this.createFormField(paramName, paramConfig);
      fields.push(field);
      
      if (paramConfig.default !== undefined) {
        defaults[paramName] = paramConfig.default;
      }
    }

    // Sort fields by required status, then alphabetically
    fields.sort((a, b) => {
      if (a.required !== b.required) {
        return a.required ? -1 : 1;
      }
      return a.label.localeCompare(b.label);
    });

    return {
      fields,
      validation: {
        requiredCombinations: this.detectRequiredCombinations(config),
        conditionalRequirements: this.detectConditionalRequirements(config),
        crossFieldValidations: this.detectCrossFieldValidations(config),
      },
      defaults,
      submitEndpoint: config.path,
    };
  }

  /**
   * Create form field configuration from parameter config
   */
  private createFormField(paramName: string, paramConfig: ParamConfig): FormFieldConfig {
    const field: FormFieldConfig = {
      name: paramName,
      label: this.generateFieldLabel(paramName),
      type: this.mapParameterTypeToFieldType(paramConfig),
      description: paramConfig.description,
      required: paramConfig.required,
      defaultValue: paramConfig.default,
      validation: this.createFieldValidation(paramConfig),
      styling: this.createFieldStyling(paramName, paramConfig),
    };

    // Add placeholder text
    if (paramConfig.example !== undefined) {
      field.placeholder = `e.g., ${paramConfig.example}`;
    }

    // Add options for select fields
    if (paramConfig.options && paramConfig.options.length > 0) {
      field.options = paramConfig.options.map(option => ({
        value: option,
        label: this.formatOptionLabel(option),
        description: this.generateOptionDescription(option, paramName),
      }));
    }

    return field;
  }

  /**
   * Generate human-readable field label from parameter name
   */
  private generateFieldLabel(paramName: string): string {
    return paramName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/\b\w/g, str => str.toUpperCase());
  }

  /**
   * Map parameter type to UI field type
   */
  private mapParameterTypeToFieldType(paramConfig: ParamConfig): FormFieldConfig['type'] {
    switch (paramConfig.type) {
      case 'boolean':
        return 'boolean';
      
      case 'number':
        return 'number';
      
      case 'array':
        if (paramConfig.options) {
          return 'multiselect';
        }
        return 'tags';
      
      case 'string':
        if (paramConfig.options) {
          return 'select';
        }
        if (paramConfig.max && paramConfig.max > 100) {
          return 'textarea';
        }
        return 'text';
      
      default:
        return 'text';
    }
  }

  /**
   * Create field validation configuration
   */
  private createFieldValidation(paramConfig: ParamConfig): FormFieldConfig['validation'] {
    const validation: FormFieldConfig['validation'] = {};

    if (paramConfig.pattern) {
      validation.pattern = paramConfig.pattern;
    }

    if (paramConfig.min !== undefined) {
      validation.min = paramConfig.min;
    }

    if (paramConfig.max !== undefined) {
      validation.max = paramConfig.max;
    }

    // Generate custom validation message
    if (paramConfig.options) {
      validation.message = `Must be one of: ${paramConfig.options.join(', ')}`;
    } else if (paramConfig.pattern) {
      validation.message = 'Invalid format';
    }

    return Object.keys(validation).length > 0 ? validation : undefined;
  }

  /**
   * Create field styling configuration
   */
  private createFieldStyling(paramName: string, paramConfig: ParamConfig): FormFieldConfig['styling'] {
    const styling: FormFieldConfig['styling'] = {};

    // Determine width based on parameter characteristics
    if (paramConfig.type === 'boolean') {
      styling.width = 'third';
    } else if (paramName === 'reference' || paramName === 'language') {
      styling.width = 'half';
    } else {
      styling.width = 'full';
    }

    // Add icons for common parameters
    const iconMap: Record<string, string> = {
      reference: '📖',
      language: '🌍',
      organization: '🏢',
      format: '📄',
      version: '🏷️',
    };

    if (iconMap[paramName]) {
      styling.icon = iconMap[paramName];
    }

    return styling;
  }

  /**
   * Format option label for select fields
   */
  private formatOptionLabel(option: string): string {
    return option
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  /**
   * Generate option description
   */
  private generateOptionDescription(option: string, paramName: string): string | undefined {
    // Common option descriptions
    const descriptions: Record<string, Record<string, string>> = {
      format: {
        text: 'Plain text format',
        usfm: 'USFM markup format',
        json: 'JSON data format',
        tsv: 'Tab-separated values',
      },
      language: {
        en: 'English',
        es: 'Spanish',
        fr: 'French',
        sw: 'Swahili',
      },
    };

    return descriptions[paramName]?.[option];
  }

  /**
   * Detect required field combinations from configuration
   */
  private detectRequiredCombinations(config: EndpointConfig): string[][] {
    const combinations: string[][] = [];
    
    // Basic requirement: reference-based endpoints need a reference
    if (config.params.reference) {
      combinations.push(['reference']);
    }

    return combinations;
  }

  /**
   * Detect conditional requirements
   */
  private detectConditionalRequirements(config: EndpointConfig): ConditionalRequirement[] {
    const requirements: ConditionalRequirement[] = [];

    // Example: If format is USFM, alignment might be available
    if (config.params.format && config.params.includeAlignment) {
      requirements.push({
        when: { format: ['usfm'] },
        require: [],
        message: 'Alignment data is available when format is USFM',
      });
    }

    return requirements;
  }

  /**
   * Detect cross-field validations
   */
  private detectCrossFieldValidations(config: EndpointConfig): CrossFieldValidation[] {
    const validations: CrossFieldValidation[] = [];

    // Example: Reference and language should be compatible
    if (config.params.reference && config.params.language) {
      validations.push({
        fields: ['reference', 'language'],
        validator: 'validateReferenceLanguageCompatibility',
        message: 'Reference format should be compatible with selected language',
      });
    }

    return validations;
  }

  /**
   * Generate example selector configuration
   */
  generateExampleSelector(config: EndpointConfig): ExampleSelectorConfig {
    const processedExamples = config.examples.map((example, index) => 
      this.processExample(example, index, config)
    );

    return {
      examples: processedExamples,
      defaultExample: processedExamples.length > 0 ? processedExamples[0].id : undefined,
      showDescriptions: true,
      allowCustom: true,
    };
  }

  /**
   * Process a real data example for UI display
   */
  private processExample(example: RealDataExample, index: number, config: EndpointConfig): ProcessedExample {
    return {
      id: `example-${index}`,
      name: example.name,
      description: example.description,
      parameters: example.params,
      expectedResponse: {
        estimatedMs: config.responseShape.performance.maxResponseTime,
        contentHints: example.expectedContent.contains || [],
        expectedFields: config.responseShape.structure.required,
      },
      tags: this.generateExampleTags(example, config),
    };
  }

  /**
   * Generate tags for example categorization
   */
  private generateExampleTags(example: RealDataExample, config: EndpointConfig): string[] {
    const tags: string[] = [];

    // Add category tag
    tags.push(config.category);

    // Add data type tag
    tags.push(config.responseShape.dataType);

    // Add parameter-based tags
    if (example.params.language) {
      tags.push(`lang-${example.params.language}`);
    }

    if (example.params.reference) {
      const ref = String(example.params.reference);
      if (ref.includes(':')) {
        tags.push('verse-level');
      } else {
        tags.push('chapter-level');
      }
    }

    return tags;
  }

  /**
   * Generate response display configuration
   */
  generateResponseDisplay(config: EndpointConfig): ResponseDisplayConfig {
    return {
      structure: this.createResponseStructureConfig(config),
      performance: this.createPerformanceDisplayConfig(config),
      errorHandling: this.createErrorDisplayConfig(config),
      formatting: this.createContentFormattingConfig(config),
    };
  }

  /**
   * Create response structure display configuration
   */
  private createResponseStructureConfig(config: EndpointConfig): ResponseStructureConfig {
    const { structure } = config.responseShape;
    
    return {
      primaryFields: structure.required.slice(0, 3), // First 3 required fields
      metadataFields: ['_metadata', 'metadata'],
      expandedFields: structure.required,
      collapsedFields: structure.optional || [],
      fieldCustomizations: this.createFieldCustomizations(config),
    };
  }

  /**
   * Create field display customizations
   */
  private createFieldCustomizations(config: EndpointConfig): Record<string, FieldDisplayCustomization> {
    const customizations: Record<string, FieldDisplayCustomization> = {};

    // Common field customizations
    customizations._metadata = {
      label: 'Response Metadata',
      icon: '📊',
      colorScheme: 'info',
    };

    customizations.responseTime = {
      label: 'Response Time',
      formatter: 'formatDuration',
      icon: '⏱️',
      colorScheme: 'default',
    };

    customizations.cacheStatus = {
      label: 'Cache Status',
      formatter: 'formatCacheStatus',
      icon: '💾',
      colorScheme: 'success',
    };

    // Data-type specific customizations
    switch (config.responseShape.dataType) {
      case 'scripture':
        customizations.scripture = {
          label: 'Scripture Text',
          icon: '📖',
          copyable: true,
        };
        break;

      case 'translation-notes':
        customizations.verseNotes = {
          label: 'Verse Notes',
          icon: '📝',
        };
        break;

      case 'languages':
        customizations.languages = {
          label: 'Available Languages',
          icon: '🌍',
        };
        break;
    }

    return customizations;
  }

  /**
   * Create performance display configuration
   */
  private createPerformanceDisplayConfig(config: EndpointConfig): PerformanceDisplayConfig {
    const maxResponseTime = config.responseShape.performance.maxResponseTime;

    return {
      showResponseTime: true,
      showCacheStatus: config.responseShape.performance.cacheable,
      showMetricsGraph: true,
      thresholds: {
        good: Math.floor(maxResponseTime * 0.3),
        warning: Math.floor(maxResponseTime * 0.7),
        error: maxResponseTime,
      },
    };
  }

  /**
   * Create error display configuration
   */
  private createErrorDisplayConfig(config: EndpointConfig): ErrorDisplayConfig {
    return {
      showDetails: true,
      showSuggestions: true,
      showRetry: true,
      customMessages: {
        'Missing reference parameter': 'Please provide a scripture reference (e.g., "John 3:16")',
        'Invalid reference format': 'Reference should be in format "Book Chapter:Verse" (e.g., "Genesis 1:1")',
        'Resource not found': 'The requested resource is not available for this language/organization',
      },
    };
  }

  /**
   * Create content formatting configuration
   */
  private createContentFormattingConfig(config: EndpointConfig): ContentFormattingConfig {
    return {
      json: {
        indent: 2,
        sortKeys: true,
        maxLength: 10000,
      },
      text: {
        preserveWhitespace: true,
        maxLines: 100,
      },
      arrays: {
        maxInitialItems: 5,
        showLength: true,
      },
    };
  }

  /**
   * Generate complete UI configuration for an endpoint
   */
  generateCompleteUI(config: EndpointConfig): {
    parameterForm: ParameterFormConfig;
    exampleSelector: ExampleSelectorConfig;
    responseDisplay: ResponseDisplayConfig;
  } {
    return {
      parameterForm: this.generateParameterForm(config),
      exampleSelector: this.generateExampleSelector(config),
      responseDisplay: this.generateResponseDisplay(config),
    };
  }
}

// Export singleton instance
export const uiGenerator = new UIGenerator();

// Export utility functions
export const generateParameterForm = (config: EndpointConfig) => uiGenerator.generateParameterForm(config);
export const generateExampleSelector = (config: EndpointConfig) => uiGenerator.generateExampleSelector(config);
export const generateResponseDisplay = (config: EndpointConfig) => uiGenerator.generateResponseDisplay(config);
export const generateCompleteUI = (config: EndpointConfig) => uiGenerator.generateCompleteUI(config);