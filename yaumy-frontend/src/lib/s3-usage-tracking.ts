import { db } from '~/server/db';
import { S3Client, ListObjectsV2Command, HeadObjectCommand } from '@aws-sdk/client-s3';
import type { Decimal } from '@prisma/client/runtime/library';

// AWS S3 Pricing (US East - N. Virginia)
// These are approximate prices and should be updated based on your actual AWS pricing
const S3_PRICING = {
  // Storage cost per GB per month (in USD)
  storage: {
    STANDARD: 0.023,              // First 50 TB / month
    STANDARD_IA: 0.0125,          // Infrequent Access
    GLACIER_INSTANT: 0.004,       // Glacier Instant Retrieval
  },
  // Data transfer cost per GB (in USD)
  transfer: {
    OUT_TO_INTERNET: 0.09,        // First 10 TB / month
    OUT_TO_CLOUDFRONT: 0.00,      // Free to CloudFront
    IN_FROM_INTERNET: 0.00,       // Free inbound
  },
  // Request pricing (per 1000 requests)
  requests: {
    PUT_COPY_POST_LIST: 0.005,    // PUT, COPY, POST, LIST requests
    GET_SELECT: 0.0004,           // GET, SELECT, and all other requests
  }
};

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Track S3 file upload
export async function trackS3Upload({
  userId,
  s3Key,
  fileName,
  fileType,
  contentType,
  sizeBytes,
  projectId,
  clipId,
  bucket = 'smallbitesai',
}: {
  userId: string;
  s3Key: string;
  fileName: string;
  fileType: 'original' | 'chunk' | 'thumbnail' | 'other';
  contentType?: string;
  sizeBytes: number;
  projectId?: string;
  clipId?: string;
  bucket?: string;
}) {
  try {
    // Create or update file record
    await db.s3FileRecord.upsert({
      where: { s3Key },
      create: {
        userId,
        s3Key,
        bucket,
        fileName,
        fileType,
        contentType,
        sizeBytes: BigInt(sizeBytes),
        projectId,
        clipId,
      },
      update: {
        sizeBytes: BigInt(sizeBytes),
        contentType,
        lastAccessed: new Date(),
      },
    });

    // Update user's storage usage
    await updateUserStorageUsage(userId);
    
    return { success: true };
  } catch (error) {
    console.error('Failed to track S3 upload:', error);
    return { success: false, error };
  }
}

// Update user's total storage usage and costs
export async function updateUserStorageUsage(userId: string) {
  try {
    // Get all files for the user
    const files = await db.s3FileRecord.findMany({
      where: { userId },
      select: {
        fileType: true,
        sizeBytes: true,
      },
    });

    // Calculate totals by type
    const totals = files.reduce((acc, file) => {
      const bytes = Number(file.sizeBytes);
      acc.totalBytes += bytes;
      acc.totalFiles += 1;

      switch (file.fileType) {
        case 'original':
          acc.fileBytes += bytes;
          acc.fileCount += 1;
          break;
        case 'chunk':
          acc.chunkBytes += bytes;
          acc.chunkCount += 1;
          break;
        case 'thumbnail':
          acc.thumbnailBytes += bytes;
          acc.thumbnailCount += 1;
          break;
        default:
          acc.otherBytes += bytes;
      }

      return acc;
    }, {
      totalBytes: 0,
      fileBytes: 0,
      chunkBytes: 0,
      thumbnailBytes: 0,
      otherBytes: 0,
      totalFiles: 0,
      fileCount: 0,
      chunkCount: 0,
      thumbnailCount: 0,
    });

    // Calculate costs
    const totalGB = totals.totalBytes / (1024 * 1024 * 1024);
    const monthlyStorageCost = totalGB * S3_PRICING.storage.STANDARD;

    // For transfer costs, we'd need to track actual transfer usage
    // For now, estimate based on typical usage patterns
    const estimatedMonthlyTransferGB = totalGB * 0.5; // Assume 50% of storage is transferred monthly
    const monthlyTransferCost = estimatedMonthlyTransferGB * S3_PRICING.transfer.OUT_TO_INTERNET;

    const totalMonthlyCost = monthlyStorageCost + monthlyTransferCost;

    // Update or create storage usage record
    await db.s3StorageUsage.upsert({
      where: { userId },
      create: {
        userId,
        totalBytes: BigInt(totals.totalBytes),
        fileBytes: BigInt(totals.fileBytes),
        chunkBytes: BigInt(totals.chunkBytes),
        thumbnailBytes: BigInt(totals.thumbnailBytes),
        otherBytes: BigInt(totals.otherBytes),
        totalFiles: totals.totalFiles,
        fileCount: totals.fileCount,
        chunkCount: totals.chunkCount,
        thumbnailCount: totals.thumbnailCount,
        monthlyStorageCost: monthlyStorageCost as unknown as Decimal,
        monthlyTransferCost: monthlyTransferCost as unknown as Decimal,
        totalMonthlyCost: totalMonthlyCost as unknown as Decimal,
        lastCalculated: new Date(),
      },
      update: {
        totalBytes: BigInt(totals.totalBytes),
        fileBytes: BigInt(totals.fileBytes),
        chunkBytes: BigInt(totals.chunkBytes),
        thumbnailBytes: BigInt(totals.thumbnailBytes),
        otherBytes: BigInt(totals.otherBytes),
        totalFiles: totals.totalFiles,
        fileCount: totals.fileCount,
        chunkCount: totals.chunkCount,
        thumbnailCount: totals.thumbnailCount,
        monthlyStorageCost: monthlyStorageCost as unknown as Decimal,
        monthlyTransferCost: monthlyTransferCost as unknown as Decimal,
        totalMonthlyCost: totalMonthlyCost as unknown as Decimal,
        lastCalculated: new Date(),
      },
    });

    return { success: true, totals, costs: { monthlyStorageCost, monthlyTransferCost, totalMonthlyCost } };
  } catch (error) {
    console.error('Failed to update user storage usage:', error);
    return { success: false, error };
  }
}

// Sync S3 files with database (for existing files)
export async function syncS3FilesForUser(userId: string) {
  try {
    const userPrefix = `users/${userId}/`;
    
    // List all objects for the user
    const objects = await listAllObjects(userPrefix);
    
    // Get existing records
    const existingRecords = await db.s3FileRecord.findMany({
      where: { userId },
      select: { s3Key: true },
    });
    const existingKeys = new Set(existingRecords.map(r => r.s3Key));

    // Process each object
    for (const object of objects) {
      if (!object.Key || !object.Size) continue;
      
      // Skip if already tracked
      if (existingKeys.has(object.Key)) continue;

      // Determine file type based on path
      let fileType: 'original' | 'chunk' | 'thumbnail' | 'other' = 'other';
      let projectId: string | undefined;
      let clipId: string | undefined;

      if (object.Key.includes('/chunks/')) {
        fileType = 'chunk';
        // Extract IDs from path if possible
        const pathParts = object.Key.split('/');
        const projectIndex = pathParts.indexOf('projects');
        if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
          projectId = pathParts[projectIndex + 1];
        }
      } else if (object.Key.includes('/thumbnails/')) {
        fileType = 'thumbnail';
      } else if (object.Key.includes('/projects/')) {
        fileType = 'original';
        const pathParts = object.Key.split('/');
        const projectIndex = pathParts.indexOf('projects');
        if (projectIndex !== -1 && pathParts[projectIndex + 1]) {
          projectId = pathParts[projectIndex + 1];
        }
      }

      // Get file metadata
      const headCommand = new HeadObjectCommand({
        Bucket: 'smallbitesai',
        Key: object.Key,
      });
      
      let contentType: string | undefined;
      try {
        const headResponse = await s3Client.send(headCommand);
        contentType = headResponse.ContentType;
      } catch (error) {
        console.error(`Failed to get metadata for ${object.Key}:`, error);
      }

      // Track the file
      await trackS3Upload({
        userId,
        s3Key: object.Key,
        fileName: object.Key.split('/').pop() || object.Key,
        fileType,
        contentType,
        sizeBytes: object.Size,
        projectId,
        clipId,
      });
    }

    // Update usage after sync
    await updateUserStorageUsage(userId);

    return { success: true, syncedCount: objects.length - existingKeys.size };
  } catch (error) {
    console.error('Failed to sync S3 files:', error);
    return { success: false, error };
  }
}

// Helper to list all objects with pagination
async function listAllObjects(prefix: string, bucket = 'smallbitesai'): Promise<any[]> {
  const objects: any[] = [];
  let continuationToken: string | undefined;

  do {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    });

    const response = await s3Client.send(command);
    
    if (response.Contents) {
      objects.push(...response.Contents);
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  return objects;
}

// Create monthly snapshot for billing
export async function createMonthlySnapshot(userId: string, year: number, month: number) {
  try {
    const usage = await db.s3StorageUsage.findUnique({
      where: { userId },
    });

    if (!usage) {
      return { success: false, error: 'No usage data found' };
    }

    // Create snapshot
    await db.s3UsageSnapshot.create({
      data: {
        userId,
        year,
        month,
        totalBytes: usage.totalBytes,
        fileBytes: usage.fileBytes,
        chunkBytes: usage.chunkBytes,
        thumbnailBytes: usage.thumbnailBytes,
        otherBytes: usage.otherBytes,
        totalFiles: usage.totalFiles,
        fileCount: usage.fileCount,
        chunkCount: usage.chunkCount,
        thumbnailCount: usage.thumbnailCount,
        storageCost: usage.monthlyStorageCost,
        transferCost: usage.monthlyTransferCost,
        totalCost: usage.totalMonthlyCost,
        // TODO: Track actual transfer metrics
        bytesTransferred: BigInt(0),
        requestCount: 0,
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to create monthly snapshot:', error);
    return { success: false, error };
  }
}

// Get S3 usage stats for admin dashboard
export async function getAllUsersS3Stats() {
  const totalUsage = await db.s3StorageUsage.aggregate({
    _sum: {
      totalBytes: true,
      monthlyStorageCost: true,
      monthlyTransferCost: true,
      totalMonthlyCost: true,
    },
    _count: true,
  });

  const topUsersByCost = await db.s3StorageUsage.findMany({
    take: 10,
    orderBy: { totalMonthlyCost: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  const topUsersByStorage = await db.s3StorageUsage.findMany({
    take: 10,
    orderBy: { totalBytes: 'desc' },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });

  // Get usage breakdown by file type
  const fileTypeBreakdown = await db.s3FileRecord.groupBy({
    by: ['fileType'],
    _sum: {
      sizeBytes: true,
    },
    _count: true,
  });

  return {
    totalUsers: totalUsage._count,
    totalBytes: Number(totalUsage._sum.totalBytes || 0),
    totalStorageCost: Number(totalUsage._sum.monthlyStorageCost || 0),
    totalTransferCost: Number(totalUsage._sum.monthlyTransferCost || 0),
    totalMonthlyCost: Number(totalUsage._sum.totalMonthlyCost || 0),
    topUsersByCost,
    topUsersByStorage,
    fileTypeBreakdown,
  };
}

// Get user's S3 usage details
export async function getUserS3Stats(userId: string) {
  const usage = await db.s3StorageUsage.findUnique({
    where: { userId },
  });

  const recentFiles = await db.s3FileRecord.findMany({
    where: { userId },
    take: 10,
    orderBy: { uploadedAt: 'desc' },
  });

  const filesByType = await db.s3FileRecord.groupBy({
    by: ['fileType'],
    where: { userId },
    _sum: {
      sizeBytes: true,
    },
    _count: true,
  });

  // Get monthly history
  const now = new Date();
  const snapshots = await db.s3UsageSnapshot.findMany({
    where: {
      userId,
      year: { gte: now.getFullYear() - 1 }, // Last 12 months
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
    take: 12,
  });

  return {
    currentUsage: usage,
    recentFiles,
    filesByType,
    monthlyHistory: snapshots,
  };
}