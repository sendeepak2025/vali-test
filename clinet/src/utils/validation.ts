/**
 * Validation utility functions for forms and inputs
 */

/**
 * Validates email format using RFC 5322 compliant regex
 * @param email - The email string to validate
 * @returns true if valid email format, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || typeof email !== 'string') {
    return false;
  }
  
  const trimmedEmail = email.trim();
  if (trimmedEmail.length === 0) {
    return false;
  }
  
  // RFC 5322 compliant email regex
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  return emailRegex.test(trimmedEmail);
};

/**
 * Validates phone number format (US format supported)
 * @param phone - The phone string to validate
 * @returns true if valid phone format, false otherwise
 */
export const isValidPhone = (phone: string): boolean => {
  if (!phone || typeof phone !== 'string') {
    return false;
  }
  
  const trimmedPhone = phone.trim();
  if (trimmedPhone.length === 0) {
    return false;
  }
  
  // Remove common formatting characters
  const cleanedPhone = trimmedPhone.replace(/[\s\-\(\)\.\+]/g, '');
  
  // Check if it's a valid US phone number (10-11 digits)
  const phoneRegex = /^1?[2-9]\d{9}$/;
  
  return phoneRegex.test(cleanedPhone);
};

/**
 * Validates name field (minimum 2 characters, letters and spaces only)
 * @param name - The name string to validate
 * @returns true if valid name, false otherwise
 */
export const isValidName = (name: string): boolean => {
  if (!name || typeof name !== 'string') {
    return false;
  }
  
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    return false;
  }
  
  // Allow letters, spaces, hyphens, and apostrophes (for names like O'Brien, Mary-Jane)
  const nameRegex = /^[a-zA-Z\s\-']+$/;
  
  return nameRegex.test(trimmedName);
};

/**
 * Validates message field (minimum 10 characters)
 * @param message - The message string to validate
 * @returns true if valid message, false otherwise
 */
export const isValidMessage = (message: string): boolean => {
  if (!message || typeof message !== 'string') {
    return false;
  }
  
  const trimmedMessage = message.trim();
  return trimmedMessage.length >= 10;
};

/**
 * Validates contact form data
 * @param data - The form data object
 * @returns Object with isValid boolean and errors object
 */
export interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: {
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };
}

export const validateContactForm = (data: ContactFormData): ValidationResult => {
  const errors: ValidationResult['errors'] = {};
  
  if (!isValidName(data.name)) {
    errors.name = 'Please enter a valid name (at least 2 characters)';
  }
  
  if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email address';
  }
  
  // Phone is optional, but if provided, must be valid
  if (data.phone && data.phone.trim().length > 0 && !isValidPhone(data.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }
  
  if (!isValidMessage(data.message)) {
    errors.message = 'Please enter a message (at least 10 characters)';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

/**
 * Validates newsletter email subscription
 * @param email - The email string to validate
 * @returns Object with isValid boolean and error message
 */
export const validateNewsletterEmail = (email: string): { isValid: boolean; error?: string } => {
  if (!email || email.trim().length === 0) {
    return { isValid: false, error: 'Please enter your email address' };
  }
  
  if (!isValidEmail(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};
