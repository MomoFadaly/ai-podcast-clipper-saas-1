"use client";

import Link from "next/link";
import {
  Route,
  ChevronRight,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { useTracks, useDeleteTrack, useUpdateTrack } from "~/hooks/use-tracks";
import { InlineEdit } from "~/components/ui/inline-edit";
import { Button } from "~/components/ui/button";
import type { TrackWithStats } from "~/actions/tracks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Checkbox } from "~/components/ui/checkbox";
import { SelectAllCheckbox } from "~/components/ui/select-all-checkbox";
import { useSelection } from "~/contexts/selection-context";
import { cn } from "~/lib/utils";

interface TracksViewProps {
  layoutType: "grid" | "list";
  searchQuery: string;
  onOpenCreateModal: () => void;
  isSelectionMode?: boolean;
}

// Use TrackWithStats from actions/tracks.ts

// Default colors for tracks without custom colors
const defaultColors = [
  "#3B82F6", // blue
  "#10B981", // emerald
  "#8B5CF6", // violet
  "#F59E0B", // amber
  "#EF4444", // red
  "#06B6D4", // cyan
  "#84CC16", // lime
  "#F97316", // orange
];

const getTrackColor = (track: TrackWithStats, index: number): string => {
  if (track.color) return track.color;
  return defaultColors[index % defaultColors.length] ?? "#3B82F6";
};

const TracksView = ({
  layoutType,
  searchQuery,
  onOpenCreateModal,
  isSelectionMode = false,
}: TracksViewProps) => {
  const { data: tracks = [], isLoading, error, refetch } = useTracks();
  const deleteTrackMutation = useDeleteTrack();
  const updateTrackMutation = useUpdateTrack();
  const { toggleItemSelection, isItemSelected } = useSelection();

  const handleDeleteTrack = async (trackId: string, trackName: string) => {
    if (
      window.confirm(
        `Are you sure you want to delete "${trackName}"? This will remove all project associations but won't delete the projects themselves.`,
      )
    ) {
      try {
        await deleteTrackMutation.mutateAsync(trackId);
      } catch (error) {
        console.error("Failed to delete track:", error);
        alert("Failed to delete track. Please try again.");
      }
    }
  };

  const handleTrackRename = async (trackId: string, newName: string) => {
    try {
      await updateTrackMutation.mutateAsync({
        trackId,
        data: { name: newName.trim() },
      });
    } catch (error) {
      console.error("Failed to rename track:", error);
      throw error; // Re-throw so InlineEdit can handle the error
    }
  };

  // Filter tracks based on search query
  const filteredTracks = tracks.filter((track) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      track.name.toLowerCase().includes(query) ||
      track.description?.toLowerCase().includes(query)
    );
  });

  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-red-100 p-6">
            <Route className="h-12 w-12 text-red-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Error loading tracks
          </h3>
          <p className="mt-2 text-gray-500">
            {error instanceof Error ? error.message : "Failed to load tracks"}
          </p>
          <Button
            onClick={() => void refetch()}
            className="mt-4"
            variant="outline"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    );
  }

  if (filteredTracks.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 rounded-full bg-gray-100 p-6">
            <Route className="h-12 w-12 text-gray-400" />
          </div>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            {searchQuery ? "No tracks found" : "No learning tracks yet"}
          </h3>
          <p className="mt-2 text-gray-500">
            {searchQuery
              ? "Try adjusting your search terms"
              : "Create your first learning track to organize your educational journey"}
          </p>
          {!searchQuery && (
            <Button onClick={onOpenCreateModal} className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Create Track
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Grid Layout
  if (layoutType === "grid") {
    return (
      <div>
        {/* Select All Checkbox */}
        {isSelectionMode && (
          <SelectAllCheckbox
            availableItems={filteredTracks.map((track) => track.id)}
            label="Select all tracks"
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {filteredTracks.map((track, index) => {
            const trackColor = getTrackColor(track, index);

            return (
              <motion.div
                key={track.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.2,
                  delay: index * 0.03,
                  ease: [0.4, 0, 0.2, 1],
                }}
                className="group relative cursor-pointer overflow-hidden rounded-xl border border-gray-200 bg-white transition-all duration-200 hover:border-gray-300 hover:shadow-xl"
              >
                {/* Selection Checkbox */}
                {isSelectionMode && (
                  <div
                    className="absolute top-3 left-3 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isItemSelected(track.id)}
                      onCheckedChange={() => toggleItemSelection(track.id)}
                      className="h-5 w-5 bg-white/90 backdrop-blur-sm"
                    />
                  </div>
                )}

                <Link
                  href={`/dashboard/tracks/${track.id}`}
                  className={cn(
                    "absolute inset-0 z-10",
                    isSelectionMode && "pointer-events-none",
                  )}
                  aria-label={`View track: ${track.name}`}
                />

                {/* Color accent bar */}
                <div
                  className="h-2 w-full"
                  style={{ backgroundColor: trackColor }}
                />

                {/* Content */}
                <div className="p-5">
                  {/* Header with actions */}
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center">
                      <div
                        className="mr-3 h-3 w-3 rounded-full"
                        style={{ backgroundColor: trackColor }}
                      />
                      <InlineEdit
                        value={track.name}
                        onSave={(newName) =>
                          handleTrackRename(track.id, newName)
                        }
                        placeholder="Track name"
                        className="text-lg font-semibold text-gray-900 group-hover:text-blue-600"
                        variant="default"
                      />
                    </div>
                    <div className="relative z-20">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                            aria-label="More options"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTrack(track.id, track.name);
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Track
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Description */}
                  {track.description && (
                    <p className="mb-4 line-clamp-2 text-sm text-gray-600">
                      {track.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {track.projectCount}
                      </div>
                      <div className="text-xs text-gray-500">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">
                        {track.completedProjects}
                      </div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-4">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-gray-600">Progress</span>
                      <span className="font-medium">
                        {Math.round(track.totalProgress ?? 0)}%
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          backgroundColor: trackColor,
                          width: `${track.totalProgress ?? 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // List Layout
  return (
    <div>
      {/* Select All Checkbox */}
      {isSelectionMode && (
        <SelectAllCheckbox
          availableItems={filteredTracks.map((track) => track.id)}
          label="Select all tracks"
        />
      )}

      <div className="space-y-4">
        {filteredTracks.map((track, index) => {
          const trackColor = getTrackColor(track, index);

          return (
            <motion.div
              key={track.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.2,
                delay: index * 0.03,
                ease: [0.4, 0, 0.2, 1],
              }}
              className="group relative cursor-pointer rounded-xl border border-gray-200 bg-white p-4 transition-all duration-200 hover:border-gray-300 hover:shadow-md"
            >
              {/* Selection Checkbox */}
              {isSelectionMode && (
                <div
                  className="absolute top-4 left-4 z-20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isItemSelected(track.id)}
                    onCheckedChange={() => toggleItemSelection(track.id)}
                    className="h-5 w-5"
                  />
                </div>
              )}

              <Link
                href={`/dashboard/tracks/${track.id}`}
                className={cn(
                  "absolute inset-0 z-10",
                  isSelectionMode && "pointer-events-none",
                )}
                aria-label={`View track: ${track.name}`}
              />
              <div className={cn(isSelectionMode && "ml-8")}>
                <div className="flex items-center justify-between">
                  {/* Track info */}
                  <div className="flex flex-1 items-center">
                    <div
                      className="mr-4 h-4 w-4 rounded-full"
                      style={{ backgroundColor: trackColor }}
                    />
                    <div className="flex-1">
                      <InlineEdit
                        value={track.name}
                        onSave={(newName) =>
                          handleTrackRename(track.id, newName)
                        }
                        placeholder="Track name"
                        className="font-semibold text-gray-900 group-hover:text-blue-600"
                        variant="default"
                      />
                      {track.description && (
                        <p className="line-clamp-1 text-sm text-gray-600">
                          {track.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center space-x-6 text-sm text-gray-600">
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {track.projectCount}
                      </div>
                      <div className="text-xs">Projects</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {track.completedProjects}
                      </div>
                      <div className="text-xs">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-gray-900">
                        {Math.round(track.totalProgress ?? 0)}%
                      </div>
                      <div className="text-xs">Progress</div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="relative z-20 ml-4 flex items-center space-x-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                          aria-label="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTrack(track.id, track.name);
                          }}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Track
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3">
                  <div className="h-1.5 w-full rounded-full bg-gray-200">
                    <div
                      className="h-1.5 rounded-full transition-all duration-300"
                      style={{
                        backgroundColor: trackColor,
                        width: `${track.totalProgress ?? 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

TracksView.displayName = "TracksView";

export default TracksView;
