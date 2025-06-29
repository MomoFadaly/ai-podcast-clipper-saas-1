import { db } from '~/server/db';
import type { AiProvider, AiAlertType } from '@prisma/client';

// Cost configurations for different AI models (prices per 1K tokens in USD)
// These should ideally be stored in the database and updated via admin interface
export const AI_MODEL_COSTS: Record<string, Record<string, { input: number; output: number }>> = {
  OPENAI: {
    'gpt-4-turbo-preview': {
      input: 0.01,    // $10 per 1M input tokens
      output: 0.03,   // $30 per 1M output tokens
    },
    'gpt-4': {
      input: 0.03,    // $30 per 1M input tokens
      output: 0.06,   // $60 per 1M output tokens
    },
    'gpt-3.5-turbo': {
      input: 0.0005,  // $0.50 per 1M input tokens
      output: 0.0015, // $1.50 per 1M output tokens
    },
  },
  PERPLEXITY: {
    'llama-3.1-sonar-small-128k-online': {
      input: 0.0002,  // $0.20 per 1M input tokens
      output: 0.0002, // $0.20 per 1M output tokens
    },
    'llama-3.1-sonar-large-128k-online': {
      input: 0.001,   // $1 per 1M input tokens
      output: 0.001,  // $1 per 1M output tokens
    },
  },
  ANTHROPIC: {
    'claude-3-opus': {
      input: 0.015,   // $15 per 1M input tokens
      output: 0.075,  // $75 per 1M output tokens
    },
    'claude-3-sonnet': {
      input: 0.003,   // $3 per 1M input tokens
      output: 0.015,  // $15 per 1M output tokens
    },
    'claude-3-haiku': {
      input: 0.00025, // $0.25 per 1M input tokens
      output: 0.00125,// $1.25 per 1M output tokens
    },
  },
};

interface TrackUsageParams {
  userId: string;
  provider: AiProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  endpoint?: string;
  metadata?: Record<string, any>;
}

export async function trackAiUsage({
  userId,
  provider,
  model,
  promptTokens,
  completionTokens,
  endpoint,
  metadata,
}: TrackUsageParams) {
  try {
    // Calculate cost
    const modelCosts = AI_MODEL_COSTS[provider]?.[model];
    if (!modelCosts) {
      console.warn(`No cost configuration found for ${provider}/${model}`);
    }
    
    const inputCost = modelCosts ? (promptTokens / 1000) * modelCosts.input : 0;
    const outputCost = modelCosts ? (completionTokens / 1000) * modelCosts.output : 0;
    const totalCost = inputCost + outputCost;
    
    // Record usage
    const usage = await db.aiApiUsage.create({
      data: {
        userId,
        provider,
        model,
        endpoint: endpoint || 'unknown',
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
        cost: totalCost,
        metadata: metadata || {},
      },
    });
    
    // Update user's monthly usage
    await updateUserMonthlyUsage(userId, totalCost);
    
    // Check usage limits and send alerts if needed
    await checkUsageLimitsAndAlert(userId);
    
    return usage;
  } catch (error) {
    console.error('Failed to track AI usage:', error);
    // Don't throw - we don't want tracking failures to break the main flow
    return null;
  }
}

async function updateUserMonthlyUsage(userId: string, cost: number) {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  
  // Get or create usage limit record
  let usageLimit = await db.userAiUsageLimit.findUnique({
    where: { userId },
  });
  
  if (!usageLimit) {
    // Create default usage limit (null = unlimited for now)
    usageLimit = await db.userAiUsageLimit.create({
      data: {
        userId,
        monthlyLimitUsd: 10.0, // Default limit $10/month
        currentMonthUsd: 0,
        resetAt: endOfMonth,
      },
    });
  }
  
  // Check if we need to reset the monthly counter
  if (now > usageLimit.resetAt) {
    await db.userAiUsageLimit.update({
      where: { id: usageLimit.id },
      data: {
        currentMonthUsd: cost,
        resetAt: endOfMonth,
      },
    });
  } else {
    // Increment current month usage
    await db.userAiUsageLimit.update({
      where: { id: usageLimit.id },
      data: {
        currentMonthUsd: {
          increment: cost,
        },
      },
    });
  }
}

async function checkUsageLimitsAndAlert(userId: string) {
  const usageLimit = await db.userAiUsageLimit.findUnique({
    where: { userId },
  });
  
  if (!usageLimit?.monthlyLimitUsd || !usageLimit.isActive) {
    return; // No limit set or inactive
  }
  
  const usagePercentage = (usageLimit.currentMonthUsd / usageLimit.monthlyLimitUsd) * 100;
  
  // Check alert thresholds
  const alerts = await db.aiUsageAlert.findMany({
    where: { userId },
  });
  
  for (const alert of alerts) {
    if (usagePercentage >= alert.threshold) {
      // Check if we should send alert (not sent in last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      if (!alert.lastAlertedAt || alert.lastAlertedAt < oneDayAgo) {
        // Update alert timestamp
        await db.aiUsageAlert.update({
          where: { id: alert.id },
          data: { lastAlertedAt: new Date() },
        });
        
        // TODO: Send actual alert (email, notification, etc.)
        console.log(`AI usage alert for user ${userId}: ${alert.alertType} (${usagePercentage.toFixed(1)}%)`);
      }
    }
  }
}

// Get user's current month usage and limits
export async function getUserAiUsageStats(userId: string) {
  const usageLimit = await db.userAiUsageLimit.findUnique({
    where: { userId },
  });
  
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Get detailed usage for current month
  const monthlyUsage = await db.aiApiUsage.aggregate({
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      cost: true,
      promptTokens: true,
      completionTokens: true,
      totalTokens: true,
    },
    _count: true,
  });
  
  // Get usage by provider
  const usageByProvider = await db.aiApiUsage.groupBy({
    by: ['provider'],
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      cost: true,
      totalTokens: true,
    },
    _count: true,
  });
  
  // Get usage by model
  const usageByModel = await db.aiApiUsage.groupBy({
    by: ['provider', 'model'],
    where: {
      userId,
      createdAt: {
        gte: startOfMonth,
      },
    },
    _sum: {
      cost: true,
      totalTokens: true,
    },
    _count: true,
  });
  
  return {
    currentMonthCost: monthlyUsage._sum.cost || 0,
    monthlyLimit: usageLimit?.monthlyLimitUsd,
    limitPercentage: usageLimit?.monthlyLimitUsd 
      ? ((monthlyUsage._sum.cost || 0) / usageLimit.monthlyLimitUsd) * 100 
      : 0,
    totalRequests: monthlyUsage._count,
    totalTokens: monthlyUsage._sum.totalTokens || 0,
    promptTokens: monthlyUsage._sum.promptTokens || 0,
    completionTokens: monthlyUsage._sum.completionTokens || 0,
    usageByProvider,
    usageByModel,
    resetAt: usageLimit?.resetAt,
  };
}

// Admin functions
export async function getAllUsersAiUsageStats(startDate?: Date, endDate?: Date) {
  const where = {
    ...(startDate && endDate ? {
      createdAt: {
        gte: startDate,
        lte: endDate,
      },
    } : {}),
  };
  
  // Get total usage
  const totalUsage = await db.aiApiUsage.aggregate({
    where,
    _sum: {
      cost: true,
      totalTokens: true,
    },
    _count: true,
  });
  
  // Get usage by user
  const usageByUser = await db.aiApiUsage.groupBy({
    by: ['userId'],
    where,
    _sum: {
      cost: true,
      totalTokens: true,
    },
    _count: true,
    orderBy: {
      _sum: {
        cost: 'desc',
      },
    },
    take: 50, // Top 50 users
  });
  
  // Get users with their details
  const userIds = usageByUser.map(u => u.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionPlan: true,
    },
  });
  
  const userMap = new Map(users.map(u => [u.id, u]));
  const enrichedUsageByUser = usageByUser.map(usage => ({
    ...usage,
    user: userMap.get(usage.userId),
  }));
  
  // Get usage by provider and model
  const usageByProviderModel = await db.aiApiUsage.groupBy({
    by: ['provider', 'model'],
    where,
    _sum: {
      cost: true,
      totalTokens: true,
    },
    _count: true,
    orderBy: {
      _sum: {
        cost: 'desc',
      },
    },
  });
  
  return {
    totalCost: totalUsage._sum.cost || 0,
    totalTokens: totalUsage._sum.totalTokens || 0,
    totalRequests: totalUsage._count,
    topUsers: enrichedUsageByUser,
    usageByProviderModel,
  };
}

// Initialize cost configurations in database
export async function initializeCostConfigurations() {
  const configs = [];
  
  for (const [provider, models] of Object.entries(AI_MODEL_COSTS)) {
    for (const [model, costs] of Object.entries(models)) {
      configs.push({
        provider: provider as AiProvider,
        model,
        inputCostPer1k: costs.input,
        outputCostPer1k: costs.output,
      });
    }
  }
  
  // Upsert all configurations
  for (const config of configs) {
    await db.aiCostConfiguration.upsert({
      where: {
        provider_model_effectiveFrom: {
          provider: config.provider,
          model: config.model,
          effectiveFrom: new Date('2024-01-01'), // Default effective date
        },
      },
      update: {
        inputCostPer1k: config.inputCostPer1k,
        outputCostPer1k: config.outputCostPer1k,
      },
      create: {
        ...config,
        effectiveFrom: new Date('2024-01-01'),
      },
    });
  }
}

// Set user AI usage limit
export async function setUserAiUsageLimit(userId: string, monthlyLimitUsd: number | null) {
  const endOfMonth = new Date();
  endOfMonth.setMonth(endOfMonth.getMonth() + 1);
  endOfMonth.setDate(0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return await db.userAiUsageLimit.upsert({
    where: { userId },
    update: {
      monthlyLimitUsd: monthlyLimitUsd ?? 10.0,
      isActive: true,
    },
    create: {
      userId,
      monthlyLimitUsd: monthlyLimitUsd ?? 10.0,
      currentMonthUsd: 0,
      resetAt: endOfMonth,
      isActive: true,
    },
  });
}

// Create usage alerts for a user
export async function createUserAiUsageAlerts(userId: string) {
  const defaultAlerts: { alertType: AiAlertType; threshold: number }[] = [
    { alertType: 'USAGE_WARNING', threshold: 80 },
    { alertType: 'USAGE_CRITICAL', threshold: 95 },
    { alertType: 'LIMIT_EXCEEDED', threshold: 100 },
  ];
  
  for (const alert of defaultAlerts) {
    await db.aiUsageAlert.upsert({
      where: {
        userId_alertType: {
          userId,
          alertType: alert.alertType,
        },
      },
      update: {
        threshold: alert.threshold,
      },
      create: {
        userId,
        alertType: alert.alertType,
        threshold: alert.threshold,
      },
    });
  }
}

// Check user AI usage against limits
export async function checkUserAiUsageLimit(userId: string) {
  const limit = await db.userAiUsageLimit.findUnique({
    where: { userId },
  });

  if (!limit) {
    // Create default limit
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const newLimit = await db.userAiUsageLimit.create({
      data: {
        userId,
        monthlyLimitUsd: 10.0,
        currentMonthUsd: 0,
        resetAt: endOfMonth,
        isActive: true,
      },
    });

    return {
      allowed: true,
      currentUsage: 0,
      monthlyLimit: 10.0,
      percentageUsed: 0,
      resetAt: endOfMonth,
    };
  }

  // Check if we need to reset
  const now = new Date();
  if (now > limit.resetAt) {
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    await db.userAiUsageLimit.update({
      where: { id: limit.id },
      data: {
        currentMonthUsd: 0,
        resetAt: endOfMonth,
      },
    });

    return {
      allowed: true,
      currentUsage: 0,
      monthlyLimit: limit.monthlyLimitUsd,
      percentageUsed: 0,
      resetAt: endOfMonth,
    };
  }

  // Check limit
  const percentageUsed = (limit.currentMonthUsd / limit.monthlyLimitUsd) * 100;
  const allowed = limit.isActive && limit.currentMonthUsd < limit.monthlyLimitUsd;

  return {
    allowed,
    currentUsage: limit.currentMonthUsd,
    monthlyLimit: limit.monthlyLimitUsd,
    percentageUsed,
    resetAt: limit.resetAt,
    reason: allowed ? undefined : 'Monthly usage limit exceeded',
  };
}

// Update AI cost configuration
export async function updateAiCostConfiguration(params: {
  provider: AiProvider;
  model: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  effectiveFrom?: Date;
}) {
  const effectiveFrom = params.effectiveFrom || new Date();
  
  return await db.aiCostConfiguration.upsert({
    where: {
      provider_model_effectiveFrom: {
        provider: params.provider,
        model: params.model,
        effectiveFrom,
      },
    },
    update: {
      inputCostPer1k: params.inputCostPer1k,
      outputCostPer1k: params.outputCostPer1k,
    },
    create: {
      provider: params.provider,
      model: params.model,
      inputCostPer1k: params.inputCostPer1k,
      outputCostPer1k: params.outputCostPer1k,
      effectiveFrom,
    },
  });
}