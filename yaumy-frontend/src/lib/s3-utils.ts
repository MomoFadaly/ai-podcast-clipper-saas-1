// S3 utility functions that don't need to be server actions

// Helper function to extract chunk number from S3 key
export function extractChunkNumberFromS3Key(s3Key: string): number | null {
  const match = /chunk-(\d+)\.mp4$/.exec(s3Key);
  return match?.[1] ? parseInt(match[1], 10) : null;
}

// Generate S3 key with yaumy prefix
export function generateYaumyS3Key(path: string): string {
  const YAUMY_PREFIX = "yaumy/";
  return `${YAUMY_PREFIX}${path}`;
}
