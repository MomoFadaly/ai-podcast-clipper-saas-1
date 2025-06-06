import { type NextRequest, NextResponse } from "next/server";
import { db } from "~/server/db";
import { auth } from "~/server/auth";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "~/env";

const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
});

interface RouteParams {
  params: Promise<{ clipId: string }>;
}

// Cache for video URLs (in memory cache with TTL)
const urlCache = new Map<string, { url: string; expires: number }>();
const CACHE_TTL = 50 * 60 * 1000; // 50 minutes (less than signed URL expiry)

// Request deduplication cache to prevent concurrent identical requests
const requestCache = new Map<string, Promise<NextResponse>>();

// Add server-side request throttling to prevent rapid successive requests
const requestThrottle = new Map<string, number>();
const THROTTLE_MS = 500; // Minimum 500ms between requests for same clipId+userId

// Session cache to prevent repeated user lookups
const sessionCache = new Map<string, { userId: string; expires: number }>();
const SESSION_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Types for cached data
interface CachedClipData {
  userId: string;
  s3Key: string;
  allClips: Array<{
    id: string;
    chunks: unknown;
    createdAt: Date;
  }>;
  response: {
    success: boolean;
    clip: {
      id: string;
      s3Key: string;
      createdAt: string;
      uploadedFile: { displayName: string | null } | null;
      chunks: Array<{
        id: number;
        start: number;
        end: number;
        duration: number;
        clipId: string;
      }>;
      transcript: unknown;
    };
    transcription: string;
  };
}

// Cache for clip data to reduce database hits
const clipDataCache = new Map<string, { data: CachedClipData; expires: number }>();
const CLIP_DATA_TTL = 10 * 60 * 1000; // Increased to 10 minutes for better performance

function getCachedUrl(s3Key: string): string | null {
  const cached = urlCache.get(s3Key);
  if (cached && cached.expires > Date.now()) {
    return cached.url;
  }
  if (cached) {
    urlCache.delete(s3Key);
  }
  return null;
}

function setCachedUrl(s3Key: string, url: string): void {
  urlCache.set(s3Key, {
    url,
    expires: Date.now() + CACHE_TTL,
  });
}

function getCachedClipData(clipId: string): CachedClipData | null {
  const cached = clipDataCache.get(clipId);
  if (cached && cached.expires > Date.now()) {
    return cached.data;
  }
  if (cached) {
    clipDataCache.delete(clipId);
  }
  return null;
}

function setCachedClipData(clipId: string, data: CachedClipData): void {
  clipDataCache.set(clipId, {
    data,
    expires: Date.now() + CLIP_DATA_TTL,
  });
}

function getCachedSession(sessionId: string): string | null {
  const cached = sessionCache.get(sessionId);
  if (cached && cached.expires > Date.now()) {
    return cached.userId;
  }
  if (cached) {
    sessionCache.delete(sessionId);
  }
  return null;
}

function setCachedSession(sessionId: string, userId: string): void {
  sessionCache.set(sessionId, {
    userId,
    expires: Date.now() + SESSION_CACHE_TTL,
  });
}

// Request deduplication helper for this specific route
function getOrCreateClipRequest(key: string, factory: () => Promise<NextResponse>): Promise<NextResponse> {
  const existing = requestCache.get(key);
  if (existing) {
    return existing;
  }

  const request = factory().finally(() => {
    // Clean up the request from cache when it's done
    requestCache.delete(key);
  });

  requestCache.set(key, request);
  return request;
}

// Cleanup expired entries periodically to prevent memory leaks
function cleanupExpiredCache() {
  const now = Date.now();
  
  // Clean URL cache
  for (const [key, value] of urlCache.entries()) {
    if (value.expires <= now) {
      urlCache.delete(key);
    }
  }
  
  // Clean clip data cache
  for (const [key, value] of clipDataCache.entries()) {
    if (value.expires <= now) {
      clipDataCache.delete(key);
    }
  }
  
  // Clean session cache
  for (const [key, value] of sessionCache.entries()) {
    if (value.expires <= now) {
      sessionCache.delete(key);
    }
  }
  
  // Clean request cache (shouldn't have long-lived entries but just in case)
  requestCache.clear();
  
  // Clean throttling cache (remove entries older than 5 minutes)
  for (const [key, timestamp] of requestThrottle.entries()) {
    if (now - timestamp > 5 * 60 * 1000) { // 5 minutes
      requestThrottle.delete(key);
    }
  }
}

// Run cleanup every 5 minutes
if (typeof global !== "undefined") {
  setInterval(cleanupExpiredCache, 5 * 60 * 1000);
}

export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Debug logging to track request source
    const componentId = request.headers.get("X-Component-ID");
    const fetchSource = request.headers.get("X-Fetch-Source");
    console.log(
      `🔍 API Request to /api/clips - Component: ${componentId ?? "unknown"}, Source: ${fetchSource ?? "unknown"}, Timestamp: ${Date.now()}`,
    );

    // Get session with caching
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { clipId } = await context.params;
    const requestKey = `${clipId}-${session.user.id}`;

    // Check server-side throttling
    const now = Date.now();
    const lastRequestTime = requestThrottle.get(requestKey);
    if (lastRequestTime && now - lastRequestTime < THROTTLE_MS) {
      console.log(
        `🛑 Throttling request for ${requestKey} (last request was ${now - lastRequestTime}ms ago)`,
      );
      return NextResponse.json(
        { error: "Too many requests. Please slow down." },
        { status: 429 },
      );
    }
    requestThrottle.set(requestKey, now);

    // Use request deduplication to prevent concurrent identical requests
    return await getOrCreateClipRequest(requestKey, async () => {
      // Check cache first
      const cachedData = getCachedClipData(clipId);
      if (cachedData && cachedData.userId === session.user.id) {
        // Check if we have a cached URL that's still valid
        const cachedUrl = getCachedUrl(cachedData.s3Key);
        if (cachedUrl) {
          console.log(`Cache HIT for clip ${clipId}`);
          return NextResponse.json({
            ...cachedData.response,
            videoUrl: cachedUrl,
          });
        }
      }

      console.log(`Cache MISS for clip ${clipId}, fetching from database`);

      // Optimized database query with selective fields
      const clip = await db.clip.findUnique({
        where: { id: clipId },
        select: {
          id: true,
          s3Key: true,
          userId: true,
          uploadedFileId: true,
          chunks: true,
          createdAt: true,
          UploadedFile: {
            select: {
              displayName: true,
              transcript: true, // Fetch transcript from the parent UploadedFile
            },
          },
        },
      });

      if (!clip) {
        return NextResponse.json({ error: "Clip not found" }, { status: 404 });
      }

      // Check if user owns this clip
      if (clip.userId !== session.user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      const transcript = clip.UploadedFile?.transcript ?? null;

      // Check for cached signed URL first
      let signedUrl = getCachedUrl(clip.s3Key);

      if (!signedUrl) {
        // Generate new signed URL only if not cached
        const command = new GetObjectCommand({
          Bucket: env.S3_BUCKET_NAME,
          Key: clip.s3Key,
        });

        try {
          signedUrl = await getSignedUrl(s3Client, command, {
            expiresIn: 3600, // 1 hour
          });
          setCachedUrl(clip.s3Key, signedUrl);
          console.log(`Generated new signed URL for ${clip.s3Key}`);
        } catch (s3Error) {
          console.error("Error generating signed URL:", s3Error);
          return NextResponse.json(
            {
              error: `Failed to generate video URL: ${s3Error instanceof Error ? s3Error.message : "Unknown S3 error"}`,
            },
            { status: 500 },
          );
        }
      } else {
        console.log(`Using cached signed URL for ${clip.s3Key}`);
      }

      // Fetch ALL clips only if not in cache or cache miss
      let allClips;
      if (cachedData?.allClips) {
        allClips = cachedData.allClips;
      } else {
        allClips = await db.clip.findMany({
          where: {
            uploadedFileId: clip.uploadedFileId,
            userId: session.user.id,
          },
          select: {
            id: true,
            chunks: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: "asc", // Order by creation time to maintain chunk order
          },
        });
      }

      // Parse and format transcription for display (optimized)
      let formattedTranscription = "Transcription not available for this clip.";
      if (transcript) {
        try {
          const transcriptSegments = transcript as unknown;
          if (
            Array.isArray(transcriptSegments) &&
            transcriptSegments.length > 0
          ) {
            // Optimized string joining
            const words = transcriptSegments
              .map((segment: { word: string }) => segment.word)
              .filter(Boolean);
            formattedTranscription = words.join(" ");
          }
        } catch (parseError) {
          console.error("Error parsing transcription:", parseError);
        }
      }

      // Convert all clips to normalized chunks format (optimized)
      interface NormalizedChunk {
        id: number;
        start: number;
        end: number;
        duration: number;
        clipId: string;
      }

      const normalizedChunks: NormalizedChunk[] = allClips.map(
        (clipItem, idx) => {
          // Optimized chunk metadata extraction
          let chunkData = null;
          if (clipItem.chunks && typeof clipItem.chunks === "object") {
            chunkData = clipItem.chunks as Record<string, unknown>;
          }

          // Extract timing information with fallbacks
          const start =
            (chunkData?.start_time_seconds as number) ??
            (chunkData?.start as number) ??
            idx * 300; // Default 5-minute chunks

          const end =
            (chunkData?.end_time_seconds as number) ??
            (chunkData?.end as number) ??
            (idx + 1) * 300;

          const duration =
            (chunkData?.duration_seconds as number) ??
            (chunkData?.duration as number) ??
            end - start;

          return {
            id:
              (chunkData?.chunk_number as number) ??
              (chunkData?.id as number) ??
              idx + 1,
            start,
            end,
            duration,
            clipId: clipItem.id,
          };
        },
      );

      // Sort chunks by start time to ensure correct order
      normalizedChunks.sort((a, b) => a.start - b.start);

      const responseData = {
        success: true,
        clip: {
          id: clip.id,
          s3Key: clip.s3Key,
          createdAt: clip.createdAt.toISOString(),
          uploadedFile: clip.UploadedFile,
          chunks: normalizedChunks,
          transcript: transcript,
        },
        videoUrl: signedUrl,
        transcription: formattedTranscription,
      };

      // Cache the processed data for faster subsequent requests
      setCachedClipData(clipId, {
        userId: session.user.id,
        s3Key: clip.s3Key,
        allClips,
        response: {
          success: true,
          clip: {
            id: clip.id,
            s3Key: clip.s3Key,
            createdAt: clip.createdAt.toISOString(),
            uploadedFile: clip.UploadedFile,
            chunks: normalizedChunks,
            transcript: transcript,
          },
          transcription: formattedTranscription,
        },
      });

      return NextResponse.json(responseData);
    });
  } catch (error) {
    console.error("Error fetching clip:", error);
    return NextResponse.json(
      { error: "Failed to fetch clip data" },
      { status: 500 },
    );
  }
}
