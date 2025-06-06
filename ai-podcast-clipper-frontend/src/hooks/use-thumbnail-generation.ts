import { useState } from "react";

interface ThumbnailGenerationResult {
  success: boolean;
  type: string;
  result?: unknown;
  results?: unknown[];
  processed?: number;
  error?: string;
  details?: string;
}

interface UseThumbnailGenerationOptions {
  onSuccess?: (result: ThumbnailGenerationResult) => void;
  onError?: (error: string) => void;
}

export function useThumbnailGeneration(
  options?: UseThumbnailGenerationOptions,
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ThumbnailGenerationResult | null>(null);

  const generateThumbnail = async (params: {
    type: "single" | "project" | "batch";
    projectId?: string;
    clipId?: string;
    projectIds?: string[];
    timeOffset?: number;
  }) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      console.log("🎬 Starting thumbnail generation:", params);

      const response = await fetch("/api/thumbnails/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => ({}))) as {
          error?: string;
          details?: string;
        };
        throw new Error(
          errorPayload.error ??
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const data = (await response.json()) as ThumbnailGenerationResult;
      console.log("✅ Thumbnail generation completed:", data);

      setResult(data);
      options?.onSuccess?.(data);

      return data;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to generate thumbnails";
      console.error("❌ Thumbnail generation failed:", errorMessage);

      setError(errorMessage);
      options?.onError?.(errorMessage);

      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // Helper methods for specific use cases
  const generateSingleThumbnail = async (params: {
    projectId?: string;
    clipId?: string;
    timeOffset?: number;
  }) => {
    return generateThumbnail({
      type: "single",
      ...params,
    });
  };

  const generateProjectThumbnails = async (projectId: string) => {
    return generateThumbnail({
      type: "project",
      projectId,
    });
  };

  const generateBatchThumbnails = async (projectIds: string[]) => {
    return generateThumbnail({
      type: "batch",
      projectIds,
    });
  };

  const reset = () => {
    setIsLoading(false);
    setError(null);
    setResult(null);
  };

  return {
    // State
    isLoading,
    error,
    result,

    // Actions
    generateThumbnail,
    generateSingleThumbnail,
    generateProjectThumbnails,
    generateBatchThumbnails,
    reset,
  };
}
