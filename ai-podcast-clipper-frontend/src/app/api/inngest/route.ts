import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
// import { processVideo } from "~/inngest/functions"; // Removed import for legacy function
import {
  processChunkwiseVideo,
  // checkChunkProgress, // Removed as this function is obsolete
  retryFailedVideo,
  cleanupVideo,
} from "~/inngest/chunkwise-functions";

// Create an API that serves functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // processVideo, // Removed legacy processing function from serve array
    processChunkwiseVideo,
    // checkChunkProgress, // Removed as this function is obsolete
    retryFailedVideo,
    cleanupVideo,
  ],
});
