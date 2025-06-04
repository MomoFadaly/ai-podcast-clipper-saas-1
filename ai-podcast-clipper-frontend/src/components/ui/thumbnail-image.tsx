"use client";

import { useState, useEffect } from "react";
import { getThumbnailSignedUrl } from "~/actions/chunkwise-s3";

interface ThumbnailImageProps {
  thumbnailUrl?: string | null;
  alt: string;
  className?: string;
  fallback?: React.ReactNode;
}

export function ThumbnailImage({
  thumbnailUrl,
  alt,
  className,
  fallback,
}: ThumbnailImageProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!thumbnailUrl) {
      setSignedUrl(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    getThumbnailSignedUrl(thumbnailUrl)
      .then((result) => {
        if (result.success && result.url) {
          setSignedUrl(result.url);
        } else {
          setError(result.error || "Failed to load thumbnail");
        }
      })
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Failed to load thumbnail",
        );
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [thumbnailUrl]);

  if (!thumbnailUrl || error) {
    return <>{fallback}</>;
  }

  if (isLoading) {
    return (
      <div className={`animate-pulse bg-gray-200 ${className}`}>
        <div className="flex h-full items-center justify-center">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      </div>
    );
  }

  if (signedUrl) {
    return (
      <img
        src={signedUrl}
        alt={alt}
        className={className}
        onError={() => setError("Failed to load image")}
      />
    );
  }

  return <>{fallback}</>;
}
