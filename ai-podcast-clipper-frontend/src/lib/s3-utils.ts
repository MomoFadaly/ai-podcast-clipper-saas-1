// S3 utility functions that don't need to be server actions

// Helper function to extract video ID from S3 key
export function extractVideoIdFromS3Key(s3Key: string): string | null {
  const match = /chunkwise\/videos\/([^\/]+)\//.exec(s3Key);
  return match?.[1] ?? null;
}

// Helper function to extract chunk number from S3 key
export function extractChunkNumberFromS3Key(s3Key: string): number | null {
  const match = /chunk-(\d+)\.mp4$/.exec(s3Key);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

// Generate S3 key with chunkwise prefix
export function generateChunkwiseS3Key(path: string): string {
  const CHUNKWISE_PREFIX = "chunkwise/";
  return `${CHUNKWISE_PREFIX}${path}`;
}
