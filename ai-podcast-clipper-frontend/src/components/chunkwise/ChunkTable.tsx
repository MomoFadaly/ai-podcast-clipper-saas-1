"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";

interface ChunkTableProps {
  clips: ClipWithDetails[];
  projectId: string;
  onCompletionChange?: (clipId: string, isCompleted: boolean) => void;
  isLoading?: boolean;
  placeholderCount?: number;
}

export function ChunkTable({
  clips,
  projectId,
  onCompletionChange,
  isLoading = false,
  placeholderCount = 0,
}: ChunkTableProps) {
  const router = useRouter();
  const [updatingClips, setUpdatingClips] = useState<Set<string>>(new Set());

  const handleCompletionToggle = async (clipId: string, completed: boolean) => {
    setUpdatingClips((prev) => new Set(prev).add(clipId));

    try {
      const response = await fetch(`/api/clips/${clipId}/completion`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: completed }),
      });

      if (!response.ok) {
        throw new Error("Failed to update completion status");
      }

      onCompletionChange?.(clipId, completed);
    } catch (error) {
      console.error("Error updating completion:", error);
    } finally {
      setUpdatingClips((prev) => {
        const newSet = new Set(prev);
        newSet.delete(clipId);
        return newSet;
      });
    }
  };

  const formatWatchTime = (seconds: number) => {
    if (seconds === 0) return "Not started";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Generate placeholder rows when loading
  const displayItems = isLoading
    ? Array.from({ length: placeholderCount }, (_, i) => ({
        id: `placeholder-${i}`,
        isPlaceholder: true,
        index: i,
      }))
    : clips.map((clip, index) => ({ ...clip, index, isPlaceholder: false }));

  return (
    <div className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6">
                <span className="hidden sm:inline">Chunk</span>
                <span className="sm:hidden">#</span>
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6">
                Duration
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:table-cell sm:px-6">
                Progress
              </th>
              <th className="hidden px-4 py-3 text-left text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6 md:table-cell">
                Completed
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6">
                Status
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium tracking-wider text-gray-500 uppercase sm:px-6">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {displayItems.map((item) => {
              if (item.isPlaceholder) {
                // Placeholder row while loading
                return (
                  <tr key={item.id} className="animate-pulse">
                    <td className="px-4 py-4 sm:px-6">
                      <div className="h-5 w-20 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="h-5 w-16 rounded bg-gray-200" />
                    </td>
                    <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                      <div className="h-2 w-full max-w-[100px] rounded-full bg-gray-200" />
                    </td>
                    <td className="hidden px-4 py-4 sm:px-6 md:table-cell">
                      <div className="h-5 w-24 rounded bg-gray-200" />
                    </td>
                    <td className="px-4 py-4 text-center sm:px-6">
                      <div className="mx-auto h-6 w-6 rounded-full bg-gray-200" />
                    </td>
                    <td className="px-4 py-4 sm:px-6">
                      <div className="ml-auto h-8 w-20 rounded bg-gray-200" />
                    </td>
                  </tr>
                );
              }

              const clip = item as ClipWithDetails & { index: number };
              const watchProgress = Math.min((clip.watchTime / 300) * 100, 100);
              const isUpdating = updatingClips.has(clip.id);

              return (
                <motion.tr
                  key={clip.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: clip.index * 0.02 }}
                  className={cn(
                    "group transition-colors hover:bg-gray-50",
                    clip.isCompleted && "bg-green-50/30 hover:bg-green-50/50",
                  )}
                >
                  {/* Chunk Number */}
                  <td className="px-4 py-4 sm:px-6">
                    <div className="flex items-center">
                      <span
                        className={cn(
                          "font-medium",
                          clip.isCompleted ? "text-green-700" : "text-gray-900",
                        )}
                      >
                        <span className="hidden sm:inline">Chunk </span>
                        {clip.index + 1}
                      </span>
                    </div>
                  </td>

                  {/* Duration */}
                  <td className="px-4 py-4 sm:px-6">
                    <span className="text-sm text-gray-600">~5 min</span>
                  </td>

                  {/* Progress */}
                  <td className="hidden px-4 py-4 sm:table-cell sm:px-6">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-gray-200">
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
                      <span className="text-xs text-gray-500">
                        {formatWatchTime(clip.watchTime)}
                      </span>
                    </div>
                  </td>

                  {/* Completed Date */}
                  <td className="hidden px-4 py-4 text-sm text-gray-600 sm:px-6 md:table-cell">
                    {clip.completedAt ? (
                      <span className="text-green-600">
                        {formatDate(clip.completedAt)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>

                  {/* Status Checkbox */}
                  <td className="px-4 py-4 text-center sm:px-6">
                    <div
                      className="flex justify-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <CompletionCheckbox
                        isCompleted={clip.isCompleted}
                        onToggle={(completed) =>
                          handleCompletionToggle(clip.id, completed)
                        }
                        disabled={isUpdating}
                        size="sm"
                        variant="fun"
                      />
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-4 text-right sm:px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() =>
                          router.push(
                            `/dashboard/projects/${projectId}/clips/${clip.id}`,
                          )
                        }
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                          clip.isCompleted
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-blue-600 text-white hover:bg-blue-700",
                        )}
                      >
                        {clip.isCompleted ? (
                          <>
                            <RotateCw className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Again</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Watch</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // TODO: Implement view notes
                          console.log("View notes for clip:", clip.id);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-50"
                      >
                        <NotebookText className="h-3.5 w-3.5" />
                        <span className="hidden sm:inline">Notes</span>
                      </button>
                    </div>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
