"use client";

import { useEffect, useState, useRef } from "react";
import type { ProjectWithStats } from "~/actions/projects";

export interface MultiProjectStatusUpdate {
  projectId: string;
  status: string;
  timestamp: string;
  displayName?: string;
  updatedAt?: string;
}

export function useMultiProjectStatus(projects: ProjectWithStats[]) {
  const [projectStatuses, setProjectStatuses] = useState<
    Record<string, string>
  >({});
  const [connections, setConnections] = useState<Record<string, EventSource>>(
    {},
  );
  const connectionsRef = useRef<Record<string, EventSource>>({});

  // Get projects that need real-time monitoring
  const processingProjects = projects.filter(
    (project) =>
      project.status !== "processed" &&
      project.status !== "failed" &&
      project.progressPercentage < 100,
  );

  useEffect(() => {
    // Clean up old connections for projects that are no longer processing
    Object.keys(connectionsRef.current).forEach((projectId) => {
      const project = projects.find((p) => p.id === projectId);
      if (
        !project ||
        project.status === "processed" ||
        project.status === "failed"
      ) {
        const eventSource = connectionsRef.current[projectId];
        if (eventSource) {
          console.log(
            `🔌 Closing connection for completed project: ${projectId}`,
          );
          eventSource.close();
          delete connectionsRef.current[projectId];
        }
      }
    });

    // Create new connections for processing projects
    processingProjects.forEach((project) => {
      if (!connectionsRef.current[project.id]) {
        console.log(
          `🔗 Creating real-time connection for project: ${project.id}`,
        );

        const eventSource = new EventSource(
          `/api/status-stream/${project.id}`,
          { withCredentials: true },
        );

        eventSource.onopen = () => {
          console.log(
            `✅ Connected to status stream for project: ${project.id}`,
          );
          setConnections((prev) => ({ ...prev, [project.id]: eventSource }));
        };

        eventSource.onmessage = (event) => {
          try {
            const update: MultiProjectStatusUpdate = JSON.parse(event.data);
            console.log(`📡 Status update for project ${project.id}:`, update);

            setProjectStatuses((prev) => ({
              ...prev,
              [project.id]: update.status,
            }));

            // Close connection if processing is complete
            if (update.status === "processed" || update.status === "failed") {
              console.log(`🏁 Processing complete for project: ${project.id}`);
              eventSource.close();
              delete connectionsRef.current[project.id];
              setConnections((prev) => {
                const newConnections = { ...prev };
                delete newConnections[project.id];
                return newConnections;
              });
            }
          } catch (err) {
            console.error(
              `Error parsing status update for project ${project.id}:`,
              err,
            );
          }
        };

        eventSource.onerror = (err) => {
          console.error(
            `❌ Status stream error for project ${project.id}:`,
            err,
          );
          eventSource.close();
          delete connectionsRef.current[project.id];
          setConnections((prev) => {
            const newConnections = { ...prev };
            delete newConnections[project.id];
            return newConnections;
          });
        };

        connectionsRef.current[project.id] = eventSource;
      }
    });

    // Cleanup function
    return () => {
      Object.values(connectionsRef.current).forEach((eventSource) => {
        eventSource.close();
      });
    };
  }, [processingProjects.map((p) => p.id).join(",")]); // Dependency on processing project IDs

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(connectionsRef.current).forEach((eventSource) => {
        eventSource.close();
      });
      connectionsRef.current = {};
    };
  }, []);

  // Function to get the current status for a project
  const getProjectStatus = (projectId: string, fallbackStatus: string) => {
    return projectStatuses[projectId] || fallbackStatus;
  };

  // Function to check if a project has an active connection
  const hasActiveConnection = (projectId: string) => {
    return !!connections[projectId];
  };

  return {
    getProjectStatus,
    hasActiveConnection,
    activeConnections: Object.keys(connections).length,
  };
}
