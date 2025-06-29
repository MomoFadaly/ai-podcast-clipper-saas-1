/**
 * Utility Functions Tests
 * Tests for common utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatRelativeTime,
  formatDuration,
  formatBytes,
  truncate,
  debounce,
  throttle,
  sleep,
  retry,
  chunk,
  groupBy,
  uniqueBy,
  deepMerge,
  isValidEmail,
  isValidUrl,
  generateId,
  slugify,
  capitalizeFirst,
  parseQueryString,
  buildQueryString,
} from '../../lib/utils';

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should combine class names', () => {
      expect(cn('btn', 'btn-primary')).toBe('btn btn-primary');
    });

    it('should handle conditional classes', () => {
      expect(cn('btn', false && 'hidden', 'visible')).toBe('btn visible');
      expect(cn('btn', true && 'active')).toBe('btn active');
    });

    it('should handle arrays', () => {
      expect(cn(['btn', 'btn-primary'])).toBe('btn btn-primary');
    });

    it('should handle objects', () => {
      expect(cn({ btn: true, 'btn-primary': true, hidden: false })).toBe('btn btn-primary');
    });

    it('should handle mixed inputs', () => {
      expect(cn('btn', ['btn-primary'], { active: true })).toBe('btn btn-primary active');
    });

    it('should remove duplicate classes', () => {
      // twMerge combines duplicate classes from different arguments
      expect(cn('p-4', 'p-8')).toBe('p-8');
    });
  });

  describe('Date Formatting', () => {
    describe('formatDate', () => {
      it('should format date correctly', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        expect(formatDate(date)).toMatch(/Jan 15, 2024/);
      });

      it('should handle custom format', () => {
        const date = new Date('2024-01-15T10:30:00Z');
        expect(formatDate(date, 'yyyy-MM-dd')).toBe('2024-01-15');
      });

      it('should handle string dates', () => {
        const result = formatDate('2024-01-15');
        expect(result).toMatch(/Jan \d{1,2}, 2024/);
      });
    });

    describe('formatRelativeTime', () => {
      it('should format recent times', () => {
        const now = new Date();
        const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
        expect(formatRelativeTime(fiveMinutesAgo)).toBe('5 minutes ago');
      });

      it('should format hours', () => {
        const now = new Date();
        const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
        expect(formatRelativeTime(twoHoursAgo)).toBe('2 hours ago');
      });

      it('should format days', () => {
        const now = new Date();
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        expect(formatRelativeTime(threeDaysAgo)).toBe('3 days ago');
      });

      it('should handle future dates', () => {
        const now = new Date();
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
        expect(formatRelativeTime(inOneHour)).toBe('in 1 hour');
      });
    });

    describe('formatDuration', () => {
      it('should format seconds', () => {
        expect(formatDuration(45)).toBe('0:45');
      });

      it('should format minutes and seconds', () => {
        expect(formatDuration(125)).toBe('2:05');
      });

      it('should format hours', () => {
        expect(formatDuration(3665)).toBe('1:01:05');
      });

      it('should handle zero', () => {
        expect(formatDuration(0)).toBe('0:00');
      });
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
      expect(formatBytes(1073741824)).toBe('1 GB');
    });

    it('should handle decimals', () => {
      expect(formatBytes(1536)).toBe('1.5 KB');
      expect(formatBytes(1536, 0)).toBe('2 KB');
    });
  });

  describe('String Utilities', () => {
    describe('truncate', () => {
      it('should truncate long strings', () => {
        expect(truncate('This is a very long string', 10)).toBe('This is...');
      });

      it('should not truncate short strings', () => {
        expect(truncate('Short', 10)).toBe('Short');
      });

      it('should handle custom suffix', () => {
        expect(truncate('This is a very long string', 10, '…')).toBe('This is a…');
      });
    });

    describe('slugify', () => {
      it('should create URL-safe slugs', () => {
        expect(slugify('Hello World!')).toBe('hello-world');
        expect(slugify('This & That')).toBe('this-that');
        expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      });

      it('should handle special characters', () => {
        expect(slugify('Café résumé')).toBe('caf-rsum');
      });
    });

    describe('capitalizeFirst', () => {
      it('should capitalize first letter', () => {
        expect(capitalizeFirst('hello')).toBe('Hello');
        expect(capitalizeFirst('HELLO')).toBe('Hello');
        expect(capitalizeFirst('hello world')).toBe('Hello world');
      });

      it('should handle empty strings', () => {
        expect(capitalizeFirst('')).toBe('');
      });
    });
  });

  describe('Validation', () => {
    describe('isValidEmail', () => {
      it('should validate correct emails', () => {
        expect(isValidEmail('test@example.com')).toBe(true);
        expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
        expect(isValidEmail('user+tag@example.com')).toBe(true);
      });

      it('should reject invalid emails', () => {
        expect(isValidEmail('invalid')).toBe(false);
        expect(isValidEmail('@example.com')).toBe(false);
        expect(isValidEmail('user@')).toBe(false);
        expect(isValidEmail('user @example.com')).toBe(false);
      });
    });

    describe('isValidUrl', () => {
      it('should validate correct URLs', () => {
        expect(isValidUrl('https://example.com')).toBe(true);
        expect(isValidUrl('http://localhost:3000')).toBe(true);
        expect(isValidUrl('https://sub.domain.com/path?query=1')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(isValidUrl('not a url')).toBe(false);
        expect(isValidUrl('example.com')).toBe(false);
        expect(isValidUrl('ftp://example.com')).toBe(false);
      });
    });
  });

  describe('Array Utilities', () => {
    describe('chunk', () => {
      it('should split array into chunks', () => {
        expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
        expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
      });

      it('should handle empty arrays', () => {
        expect(chunk([], 2)).toEqual([]);
      });

      it('should handle chunk size larger than array', () => {
        expect(chunk([1, 2], 5)).toEqual([[1, 2]]);
      });
    });

    describe('groupBy', () => {
      it('should group objects by key', () => {
        const items = [
          { type: 'a', value: 1 },
          { type: 'b', value: 2 },
          { type: 'a', value: 3 },
        ];
        
        const grouped = groupBy(items, 'type');
        expect(grouped).toEqual({
          a: [{ type: 'a', value: 1 }, { type: 'a', value: 3 }],
          b: [{ type: 'b', value: 2 }],
        });
      });

      it('should group by function', () => {
        const items = [1, 2, 3, 4, 5];
        const grouped = groupBy(items, (n) => n % 2 === 0 ? 'even' : 'odd');
        
        expect(grouped).toEqual({
          odd: [1, 3, 5],
          even: [2, 4],
        });
      });
    });

    describe('uniqueBy', () => {
      it('should remove duplicates by key', () => {
        const items = [
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
          { id: 1, name: 'C' },
        ];
        
        expect(uniqueBy(items, 'id')).toEqual([
          { id: 1, name: 'A' },
          { id: 2, name: 'B' },
        ]);
      });

      it('should work with function', () => {
        const items = ['hello', 'Hello', 'HELLO', 'world'];
        expect(uniqueBy(items, (s) => s.toLowerCase())).toEqual(['hello', 'world']);
      });
    });
  });

  describe('Object Utilities', () => {
    describe('deepMerge', () => {
      it('should merge objects deeply', () => {
        const obj1 = { a: 1, b: { c: 2 } };
        const obj2 = { b: { d: 3 }, e: 4 };
        
        expect(deepMerge(obj1, obj2)).toEqual({
          a: 1,
          b: { c: 2, d: 3 },
          e: 4,
        });
      });

      it('should handle arrays', () => {
        const obj1 = { arr: [1, 2] };
        const obj2 = { arr: [3, 4] };
        
        expect(deepMerge(obj1, obj2)).toEqual({
          arr: [3, 4], // Arrays are replaced, not merged
        });
      });

      it('should handle null values', () => {
        const obj1 = { a: 1, b: null };
        const obj2 = { b: 2, c: null };
        
        expect(deepMerge(obj1, obj2)).toEqual({
          a: 1,
          b: 2,
          c: null,
        });
      });
    });
  });

  describe('URL Utilities', () => {
    describe('parseQueryString', () => {
      it('should parse query strings', () => {
        expect(parseQueryString('?foo=bar&baz=qux')).toEqual({
          foo: 'bar',
          baz: 'qux',
        });
      });

      it('should handle arrays', () => {
        expect(parseQueryString('?tags=a&tags=b&tags=c')).toEqual({
          tags: ['a', 'b', 'c'],
        });
      });

      it('should decode values', () => {
        expect(parseQueryString('?name=John%20Doe&email=test%40example.com')).toEqual({
          name: 'John Doe',
          email: 'test@example.com',
        });
      });
    });

    describe('buildQueryString', () => {
      it('should build query strings', () => {
        expect(buildQueryString({ foo: 'bar', baz: 'qux' })).toBe('foo=bar&baz=qux');
      });

      it('should handle arrays', () => {
        expect(buildQueryString({ tags: ['a', 'b', 'c'] })).toBe('tags=a&tags=b&tags=c');
      });

      it('should encode values', () => {
        expect(buildQueryString({ name: 'John Doe', email: 'test@example.com' }))
          .toBe('name=John%20Doe&email=test%40example.com');
      });

      it('should skip null/undefined values', () => {
        expect(buildQueryString({ a: 1, b: null, c: undefined, d: 2 })).toBe('a=1&d=2');
      });
    });
  });

  describe('Async Utilities', () => {
    describe('sleep', () => {
      it('should delay execution', async () => {
        const start = Date.now();
        await sleep(50);
        const elapsed = Date.now() - start;
        expect(elapsed).toBeGreaterThanOrEqual(45); // Allow some margin
      });
    });

    describe('retry', () => {
      it('should retry failed operations', async () => {
        let attempts = 0;
        const operation = async () => {
          attempts++;
          if (attempts < 3) throw new Error('Failed');
          return 'Success';
        };

        const result = await retry(operation, 3, 10);
        expect(result).toBe('Success');
        expect(attempts).toBe(3);
      });

      it('should throw after max retries', async () => {
        const operation = async () => {
          throw new Error('Always fails');
        };

        await expect(retry(operation, 2, 10)).rejects.toThrow('Always fails');
      });
    });
  });

  describe('generateId', () => {
    it('should generate unique IDs', () => {
      const id1 = generateId();
      const id2 = generateId();
      
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });

    it('should include prefix if provided', () => {
      const id = generateId('user');
      expect(id).toMatch(/^user_/);
    });
  });
});