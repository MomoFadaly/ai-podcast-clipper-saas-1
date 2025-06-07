"use client";

import { useProjectTracks } from "~/hooks/use-tracks";
import TrackBadge from "./track-badge";
import { Route } from "lucide-react";

interface ProjectTracksDisplayProps {
  projectId: string;
  maxDisplay?: number;
  size?: "sm" | "md";
  showAddButton?: boolean;
  onAddClick?: () => void;
}

export default function ProjectTracksDisplay({
  projectId,
  maxDisplay = 3,
  size = "sm",
  showAddButton = false,
  onAddClick,
}: ProjectTracksDisplayProps) {
  const { data: tracks = [], isLoading, error } = useProjectTracks(projectId);

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-6 w-16 animate-pulse rounded-full bg-gray-200"
          />
        ))}
      </div>
    );
  }

  if (error || tracks.length === 0) {
    return showAddButton ? (
      <button
        onClick={onAddClick}
        className="inline-flex items-center rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
      >
        <Route className="mr-1 h-3 w-3" />
        Add to track
      </button>
    ) : null;
  }

  const displayTracks = tracks.slice(0, maxDisplay);
  const remainingCount = tracks.length - maxDisplay;

  return (
    <div className="flex flex-wrap items-center gap-1">
      {displayTracks.map((track) => (
        <TrackBadge key={track.id} track={track} size={size} showIcon={false} />
      ))}

      {remainingCount > 0 && (
        <span className="text-xs text-gray-500">+{remainingCount} more</span>
      )}

      {showAddButton && (
        <button
          onClick={onAddClick}
          className="ml-1 inline-flex items-center rounded-full border border-dashed border-gray-300 px-2 py-1 text-xs text-gray-500 transition-colors hover:border-gray-400 hover:text-gray-600"
        >
          <Route className="mr-1 h-3 w-3" />
          Add
        </button>
      )}
    </div>
  );
}
