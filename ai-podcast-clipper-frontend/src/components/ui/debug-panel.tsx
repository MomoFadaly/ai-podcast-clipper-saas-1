"use client";

import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "~/hooks/use-projects";
import { useState } from "react";
import { RefreshCw, Eye, Trash2 } from "lucide-react";

interface DebugPanelProps {
  projectId: string;
}

export function DebugPanel({ projectId }: DebugPanelProps) {
  const queryClient = useQueryClient();
  const [showDebug, setShowDebug] = useState(false);

  const inspectCache = () => {
    const projectData = queryClient.getQueryData(queryKeys.project(projectId));
    const clipsData = queryClient.getQueryData(
      queryKeys.clips(projectId, { limit: 20 }),
    );

    console.log("📊 Cache Inspection:", {
      projectData,
      clipsData,
      allQueries: queryClient.getQueryCache().getAll(),
    });
  };

  const forceInvalidate = async () => {
    console.log("🔄 Force invalidating all queries...");
    await queryClient.invalidateQueries();
  };

  const clearCache = () => {
    console.log("🗑️ Clearing all cache...");
    queryClient.clear();
  };

  if (!showDebug) {
    return (
      <button
        onClick={() => setShowDebug(true)}
        className="fixed right-4 bottom-4 z-50 rounded-full bg-purple-600 p-2 text-white shadow-lg hover:bg-purple-700"
        title="Show debug panel"
      >
        🐛
      </button>
    );
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border border-gray-300 bg-white p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Debug Panel</h3>
        <button
          onClick={() => setShowDebug(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>
      <div className="space-y-2">
        <button
          onClick={inspectCache}
          className="flex w-full items-center gap-2 rounded bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
        >
          <Eye className="h-4 w-4" />
          Inspect Cache
        </button>
        <button
          onClick={forceInvalidate}
          className="flex w-full items-center gap-2 rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-100"
        >
          <RefreshCw className="h-4 w-4" />
          Force Invalidate
        </button>
        <button
          onClick={clearCache}
          className="flex w-full items-center gap-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Clear All Cache
        </button>
      </div>
    </div>
  );
}
