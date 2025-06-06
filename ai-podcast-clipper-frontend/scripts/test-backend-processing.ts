#!/usr/bin/env node

// Test script to call the backend processing endpoint directly
import fetch from "node-fetch";
import "dotenv/config";

// Load environment variables from .env
// dotenv.config(); // Not needed with import 'dotenv/config'

interface BackendResult {
  success: boolean;
  video_info?: unknown;
  chunks?: unknown[];
  transcript?: { word: string }[];
  original_s3_key?: string;
  error?: string;
}

async function testBackendProcessing() {
  console.log("🧪 Testing backend processing endpoint directly...");

  const testPayload = {
    youtube_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Rick Roll for testing
    video_id: "test-direct-backend-" + Date.now(),
    chunk_config: {
      method: "minutes",
      minutesPerChunk: 1, // Using smaller chunks for quicker test
      totalChunks: 1,
    },
  };

  const endpoint = process.env.PROCESS_VIDEO_ENDPOINT;
  const authToken = process.env.PROCESS_VIDEO_ENDPOINT_AUTH;

  if (!endpoint) {
    console.error(
      "❌ Error: PROCESS_VIDEO_ENDPOINT environment variable is not set.",
    );
    console.error(
      "Ensure your .env file has PROCESS_VIDEO_ENDPOINT (full URL to chunkwise_processor.py process_video_endpoint)",
    );
    return;
  }
  if (!authToken) {
    console.error(
      "❌ Error: PROCESS_VIDEO_ENDPOINT_AUTH environment variable is not set.",
    );
    return;
  }

  console.log("📞 Using Endpoint:", endpoint);
  console.log(
    "🔑 Auth Token:",
    authToken ? "Set" : "NOT SET (Request will likely fail)",
  );
  console.log("📤 Calling backend with payload:");
  console.log(JSON.stringify(testPayload, null, 2));

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(testPayload),
    });

    console.log(`📊 Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Backend error response:", errorText);
      return;
    }

    const result = (await response.json()) as BackendResult;
    console.log("✅ Backend response received");
    console.log("📋 Full response:");
    console.log(JSON.stringify(result, null, 2));

    // Analyze the response structure
    if (result.success) {
      console.log("\n🎯 ANALYSIS:");
      console.log("- Success:", result.success);
      console.log("- Has video_info:", !!result.video_info);
      console.log("- Has chunks:", !!result.chunks);
      console.log(
        "- Chunks count:",
        Array.isArray(result.chunks) ? result.chunks.length : 0,
      );
      console.log("- Has transcript:", !!result.transcript);
      console.log(
        "- Transcript segments:",
        Array.isArray(result.transcript) ? result.transcript.length : 0,
      );
      console.log("- Has original_s3_key:", !!result.original_s3_key);

      if (result.chunks && result.chunks.length > 0) {
        console.log("- First chunk:", result.chunks[0]);
      }

      if (result.transcript && result.transcript.length > 0) {
        console.log("- First transcript segment:", result.transcript[0]);
        console.log(
          "- Sample transcript text:",
          result.transcript
            .slice(0, 5)
            .map((t) => t.word)
            .join(" "),
        );
      }
    } else {
      console.log("❌ Backend returned failure:", result.error);
    }
  } catch (error) {
    console.error(
      "❌ Network/parsing error:",
      error instanceof Error ? error.message : String(error),
    );
  }
}

testBackendProcessing()
  .then(() => {
    console.log("\n✅ Backend test complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Backend test failed:", error);
    process.exit(1);
  });
