"use client";

export default function LearningLabPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white">
        <div className="flex items-center">
          <svg
            className="mr-3 h-8 w-8"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <div>
            <h1 className="mb-1 text-2xl font-bold">Learning Lab</h1>
            <p className="text-purple-100">
              AI-powered insights and knowledge extraction
            </p>
          </div>
        </div>
      </div>

      {/* Coming Soon Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <svg
              className="h-8 w-8 text-purple-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Coming Soon!
          </h2>
          <p className="mb-6 text-gray-500">
            The Learning Lab will feature AI-powered insights, automatic note
            generation, knowledge graphs, and personalized learning
            recommendations based on your video chunks.
          </p>

          <div className="space-y-2 text-left">
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
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
              Smart note generation from transcripts
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
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
              Key concept extraction and summaries
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
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
              Interactive knowledge graphs
            </div>
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="mr-2 h-4 w-4 text-green-500"
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
              Personalized learning paths
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
