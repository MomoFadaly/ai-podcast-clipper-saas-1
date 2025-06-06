"use client";

import ChunkedVideoPlayer from "../../components/ChunkedVideoPlayer";

export default function TestVideoPlayerPage() {
  // Test chunk data
  const testChunk = {
    id: 1,
    start: 10, // Start at 10 seconds
    end: 30, // End at 30 seconds
    duration: 20,
  };

  // Public test video URL
  const testVideoUrl =
    "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">
          Video.js Player Test
        </h1>

        <div className="mb-6 rounded-lg bg-white p-6 shadow-lg">
          <h2 className="mb-4 text-xl font-semibold">Test Information</h2>
          <div className="space-y-2 text-sm text-gray-600">
            <p>
              <strong>Video URL:</strong> {testVideoUrl}
            </p>
            <p>
              <strong>Chunk Start:</strong> {testChunk.start} seconds
            </p>
            <p>
              <strong>Chunk End:</strong> {testChunk.end} seconds
            </p>
            <p>
              <strong>Expected Behavior:</strong> Video should start at 10s and
              stop at 30s
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-lg bg-white shadow-lg">
          <div className="aspect-video bg-black">
            <ChunkedVideoPlayer
              src={testVideoUrl}
              chunk={testChunk}
              onError={(errorMsg) => {
                console.error("Video player error:", errorMsg);
                alert(`Video Error: ${errorMsg}`);
              }}
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4">
          <h3 className="mb-2 font-semibold text-blue-900">Instructions:</h3>
          <ul className="space-y-1 text-sm text-blue-800">
            <li>
              • The video should automatically seek to 10 seconds when loaded
            </li>
            <li>
              • When you try to seek before 10s, it should jump back to 10s
            </li>
            <li>• When the video reaches 30s, it should pause automatically</li>
            <li>
              • If you try to seek past 30s, it should jump back to 30s and
              pause
            </li>
            <li>• Check the browser console for detailed logging</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
