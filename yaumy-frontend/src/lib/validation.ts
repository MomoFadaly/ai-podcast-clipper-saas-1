/**
 * Validation and Sanitization Utilities
 * Common validation and sanitization functions for user input
 */

/**
 * Validate email address
 */
export function validateEmail(email: string): boolean {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

/**
 * Validate URL with optional protocol whitelist
 */
export function validateUrl(url: string, allowedProtocols?: string[]): boolean {
  try {
    const u = new URL(url);
    const protocols = allowedProtocols?.map(p => p.endsWith(':') ? p : `${p}:`) || ['http:', 'https:'];
    return protocols.includes(u.protocol);
  } catch {
    return false;
  }
}

interface PasswordRules {
  minLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

/**
 * Validate password strength
 */
export function validatePassword(password: string, rules?: PasswordRules): boolean {
  const defaultRules: PasswordRules = {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: true,
    ...rules,
  };

  if (password.length < (defaultRules.minLength || 8)) return false;
  if (defaultRules.requireUppercase && !/[A-Z]/.test(password)) return false;
  if (defaultRules.requireLowercase && !/[a-z]/.test(password)) return false;
  if (defaultRules.requireNumbers && !/\d/.test(password)) return false;
  if (defaultRules.requireSpecialChars && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  return true;
}

/**
 * Validate username
 */
export function validateUsername(username: string): boolean {
  // 3-30 chars, alphanumeric with underscores and hyphens, must start with letter
  const re = /^[a-zA-Z][a-zA-Z0-9_-]{2,29}$/;
  return re.test(username);
}

/**
 * Validate phone number (international format)
 */
export function validatePhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

/**
 * Validate credit card number using Luhn algorithm
 */
export function validateCreditCard(cardNumber: string): boolean {
  const cleaned = cardNumber.replace(/\D/g, '');
  
  if (cleaned.length < 13 || cleaned.length > 19) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned.charAt(i), 10);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
}

interface DateOptions {
  min?: Date;
  max?: Date;
}

/**
 * Validate date
 */
export function validateDate(date: string | Date, options?: DateOptions): boolean {
  let d: Date;
  
  if (typeof date === 'string') {
    // Handle different date formats
    let dateStr = date;
    
    // Convert DD-MM-YYYY to YYYY-MM-DD
    if (/^\d{2}-\d{2}-\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('-');
      dateStr = `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    // Convert MM/DD/YYYY to YYYY-MM-DD
    else if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
      dateStr = `${parts[2]}-${parts[0]}-${parts[1]}`;
    }
    
    d = new Date(dateStr);
    
    // Additional validation for YYYY-MM-DD format
    const parts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10);
      const day = parseInt(parts[3], 10);
      
      if (month > 12 || month < 1) return false;
      if (day > 31 || day < 1) return false;
      
      // Check for specific invalid dates like Feb 30
      if (month === 2 && day > 29) return false;
      if ([4, 6, 9, 11].includes(month) && day > 30) return false;
      
      // Check for leap year
      if (month === 2 && day === 29) {
        const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
        if (!isLeapYear) return false;
      }
    }
  } else {
    d = date;
  }
  
  if (isNaN(d.getTime())) return false;

  if (options?.min && d < options.min) return false;
  if (options?.max && d > options.max) return false;

  return true;
}

/**
 * Validate file type
 */
export function validateFileType(
  filename: string,
  allowedExtensions: string[] = [],
  allowedMimeTypes: string[] = []
): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  
  if (allowedExtensions.length > 0 && !allowedExtensions.includes(ext)) {
    return false;
  }

  // In a real implementation, you'd check the actual MIME type
  // For now, we'll do a simple mapping
  const mimeMap: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    pdf: 'application/pdf',
    mp4: 'video/mp4',
    // Add more as needed
  };

  if (allowedMimeTypes.length > 0) {
    const mime = mimeMap[ext];
    return mime ? allowedMimeTypes.includes(mime) : false;
  }

  return true;
}

/**
 * Validate file size
 */
export function validateFileSize(
  size: number,
  maxSize: number | { min?: number; max?: number }
): boolean {
  if (typeof maxSize === 'number') {
    return size <= maxSize;
  }

  if (maxSize.min && size < maxSize.min) return false;
  if (maxSize.max && size > maxSize.max) return false;

  return true;
}

/**
 * Sanitize HTML to prevent XSS
 */
export function sanitizeHtml(html: string): string {
  // Basic sanitization - in production use a library like DOMPurify
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove space before handler too
    .replace(/\s*on\w+=[^\s>]+/gi, '') // Handle unquoted event handlers
    .replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href=""');
}

/**
 * Sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  // First handle path traversal attempts - replace .. with --
  let safe = filename.replace(/\.\./g, '--');
  safe = safe.replace(/[\/\\]/g, '-');
  
  // Remove special characters
  safe = safe.replace(/[<>:"|?*]/g, '');
  
  // Replace spaces with hyphens
  safe = safe.replace(/\s+/g, '-');
  
  // Remove non-ASCII characters
  safe = safe.replace(/[^\x00-\x7F]/g, '');
  
  // Handle Windows reserved names
  const reserved = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
                   'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
                   'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
  
  const nameWithoutExt = safe.split('.')[0].toUpperCase();
  if (reserved.includes(nameWithoutExt)) {
    safe = '_' + safe;
  }

  // Default name if empty
  return safe || 'file';
}

/**
 * Escape special regex characters
 */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Check if string is a valid UUID
 */
export function isUUID(str: string): boolean {
  const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return re.test(str);
}

/**
 * Check if string is valid JSON
 */
export function isJSON(str: string): boolean {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is base64 encoded
 */
export function isBase64(str: string): boolean {
  if (str === '') return false;
  // Handle base64 without padding
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  if (!base64Regex.test(str)) return false;
  
  // Base64 strings should have length divisible by 4 when padded
  const len = str.length;
  const padding = len % 4;
  
  // If not divisible by 4, it can still be valid if it's missing padding
  if (padding === 1) return false; // This is never valid
  
  return true;
}

/**
 * Check if string is a valid hex color
 */
export function isHexColor(str: string): boolean {
  const re = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;
  return re.test(str);
}

/**
 * Normalize email address
 */
export function normalizeEmail(email: string): string {
  let normalized = email.trim().toLowerCase();
  
  // Remove dots and everything after + in local part (Gmail style)
  const [local, domain] = normalized.split('@');
  if (local && domain) {
    const cleanLocal = local.split('+')[0].replace(/\./g, '');
    normalized = `${cleanLocal}@${domain}`;
  }
  
  return normalized;
}

/**
 * Normalize phone number
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digits except leading +
  const hasPlus = phone.startsWith('+');
  const digits = phone.replace(/\D/g, '');
  return hasPlus ? '+' + digits : digits;
}

/**
 * Safe JSON parse with fallback
 */
export function parseJSON<T = any>(str: string, fallback?: T): T {
  try {
    return JSON.parse(str);
  } catch {
    return fallback as T;
  }
}