"use client";

import React, { useEffect, useRef, useCallback, useMemo } from "react";
import videojs from "video.js";
import "video.js/dist/video-js.css";
import styles from "./ChunkedVideoPlayer.module.css";
// import VideoPerformanceMonitor from "./VideoPerformanceMonitor";
// import { videoPreloader } from "~/lib/video-preloader";
// import {
//   getOptimalVideoConfig,
//   monitorVideoPerformance,
// } from "~/lib/video-config";

interface Chunk {
  id: number;
  start: number;
  end: number;
  duration: number;
}

interface ChunkedVideoPlayerProps {
  src: string;
  chunk: Chunk;
  onError?: (error: string) => void;
  onReady?: () => void;
  adjacentChunks?: Array<{ clipId: string; url?: string }>;
  currentChunkIndex?: number;
  onChunkNavigation?: (direction: "next" | "prev") => void;
}

// Video.js extends
interface ExtendedPlayer extends ReturnType<typeof videojs> {
  _originalCurrentTime?: (time?: number) => number | undefined;
  _originalDuration?: () => number | undefined;
}

interface SeekBarComponent {
  getPercent?: () => number;
  handleMouseMove?: (event: MouseEvent) => void;
  el: () => HTMLElement;
}

interface SeekableTimeRanges {
  length: number;
  start: (index: number) => number;
  end: (index: number) => number;
}

// Video cache for performance optimization
const videoCache = new Map<string, HTMLVideoElement>();
const preloadCache = new Set<string>();

// Use optimized configuration from video-config
const getPlayerOptions = (isChunked = true) => ({
  controls: true,
  responsive: true,
  fluid: true,
  preload: "metadata",
  // Basic options for now
});

const ChunkedVideoPlayerComponent: React.FC<ChunkedVideoPlayerProps> = ({
  src,
  chunk,
  onError,
  onReady,
  adjacentChunks = [],
  currentChunkIndex = 0,
  onChunkNavigation,
}) => {
  const videoRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<ExtendedPlayer | null>(null);
  const chunkRef = useRef<Chunk>(chunk);
  const srcRef = useRef<string>(src);
  const isInitialized = useRef(false);

  // Add debugging to track video player renders
  const playerInstanceId = useRef(
    `VideoPlayer-${Math.random().toString(36).substr(2, 9)}`,
  );
  console.log(
    `🎬 ${playerInstanceId.current} render - src: ${src}, chunk: ${chunk.id}`,
  );

  // Update refs when props change
  useEffect(() => {
    chunkRef.current = chunk;
  }, [chunk]);

  // Handle source changes with proper cleanup
  useEffect(() => {
    if (srcRef.current !== src && playerRef.current) {
      console.log("=== VIDEO SOURCE CHANGE ===");
      console.log("Old src:", srcRef.current);
      console.log("New src:", src);

      // Update source and reset player state
      const player = playerRef.current;

      // Ensure player is ready and has methods available before calling them
      if (
        player &&
        typeof player.paused === "function" &&
        typeof player.pause === "function"
      ) {
        // Pause the player first
        if (!player.paused()) {
          player.pause();
        }
      }

      // Update the source
      if (player && typeof player.src === "function") {
        player.src({ src, type: "video/mp4" });

        // Reset to chunk start when source changes
        player.ready(() => {
          console.log("Player ready after source change");
          if (player._originalCurrentTime) {
            player._originalCurrentTime(chunk.start);
          }
        });
      }
    }

    srcRef.current = src;
  }, [src, chunk.start]);

  // Memoized time conversion functions for performance
  const timeConverters = useMemo(
    () => ({
      chunkTimeToVideoTime: (chunkTime: number): number => {
        const currentChunk = chunkRef.current;
        return (
          currentChunk.start +
          Math.max(0, Math.min(chunkTime, currentChunk.duration))
        );
      },

      videoTimeToChunkTime: (videoTime: number): number => {
        const currentChunk = chunkRef.current;
        return Math.max(
          0,
          Math.min(videoTime - currentChunk.start, currentChunk.duration),
        );
      },
    }),
    [],
  );

  // Optimized chunk time overrides with minimal DOM manipulation
  const setupChunkTimeOverrides = useCallback(
    (player: ExtendedPlayer) => {
      const currentChunk = chunkRef.current;

      // Store original methods
      const originalCurrentTime = player.currentTime.bind(player);
      const originalDuration = player.duration.bind(player);

      // Override currentTime to return chunk-relative time
      player.currentTime = function (seconds?: number) {
        if (seconds !== undefined) {
          const videoTime = timeConverters.chunkTimeToVideoTime(seconds);
          return originalCurrentTime(videoTime);
        } else {
          const videoTime = originalCurrentTime() ?? 0;
          return timeConverters.videoTimeToChunkTime(videoTime);
        }
      } as typeof player.currentTime;

      // Override duration to return chunk duration
      player.duration = function () {
        return currentChunk.duration;
      } as typeof player.duration;

      // Override seekable to return chunk range
      player.seekable = function (): SeekableTimeRanges {
        return {
          length: 1,
          start: () => 0,
          end: () => currentChunk.duration,
        };
      } as typeof player.seekable;

      // Optimize seek bar overrides with requestAnimationFrame
      requestAnimationFrame(() => {
        const seekBar = player
          .getChild("ControlBar")
          ?.getChild("ProgressControl")
          ?.getChild("SeekBar") as SeekBarComponent | undefined;

        if (seekBar) {
          // Override the getPercent method to work with chunk time
          const originalGetPercent = seekBar.getPercent?.bind(seekBar);
          if (originalGetPercent) {
            seekBar.getPercent = function () {
              const chunkCurrentTime = timeConverters.videoTimeToChunkTime(
                originalCurrentTime() ?? 0,
              );
              return Math.min(chunkCurrentTime / currentChunk.duration, 1);
            };
          }

          // Override the handleMouseMove for scrubbing
          const originalHandleMouseMove =
            seekBar.handleMouseMove?.bind(seekBar);
          if (originalHandleMouseMove) {
            seekBar.handleMouseMove = function (event: MouseEvent) {
              const rect = this.el().getBoundingClientRect();
              const percent = Math.max(
                0,
                Math.min(1, (event.clientX - rect.left) / rect.width),
              );
              const chunkTime = percent * currentChunk.duration;
              const videoTime = timeConverters.chunkTimeToVideoTime(chunkTime);
              originalCurrentTime(videoTime);
            };
          }
        }
      });
    },
    [timeConverters],
  );

  // Optimized event handlers with throttling
  const handleTimeUpdate = useCallback(() => {
    const player = playerRef.current;
    const currentChunk = chunkRef.current;

    if (!player || !currentChunk) return;

    const actualVideoTime = player._originalCurrentTime?.() ?? 0;

    // Check boundaries
    if (actualVideoTime > currentChunk.end) {
      player._originalCurrentTime?.(currentChunk.end);
      if (typeof player.pause === "function") {
        player.pause();
      }
    } else if (actualVideoTime < currentChunk.start) {
      player._originalCurrentTime?.(currentChunk.start);
    }
  }, []);

  const handleSeeked = useCallback(() => {
    const player = playerRef.current;
    const currentChunk = chunkRef.current;

    if (!player || !currentChunk) return;

    const actualVideoTime = player._originalCurrentTime?.() ?? 0;

    // Enforce chunk boundaries
    if (actualVideoTime < currentChunk.start) {
      player._originalCurrentTime?.(currentChunk.start);
    }
    if (actualVideoTime > currentChunk.end) {
      player._originalCurrentTime?.(currentChunk.end);
    }
  }, []);

  // Optimized progress bar update with requestAnimationFrame
  const updateProgressBar = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;

    const actualTime = player._originalCurrentTime?.() ?? 0;
    const chunkTime = timeConverters.videoTimeToChunkTime(actualTime);
    const progress = Math.min(chunkTime / chunkRef.current.duration, 1);

    // Update progress bar efficiently
    const progressControl = player
      .getChild("ControlBar")
      ?.getChild("ProgressControl");
    const seekBar = progressControl?.getChild("SeekBar");
    const playProgressBar = seekBar?.getChild("PlayProgressBar");

    if (playProgressBar?.el()) {
      const element = playProgressBar.el() as HTMLElement;
      const newWidth = `${progress * 100}%`;
      if (element.style.width !== newWidth) {
        element.style.width = newWidth;
      }
    }
  }, [timeConverters]);

  // Preload next video for smooth navigation
  const preloadVideo = useCallback((videoSrc: string) => {
    if (preloadCache.has(videoSrc) || videoCache.has(videoSrc)) return;

    preloadCache.add(videoSrc);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = videoSrc;
    video.addEventListener(
      "loadedmetadata",
      () => {
        videoCache.set(videoSrc, video);
      },
      { once: true },
    );
  }, []);

  // Initialize player with optimizations
  useEffect(() => {
    if (!videoRef.current || isInitialized.current) return;

    // Create video element
    const videoElement = document.createElement("video-js");
    videoElement.classList.add("vjs-big-play-centered");
    videoRef.current.appendChild(videoElement);

    // Initialize player with optimized configuration
    const playerOptions = getPlayerOptions(true);
    const player = videojs(videoElement, {
      ...playerOptions,
      sources: [{ src, type: "video/mp4" }],
    }) as ExtendedPlayer;

    playerRef.current = player;
    isInitialized.current = true;

    // Enhanced player ready callback with proper state management
    player.ready(() => {
      console.log("🎬 Video player ready");

      // Store original methods before overriding
      player._originalCurrentTime = player.currentTime.bind(player);
      player._originalDuration = player.duration.bind(player);

      // Set up chunk time overrides
      setupChunkTimeOverrides(player);

      // Seek to chunk start using original method
      player._originalCurrentTime?.(chunkRef.current.start);

      // Set up performance monitoring
      // monitorVideoPerformance(player);

      // Initialize advanced preloading
      // if (adjacentChunks.length > 0) {
      //   void videoPreloader.preloadAdjacent(
      //     src,
      //     currentChunkIndex,
      //     adjacentChunks,
      //     async (clipId: string) => {
      //       // This would need to be provided by the parent component
      //       return adjacentChunks.find((c) => c.clipId === clipId)?.url || null;
      //     },
      //   );
      // }

      // Call onReady callback
      onReady?.();
    });

    // Handle source loading events to ensure proper state
    player.on("loadstart", () => {
      console.log("🎬 Video load started - resetting to chunk start");
      // Clear any previous state that might interfere
    });

    player.on("loadeddata", () => {
      console.log("🎬 Video data loaded - ensuring chunk start position");
      // Ensure we're at the correct position when new data loads
      if (player._originalCurrentTime) {
        const currentTime = player._originalCurrentTime();
        const chunkStart = chunkRef.current.start;
        if (
          currentTime !== undefined &&
          Math.abs(currentTime - chunkStart) > 0.5
        ) {
          // Only seek if significantly off
          player._originalCurrentTime(chunkStart);
        }
      }
    });

    player.on("canplay", () => {
      console.log("🎬 Video can play - final position check");
      // Final position verification
      if (player._originalCurrentTime) {
        const currentTime = player._originalCurrentTime();
        const chunkStart = chunkRef.current.start;
        if (
          currentTime !== undefined &&
          Math.abs(currentTime - chunkStart) > 0.5
        ) {
          player._originalCurrentTime(chunkStart);
        }
      }
    });

    // Add optimized event listeners
    player.on("timeupdate", handleTimeUpdate);
    player.on("seeking", handleTimeUpdate);
    player.on("seeked", handleSeeked);

    // Throttled progress bar updates
    let progressUpdateFrame: number;
    player.on("timeupdate", () => {
      if (progressUpdateFrame) {
        cancelAnimationFrame(progressUpdateFrame);
      }
      progressUpdateFrame = requestAnimationFrame(updateProgressBar);
    });

    // Error handling
    player.on("error", (e: unknown) => {
      const error = player.error();
      if (process.env.NODE_ENV === "development") {
        console.error("Video load error:", e);
        if (error) {
          console.error("Video.js error details:", {
            code: error.code,
            message: error.message,
          });
        }
      }
      onError?.(
        `Failed to load video - Error code: ${error?.code ?? "unknown"}`,
      );
    });

    // Performance monitoring events (only in development)
    if (process.env.NODE_ENV === "development") {
      const events = [
        "loadstart",
        "loadedmetadata",
        "canplay",
        "waiting",
        "stalled",
        "suspend",
        "abort",
      ];
      events.forEach((eventName) => {
        player.on(eventName, () => {
          console.log(`Video event: ${eventName}`);
        });
      });
    }

    // Cleanup function
    return () => {
      if (progressUpdateFrame) {
        cancelAnimationFrame(progressUpdateFrame);
      }
      if (player && !player.isDisposed()) {
        player.off("timeupdate", handleTimeUpdate);
        player.off("seeking", handleTimeUpdate);
        player.off("seeked", handleSeeked);
        player.dispose();
      }
      isInitialized.current = false;
    };
  }, [src, onError, onReady]);

  // Update player when chunk changes (optimized)
  useEffect(() => {
    const player = playerRef.current;
    if (!player?.isReady_) return;

    // Update the chunk overrides with new chunk data
    setupChunkTimeOverrides(player);
    // Seek to new chunk start using original method
    player._originalCurrentTime?.(chunk.start);

    // Preload for smooth navigation if we have a different video
    if (srcRef.current !== src) {
      preloadVideo(src);
    }
  }, [chunk, setupChunkTimeOverrides, src, preloadVideo]);

  // Update video source when it changes - with improved state management
  useEffect(() => {
    const player = playerRef.current;
    if (!player?.isReady_ || srcRef.current === src) return;

    console.log("🔄 Updating video source");
    console.log("From:", srcRef.current);
    console.log("To:", src);

    // Pause player before changing source to prevent conflicts
    if (
      typeof player.paused === "function" &&
      typeof player.pause === "function" &&
      !player.paused()
    ) {
      player.pause();
    }

    // Update source with proper handling
    player.src({ src, type: "video/mp4" });

    // Reset chunk overrides after source change
    player.ready(() => {
      console.log("🔄 Player ready after source update");
      setupChunkTimeOverrides(player);
      if (player._originalCurrentTime) {
        player._originalCurrentTime(chunkRef.current.start);
      }
    });

    srcRef.current = src;
  }, [src, setupChunkTimeOverrides]);

  return (
    <div data-vjs-player className={styles.chunkedVideoContainer}>
      <div ref={videoRef} />
      {/* <VideoPerformanceMonitor
        player={playerRef.current}
        enabled={process.env.NODE_ENV === "development"}
      /> */}
    </div>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const ChunkedVideoPlayer = React.memo(
  ChunkedVideoPlayerComponent,
  (prevProps, nextProps) => {
    // Only re-render if src, chunk id, or chunk start/end times change
    return (
      prevProps.src === nextProps.src &&
      prevProps.chunk.id === nextProps.chunk.id &&
      prevProps.chunk.start === nextProps.chunk.start &&
      prevProps.chunk.end === nextProps.chunk.end &&
      prevProps.chunk.duration === nextProps.chunk.duration
    );
  },
);

export default ChunkedVideoPlayer;
