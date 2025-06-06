"use client";

import React from "react";
import { ChunkedVideoPlayer } from "~/components/ChunkedVideoPlayer";

export default function TestChunkedVideoPage() {
  // Test chunk data - simulating a 10-second chunk from a longer video
  const testChunk = {
    id: 1,
    start: 30, // Start at 30 seconds in the original video
    end: 40, // End at 40 seconds in the original video
    duration: 10, // 10 seconds long
  };

  // Using a public test video URL
  const testVideoUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div className="container mx-auto p-8">
      <h1 className="mb-6 text-3xl font-bold">Chunked Video Player Test</h1>

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Test Configuration:</h2>
        <ul className="list-inside list-disc space-y-1 text-gray-700">
          <li>Original video: Big Buck Bunny (sample video)</li>
          <li>Chunk start: {testChunk.start} seconds</li>
          <li>Chunk end: {testChunk.end} seconds</li>
          <li>Chunk duration: {testChunk.duration} seconds</li>
        </ul>
      </div>

      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Expected Behavior:</h2>
        <ul className="list-inside list-disc space-y-1 text-gray-700">
          <li>Seek bar should show 0:00 to 0:10 (chunk duration)</li>
          <li>Video should start at the chunk beginning</li>
          <li>User cannot seek outside the chunk boundaries</li>
          <li>Video appears as a standalone 10-second clip</li>
        </ul>
      </div>

      <div className="overflow-hidden rounded-lg bg-black">
        <ChunkedVideoPlayer
          src={testVideoUrl}
          chunk={testChunk}
          onError={(error) => {
            console.error("Video error:", error);
            alert(`Video error: ${error}`);
          }}
        />
      </div>

      <div className="mt-6">
        <h2 className="mb-2 text-xl font-semibold">Debug Info:</h2>
        <p className="text-sm text-gray-600">
          Check the browser console for detailed logging about the chunk
          overrides.
        </p>
      </div>
    </div>
  );
}
