"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface ClipData {
  id: string;
  s3Key: string;
  createdAt: string; // API returns dates as strings, not Date objects
  uploadedFile: {
    displayName: string;
  };
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
  const [transcription, setTranscription] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"transcription" | "notes">("transcription");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    const fetchClipData = async () => {
      try {
        const response = await fetch(`/api/clips/${clipId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch clip data");
        }

        const data = (await response.json()) as ApiResponse;
        setClip(data.clip);
        setVideoUrl(data.videoUrl);
        setTranscription(data.transcription ?? "Transcription not available for this clip.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load clip");
      } finally {
        setLoading(false);
      }
    };

    if (clipId) {
      void fetchClipData();
    }
  }, [clipId]);

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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/dashboard/projects/${projectId}`)}
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
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  </svg>
                </button>
                <button 
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                  title="Share clip"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
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
            {videoUrl ? (
              <video
                controls
                className="h-full w-full"
                src={videoUrl}
                onError={() => setError("Failed to load video")}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="flex h-full items-center justify-center">
                <div className="text-center text-white">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                  <p>Loading video...</p>
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
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === "transcription"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Transcription</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab("notes")}
                className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium ${
                  activeTab === "notes"
                    ? "border-purple-500 text-purple-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                <div className="flex items-center space-x-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>Notes & Insights</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "transcription" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Transcription</h3>
                  <button className="text-sm text-purple-600 hover:text-purple-700">
                    Copy to clipboard
                  </button>
                </div>
                <div className="max-h-96 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">
                    {transcription}
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  Generated automatically from the video audio
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">Notes & Insights</h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">Auto-save enabled</span>
                    <div className="h-2 w-2 rounded-full bg-green-400"></div>
                  </div>
                </div>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add your notes, insights, and key takeaways from this clip..."
                  className="min-h-[300px] w-full rounded-lg border border-gray-200 p-4 text-sm focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
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
  );
}
