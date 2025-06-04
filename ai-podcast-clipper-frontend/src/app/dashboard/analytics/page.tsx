"use client";

export default function AnalyticsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-gray-500">
          Track your learning progress and engagement
        </p>
      </div>

      {/* Coming Soon Card */}
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
        <div className="mx-auto max-w-md">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-6a2 2 0 01-2-2z"
              />
            </svg>
          </div>

          <h2 className="mb-2 text-xl font-semibold text-gray-900">
            Analytics Coming Soon!
          </h2>
          <p className="mb-6 text-gray-500">
            Get detailed insights into your learning patterns, progress
            tracking, and engagement metrics across all your video chunks.
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
              Learning time and progress tracking
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
              Completion rates and patterns
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
              Topic and skill progression
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
              Learning streak and achievements
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
