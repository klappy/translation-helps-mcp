/**
 * API Response Validator
 * Validates and transforms API responses to ensure consistent data structures
 */

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
  warnings: string[];
}

export class APIResponseValidator {
  /**
   * Validate Translation Notes response
   */
  static validateTranslationNotes(response: any): ValidationResult<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for notes in various locations
    const notes = response?.notes || 
                  response?.verseNotes || 
                  response?.data?.notes ||
                  response?.data?.verseNotes ||
                  [];
    
    if (!Array.isArray(notes)) {
      errors.push('Notes must be an array');
      return { valid: false, errors, warnings };
    }
    
    if (notes.length === 0) {
      warnings.push('No notes found in response');
    }
    
    // Validate each note
    const validatedNotes = notes.map((note, index) => {
      const validNote: any = {};
      
      // Extract content with multiple fallbacks
      validNote.content = note.Note || note.note || note.text || note.content || '';
      if (!validNote.content) {
        warnings.push(`Note ${index} has no content`);
      }
      
      // Extract reference
      validNote.reference = note.Reference || note.reference || note.ref || '';
      
      // Extract quote
      validNote.quote = note.Quote || note.quote || '';
      
      // Extract support reference
      validNote.supportReference = note.SupportReference || note.supportReference || '';
      
      return validNote;
    });
    
    return {
      valid: true,
      data: { notes: validatedNotes },
      errors,
      warnings
    };
  }
  
  /**
   * Validate Translation Academy response
   */
  static validateTranslationAcademy(response: any): ValidationResult<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check if it's a module list response
    if (response?.success && response?.data?.modules) {
      return {
        valid: true,
        data: {
          type: 'module_list',
          modules: response.data.modules
        },
        errors,
        warnings
      };
    }
    
    // Check if it's a direct article response
    if (response?.title && response?.content) {
      return {
        valid: true,
        data: {
          type: 'article',
          title: response.title,
          content: response.content
        },
        errors,
        warnings
      };
    }
    
    // Check for nested data
    if (response?.data?.title && response?.data?.content) {
      return {
        valid: true,
        data: {
          type: 'article',
          title: response.data.title,
          content: response.data.content
        },
        errors,
        warnings
      };
    }
    
    errors.push('Invalid Translation Academy response structure');
    return { valid: false, errors, warnings };
  }
  
  /**
   * Generic response validator
   */
  static validate(response: any, expectedFields: string[]): ValidationResult<any> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const data: any = {};
    
    for (const field of expectedFields) {
      // Try multiple locations
      const value = response?.[field] || 
                   response?.data?.[field] ||
                   response?.result?.[field];
      
      if (value === undefined || value === null) {
        warnings.push(`Missing expected field: ${field}`);
      } else {
        data[field] = value;
      }
    }
    
    return {
      valid: errors.length === 0,
      data,
      errors,
      warnings
    };
  }
  
  /**
   * Create a safe wrapper for any API call
   */
  static async safeAPICall<T>(
    apiCall: () => Promise<Response>,
    validator: (data: any) => ValidationResult<T>
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await apiCall();
      
      if (!response.ok) {
        return {
          success: false,
          error: `API returned ${response.status}: ${response.statusText}`
        };
      }
      
      const rawData = await response.json();
      const validation = validator(rawData);
      
      if (!validation.valid) {
        console.error('Validation errors:', validation.errors);
        return {
          success: false,
          error: validation.errors.join('; ')
        };
      }
      
      if (validation.warnings.length > 0) {
        console.warn('Validation warnings:', validation.warnings);
      }
      
      return {
        success: true,
        data: validation.data
      };
    } catch (error) {
      console.error('API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}