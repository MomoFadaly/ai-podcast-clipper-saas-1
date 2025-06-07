"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FolderOpen, Plus, Search, Check, Play } from "lucide-react";
import { Button } from "~/components/ui/button";
import { useProjects } from "~/hooks/use-projects";
import { useAddProjectToTrack, useTrackProjects } from "~/hooks/use-tracks";
import { cn } from "~/lib/utils";

interface AddProjectsToTrackModalProps {
  isOpen: boolean;
  onClose: () => void;
  trackId: string;
  trackName: string;
}

export default function AddProjectsToTrackModal({
  isOpen,
  onClose,
  trackId,
  trackName,
}: AddProjectsToTrackModalProps) {
  const { data: allProjects = [], isLoading: projectsLoading } = useProjects();
  const { data: trackProjects = [] } = useTrackProjects(trackId);
  const addProjectToTrackMutation = useAddProjectToTrack();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);

  // Get IDs of projects already in this track
  const trackProjectIds = trackProjects.map((p) => p.id);

  // Filter projects to show only those not already in the track
  const availableProjects = allProjects.filter((project) => {
    const notInTrack = !trackProjectIds.includes(project.id);
    const matchesSearch = searchQuery
      ? project.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return notInTrack && matchesSearch;
  });

  const handleProjectToggle = (projectId: string) => {
    setSelectedProjectIds((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId],
    );
  };

  const handleAddProjects = async () => {
    if (selectedProjectIds.length === 0) return;

    try {
      // Add each selected project to the track
      await Promise.all(
        selectedProjectIds.map((projectId) =>
          addProjectToTrackMutation.mutateAsync({ projectId, trackId }),
        ),
      );
      onClose();
    } catch (error) {
      console.error("Failed to add projects to track:", error);
      alert("Failed to add projects to track. Please try again.");
    }
  };

  const getProcessingStatusBadge = (
    status: string,
    progressPercentage: number,
  ) => {
    if (status === "processed" || progressPercentage === 100) {
      return { class: "bg-green-100 text-green-800", label: "Ready" };
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return { class: "bg-blue-100 text-blue-800", label: "Processing" };
    } else if (status === "queued") {
      return { class: "bg-yellow-100 text-yellow-800", label: "Queued" };
    } else {
      return { class: "bg-gray-100 text-gray-800", label: "Pending" };
    }
  };

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
          className="relative w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Add Projects to Track
                </h2>
                <p className="text-sm text-gray-600">
                  Add projects to &ldquo;{trackName}&rdquo; learning track
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
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2 pr-3 pl-9 text-sm transition-colors focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Content */}
          <div className="max-h-96 overflow-y-auto px-6 py-4">
            {projectsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-gray-200"></div>
                    <div className="h-16 w-24 animate-pulse rounded-lg bg-gray-200"></div>
                    <div className="flex-1">
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-200"></div>
                      <div className="mt-1 h-3 w-32 animate-pulse rounded bg-gray-200"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : availableProjects.length === 0 ? (
              <div className="py-8 text-center">
                <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  {searchQuery ? "No projects found" : "No available projects"}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchQuery
                    ? "Try adjusting your search terms"
                    : "All your projects are already in this track or you haven't created any projects yet"}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {availableProjects.map((project) => {
                  const isSelected = selectedProjectIds.includes(project.id);
                  const statusInfo = getProcessingStatusBadge(
                    project.status,
                    project.progressPercentage,
                  );

                  return (
                    <div
                      key={project.id}
                      onClick={() => handleProjectToggle(project.id)}
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

                      {/* Project Thumbnail */}
                      <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                        {project.thumbnailUrl ? (
                          <img
                            src={project.thumbnailUrl}
                            alt={project.displayName ?? "Project"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center">
                            <Play className="h-4 w-4 text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Project Info */}
                      <div className="min-w-0 flex-1">
                        <h4 className="truncate text-sm font-medium text-gray-900">
                          {project.displayName ??
                            `Project ${project.id.slice(0, 8)}`}
                        </h4>
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <span>{project.chunksCount} chunks</span>
                          <span>•</span>
                          <span>
                            {new Date(project.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Status and Progress */}
                      <div className="flex flex-col items-end space-y-1">
                        {/* Only show processing status if still processing */}
                        {project.status !== "processed" &&
                          project.progressPercentage < 100 && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                statusInfo.class,
                              )}
                            >
                              {project.status === "processing" && (
                                <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                              )}
                              {statusInfo.label}
                            </span>
                          )}
                        <div className="text-xs text-gray-500">
                          {Math.round(
                            ((project.completedChunks || 0) /
                              (project.chunksCount || 1)) *
                              100,
                          )}
                          % watched
                        </div>
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
                {selectedProjectIds.length} project
                {selectedProjectIds.length !== 1 ? "s" : ""} selected
              </p>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAddProjects}
                  disabled={
                    selectedProjectIds.length === 0 ||
                    addProjectToTrackMutation.isPending
                  }
                >
                  {addProjectToTrackMutation.isPending ? (
                    "Adding..."
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      Add {selectedProjectIds.length} Project
                      {selectedProjectIds.length !== 1 ? "s" : ""}
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
