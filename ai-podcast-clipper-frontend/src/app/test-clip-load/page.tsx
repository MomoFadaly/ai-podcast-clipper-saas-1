"use client";

import { useState } from "react";

interface FetchedClipData {
  clip?: {
    id?: string;
    chunks?: unknown[];
    title?: string;
    // The transcript is now on the UploadedFile model, but we might pass it at this level
    transcript?: unknown;
    uploadedFile?: {
      displayName?: string;
    };
  };
  videoUrl?: string;
}

export default function TestClipLoad() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<FetchedClipData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const testClipId = "92ed6bbf-5bc6-4c00-952e-281010c77caa"; // From the logs

  const fetchClip = async () => {
    console.log("🧪 Starting test fetch...");
    setLoading(true);
    setError(null);
    setData(null);

    try {
      console.log("📡 Making request to /api/clips/" + testClipId);
      const response = await fetch(`/api/clips/${testClipId}`);
      console.log("📥 Response received:", response.status, response.ok);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      console.log("📋 Parsing JSON...");
      const result = (await response.json()) as FetchedClipData;
      console.log("✅ JSON parsed:", result);

      console.log("🔄 Setting data...");
      setData(result);
      console.log("✅ Data set successfully");
    } catch (err) {
      console.error("❌ Error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      console.log("🏁 Setting loading to false");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold">Test Clip Loading</h1>

        <button
          onClick={fetchClip}
          disabled={loading}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Test Load Clip"}
        </button>

        {loading && (
          <div className="mt-4 rounded border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center">
              <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              Loading clip data...
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-4">
            <h3 className="font-semibold text-red-800">Error:</h3>
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {data && (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-4">
            <h3 className="mb-2 font-semibold text-green-800">Success!</h3>
            <div className="text-sm">
              <p>
                <strong>Clip ID:</strong> {data.clip?.id}
              </p>
              <p>
                <strong>Video URL:</strong>{" "}
                {data.videoUrl ? "✅ Present" : "❌ Missing"}
              </p>
              <p>
                <strong>Chunks:</strong> {data.clip?.chunks?.length ?? 0}
              </p>
              <p>
                <strong>Display Name:</strong>{" "}
                {data.clip?.uploadedFile?.displayName}
              </p>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-green-700 hover:text-green-900">
                Raw Data (click to expand)
              </summary>
              <pre className="mt-2 max-h-60 overflow-auto rounded border bg-white p-2 text-xs">
                {JSON.stringify(data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
}
