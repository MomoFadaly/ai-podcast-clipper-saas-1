/**
 * AI Usage Tracking Tests
 * Tests for AI API usage monitoring and cost management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { trackAiUsage, checkUserAiUsageLimit, updateAiCostConfiguration } from '../../lib/ai-usage-tracking';
import { db } from '../../server/db';

// Mock database
vi.mock('../../server/db', () => ({
  db: {
    aiApiUsage: {
      create: vi.fn(),
      aggregate: vi.fn(),
    },
    userAiUsageLimit: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    aiCostConfiguration: {
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    aiUsageAlert: {
      upsert: vi.fn(),
    },
  },
}));

describe('AI Usage Tracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('trackAiUsage', () => {
    it('should track OpenAI usage correctly', async () => {
      const mockUsage = {
        id: 'usage1',
        userId: 'user1',
        provider: 'OPENAI',
        model: 'gpt-4',
        endpoint: 'chat/completions',
        promptTokens: 1000,
        completionTokens: 500,
        totalTokens: 1500,
        cost: 0.045, // (1000 * 0.03 + 500 * 0.06) / 1000
        metadata: {},
        createdAt: new Date(),
      };

      vi.mocked(db.aiApiUsage.create).mockResolvedValueOnce(mockUsage as any);
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 5,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      } as any);

      const result = await trackAiUsage({
        userId: 'user1',
        provider: 'OPENAI' as any,
        model: 'gpt-4',
        promptTokens: 1000,
        completionTokens: 500,
        endpoint: 'chat/completions',
      });

      expect(result.cost).toBe(0.045);
      expect(result.totalTokens).toBe(1500);
      expect(vi.mocked(db.aiApiUsage.create)).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user1',
          provider: 'OPENAI',
          model: 'gpt-4',
          promptTokens: 1000,
          completionTokens: 500,
          totalTokens: 1500,
        }),
      });
    });

    it('should handle unknown models', async () => {
      vi.mocked(db.aiApiUsage.create).mockResolvedValueOnce({
        id: 'usage2',
        cost: 0,
      } as any);

      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.userAiUsageLimit.create).mockResolvedValueOnce({
        id: 'limit2',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      } as any);

      const result = await trackAiUsage({
        userId: 'user1',
        provider: 'OPENAI' as any,
        model: 'unknown-model',
        promptTokens: 1000,
        completionTokens: 500,
      });

      expect(result).not.toBeNull();
      expect(result?.cost).toBe(0);
    });

    it('should use default endpoint when not provided', async () => {
      vi.mocked(db.aiApiUsage.create).mockResolvedValueOnce({} as any);
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 0,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      } as any);
      vi.mocked(db.userAiUsageLimit.update).mockResolvedValueOnce({} as any);

      await trackAiUsage({
        userId: 'user1',
        provider: 'OPENAI' as any,
        model: 'gpt-4',
        promptTokens: 100,
        completionTokens: 50,
      });

      expect(vi.mocked(db.aiApiUsage.create)).toHaveBeenCalledWith({
        data: expect.objectContaining({
          endpoint: 'unknown',
        }),
      });
    });
  });

  describe('checkUserAiUsageLimit', () => {
    it('should allow usage within limits', async () => {
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 5,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      } as any);

      const result = await checkUserAiUsageLimit('user1');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(5);
      expect(result.monthlyLimit).toBe(10);
      expect(result.percentageUsed).toBe(50);
    });

    it('should deny usage when limit exceeded', async () => {
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 12,
        resetAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        isActive: true,
      } as any);

      const result = await checkUserAiUsageLimit('user1');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Monthly usage limit exceeded');
    });

    it('should reset usage when period ends', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 12,
        resetAt: pastDate,
        isActive: true,
      } as any);

      vi.mocked(db.userAiUsageLimit.update).mockResolvedValueOnce({
        id: 'limit1',
        userId: 'user1',
        monthlyLimitUsd: 10,
        currentMonthUsd: 0,
        resetAt: expect.any(Date),
        isActive: true,
      } as any);

      const result = await checkUserAiUsageLimit('user1');

      expect(result.allowed).toBe(true);
      expect(result.currentUsage).toBe(0);
      expect(vi.mocked(db.userAiUsageLimit.update)).toHaveBeenCalled();
    });

    it('should create default limit for new users', async () => {
      vi.mocked(db.userAiUsageLimit.findUnique).mockResolvedValueOnce(null);
      vi.mocked(db.userAiUsageLimit.create).mockResolvedValueOnce({
        id: 'limit2',
        userId: 'user2',
        monthlyLimitUsd: 10,
        currentMonthUsd: 0,
        resetAt: expect.any(Date),
        isActive: true,
      } as any);

      const result = await checkUserAiUsageLimit('user2');

      expect(result.allowed).toBe(true);
      expect(result.monthlyLimit).toBe(10);
      expect(vi.mocked(db.userAiUsageLimit.create)).toHaveBeenCalled();
    });
  });

  describe('updateAiCostConfiguration', () => {
    it('should update cost configuration', async () => {
      vi.mocked(db.aiCostConfiguration.upsert).mockResolvedValueOnce({
        id: 'config1',
        provider: 'OPENAI',
        model: 'gpt-4-turbo',
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
        effectiveFrom: new Date(),
      } as any);

      await updateAiCostConfiguration({
        provider: 'OPENAI' as any,
        model: 'gpt-4-turbo',
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
      });

      expect(vi.mocked(db.aiCostConfiguration.upsert)).toHaveBeenCalledWith({
        where: expect.any(Object),
        update: expect.objectContaining({
          inputCostPer1k: 0.01,
          outputCostPer1k: 0.03,
        }),
        create: expect.objectContaining({
          provider: 'OPENAI',
          model: 'gpt-4-turbo',
          inputCostPer1k: 0.01,
          outputCostPer1k: 0.03,
        }),
      });
    });
  });
});