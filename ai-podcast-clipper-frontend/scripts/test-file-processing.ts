#!/usr/bin/env node

// Test file upload processing workflow using chunkwise system
import fetch from "node-fetch";
import "dotenv/config"; // Use this for ES modules

interface BackendResult {
  success: boolean;
  video_info?: unknown;
  chunks?: unknown[];
  transcript?: { word: string }[];
  original_s3_key?: string;
  error?: string;
}

async function testFileProcessingWorkflow() {
  console.log("🧪 Testing file upload processing workflow...");

  // Test 1: Check if we can call the chunkwise backend with an S3 file
  console.log("\n=== TEST 1: Backend Chunkwise Processing (S3 File) ===");

  // Use PROCESS_VIDEO_ENDPOINT as this is what chunkwise-functions.ts uses
  const backendUrl = process.env.PROCESS_VIDEO_ENDPOINT;
  const authToken = process.env.PROCESS_VIDEO_ENDPOINT_AUTH;

  if (!backendUrl) {
    console.log(
      "❌ PROCESS_VIDEO_ENDPOINT not configured. Please set this environment variable.",
    );
    return;
  }

  console.log("🔗 Backend URL:", backendUrl);
  console.log(
    "🔐 Auth token:",
    authToken ? "CONFIGURED" : "MISSING (Script will likely fail)",
  );

  if (!authToken) {
    console.log(
      "❌ Auth token (PROCESS_VIDEO_ENDPOINT_AUTH) not configured. Cannot proceed.",
    );
    return;
  }

  // Test payload for S3 file processing (similar to file upload)
  const testPayload = {
    video_id: "test-file-upload-" + Date.now(),
    s3_key: "test/sample-video.mp4", // Mock S3 key, ensure this key exists for a meaningful test or expect a download error from backend if it tries to fetch.
    chunk_config: {
      method: "minutes",
      minutesPerChunk: 2,
      totalChunks: 1,
    },
    existingTranscript: [], // No existing transcript for file uploads
  };

  console.log("📤 Calling backend with S3 file payload:");
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    console.log("⏳ Making request to backend...");

    const response = await fetch(backendUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(testPayload),
    });

    console.log("📊 Response status:", response.status);
    console.log(
      "📊 Response headers:",
      Object.fromEntries(response.headers.entries()),
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("❌ Backend error response:", errorText);
      console.log(
        "❌ This suggests the backend chunkwise processor is failing",
      );
      return;
    }

    const result = (await response.json()) as BackendResult;
    console.log("✅ Backend success response:");
    console.log(JSON.stringify(result, null, 2));

    // Check if the response has the expected fields
    const expectedFields = ["success", "video_info", "chunks", "transcript"];
    const missingFields = expectedFields.filter((field) => !(field in result));

    if (missingFields.length > 0) {
      console.log("⚠️ Missing expected fields:", missingFields);
    } else {
      console.log("✅ Response has all expected fields");
    }

    if (result.transcript && Array.isArray(result.transcript)) {
      console.log(`✅ Transcript data: ${result.transcript.length} segments`);
    } else {
      console.log("⚠️ No transcript data in response");
    }
  } catch (error: any) {
    console.log("❌ Request failed:", error.message);

    if (error.code === "ECONNREFUSED") {
      console.log("❌ Backend service is not running or not accessible");
    } else if (error.code === "ETIMEDOUT") {
      console.log("❌ Request timed out - backend may be slow or overloaded");
    } else {
      console.log("❌ Unexpected error type:", error.code || "UNKNOWN");
    }
  }

  console.log("\n=== TEST SUMMARY ===");
  console.log("This test checks if the chunkwise backend can process S3 files");
  console.log("For file uploads:");
  console.log("1. File is uploaded directly to S3");
  console.log("2. Inngest triggers chunkwise processing with S3 key");
  console.log(
    "3. Backend downloads from S3 and processes (if s3_key is real and accessible)",
  );
  console.log("4. Results saved to database");
}

// Run the test
testFileProcessingWorkflow().catch(console.error);
