"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CompletionCheckbox } from "~/components/ui/completion-checkbox";
import { cn } from "~/lib/utils";
import type { ClipWithDetails } from "~/actions/projects";
import {
  Play,
  CheckCircle2,
  Clock,
  NotebookText,
  ChevronRight,
  RotateCw,
  RotateCcw,
} from "lucide-react";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";
import { ResetProgressModal } from "~/components/ui/reset-progress-modal";
import { motion } from "framer-motion";
import { toast } from "sonner";

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
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

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

  const handleResetProgress = async () => {
    try {
      const response = await fetch(`/api/clips/${clip.id}/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => ({}))) as {
          message?: string;
        };
        throw new Error(errorData.message ?? "Failed to reset clip progress");
      }

      // Call the parent callback to update UI
      onCompletionChange?.(clip.id, false);

      toast.success("Clip progress reset successfully! 🎉");
    } catch (error) {
      console.error("Error resetting clip progress:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to reset clip progress",
      );
    }
  };

  const formatWatchTime = (seconds: number) => {
    if (seconds === 0) return "Not started";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const watchProgress = Math.min((clip.watchTime / 300) * 100, 100);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "group relative cursor-pointer rounded-xl border bg-white transition-all duration-200",
        clip.isCompleted
          ? "border-green-200 shadow-sm hover:shadow-md"
          : "border-gray-200 hover:border-blue-300 hover:shadow-md",
      )}
    >
      {/* Main clickable link covering the entire card */}
      <Link
        href={`/dashboard/projects/${projectId}/clips/${clip.id}`}
        className="absolute inset-0 z-10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
        aria-label={`Watch Chunk ${index + 1}`}
      />

      {/* Completion status indicator - mobile optimized */}
      <div className="absolute -top-2 -right-2 z-20 scale-90 sm:scale-100">
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

      {/* Card content */}
      <div className="p-3 sm:p-4">
        {/* Thumbnail area - responsive */}
        <div
          className={cn(
            "relative mb-3 aspect-video overflow-hidden rounded-lg bg-gray-100 transition-all duration-300",
            clip.isCompleted ? "bg-green-50" : "group-hover:bg-blue-50",
          )}
        >
          <ThumbnailImage
            thumbnailUrl={clip.thumbnailUrl}
            alt={`Chunk ${index + 1} thumbnail`}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            fallback={
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                <Play className="h-8 w-8 text-gray-400" />
              </div>
            }
          />

          {/* Overlay for completed status */}
          {clip.isCompleted && clip.thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-900/10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="rounded-full bg-green-600 p-2 shadow-lg"
              >
                <CheckCircle2 className="h-6 w-6 text-white" />
              </motion.div>
            </div>
          )}

          {/* Play button overlay */}
          {!clip.isCompleted && clip.thumbnailUrl && (
            <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              <div className="rounded-full bg-black/60 p-3 backdrop-blur-sm">
                <Play className="h-6 w-6 text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute right-2 bottom-2">
            <span className="rounded bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
              ~5 min
            </span>
          </div>
        </div>

        {/* Content - mobile optimized */}
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h4
              className={cn(
                "text-base font-semibold transition-colors sm:text-lg",
                clip.isCompleted
                  ? "text-green-700"
                  : "text-gray-900 group-hover:text-blue-600",
              )}
            >
              Chunk {index + 1}
            </h4>

            {/* Status icon */}
            {clip.isCompleted ? (
              <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-green-500" />
            ) : clip.watchTime > 0 ? (
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className="text-xs text-gray-500">
                  {Math.round(watchProgress)}%
                </span>
              </div>
            ) : null}
          </div>

          {/* Watch progress bar */}
          {clip.watchTime > 0 && (
            <div className="w-full">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${watchProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn(
                    "h-full rounded-full",
                    clip.isCompleted ? "bg-green-500" : "bg-blue-500",
                  )}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Watch time: {formatWatchTime(clip.watchTime)}
              </p>
            </div>
          )}

          {/* Completion date */}
          {clip.completedAt && (
            <p className="text-xs text-green-600">
              ✅ Watched {new Date(clip.completedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Action buttons - mobile optimized */}
        <div className="relative z-20 mt-3 flex items-center justify-between gap-2">
          <button
            onClick={(e) => {
              e.preventDefault();
              router.push(`/dashboard/projects/${projectId}/clips/${clip.id}`);
            }}
            className={cn(
              "flex items-center gap-1.5 text-sm font-medium transition-all duration-200",
              clip.isCompleted
                ? "text-green-600 hover:text-green-700"
                : "text-blue-600 hover:text-blue-700",
            )}
          >
            {clip.isCompleted ? (
              <>
                <RotateCw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Watch Again</span>
                <span className="sm:hidden">Watch</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Watch Chunk</span>
                <span className="sm:hidden">Watch</span>
              </>
            )}
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className="flex items-center gap-1">
            {/* Reset button - only show if there's progress to reset */}
            {(clip.watchTime > 0 || clip.isCompleted) && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setIsResetModalOpen(true);
                }}
                className="flex items-center gap-1 text-xs text-purple-600 transition-colors hover:text-purple-700"
                title="Reset progress"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Reset</span>
              </button>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                // TODO: Implement view notes functionality
                console.log("View notes for chunk", clip.id);
              }}
              className={cn(
                "flex items-center gap-1 text-xs transition-colors",
                clip.isCompleted
                  ? "text-green-600 hover:text-green-700"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              <NotebookText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Notes</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtle animation for completed cards */}
      {clip.isCompleted && (
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-2 right-8 h-1 w-1 animate-ping rounded-full bg-green-400 delay-300" />
          <div className="absolute bottom-2 left-4 h-0.5 w-0.5 animate-ping rounded-full bg-green-300 delay-500" />
        </div>
      )}

      {/* Reset Progress Modal */}
      <ResetProgressModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetProgress}
        title="Reset Chunk Progress"
        description="This will reset your viewing progress for this chunk. Your watch time and completion status will be cleared."
        itemType="clip"
        itemName={`Chunk ${index + 1}`}
      />
    </motion.div>
  );
}
