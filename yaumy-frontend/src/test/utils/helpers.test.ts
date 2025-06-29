/**
 * Utility Function Tests
 * Tests helper functions and utilities
 */

import { describe, it, expect } from 'vitest';

// Simple utility functions to test
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const slugify = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('should handle large numbers', () => {
      const largeNumber = 5 * 1073741824; // 5 GB
      expect(formatFileSize(largeNumber)).toBe('5 GB');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('test@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('test..test@example.com')).toBe(false);
    });

    it('should handle edge cases', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail(' ')).toBe(false);
      expect(validateEmail('test @example.com')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('should create valid slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test Title With Spaces')).toBe('test-title-with-spaces');
      expect(slugify('Special!@#$%Characters')).toBe('specialcharacters');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(slugify('Multiple   Spaces')).toBe('multiple-spaces');
      expect(slugify('Dash-Separated-Words')).toBe('dash-separated-words');
      expect(slugify('  Leading and trailing  ')).toBe('leading-and-trailing');
    });

    it('should handle empty and special cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('123')).toBe('123');
    });
  });
});