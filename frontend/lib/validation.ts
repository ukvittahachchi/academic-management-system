export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export const validateModuleForm = (data: {
  module_name: string;
  description: string;
  grade_level: string;
  subject: string;
}): ValidationResult => {
  const errors: ValidationError[] = [];

  // Module Name validation
  if (!data.module_name || data.module_name.trim().length === 0) {
    errors.push({
      field: 'module_name',
      message: 'Module name is required'
    });
  } else if (data.module_name.trim().length < 3) {
    errors.push({
      field: 'module_name',
      message: 'Module name must be at least 3 characters'
    });
  } else if (data.module_name.length > 100) {
    errors.push({
      field: 'module_name',
      message: 'Module name must not exceed 100 characters'
    });
  }

  // Grade Level validation
  if (!data.grade_level || data.grade_level.trim().length === 0) {
    errors.push({
      field: 'grade_level',
      message: 'Grade level is required'
    });
  } else if (!/^(Grade|Class|Year)\s+\d+$/i.test(data.grade_level)) {
    errors.push({
      field: 'grade_level',
      message: 'Grade level should be in format "Grade X" or "Class X"'
    });
  }

  // Description validation
  if (data.description && data.description.length > 500) {
    errors.push({
      field: 'description',
      message: 'Description must not exceed 500 characters'
    });
  }

  // Subject validation
  if (data.subject && data.subject.length > 50) {
    errors.push({
      field: 'subject',
      message: 'Subject must not exceed 50 characters'
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error;
  if (error?.message) return error.message;
  if (error?.response?.data?.message) return error.response.data.message;
  if (error?.validationErrors?.length > 0) {
    return error.validationErrors.join(', ');
  }
  return 'An unexpected error occurred';
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};