/**
 * Utility Function Tests
 * Tests helper functions and utilities
 */

import { describe, it, expect } from 'vitest';
import { formatFileSize, validateEmail, slugify } from '../../lib/helpers';

describe('Utility Functions', () => {
  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1048576)).toBe('1 MB');
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(2621440)).toBe('2.5 MB');
    });

    it('should handle large numbers', () => {
      expect(formatFileSize(1099511627776)).toBe('1 TB');
      expect(formatFileSize(5497558138880)).toBe('5 TB');
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
      expect(slugify('Test Article Title')).toBe('test-article-title');
    });

    it('should handle multiple spaces and dashes', () => {
      expect(slugify('Hello    World')).toBe('hello-world');
      expect(slugify('Test--Article--Title')).toBe('test-article-title');
    });

    it('should handle empty and special cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify('   ')).toBe('');
      expect(slugify('Hello@World#Test')).toBe('helloworldtest');
    });
  });
});