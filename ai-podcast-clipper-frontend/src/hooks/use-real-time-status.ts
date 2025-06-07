"use client";

import { useEffect, useState, useRef } from "react";

export interface StatusUpdate {
  projectId: string;
  status: string;
  timestamp: string;
  displayName?: string;
  updatedAt?: string;
  processingProgress?: number;
  final?: boolean;
}

export interface UseRealTimeStatusReturn {
  currentStatus: string | null;
  currentProgress: number | null;
  lastUpdate: StatusUpdate | null;
  isConnected: boolean;
  error: string | null;
}

export function useRealTimeStatus(
  projectId: string | null,
  initialStatus?: string,
): UseRealTimeStatusReturn {
  const [currentStatus, setCurrentStatus] = useState<string | null>(
    initialStatus ?? null,
  );
  const [currentProgress, setCurrentProgress] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<StatusUpdate | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!projectId) {
      return;
    }

    // Don't connect if already processed or failed based on initial status only
    // Allow connection to continue if currentStatus changes during processing
    if (initialStatus === "processed" || initialStatus === "failed") {
      console.log(
        `🚫 Not connecting to SSE for project ${projectId} - already completed (${initialStatus})`,
      );
      return;
    }

    console.log(`🔗 Connecting to real-time status for project: ${projectId}`);

    // Create EventSource connection
    const eventSource = new EventSource(`/api/status-stream/${projectId}`, {
      withCredentials: true,
    });

    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log(`✅ Connected to status stream for project: ${projectId}`);
      setIsConnected(true);
      setError(null);
    };

    eventSource.onmessage = (event) => {
      try {
        const update: StatusUpdate = JSON.parse(event.data);
        console.log(`📡 Status update received:`, update);

        setLastUpdate(update);
        setCurrentStatus(update.status);

        // Update progress if provided
        if (update.processingProgress !== undefined) {
          setCurrentProgress(update.processingProgress);
        }

        // Close connection if processing is complete (with a delay to ensure all data is ready)
        if (
          update.final ||
          update.status === "processed" ||
          update.status === "failed"
        ) {
          console.log(`🏁 Processing complete for project: ${projectId}`, {
            finalStatus: update.status,
            isFinal: update.final,
            processingProgress: update.processingProgress,
          });

          // Keep connection open briefly to ensure all backend operations complete
          setTimeout(() => {
            console.log(`🔌 Closing SSE connection for project: ${projectId}`);
            eventSource.close();
            setIsConnected(false);
          }, 3000); // Wait 3 seconds before closing
        }
      } catch (err) {
        console.error("Error parsing status update:", err);
        setError("Failed to parse status update");
      }
    };

    eventSource.onerror = (err) => {
      console.error(`❌ Status stream error for project ${projectId}:`, err);
      setError("Connection error");
      setIsConnected(false);
      eventSource.close();
    };

    // Cleanup function
    return () => {
      console.log(
        `🔌 Disconnecting from status stream for project: ${projectId}`,
      );
      eventSource.close();
      setIsConnected(false);
    };
  }, [projectId, initialStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    currentStatus,
    currentProgress,
    lastUpdate,
    isConnected,
    error,
  };
}
