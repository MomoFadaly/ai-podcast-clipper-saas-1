"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRealTimeStatus } from "~/hooks/use-real-time-status";
import type { ProjectWithStats } from "~/actions/projects";

interface RealTimeProjectCardProps {
  project: ProjectWithStats;
  onStatusUpdate?: (projectId: string, newStatus: string) => void;
}

export function RealTimeProjectCard({
  project,
  onStatusUpdate,
}: RealTimeProjectCardProps) {
  const [currentProject, setCurrentProject] = useState(project);

  // Use real-time status hook for projects that are still processing
  const { currentStatus, isConnected } = useRealTimeStatus(
    project.status !== "processed" && project.status !== "failed"
      ? project.id
      : null,
    project.status,
  );

  // Update project status when real-time update is received
  useEffect(() => {
    if (currentStatus && currentStatus !== currentProject.status) {
      console.log(
        `📡 Project ${project.id} status updated: ${project.status} → ${currentStatus}`,
      );

      const updatedProject = {
        ...currentProject,
        status: currentStatus,
      };
      setCurrentProject(updatedProject);
      onStatusUpdate?.(project.id, currentStatus);
    }
  }, [currentStatus, currentProject, project.id, onStatusUpdate]);

  const getStatusBadge = (status: string, progressPercentage: number) => {
    if (status === "processed" || progressPercentage === 100) {
      return "bg-green-100 text-green-800";
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return "bg-blue-100 text-blue-800";
    } else if (status === "queued") {
      return "bg-yellow-100 text-yellow-800";
    } else {
      return "bg-gray-100 text-gray-800";
    }
  };

  const getProcessingStatusLabel = (
    status: string,
    progressPercentage: number,
  ) => {
    if (status === "processed" || progressPercentage === 100) {
      return "Ready";
    } else if (
      status === "processing" ||
      (progressPercentage > 0 && progressPercentage < 100)
    ) {
      return "Processing";
    } else if (status === "queued") {
      return "Queued";
    } else {
      return "Pending";
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-colors hover:border-gray-300">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="block"
          >
            <p className="truncate font-medium text-gray-900 hover:text-blue-600">
              {currentProject.displayName || "Untitled Project"}
            </p>
            <div className="mt-1 flex items-center text-sm text-gray-500">
              <span>{currentProject.chunksCount ?? 0} chunks</span>
              <span className="mx-2">•</span>
              <span>{currentProject.totalDuration || "Unknown"}</span>
              <span className="mx-2">•</span>
              <span>
                {new Date(currentProject.createdAt).toLocaleDateString()}
              </span>
              {currentProject.progressPercentage < 100 && (
                <>
                  <span className="mx-2">•</span>
                  <span>
                    {Math.round(currentProject.progressPercentage)}% watched
                  </span>
                </>
              )}
            </div>
          </Link>
        </div>

        <div className="ml-4 flex items-center space-x-2">
          {/* Real-time connection indicator (only in development) */}
          {process.env.NODE_ENV === "development" && isConnected && (
            <div className="flex items-center text-xs text-green-600">
              <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-green-500" />
              Live
            </div>
          )}

          {/* Only show processing status if still processing */}
          {currentProject.status !== "processed" &&
            currentProject.progressPercentage < 100 && (
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(currentProject.status, currentProject.progressPercentage)}`}
              >
                {currentProject.status === "processing" && (
                  <div className="mr-1 h-2 w-2 animate-spin rounded-full border border-current border-t-transparent" />
                )}
                {getProcessingStatusLabel(
                  currentProject.status,
                  currentProject.progressPercentage,
                )}
              </span>
            )}
          <Link
            href={`/dashboard/projects/${currentProject.id}`}
            className="text-blue-600 hover:text-blue-800"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
