/**
 * Validation Tests
 * Tests for input validation and sanitization functions
 */

import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validateUrl,
  validatePassword,
  validateUsername,
  validatePhoneNumber,
  validateCreditCard,
  validateDate,
  validateFileType,
  validateFileSize,
  sanitizeHtml,
  sanitizeFilename,
  escapeRegex,
  isUUID,
  isJSON,
  isBase64,
  isHexColor,
  normalizeEmail,
  normalizePhoneNumber,
  parseJSON,
} from '../../lib/validation';

describe('Validation Functions', () => {
  describe('Email Validation', () => {
    it('should validate correct emails', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
      expect(validateEmail('test.email.with+symbol@example4u.net')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@example')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should validate correct URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://localhost:3000')).toBe(true);
      expect(validateUrl('https://sub.domain.com/path?query=1')).toBe(true);
      expect(validateUrl('https://example.com/path/to/resource#anchor')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('not a url')).toBe(false);
      expect(validateUrl('example.com')).toBe(false);
      expect(validateUrl('ftp://example.com')).toBe(false);
      expect(validateUrl('javascript:alert(1)')).toBe(false);
      expect(validateUrl('')).toBe(false);
    });

    it('should validate URLs with specific protocols', () => {
      expect(validateUrl('https://example.com', ['https'])).toBe(true);
      expect(validateUrl('http://example.com', ['https'])).toBe(false);
      expect(validateUrl('ftp://example.com', ['ftp', 'ftps'])).toBe(true);
    });
  });

  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      expect(validatePassword('StrongP@ssw0rd')).toBe(true);
      expect(validatePassword('Another$tr0ng1')).toBe(true);
    });

    it('should reject weak passwords', () => {
      expect(validatePassword('weak')).toBe(false);
      expect(validatePassword('12345678')).toBe(false);
      expect(validatePassword('password')).toBe(false);
      expect(validatePassword('NoNumbers!')).toBe(false);
      expect(validatePassword('nouppercas3!')).toBe(false);
      expect(validatePassword('NOLOWERCASE123!')).toBe(false);
    });

    it('should validate with custom rules', () => {
      const customRules = {
        minLength: 6,
        requireUppercase: false,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
      };
      
      expect(validatePassword('simple123', customRules)).toBe(true);
      expect(validatePassword('simple', customRules)).toBe(false);
    });
  });

  describe('Username Validation', () => {
    it('should validate correct usernames', () => {
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('test-user')).toBe(true);
    });

    it('should reject invalid usernames', () => {
      expect(validateUsername('a')).toBe(false); // Too short
      expect(validateUsername('user name')).toBe(false); // Contains space
      expect(validateUsername('user@name')).toBe(false); // Special char
      expect(validateUsername('123user')).toBe(false); // Starts with number
      expect(validateUsername('a'.repeat(31))).toBe(false); // Too long
    });
  });

  describe('Phone Number Validation', () => {
    it('should validate correct phone numbers', () => {
      expect(validatePhoneNumber('+1-555-123-4567')).toBe(true);
      expect(validatePhoneNumber('(555) 123-4567')).toBe(true);
      expect(validatePhoneNumber('555-123-4567')).toBe(true);
      expect(validatePhoneNumber('+44 20 7946 0958')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abc-def-ghij')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
    });
  });

  describe('Credit Card Validation', () => {
    it('should validate correct credit card numbers', () => {
      // Test card numbers (not real)
      expect(validateCreditCard('4111111111111111')).toBe(true); // Visa
      expect(validateCreditCard('5500000000000004')).toBe(true); // Mastercard
      expect(validateCreditCard('340000000000009')).toBe(true); // Amex
    });

    it('should reject invalid credit card numbers', () => {
      expect(validateCreditCard('1234567890123456')).toBe(false);
      expect(validateCreditCard('411111111111111')).toBe(false); // Wrong length
      expect(validateCreditCard('abcd-efgh-ijkl-mnop')).toBe(false);
    });

    it('should handle formatted numbers', () => {
      expect(validateCreditCard('4111-1111-1111-1111')).toBe(true);
      expect(validateCreditCard('4111 1111 1111 1111')).toBe(true);
    });
  });

  describe('Date Validation', () => {
    it('should validate correct dates', () => {
      expect(validateDate('2024-01-15')).toBe(true);
      expect(validateDate('01/15/2024')).toBe(true);
      expect(validateDate('15-01-2024')).toBe(true);
      expect(validateDate(new Date())).toBe(true);
    });

    it('should reject invalid dates', () => {
      expect(validateDate('2024-13-01')).toBe(false); // Invalid month
      expect(validateDate('2024-02-30')).toBe(false); // Invalid day
      expect(validateDate('not a date')).toBe(false);
      expect(validateDate('')).toBe(false);
    });

    it('should validate date ranges', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      expect(validateDate(today, { min: yesterday, max: tomorrow })).toBe(true);
      expect(validateDate(yesterday, { min: today })).toBe(false);
      expect(validateDate(tomorrow, { max: today })).toBe(false);
    });
  });

  describe('File Validation', () => {
    describe('validateFileType', () => {
      it('should validate allowed file types', () => {
        expect(validateFileType('image.jpg', ['jpg', 'jpeg', 'png'])).toBe(true);
        expect(validateFileType('document.pdf', ['pdf', 'doc', 'docx'])).toBe(true);
        expect(validateFileType('video.mp4', ['mp4', 'avi', 'mov'])).toBe(true);
      });

      it('should reject disallowed file types', () => {
        expect(validateFileType('script.exe', ['jpg', 'png'])).toBe(false);
        expect(validateFileType('image.gif', ['jpg', 'png'])).toBe(false);
      });

      it('should handle MIME types', () => {
        expect(validateFileType('file.jpg', [], ['image/jpeg'])).toBe(true);
        expect(validateFileType('file.pdf', [], ['application/pdf'])).toBe(true);
        expect(validateFileType('file.exe', [], ['image/jpeg'])).toBe(false);
      });
    });

    describe('validateFileSize', () => {
      it('should validate file sizes', () => {
        expect(validateFileSize(1024, 2048)).toBe(true); // 1KB < 2KB
        expect(validateFileSize(1048576, 2097152)).toBe(true); // 1MB < 2MB
      });

      it('should reject oversized files', () => {
        expect(validateFileSize(2048, 1024)).toBe(false); // 2KB > 1KB
      });

      it('should handle min and max sizes', () => {
        expect(validateFileSize(2048, { min: 1024, max: 4096 })).toBe(true);
        expect(validateFileSize(512, { min: 1024 })).toBe(false);
        expect(validateFileSize(8192, { max: 4096 })).toBe(false);
      });
    });
  });

  describe('Sanitization Functions', () => {
    describe('sanitizeHtml', () => {
      it('should remove dangerous HTML', () => {
        expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('');
        expect(sanitizeHtml('<img src=x onerror=alert(1)>')).toBe('<img src=x>');
        expect(sanitizeHtml('<a href="javascript:alert(1)">link</a>')).toBe('<a href="">link</a>');
      });

      it('should allow safe HTML', () => {
        expect(sanitizeHtml('<p>Hello <strong>world</strong></p>'))
          .toBe('<p>Hello <strong>world</strong></p>');
        expect(sanitizeHtml('<a href="https://example.com">link</a>'))
          .toBe('<a href="https://example.com">link</a>');
      });
    });

    describe('sanitizeFilename', () => {
      it('should sanitize filenames', () => {
        expect(sanitizeFilename('my file.txt')).toBe('my-file.txt');
        expect(sanitizeFilename('../../etc/passwd')).toBe('------etc-passwd');
        expect(sanitizeFilename('file<>:|?*.txt')).toBe('file.txt');
        expect(sanitizeFilename('CON.txt')).toBe('_CON.txt'); // Windows reserved
      });

      it('should handle unicode', () => {
        expect(sanitizeFilename('café.txt')).toBe('caf.txt');
        expect(sanitizeFilename('文件.txt')).toBe('.txt');
      });
    });

    describe('escapeRegex', () => {
      it('should escape regex special characters', () => {
        expect(escapeRegex('hello.*world')).toBe('hello\\.\\*world');
        expect(escapeRegex('[abc]+')).toBe('\\[abc\\]\\+');
        expect(escapeRegex('test?')).toBe('test\\?');
      });
    });
  });

  describe('Type Checking Functions', () => {
    describe('isUUID', () => {
      it('should validate UUIDs', () => {
        expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isUUID('550e8400-e29b-11d4-a716-446655440000')).toBe(true);
        expect(isUUID('550e8400-e29b-21d4-a716-446655440000')).toBe(true);
        expect(isUUID('550e8400-e29b-31d4-a716-446655440000')).toBe(true);
        expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
        expect(isUUID('550e8400-e29b-51d4-a716-446655440000')).toBe(true);
      });

      it('should reject invalid UUIDs', () => {
        expect(isUUID('not-a-uuid')).toBe(false);
        expect(isUUID('550e8400-e29b-61d4-a716-446655440000')).toBe(false); // Invalid version
        expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false); // No hyphens
      });
    });

    describe('isJSON', () => {
      it('should validate JSON strings', () => {
        expect(isJSON('{"key": "value"}')).toBe(true);
        expect(isJSON('[1, 2, 3]')).toBe(true);
        expect(isJSON('"string"')).toBe(true);
        expect(isJSON('123')).toBe(true);
        expect(isJSON('true')).toBe(true);
        expect(isJSON('null')).toBe(true);
      });

      it('should reject invalid JSON', () => {
        expect(isJSON('{key: "value"}')).toBe(false);
        expect(isJSON('undefined')).toBe(false);
        expect(isJSON('')).toBe(false);
      });
    });

    describe('isBase64', () => {
      it('should validate base64 strings', () => {
        expect(isBase64('SGVsbG8gV29ybGQ=')).toBe(true);
        expect(isBase64('SGVsbG8gV29ybGQ')).toBe(true); // Without padding
        expect(isBase64('U29tZSBkYXRhIHdpdGggACBhbmQg77u/')).toBe(true);
      });

      it('should reject invalid base64', () => {
        expect(isBase64('Hello World')).toBe(false);
        expect(isBase64('SGVsbG8gV29ybGQ!=')).toBe(false);
        expect(isBase64('')).toBe(false);
      });
    });

    describe('isHexColor', () => {
      it('should validate hex colors', () => {
        expect(isHexColor('#ffffff')).toBe(true);
        expect(isHexColor('#000000')).toBe(true);
        expect(isHexColor('#abc123')).toBe(true);
        expect(isHexColor('#fff')).toBe(true);
        expect(isHexColor('#000')).toBe(true);
      });

      it('should reject invalid hex colors', () => {
        expect(isHexColor('ffffff')).toBe(false); // No hash
        expect(isHexColor('#gggggg')).toBe(false); // Invalid chars
        expect(isHexColor('#ffff')).toBe(false); // Wrong length
      });
    });
  });

  describe('Normalization Functions', () => {
    describe('normalizeEmail', () => {
      it('should normalize emails', () => {
        expect(normalizeEmail('TEST@EXAMPLE.COM')).toBe('test@example.com');
        expect(normalizeEmail(' test@example.com ')).toBe('test@example.com');
        expect(normalizeEmail('test+tag@example.com')).toBe('test@example.com');
        expect(normalizeEmail('test.name@example.com')).toBe('testname@example.com');
      });
    });

    describe('normalizePhoneNumber', () => {
      it('should normalize phone numbers', () => {
        expect(normalizePhoneNumber('+1 (555) 123-4567')).toBe('+15551234567');
        expect(normalizePhoneNumber('555-123-4567')).toBe('5551234567');
        expect(normalizePhoneNumber('(555) 123 4567')).toBe('5551234567');
      });
    });
  });

  describe('parseJSON', () => {
    it('should parse valid JSON', () => {
      expect(parseJSON('{"key": "value"}')).toEqual({ key: 'value' });
      expect(parseJSON('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should return fallback value for invalid JSON', () => {
      expect(parseJSON('invalid', null)).toBe(null);
      expect(parseJSON('', [])).toEqual([]);
      expect(parseJSON('{invalid}', {})).toEqual({});
    });
  });
});