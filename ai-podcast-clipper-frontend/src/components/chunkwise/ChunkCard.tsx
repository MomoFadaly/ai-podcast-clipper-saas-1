"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CompletionCheckbox } from "~/components/ui/completion-checkbox";
import { cn } from "~/lib/utils";
import type { ClipWithDetails } from "~/actions/projects";
import { CheckIcon } from "lucide-react";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";

interface ChunkCardProps {
  clip: ClipWithDetails;
  index: number;
  projectId: string;
  onCompletionChange?: (clipId: string, isCompleted: boolean) => void;
}

export function ChunkCard({
  clip,
  index,
  projectId,
  onCompletionChange,
}: ChunkCardProps) {
  const router = useRouter();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCompletionToggle = async (completed: boolean) => {
    setIsUpdating(true);

    try {
      const response = await fetch(`/api/clips/${clip.id}/completion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: completed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update completion status");
      }

      // Call the parent callback to update UI
      onCompletionChange?.(clip.id, completed);
    } catch (error) {
      console.error("Error updating completion:", error);
      // Optionally show a toast notification here
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWatchChunk = () => {
    router.push(`/dashboard/projects/${projectId}/clips/${clip.id}`);
  };

  const formatWatchTime = (seconds: number) => {
    if (seconds === 0) return "Not started";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const watchProgress = Math.min((clip.watchTime / 300) * 100, 100);

  return (
    <div
      className={cn(
        "group relative cursor-pointer rounded-lg border bg-white p-4 transition-all duration-300 hover:shadow-lg",
        clip.isCompleted
          ? "border-green-200 bg-gradient-to-br from-green-50 to-white shadow-md hover:border-green-300"
          : "border-gray-200 hover:border-blue-300 hover:shadow-md",
      )}
    >
      {/* Main clickable link covering the entire card */}
      <Link
        href={`/dashboard/projects/${projectId}/clips/${clip.id}`}
        className="absolute inset-0 z-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-label={`Watch Chunk ${index + 1}`}
      />

      {/* Completion status indicator */}
      <div className="absolute -top-2 -right-2 z-20">
        <div onClick={(e) => e.stopPropagation()}>
          <CompletionCheckbox
            isCompleted={clip.isCompleted}
            onToggle={handleCompletionToggle}
            disabled={isUpdating}
            size="md"
            variant="fun"
          />
        </div>
      </div>

      {/* Completed overlay effect */}
      {clip.isCompleted && (
        <div className="pointer-events-none absolute inset-0 rounded-lg bg-gradient-to-r from-green-400/10 to-green-600/5" />
      )}

      {/* Thumbnail area */}
      <div
        className={cn(
          "relative mb-3 aspect-video overflow-hidden rounded bg-gray-100 transition-all duration-300",
          clip.isCompleted ? "bg-green-100" : "group-hover:bg-blue-50",
        )}
      >
        <ThumbnailImage
          thumbnailUrl={clip.thumbnailUrl}
          alt={`Chunk ${index + 1} thumbnail`}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
        />

        {/* Overlay for completed status */}
        {clip.isCompleted && clip.thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-900/20">
            <div className="rounded-full bg-green-600 p-2 shadow-lg">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        )}

        {/* Play button overlay */}
        {clip.thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="rounded-full bg-black/50 p-3 backdrop-blur-sm">
              <svg
                className="h-6 w-6 text-white"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h4
            className={cn(
              "font-medium transition-colors",
              clip.isCompleted
                ? "text-green-800"
                : "text-gray-900 group-hover:text-blue-600",
            )}
          >
            Chunk {index + 1}
          </h4>

          {/* Watch progress indicator */}
          {clip.watchTime > 0 && (
            <div className="flex items-center space-x-1">
              <div
                className={cn(
                  "h-2 w-8 overflow-hidden rounded-full bg-gray-200",
                  clip.isCompleted && "bg-green-200",
                )}
              >
                <div
                  className={cn(
                    "h-full transition-all duration-300",
                    clip.isCompleted
                      ? "bg-green-500"
                      : "bg-blue-500 group-hover:bg-blue-600",
                  )}
                  style={{ width: `${watchProgress}%` }}
                />
              </div>
              <span className="text-xs text-gray-500">
                {Math.round(watchProgress)}%
              </span>
            </div>
          )}
        </div>

        <p
          className={cn(
            "text-sm transition-colors",
            clip.isCompleted ? "text-green-600" : "text-gray-500",
          )}
        >
          ~5 minute segment
        </p>

        {/* Watch time info */}
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Watch time: {formatWatchTime(clip.watchTime)}</span>
          {clip.completedAt && (
            <span>Completed {clip.completedAt.toLocaleDateString()}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="relative z-20 mt-4 flex items-center justify-between">
        <span
          className={cn(
            "text-sm font-medium transition-all duration-200",
            clip.isCompleted
              ? "text-green-600 group-hover:text-green-800"
              : "text-blue-600 group-hover:text-blue-800",
          )}
        >
          {clip.isCompleted ? "Watch Again →" : "Watch Chunk →"}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Implement view notes functionality
            console.log("View notes for chunk", clip.id);
          }}
          className={cn(
            "text-sm transition-colors",
            clip.isCompleted
              ? "text-green-500 hover:text-green-700"
              : "text-gray-500 hover:text-gray-700",
          )}
        >
          View Notes
        </button>
      </div>

      {/* Completion celebration effect */}
      {clip.isCompleted && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-2 right-8 h-1 w-1 animate-ping rounded-full bg-yellow-400 delay-300" />
          <div className="absolute bottom-2 left-4 h-0.5 w-0.5 animate-ping rounded-full bg-yellow-300 delay-500" />
        </div>
      )}
    </div>
  );
}
