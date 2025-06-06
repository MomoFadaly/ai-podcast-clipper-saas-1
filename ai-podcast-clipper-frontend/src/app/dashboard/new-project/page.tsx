"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { ThumbnailImage } from "~/components/ui/thumbnail-image";

interface VideoMetadata {
  title: string;
  duration: number; // in seconds
  thumbnail: string;
  channel: string;
  description: string;
}

interface ChunkConfig {
  method: "minutes" | "chunks";
  minutesPerChunk: number;
  totalChunks: number;
}

interface UploadedFile {
  file: File;
  preview?: string;
  metadata?: {
    duration: number;
    name: string;
    size: number;
  };
}

// Types for preview data
interface PreviewChunk {
  id: number;
  start: number;
  end: number;
  duration: number;
}
interface PreviewTranscriptWord {
  start: number;
  end: number;
  word: string;
}

// Type for process result
interface ProcessResult {
  success?: boolean;
  clip?: {
    chunks: PreviewChunk[];
    transcript: PreviewTranscriptWord[];
  };
  clips_processed?: number;
  metadata?: unknown;
}

// Helper to calculate chunk boundaries
function calculateChunks(
  durationSeconds: number,
  method: "minutes" | "chunks",
  value: number,
): { start: number; end: number }[] {
  const chunks: { start: number; end: number }[] = [];
  if (durationSeconds <= 0 || value <= 0) return chunks;
  if (method === "minutes") {
    const chunkLength = value * 60;
    let start = 0;
    while (start < durationSeconds) {
      const end = Math.min(start + chunkLength, durationSeconds);
      chunks.push({ start, end });
      start = end;
    }
  } else if (method === "chunks") {
    const chunkLength = durationSeconds / value;
    for (let i = 0; i < value; i++) {
      const start = Math.round(i * chunkLength * 1000) / 1000;
      let end = Math.round((i + 1) * chunkLength * 1000) / 1000;
      if (i === value - 1) end = durationSeconds; // Ensure last chunk ends at video end
      chunks.push({ start, end });
    }
  }
  return chunks;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("youtube");

  // YouTube-related state
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(
    null,
  );

  // File upload state
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState("");
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Common state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<{
    step: string;
    message: string;
    progress?: number;
  } | null>(null);
  const [chunkConfig, setChunkConfig] = useState<ChunkConfig>({
    method: "minutes",
    minutesPerChunk: 5,
    totalChunks: 1,
  });

  // Track last slider used
  const [lastChunkSlider, setLastChunkSlider] = useState<
    "minutesPerChunk" | "totalChunks"
  >("minutesPerChunk");

  // Preview state
  const [previewData, setPreviewData] = useState<{
    chunks: PreviewChunk[];
    transcript: PreviewTranscriptWord[];
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // YouTube URL validation
  const validateYouTubeUrl = (url: string): boolean => {
    // More permissive regex that handles various YouTube URL formats and parameters
    const youtubeRegex =
      /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)[\w-]+/;
    return youtubeRegex.test(url);
  };

  // Extract video ID from YouTube URL
  const extractVideoId = (url: string): string | null => {
    const regExp =
      /^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#&?]*).*/;
    const match = regExp.exec(url);
    return match?.[7]?.length === 11 ? match[7] : null;
  };

  // Extract video duration from file
  const extractVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      const url = URL.createObjectURL(file);

      video.preload = "metadata";
      video.src = url;

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        const duration = Math.round(video.duration);
        console.log(
          `✅ Extracted video duration: ${duration} seconds (${(duration / 60).toFixed(1)} minutes)`,
        );
        resolve(duration);
      };

      video.onerror = () => {
        URL.revokeObjectURL(url);
        console.warn("❌ Could not extract video duration, using default");
        resolve(0); // Return 0 if we can't extract duration
      };
    });
  };

  // File upload handlers
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploadError("");

    // Filter for video files
    const videoFiles = acceptedFiles.filter(
      (file) =>
        file.type.startsWith("video/") ||
        file.type === "audio/mpeg" ||
        file.type === "audio/mp3" ||
        file.type === "audio/wav",
    );

    if (videoFiles.length === 0) {
      setUploadError("Please upload video or audio files only.");
      return;
    }

    if (videoFiles.length > 1) {
      setUploadError("Please upload only one file at a time.");
      return;
    }

    const file = videoFiles[0];
    if (!file) {
      setUploadError("No valid file selected.");
      return;
    }

    // Create a temporary URL for preview if it's a video
    const preview = file.type.startsWith("video/")
      ? URL.createObjectURL(file)
      : undefined;

    console.log("📁 Processing uploaded file:", file.name);

    // Extract duration for video files
    let actualDuration = 0;
    if (file.type.startsWith("video/")) {
      try {
        actualDuration = await extractVideoDuration(file);
        console.log(`🎬 Video duration extracted: ${actualDuration}s`);
      } catch (error) {
        console.warn("⚠️ Could not extract video duration:", error);
      }
    }

    // Extract basic metadata
    const uploadedFile: UploadedFile = {
      file,
      preview,
      metadata: {
        duration: actualDuration, // Use actual extracted duration
        name: file.name,
        size: file.size,
      },
    };

    console.log("📊 Final uploaded file metadata:", uploadedFile.metadata);
    setUploadedFiles([uploadedFile]);
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } =
    useDropzone({
      onDrop: (acceptedFiles) => {
        void onDrop(acceptedFiles);
      },
      accept: {
        "video/*": [".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm", ".mkv"],
        "audio/*": [".mp3", ".wav", ".m4a", ".aac", ".ogg", ".flac"],
      },
      maxFiles: 1,
      multiple: false,
    });

  // Fetch YouTube video metadata using our server-side API
  const fetchVideoMetadata = async (url: string): Promise<VideoMetadata> => {
    try {
      console.log("Fetching metadata for:", url);

      const response = await fetch(
        `/api/youtube-metadata?url=${encodeURIComponent(url)}`,
      );
      console.log("API response status:", response.status);

      if (!response.ok) {
        const errorData: { message?: string } = (await response
          .json()
          .catch(() => ({}))) as { message?: string };
        throw new Error(
          errorData.message ??
            `HTTP ${response.status}: ${response.statusText}`,
        );
      }

      const result: {
        success?: boolean;
        data?: {
          title?: string;
          duration?: number;
          thumbnail?: string;
          channel?: string;
          description?: string;
          id?: string;
        };
        message?: string;
      } = (await response.json()) as {
        success?: boolean;
        data?: {
          title?: string;
          duration?: number;
          thumbnail?: string;
          channel?: string;
          description?: string;
          id?: string;
        };
        message?: string;
      };

      console.log("API result:", result);

      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Failed to fetch video metadata");
      }

      // Transform the API response to match our VideoMetadata interface
      const apiData = result.data;
      return {
        title: apiData.title ?? "Unknown Title",
        duration: apiData.duration ?? 300,
        thumbnail: apiData.thumbnail ?? "",
        channel: apiData.channel ?? "Unknown Channel",
        description: apiData.description ?? "",
      };
    } catch (error) {
      console.error("Error fetching metadata:", error);
      throw error;
    }
  };

  // Process YouTube video using our server-side API
  const processYouTubeVideo = async (url: string): Promise<void> => {
    try {
      setProcessingStatus({
        step: "validation",
        message: "Validating YouTube URL...",
        progress: 10,
      });

      console.log("Processing YouTube video:", url);

      setProcessingStatus({
        step: "downloading",
        message: "Downloading and processing video...",
        progress: 30,
      });

      // Calculate chunk boundaries
      if (!videoMetadata) throw new Error("No video metadata");
      const method: "minutes" | "chunks" =
        lastChunkSlider === "totalChunks" ? "chunks" : "minutes";
      const value =
        method === "chunks"
          ? chunkConfig.totalChunks
          : chunkConfig.minutesPerChunk;
      const chunks = calculateChunks(videoMetadata.duration, method, value);

      const response = await fetch("/api/youtube-process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          youtube_url: url,
          chunks,
        }),
      });

      console.log("YouTube processing response status:", response.status);

      if (!response.ok) {
        const errorData: { message?: string } = (await response
          .json()
          .catch(() => ({}))) as { message?: string };
        throw new Error(
          errorData.message ?? `HTTP ${response.status}: Processing failed`,
        );
      }

      setProcessingStatus({
        step: "analyzing",
        message: "Analyzing content and generating clips...",
        progress: 70,
      });

      // --- Type guard for ProcessResult ---
      function isPreviewChunkArray(arr: unknown): arr is PreviewChunk[] {
        return (
          Array.isArray(arr) &&
          arr.every(
            (c) =>
              typeof c === "object" &&
              c !== null &&
              typeof (
                c as { start?: unknown; end?: unknown; duration?: unknown }
              ).start === "number" &&
              typeof (
                c as { start?: unknown; end?: unknown; duration?: unknown }
              ).end === "number" &&
              typeof (
                c as { start?: unknown; end?: unknown; duration?: unknown }
              ).duration === "number",
          )
        );
      }
      function isPreviewTranscriptArray(
        arr: unknown,
      ): arr is PreviewTranscriptWord[] {
        return (
          Array.isArray(arr) &&
          arr.every(
            (w) =>
              typeof w === "object" &&
              w !== null &&
              typeof (w as { start?: unknown; end?: unknown; word?: unknown })
                .start === "number" &&
              typeof (w as { start?: unknown; end?: unknown; word?: unknown })
                .end === "number" &&
              typeof (w as { start?: unknown; end?: unknown; word?: unknown })
                .word === "string",
          )
        );
      }
      // --- End type guards ---
      const result: unknown = await response.json();
      if (
        typeof result === "object" &&
        result !== null &&
        (result as ProcessResult).success &&
        (result as ProcessResult).clip &&
        isPreviewChunkArray((result as ProcessResult).clip?.chunks) &&
        isPreviewTranscriptArray((result as ProcessResult).clip?.transcript)
      ) {
        setPreviewData({
          chunks: (result as ProcessResult).clip!.chunks,
          transcript: (result as ProcessResult).clip!.transcript,
        });
        setShowPreview(true);
        setProcessingStatus(null);
        return;
      }

      setProcessingStatus({
        step: "complete",
        message: `Successfully processed!`,
        progress: 100,
      });

      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("Error processing YouTube video:", error);
      setProcessingStatus({
        step: "error",
        message: error instanceof Error ? error.message : "Processing failed",
        progress: 0,
      });
      throw error;
    }
  };

  // Process uploaded file
  const processUploadedFile = async (
    uploadedFile: UploadedFile,
  ): Promise<void> => {
    const { generateUploadUrl } = await import("~/actions/s3");
    try {
      console.log("=== STARTING FILE PROCESSING (INNGEST WORKFLOW) ===");
      console.log("File details:", {
        name: uploadedFile.file.name,
        size: uploadedFile.file.size,
        type: uploadedFile.file.type,
        metadata: uploadedFile.metadata,
      });
      console.log("Current chunk config:", chunkConfig);

      setProcessingStatus({
        step: "preparing",
        message: "Creating project...",
        progress: 10,
      });

      // Validate chunk config before proceeding
      if (!chunkConfig || chunkConfig.minutesPerChunk <= 0) {
        console.error("Invalid chunk config detected:", chunkConfig);
        throw new Error(
          "Invalid chunk configuration. Please adjust your settings.",
        );
      }

      // Calculate chunk boundaries
      if (!videoMetadata) throw new Error("No video metadata");
      const method: "minutes" | "chunks" =
        lastChunkSlider === "totalChunks" ? "chunks" : "minutes";
      const value =
        method === "chunks"
          ? chunkConfig.totalChunks
          : chunkConfig.minutesPerChunk;
      const chunks = calculateChunks(videoMetadata.duration, method, value);

      // Step 1: Generate upload URL and create project
      console.log("=== STEP 1: Creating project and upload URL ===");

      const { success, signedUrl, uploadedFileId } = await generateUploadUrl({
        filename: uploadedFile.file.name,
        contentType: uploadedFile.file.type,
      });

      if (!success) {
        throw new Error("Failed to generate upload URL");
      }

      console.log("✅ Project created with ID:", uploadedFileId);

      setProcessingStatus({
        step: "uploading",
        message: "Uploading file to storage...",
        progress: 30,
      });

      // Step 2: Upload file to S3
      console.log("=== STEP 2: Uploading to S3 ===");
      const uploadResponse = await fetch(signedUrl, {
        method: "PUT",
        body: uploadedFile.file,
        headers: {
          "Content-Type": uploadedFile.file.type,
        },
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed with status: ${uploadResponse.status}`);
      }

      console.log("✅ File uploaded to S3 successfully");

      setProcessingStatus({
        step: "processing",
        message: "Processing file and generating clips...",
        progress: 60,
      });

      // Step 3: Trigger Inngest processing
      console.log("=== STEP 3: Triggering Inngest processing ===");
      const { processVideo } = await import("~/actions/generation");
      await processVideo(uploadedFileId, chunks);

      console.log("✅ Inngest processing triggered successfully");

      setProcessingStatus({
        step: "complete",
        message: "Processing started! Your clips will be ready shortly.",
        progress: 100,
      });

      console.log("=== PROCESSING INITIATED ===");
      console.log("Redirecting to dashboard to view progress...");

      // Wait a moment to show completion message
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (error) {
      console.error("=== ERROR IN FILE PROCESSING ===");
      console.error("Error details:", error);
      console.error(
        "Error stack:",
        error instanceof Error ? error.stack : "No stack trace",
      );
      console.error("Current chunk config:", chunkConfig);

      setProcessingStatus({
        step: "error",
        message: error instanceof Error ? error.message : "Processing failed",
        progress: 0,
      });
      throw error;
    }
  };

  // Handle step 1 submission (URL validation or file upload confirmation)
  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === "youtube") {
      setUrlError("");

      if (!youtubeUrl.trim()) {
        setUrlError("Please enter a YouTube URL");
        return;
      }

      if (!validateYouTubeUrl(youtubeUrl)) {
        setUrlError("Please enter a valid YouTube URL");
        return;
      }

      setIsLoadingMetadata(true);

      try {
        const metadata = await fetchVideoMetadata(youtubeUrl);
        setVideoMetadata(metadata);

        // Calculate initial chunk configuration with constraints
        const videoDurationMinutes = metadata.duration / 60;
        const minChunkMinutes = 3;

        // Use 5 minutes as default, but ensure it doesn't exceed video duration and isn't below minimum
        let initialMinutesPerChunk = Math.min(5, videoDurationMinutes);
        initialMinutesPerChunk = Math.max(
          initialMinutesPerChunk,
          minChunkMinutes,
        );

        // If video is shorter than minimum chunk size, use the whole video
        if (videoDurationMinutes < minChunkMinutes) {
          initialMinutesPerChunk = videoDurationMinutes;
        }

        const estimatedChunks = Math.ceil(
          videoDurationMinutes / initialMinutesPerChunk,
        );

        setChunkConfig({
          method: "minutes",
          minutesPerChunk: initialMinutesPerChunk,
          totalChunks: estimatedChunks,
        });

        setCurrentStep(2);
      } catch (error) {
        setUrlError(
          error instanceof Error
            ? error.message
            : "Failed to fetch video information. Please check the URL and try again.",
        );
      } finally {
        setIsLoadingMetadata(false);
      }
    } else if (activeTab === "upload") {
      if (uploadedFiles.length === 0) {
        setUploadError("Please upload a file first");
        return;
      }

      // For uploaded files, we'll estimate duration or ask user to configure
      // For now, we'll use a default configuration and move to step 2
      const uploadedFile = uploadedFiles[0];
      if (!uploadedFile) {
        setUploadError("No file selected");
        return;
      }

      // Create mock metadata from the uploaded file
      const hasValidDuration =
        uploadedFile.metadata && uploadedFile.metadata.duration > 0;
      const actualDuration = hasValidDuration
        ? uploadedFile.metadata!.duration
        : 1800; // Only use default if no duration detected

      const mockMetadata: VideoMetadata = {
        title: uploadedFile.metadata?.name ?? "Uploaded File",
        duration: actualDuration,
        thumbnail: uploadedFile.preview ?? "",
        channel: "Local Upload",
        description: `Uploaded file: ${uploadedFile.file.name}`,
      };

      setVideoMetadata(mockMetadata);

      // Calculate chunk configuration for the actual video duration
      const fileDurationMinutes = actualDuration / 60;

      console.log("=== CHUNK CONFIG CALCULATION ===");
      console.log("Actual file duration (seconds):", actualDuration);
      console.log("File duration (minutes):", fileDurationMinutes);

      let minutesPerChunk: number;
      let totalChunks: number;

      if (fileDurationMinutes <= 1) {
        // For videos 1 minute or less, use the entire video as one chunk
        minutesPerChunk = Math.max(fileDurationMinutes, 0.1); // Minimum 0.1 minutes (6 seconds)
        totalChunks = 1;
        console.log(
          "🎬 Short video detected - using entire video as one chunk",
        );
      } else if (fileDurationMinutes <= 3) {
        // For videos 1-3 minutes, split into at most 2 chunks
        minutesPerChunk = fileDurationMinutes / 2;
        totalChunks = 2;
        console.log("🎬 Medium short video - splitting into 2 chunks");
      } else {
        // For longer videos, use 3-5 minute chunks
        const idealChunkMinutes = 5;
        minutesPerChunk = Math.min(idealChunkMinutes, fileDurationMinutes);
        totalChunks = Math.ceil(fileDurationMinutes / minutesPerChunk);
        console.log("🎬 Regular video - using standard chunking");
      }

      const newChunkConfig = {
        method: "minutes" as const,
        minutesPerChunk: Math.round(minutesPerChunk * 10) / 10, // Round to 1 decimal
        totalChunks: Math.max(totalChunks, 1), // Ensure at least 1 chunk
      };

      console.log("Minutes per chunk:", minutesPerChunk);
      console.log("Total chunks:", totalChunks);
      console.log("Final chunk config:", newChunkConfig);

      setChunkConfig(newChunkConfig);

      setCurrentStep(2);
    }
  };

  // Handle chunk configuration changes
  const handleChunkConfigChange = (
    field: "minutesPerChunk" | "totalChunks",
    value: number,
  ) => {
    if (!videoMetadata) return;
    setLastChunkSlider(field);
    const videoDurationMinutes = videoMetadata.duration / 60;
    if (field === "minutesPerChunk") {
      const newTotalChunks = Math.ceil(videoDurationMinutes / value);
      setChunkConfig({
        method: "minutes",
        minutesPerChunk: value,
        totalChunks: newTotalChunks,
      });
    } else if (field === "totalChunks") {
      const newMinutesPerChunk = videoDurationMinutes / value;
      setChunkConfig({
        method: "chunks",
        minutesPerChunk: newMinutesPerChunk,
        totalChunks: value,
      });
    }
  };

  const getSliderConstraints = () => {
    if (!videoMetadata) {
      return { minMinutes: 1, maxMinutes: 10, minChunks: 1, maxChunks: 10 };
    }

    const videoDurationMinutes = videoMetadata.duration / 60;
    const minChunkMinutes = 3;
    const maxChunkMinutes = Math.max(videoDurationMinutes, minChunkMinutes);

    // Max chunks should be reasonable but not create chunks that are too short
    const maxChunks = Math.floor(videoDurationMinutes / minChunkMinutes);
    const minChunks = 1;

    return {
      minMinutes: minChunkMinutes,
      maxMinutes: maxChunkMinutes,
      minChunks,
      maxChunks: Math.max(maxChunks, 1),
    };
  };

  const sliderConstraints = getSliderConstraints();

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const formatMinutes = (minutes: number): string => {
    if (minutes < 1) {
      return `${Math.round(minutes * 60)}s`;
    } else if (minutes === Math.floor(minutes)) {
      return `${Math.floor(minutes)}m`;
    } else {
      const mins = Math.floor(minutes);
      const secs = Math.round((minutes - mins) * 60);
      return `${mins}m ${secs}s`;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const removeUploadedFile = () => {
    const uploadedFile = uploadedFiles[0];
    if (uploadedFile?.preview) {
      URL.revokeObjectURL(uploadedFile.preview);
    }
    setUploadedFiles([]);
  };

  // Preview modal/section
  const previewSection = (() => {
    if (!showPreview || !previewData) return null;
    const { chunks, transcript } = previewData;
    if (!Array.isArray(chunks) || !Array.isArray(transcript)) return null;
    return (
      <div className="bg-opacity-40 fixed inset-0 z-50 flex items-center justify-center bg-black">
        <div className="w-full max-w-2xl rounded-lg bg-white p-8 shadow-lg">
          <h2 className="mb-4 text-xl font-bold">
            Preview Chunks & Transcript
          </h2>
          <div className="mb-4">
            <h3 className="mb-2 font-semibold">Chunks</h3>
            <ul className="max-h-40 overflow-y-auto rounded border bg-gray-50 p-2">
              {chunks.map((chunk: PreviewChunk, idx: number) => (
                <li key={chunk.id ?? idx} className="mb-1">
                  Chunk {chunk.id ?? idx + 1}: {Math.round(chunk.start)}s -{" "}
                  {Math.round(chunk.end)}s ({Math.round(chunk.duration)}s)
                </li>
              ))}
            </ul>
          </div>
          <div className="mb-4">
            <h3 className="mb-2 font-semibold">Transcript Sample</h3>
            <div className="max-h-32 overflow-y-auto rounded border bg-gray-50 p-2 text-sm">
              {transcript
                .slice(0, 40)
                .map((w: PreviewTranscriptWord) => w.word)
                .join(" ")}
              {transcript.length > 40 ? " ..." : ""}
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <button
              className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
              onClick={() => {
                setShowPreview(false);
                router.push("/dashboard");
              }}
            >
              Confirm & Continue
            </button>
            <button
              className="rounded bg-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-300"
              onClick={() => setShowPreview(false)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  })();

  return (
    <>
      {previewSection}
      <div className="mx-auto max-w-2xl">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep} of 2
            </span>
            <span className="text-sm text-gray-500">
              {currentStep === 1 ? "Select Source" : "Chunk Configuration"}
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200">
            <div
              className="h-2 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
              style={{ width: `${(currentStep / 2) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1: Source Selection */}
        {currentStep === 1 && (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="p-6">
              <div className="mb-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                  <svg
                    className="h-8 w-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h2 className="mb-2 text-2xl font-bold text-gray-900">
                  Create New Project
                </h2>
                <p className="text-gray-600">
                  Choose your content source to get started
                </p>
              </div>

              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger
                    value="youtube"
                    className="flex items-center gap-2"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                    </svg>
                    YouTube URL
                  </TabsTrigger>
                  <TabsTrigger
                    value="upload"
                    className="flex items-center gap-2"
                  >
                    <svg
                      className="h-4 w-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    Upload File
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="youtube" className="mt-6">
                  <form onSubmit={handleUrlSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <label
                        htmlFor="youtubeUrl"
                        className="block text-sm font-medium text-gray-700"
                      >
                        YouTube Video URL
                      </label>
                      <input
                        type="url"
                        id="youtubeUrl"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className={`w-full rounded-lg border px-4 py-3 transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${
                          urlError ? "border-red-300" : "border-gray-300"
                        }`}
                        placeholder="https://www.youtube.com/watch?v=..."
                        disabled={isLoadingMetadata}
                      />
                      {urlError && (
                        <p className="text-sm text-red-600">{urlError}</p>
                      )}
                      <p className="text-sm text-gray-500">
                        We support YouTube videos and YouTube Shorts
                      </p>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <h4 className="mb-2 text-sm font-medium text-blue-900">
                        What happens next:
                      </h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-blue-800">
                        <li>We&apos;ll fetch the video details and duration</li>
                        <li>
                          You&apos;ll configure how to split the video into
                          chunks
                        </li>
                        <li>
                          Each chunk will be processed for optimal learning
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                        disabled={isLoadingMetadata}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isLoadingMetadata}
                        className="w-full transform rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-blue-700 hover:to-purple-700 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                      >
                        {isLoadingMetadata ? (
                          <div className="flex items-center justify-center">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                            Loading Video...
                          </div>
                        ) : (
                          "Continue"
                        )}
                      </button>
                    </div>
                  </form>
                </TabsContent>

                <TabsContent value="upload" className="mt-6">
                  <form onSubmit={handleUrlSubmit} className="space-y-6">
                    <div className="space-y-4">
                      {/* Dropzone */}
                      <div
                        {...getRootProps()}
                        className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                          isDragActive
                            ? isDragReject
                              ? "border-red-400 bg-red-50"
                              : "border-blue-400 bg-blue-50"
                            : "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                        }`}
                      >
                        <input {...getInputProps()} />
                        <div className="space-y-4">
                          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                            <svg
                              className="h-8 w-8 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                              />
                            </svg>
                          </div>

                          {isDragActive ? (
                            isDragReject ? (
                              <p className="text-lg font-medium text-red-600">
                                Please drop video or audio files only
                              </p>
                            ) : (
                              <p className="text-lg font-medium text-blue-600">
                                Drop your file here...
                              </p>
                            )
                          ) : (
                            <>
                              <div>
                                <p className="text-lg font-medium text-gray-900">
                                  Drag & drop your video or audio file
                                </p>
                                <p className="text-sm text-gray-500">
                                  or click to browse your files
                                </p>
                              </div>
                              <div className="text-xs text-gray-400">
                                Supports: MP4, AVI, MOV, MP3, WAV, M4A and more
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {uploadError && (
                        <p className="text-sm text-red-600">{uploadError}</p>
                      )}

                      {/* Uploaded file preview */}
                      {uploadedFiles.length > 0 && uploadedFiles[0] && (
                        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500">
                                <svg
                                  className="h-5 w-5 text-white"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div>
                                <p className="font-medium text-green-900">
                                  {uploadedFiles[0].metadata?.name}
                                </p>
                                <p className="text-sm text-green-700">
                                  {formatFileSize(
                                    uploadedFiles[0].metadata?.size ?? 0,
                                  )}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={removeUploadedFile}
                              className="text-green-600 hover:text-green-800"
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
                                  d="M6 18L18 6M6 6l12 12"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <h4 className="mb-2 text-sm font-medium text-purple-900">
                        What happens next:
                      </h4>
                      <ul className="list-inside list-disc space-y-1 text-sm text-purple-800">
                        <li>
                          We&apos;ll analyze your file and extract metadata
                        </li>
                        <li>
                          You&apos;ll configure how to split the content into
                          chunks
                        </li>
                        <li>
                          Each chunk will be processed for optimal learning
                        </li>
                      </ul>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                        disabled={isProcessingFile}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={
                          isProcessingFile || uploadedFiles.length === 0
                        }
                        className="w-full transform rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-purple-700 hover:to-pink-700 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                      >
                        {isProcessingFile ? (
                          <div className="flex items-center justify-center">
                            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                            Processing File...
                          </div>
                        ) : (
                          "Continue"
                        )}
                      </button>
                    </div>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        )}

        {/* Step 2: Video Metadata + Chunk Configuration */}
        {currentStep === 2 && videoMetadata && (
          <div className="space-y-6">
            {/* Debug Information Panel */}
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <h4 className="mb-2 text-sm font-medium text-yellow-800">
                🔍 Debug Information
              </h4>
              <div className="space-y-2 text-sm text-yellow-700">
                <div>
                  <strong>Video Duration:</strong> {videoMetadata.duration}{" "}
                  seconds ({(videoMetadata.duration / 60).toFixed(1)} minutes)
                </div>
                <div>
                  <strong>Current Chunk Config:</strong>{" "}
                  {JSON.stringify(chunkConfig, null, 2)}
                </div>
                <div>
                  <strong>Active Tab:</strong> {activeTab}
                </div>
                <div>
                  <strong>Minutes per Chunk:</strong>{" "}
                  {chunkConfig.minutesPerChunk}
                </div>
                <div>
                  <strong>Total Chunks:</strong> {chunkConfig.totalChunks}
                </div>
                <div>
                  <strong>Valid Config:</strong>{" "}
                  {chunkConfig.minutesPerChunk > 0 &&
                  chunkConfig.totalChunks > 0
                    ? "✅ Yes"
                    : "❌ No"}
                </div>
              </div>
            </div>

            {/* Video Metadata Card - Compressed */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="p-4">
                <div className="flex items-start space-x-4">
                  <ThumbnailImage
                    thumbnailUrl={videoMetadata.thumbnail}
                    alt={videoMetadata.title}
                    className="h-16 w-24 flex-shrink-0 rounded-lg object-cover"
                    fallback={
                      <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200">
                        <svg
                          className="h-8 w-8 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    }
                  />
                  {!videoMetadata.thumbnail && uploadedFiles[0]?.preview && (
                    <video
                      src={uploadedFiles[0].preview}
                      className="h-16 w-24 flex-shrink-0 rounded-lg object-cover"
                      muted
                    />
                  )}
                  {!videoMetadata.thumbnail && !uploadedFiles[0]?.preview && (
                    <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center rounded-lg bg-gray-200">
                      <svg
                        className="h-8 w-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="line-clamp-2 text-lg font-semibold text-gray-900">
                      {videoMetadata.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {videoMetadata.channel}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <svg
                          className="mr-1 h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        {formatDuration(videoMetadata.duration)}
                      </span>
                      <button
                        onClick={() => setCurrentStep(1)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-700"
                      >
                        Change Source
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chunk Configuration */}
            <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="p-6">
                <div className="mb-6 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                    <svg
                      className="h-6 w-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 4V2a1 1 0 011-1h8a1 1 0 011 1v2m-9 4v10a2 2 0 002 2h6a2 2 0 002-2V8M7 8h10M7 8l1 10m8-10l-1 10"
                      />
                    </svg>
                  </div>
                  <h2 className="mb-2 text-xl font-bold text-gray-900">
                    Configure Chunks
                  </h2>
                  <p className="text-gray-600">
                    Choose how to split your{" "}
                    {formatDuration(videoMetadata.duration)} content
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Minutes per Chunk */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Minutes per Chunk
                      </label>
                      <span className="text-sm font-semibold text-blue-600">
                        {formatMinutes(chunkConfig.minutesPerChunk)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={sliderConstraints.minMinutes}
                      max={sliderConstraints.maxMinutes}
                      step="0.5"
                      value={chunkConfig.minutesPerChunk}
                      onChange={(e) => {
                        setLastChunkSlider("minutesPerChunk");
                        handleChunkConfigChange(
                          "minutesPerChunk",
                          parseFloat(e.target.value),
                        );
                      }}
                      className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>{sliderConstraints.minMinutes}m</span>
                      {sliderConstraints.maxMinutes >
                        sliderConstraints.minMinutes * 2 && (
                        <span>
                          {Math.round(sliderConstraints.maxMinutes / 2)}m
                        </span>
                      )}
                      <span>{Math.round(sliderConstraints.maxMinutes)}m</span>
                    </div>
                  </div>

                  <div className="text-center text-gray-500">
                    <span className="text-sm">or</span>
                  </div>

                  {/* Total Number of Chunks */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">
                        Total Number of Chunks
                      </label>
                      <span className="text-sm font-semibold text-purple-600">
                        {chunkConfig.totalChunks} chunks
                      </span>
                    </div>
                    <input
                      type="range"
                      min={sliderConstraints.minChunks}
                      max={sliderConstraints.maxChunks}
                      step="1"
                      value={chunkConfig.totalChunks}
                      onChange={(e) => {
                        setLastChunkSlider("totalChunks");
                        handleChunkConfigChange(
                          "totalChunks",
                          parseInt(e.target.value),
                        );
                      }}
                      className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200"
                    />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>1 chunk</span>
                      {sliderConstraints.maxChunks > 2 && (
                        <span>
                          {Math.round(sliderConstraints.maxChunks / 2)} chunks
                        </span>
                      )}
                      <span>{sliderConstraints.maxChunks} chunks</span>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="rounded-lg border border-purple-200 bg-gradient-to-r from-purple-50 to-blue-50 p-4">
                    <h4 className="mb-2 text-sm font-medium text-purple-900">
                      Chunking Summary:
                    </h4>
                    <div className="space-y-1 text-sm text-purple-800">
                      <div className="flex justify-between">
                        <span>Content Duration:</span>
                        <span className="font-medium">
                          {formatDuration(videoMetadata.duration)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Chunk Length:</span>
                        <span className="font-medium">
                          {formatMinutes(chunkConfig.minutesPerChunk)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Chunks:</span>
                        <span className="font-medium">
                          {chunkConfig.totalChunks} chunks
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => setCurrentStep(1)}
                      className="w-full rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 sm:w-auto"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        console.log("Starting processing:", {
                          activeTab,
                          youtubeUrl,
                          uploadedFiles,
                          videoMetadata,
                          chunkConfig,
                        });
                        setIsProcessing(true);
                        try {
                          if (activeTab === "youtube") {
                            await processYouTubeVideo(youtubeUrl);
                          } else if (
                            activeTab === "upload" &&
                            uploadedFiles.length > 0
                          ) {
                            const uploadedFile = uploadedFiles[0];
                            if (uploadedFile) {
                              await processUploadedFile(uploadedFile);
                            }
                          }
                        } catch (error) {
                          console.error("Processing failed:", error);
                          setIsProcessing(false);
                        }
                      }}
                      disabled={isProcessing}
                      className="w-full transform rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-medium text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-purple-700 hover:to-pink-700 hover:shadow-xl disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1"
                    >
                      {isProcessing ? (
                        <div className="flex items-center justify-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        "Start Processing"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Processing Status Overlay */}
        {isProcessing && processingStatus && (
          <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-black">
            <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                  {processingStatus?.step === "error" ? (
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z"
                      />
                    </svg>
                  ) : processingStatus?.step === "complete" ? (
                    <svg
                      className="h-8 w-8 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : (
                    <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-white"></div>
                  )}
                </div>

                <h3 className="mb-2 text-lg font-semibold text-gray-900">
                  {processingStatus?.step === "error"
                    ? "Processing Error"
                    : processingStatus?.step === "complete"
                      ? "Processing Complete!"
                      : "Processing Your Content"}
                </h3>

                <p className="mb-4 text-sm text-gray-600">
                  {processingStatus?.message}
                </p>

                {/* Progress Bar */}
                {processingStatus?.progress !== undefined &&
                  processingStatus?.step !== "error" && (
                    <div className="mb-4">
                      <div className="mb-2 flex justify-between text-xs text-gray-500">
                        <span>Progress</span>
                        <span>{processingStatus?.progress}%</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-200">
                        <div
                          className="h-2 rounded-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                          style={{ width: `${processingStatus?.progress}%` }}
                        />
                      </div>
                    </div>
                  )}

                {processingStatus?.step === "error" && (
                  <button
                    onClick={() => {
                      setIsProcessing(false);
                      setProcessingStatus(null);
                    }}
                    className="rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
