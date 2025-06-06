"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import ChunkedVideoPlayer from "../../../../../../components/ChunkedVideoPlayer";
import { deduplicatedFetch } from "~/lib/request-deduplication";
import { logAPICall } from "~/lib/api-debug";

interface Chunk {
  id: number;
  start: number;
  end: number;
  duration: number;
  clipId: string; // Add clipId to identify which clip this chunk represents
}

interface TranscriptWord {
  start: number;
  end: number;
  word: string;
}

interface ClipData {
  id: string;
  s3Key: string;
  createdAt: string; // API returns dates as strings, not Date objects
  uploadedFile: {
    displayName: string;
  };
  chunks: Chunk[];
  transcript: TranscriptWord[];
}

interface ApiResponse {
  success: boolean;
  clip: ClipData;
  videoUrl: string;
  transcription?: string;
}

export default function ClipViewPage() {
  const params = useParams();
  const router = useRouter();
  const clipId = params.clipId as string;
  const projectId = params.id as string;

  const [clip, setClip] = useState<ClipData | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transcription" | "notes">(
    "transcription",
  );
  const [notes, setNotes] = useState("");
  const [currentChunkIdx, setCurrentChunkIdx] = useState(0);
  const [loadingNewClip, setLoadingNewClip] = useState(false);

  // Track what we've loaded to prevent unnecessary refetches
  const loadedClipsRef = useRef<Set<string>>(new Set());
  const fetchPromiseRef = useRef<Promise<void> | null>(null);

  // Add debugging to track re-renders
  const componentId = useRef(
    `ClipView-${Math.random().toString(36).substr(2, 9)}`,
  );
  console.log(
    `🔄 ${componentId.current} render - clipId: ${clipId}, timestamp: ${Date.now()}`,
  );

  // Simplified fetch function that doesn't use useEffect
  const fetchClipData = async (targetClipId: string) => {
    // Skip if already loaded
    if (loadedClipsRef.current.has(targetClipId)) {
      console.log(
        `⏭️ ${componentId.current} Clip ${targetClipId} already loaded, skipping`,
      );
      return;
    }

    // Skip if already fetching
    if (fetchPromiseRef.current) {
      console.log(
        `🔄 ${componentId.current} Fetch already in progress, waiting...`,
      );
      await fetchPromiseRef.current;
      return;
    }

    console.log(
      `🔄 ${componentId.current} Starting fetch for clipId: ${targetClipId}`,
    );

    const fetchPromise = (async () => {
      try {
        setLoading(true);
        setError(null);

        console.log(
          `📡 ${componentId.current} Making fetch request to /api/clips/${targetClipId}`,
        );
        logAPICall(
          `/api/clips/${targetClipId}`,
          "ClipViewPage-manual",
          componentId.current,
        );

        const response = await fetch(`/api/clips/${targetClipId}`, {
          headers: {
            "X-Component-ID": componentId.current,
            "X-Fetch-Source": "ClipViewPage-manual",
          },
        });

        console.log(
          `📥 ${componentId.current} Response status: ${response.status}`,
        );

        if (!response.ok) {
          const errorData: unknown = await response.json().catch(() => null);
          console.error("API Error Response:", errorData);
          let errorMsg = `HTTP ${response.status}: Failed to fetch clip data`;
          if (
            errorData &&
            typeof errorData === "object" &&
            "error" in errorData &&
            typeof (errorData as { error?: unknown }).error === "string"
          ) {
            errorMsg = (errorData as { error: string }).error;
          }
          throw new Error(errorMsg);
        }

        console.log(`📋 ${componentId.current} Parsing JSON response...`);
        const data = (await response.json()) as ApiResponse;
        console.log(
          `✅ ${componentId.current} JSON parsed successfully:`,
          data,
        );

        console.log(`🔄 ${componentId.current} Updating state...`);
        setClip(data.clip);
        setVideoUrl(data.videoUrl);
        loadedClipsRef.current.add(targetClipId); // Mark as loaded
        console.log(`✅ ${componentId.current} State updated successfully`);

        // Find the index of the current clip in the chunks array
        const currentClipIndex =
          data.clip.chunks?.findIndex(
            (chunk) => chunk.clipId === targetClipId,
          ) ?? -1;
        if (currentClipIndex !== -1) {
          setCurrentChunkIdx(currentClipIndex);
        }
      } catch (err: unknown) {
        console.error(
          `❌ ${componentId.current} Error fetching clip data:`,
          err,
        );
        if (err instanceof Error) {
          setError(err.message);
        } else if (
          err &&
          typeof err === "object" &&
          "message" in err &&
          typeof (err as { message?: unknown }).message === "string"
        ) {
          setError((err as { message: string }).message);
        } else {
          setError("Failed to load clip");
        }
      } finally {
        console.log(`🏁 ${componentId.current} Setting loading to false`);
        setLoading(false);
        fetchPromiseRef.current = null; // Clear the promise
      }
    })();

    fetchPromiseRef.current = fetchPromise;
    return fetchPromise;
  };

  // Trigger fetch when clipId changes
  useEffect(() => {
    if (clipId) {
      void fetchClipData(clipId);
    }
  }, [clipId]);

  // Handle chunk navigation - switch to different clip
  const handleChunkNavigation = async (chunkIndex: number) => {
    if (!clip?.chunks?.[chunkIndex]) return;

    const targetChunk = clip.chunks[chunkIndex];
    const targetClipId = targetChunk.clipId;

    console.log(
      `🔄 Navigating to chunk ${chunkIndex}, clipId: ${targetClipId}`,
    );

    // If it's the same clip, just update the index
    if (targetClipId === clipId) {
      console.log("✅ Same clip, just updating chunk index");
      setCurrentChunkIdx(chunkIndex);
      return;
    }

    // Check if we already have this clip data loaded
    if (loadedClipsRef.current.has(targetClipId)) {
      console.log("✅ Clip already loaded, just updating index and URL");
      setCurrentChunkIdx(chunkIndex);
      // Update URL without fetching
      window.history.replaceState(
        null,
        "",
        `/dashboard/projects/${projectId}/clips/${targetClipId}`,
      );
      return;
    }

    // If it's a different clip, we need to fetch new video URL
    setLoadingNewClip(true);
    try {
      console.log(
        `🔄 ${componentId.current} Fetching new clip data for: ${targetClipId}`,
      );
      console.log(
        `📡 ${componentId.current} Making chunk navigation fetch to /api/clips/${targetClipId}`,
      );
      logAPICall(
        `/api/clips/${targetClipId}`,
        "ClipViewPage-chunkNavigation",
        componentId.current,
      );
      const response = await fetch(`/api/clips/${targetClipId}`, {
        headers: {
          "X-Component-ID": componentId.current,
          "X-Fetch-Source": "ClipViewPage-chunkNavigation",
        },
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch clip ${targetClipId}`);
      }

      const data = (await response.json()) as ApiResponse;
      console.log("✅ NEW CLIP DATA RECEIVED");
      console.log("New video URL:", data.videoUrl);

      // Update state BEFORE updating URL to prevent race conditions
      setVideoUrl(data.videoUrl);
      setCurrentChunkIdx(chunkIndex);
      loadedClipsRef.current.add(targetClipId); // Mark this clip as already loaded

      // Update the URL in browser without triggering useEffect
      // We delay this to prevent immediate re-fetching
      setTimeout(() => {
        window.history.replaceState(
          null,
          "",
          `/dashboard/projects/${projectId}/clips/${targetClipId}`,
        );
      }, 100);
    } catch (err) {
      console.error("❌ Error switching to new clip:", err);
      setError("Failed to switch to new chunk");
    } finally {
      setLoadingNewClip(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600"></div>
          <p className="text-gray-600">Loading clip...</p>
        </div>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h1 className="mb-2 text-xl font-bold text-red-800">Error</h1>
            <p className="text-red-600">{error ?? "Clip not found"}</p>
            <button
              onClick={() => router.back()}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Sidebar for chunk navigation
  const chunkSidebar = (
    <div className="w-56 border-r bg-white p-4">
      <h2 className="mb-4 text-lg font-semibold">Chunks</h2>
      <ul className="space-y-2">
        {Array.isArray(clip.chunks) &&
          clip.chunks.map((chunk, idx) => (
            <li key={chunk.clipId}>
              <button
                className={`w-full rounded px-3 py-2 text-left text-sm font-medium ${
                  idx === currentChunkIdx
                    ? "bg-purple-100 text-purple-700"
                    : "text-gray-700 hover:bg-gray-100"
                } ${loadingNewClip && idx !== currentChunkIdx ? "opacity-50" : ""}`}
                onClick={() => handleChunkNavigation(idx)}
                disabled={loadingNewClip}
              >
                Chunk {chunk.id} ({Math.round(chunk.start)}s -{" "}
                {Math.round(chunk.end)}s)
                {loadingNewClip && idx !== currentChunkIdx && (
                  <div className="ml-2 inline-block h-3 w-3 animate-spin rounded-full border border-gray-400 border-t-transparent"></div>
                )}
              </button>
            </li>
          ))}
      </ul>
    </div>
  );

  // Defensive: get current chunk or null
  const currentChunk =
    Array.isArray(clip.chunks) && clip.chunks.length > 0
      ? clip.chunks[currentChunkIdx]
      : null;

  // Defensive: filter transcript for current chunk
  const chunkTranscript =
    currentChunk && Array.isArray(clip.transcript)
      ? clip.transcript.filter(
          (w) =>
            typeof w.start === "number" &&
            typeof w.end === "number" &&
            typeof w.word === "string" &&
            w.start >= currentChunk.start &&
            w.end <= currentChunk.end,
        )
      : [];

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      {chunkSidebar}
      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() =>
                    router.push(`/dashboard/projects/${projectId}`)
                  }
                  className="flex items-center text-gray-600 hover:text-gray-900"
                >
                  <svg
                    className="mr-2 h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 19l-7-7 7-7"
                    />
                  </svg>
                  Back to Project
                </button>
                <div className="h-6 w-px bg-gray-300"></div>
                <h1 className="text-xl font-bold text-gray-900">
                  {clip.uploadedFile.displayName}
                </h1>
                {currentChunk && (
                  <span className="text-sm text-gray-500">
                    - Chunk {currentChunk.id}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-500">
                  Created {new Date(clip.createdAt).toLocaleDateString()}
                </div>
                {/* Minimal Icon Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Download clip"
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
                        d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                      />
                    </svg>
                  </button>
                  <button
                    className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                    title="Share clip"
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
                        d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Video Player */}
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="overflow-hidden rounded-lg bg-white shadow-lg">
            <div className="aspect-video bg-black">
              {videoUrl && currentChunk ? (
                <ChunkedVideoPlayer
                  src={videoUrl}
                  chunk={currentChunk}
                  onError={(errorMsg) => {
                    console.error("Video load error:", errorMsg);
                    setError(errorMsg);
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="text-center text-white">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                    <p>
                      {loadingNewClip
                        ? "Loading new chunk..."
                        : "Loading video..."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tabbed Content */}
          <div className="mt-8 rounded-lg bg-white shadow-lg">
            {/* Tab Navigation */}
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6" aria-label="Tabs">
                <button
                  onClick={() => setActiveTab("transcription")}
                  className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "transcription"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  disabled={!currentChunk}
                >
                  <div className="flex items-center space-x-2">
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
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span>Transcription</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab("notes")}
                  className={`border-b-2 px-1 py-4 text-sm font-medium whitespace-nowrap ${
                    activeTab === "notes"
                      ? "border-purple-500 text-purple-600"
                      : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                  }`}
                  disabled={!currentChunk}
                >
                  <div className="flex items-center space-x-2">
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
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    <span>Notes & Insights</span>
                  </div>
                </button>
              </nav>
            </div>

            {/* Tab Content */}
            <div className="p-6">
              {!currentChunk ? (
                <div className="py-12 text-center text-gray-500">
                  <p className="text-lg font-semibold">
                    No chunks available for this clip.
                  </p>
                  <p className="mt-2 text-sm">
                    Try re-processing the video or uploading a new one.
                  </p>
                </div>
              ) : activeTab === "transcription" ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Transcription - Chunk {currentChunk.id}
                    </h3>
                    <button className="text-sm text-purple-600 hover:text-purple-700">
                      Copy to clipboard
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700">
                      {chunkTranscript.map((w) => w.word).join(" ")}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Generated automatically from the video audio
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      Notes & Insights - Chunk {currentChunk.id}
                    </h3>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        Auto-save enabled
                      </span>
                      <div className="h-2 w-2 rounded-full bg-green-400"></div>
                    </div>
                  </div>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add your notes, insights, and key takeaways from this clip..."
                    className="min-h-[300px] w-full rounded-lg border border-gray-200 p-4 text-sm focus:border-purple-500 focus:ring-2 focus:ring-purple-200 focus:outline-none"
                    disabled={!currentChunk}
                  />
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{notes.length} characters</span>
                    <span>Last saved: Just now</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
