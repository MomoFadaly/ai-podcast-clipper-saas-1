import { Inngest } from "inngest";

// Create a client to send and receive events with optimized dev config
export const inngest = new Inngest({ 
  id: "ai-podcast-clipper-frontend",
  // Reduce dev mode polling to improve performance
  ...(process.env.NODE_ENV === "development" && {
    devMode: {
      pollInterval: 5000, // Poll every 5 seconds instead of default frequent polling
    }
  })
});
