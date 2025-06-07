"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Route, Plus, Search, Check } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useTracks, useAddProjectToTrack } from "~/hooks/use-tracks";
import { cn } from "~/lib/utils";

interface AddProjectToTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectName: string;
  currentTrackIds?: string[];
}

export default function AddProjectToTrackModal({
  isOpen,
  onClose,
  projectId,
  projectName,
  currentTrackIds = [],
}: AddProjectToTrackModalProps) {
  const { data: tracks = [], isLoading } = useTracks();
  const addProjectToTrackMutation = useAddProjectToTrack();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);

  // Filter tracks based on search and exclude already assigned tracks
  const filteredTracks = tracks.filter((track) => {
    const matchesSearch = searchQuery
      ? track.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        track.description?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const notAlreadyAssigned = !currentTrackIds.includes(track.id);

    return matchesSearch && notAlreadyAssigned;
  });

  const handleTrackToggle = (trackId: string) => {
    setSelectedTrackIds((prev) =>
      prev.includes(trackId)
        ? prev.filter((id) => id !== trackId)
        : [...prev, trackId],
    );
  };

  const handleAddToTracks = async () => {
    if (selectedTrackIds.length === 0) return;

    try {
      // Add project to each selected track
      await Promise.all(
        selectedTrackIds.map((trackId) =>
          addProjectToTrackMutation.mutateAsync({ projectId, trackId }),
        ),
      );
      onClose();
    } catch (error) {
      console.error("Failed to add project to tracks:", error);
      alert("Failed to add project to tracks. Please try again.");
    }
  };

  const getTrackColor = (track: { color?: string | null }) =>
    track.color ?? "#3B82F6";

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add to Learning Tracks
                </h2>
                <p className="text-sm text-gray-600">
                  Add &ldquo;{projectName}&rdquo; to learning tracks
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="relative">
              <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search tracks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pr-3 pl-9 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto px-6 py-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 w-32 animate-pulse rounded bg-gray-200"></div>
                      <div className="mt-1 h-3 w-48 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTracks.length === 0 ? (
              <div className="py-8 text-center">
                <Route className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchQuery ? "No tracks found" : "No available tracks"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "This project is already in all your tracks or you haven't created any tracks yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTracks.map((track) => {
                  const trackColor = getTrackColor(track);
                  const isSelected = selectedTrackIds.includes(track.id);

                  return (
                    <div
                      key={track.id}
                      onClick={() => handleTrackToggle(track.id)}
                      className={cn(
                        "flex cursor-pointer items-center space-x-3 rounded-lg border p-3 transition-all",
                        isSelected
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                      )}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border-2 transition-colors",
                          isSelected
                            ? "border-blue-600 bg-blue-600"
                            : "border-gray-300",
                        )}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>

                      {/* Track Icon */}
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-sm"
                        style={{
                          backgroundColor: `${trackColor}20`,
                          color: trackColor,
                        }}
                      >
                        {track.icon ?? "📚"}
                      </div>

                      {/* Track Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-gray-900">
                          {track.name}
                        </h4>
                        <p className="truncate text-xs text-gray-500">
                          {track.description ??
                            `${track.projectCount} projects`}
                        </p>
                      </div>

                      {/* Progress indicator */}
                      <div className="text-xs text-gray-400">
                        {track.projectCount} projects
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                {selectedTrackIds.length} track
                {selectedTrackIds.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddToTracks}
                  disabled={
                    selectedTrackIds.length === 0 ||
                    addProjectToTrackMutation.isPending
                  }
                >
                  {addProjectToTrackMutation.isPending ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add to {selectedTrackIds.length} Track
                      {selectedTrackIds.length !== 1 ? "s" : ""}
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
