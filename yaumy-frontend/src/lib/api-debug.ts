// Comprehensive API debugging utility to track patterns
// This helps identify what's causing repeated API calls

interface APICallLog {
  url: string;
  timestamp: number;
  source: string;
  componentId: string;
  stackTrace: string;
}

class APIDebugger {
  private calls: APICallLog[] = [];
  private readonly MAX_LOGS = 100; // Keep last 100 calls

  logCall(url: string, source: string, componentId: string): void {
    const call: APICallLog = {
      url,
      timestamp: Date.now(),
      source,
      componentId,
      stackTrace: new Error().stack ?? "No stack trace",
    };

    this.calls.push(call);

    // Keep only the last MAX_LOGS entries
    if (this.calls.length > this.MAX_LOGS) {
      this.calls = this.calls.slice(-this.MAX_LOGS);
    }

    // Check for rapid calls to same URL
    this.checkForRapidCalls(url);
  }

  private checkForRapidCalls(url: string): void {
    const now = Date.now();
    const recentCalls = this.calls.filter(
      (call) => call.url === url && now - call.timestamp < 5000, // Last 5 seconds
    );

    if (recentCalls.length > 5) {
      console.error(`RAPID API CALLS DETECTED to ${url}:`);
      console.table(
        recentCalls.map((call) => ({
          timestamp: new Date(call.timestamp).toISOString(),
          source: call.source,
          componentId: call.componentId,
          timeSinceLast:
            recentCalls.indexOf(call) > 0
              ? `${call.timestamp - recentCalls[recentCalls.indexOf(call) - 1]!.timestamp}ms`
              : "N/A",
        })),
      );

      // Show stack traces for recent calls
      recentCalls.slice(-3).forEach((call, index) => {
        console.error(`Stack trace for call ${index + 1}:`, call.stackTrace);
      });
    }
  }

  getCallsSummary(): Record<string, number> {
    const summary: Record<string, number> = {};
    this.calls.forEach((call) => {
      summary[call.url] = (summary[call.url] ?? 0) + 1;
    });
    return summary;
  }

  getRecentCalls(timeWindow = 10000): APICallLog[] {
    const now = Date.now();
    return this.calls.filter((call) => now - call.timestamp < timeWindow);
  }

  printSummary(): void {
    console.log("API Calls Summary (last 100 calls):");
    console.table(this.getCallsSummary());

    const recent = this.getRecentCalls();
    if (recent.length > 0) {
      console.log("Recent calls (last 10 seconds):");
      console.table(
        recent.map((call) => ({
          url: call.url,
          timestamp: new Date(call.timestamp).toISOString(),
          source: call.source,
          componentId: call.componentId,
        })),
      );
    }
  }
}

// Global instance
export const apiDebugger = new APIDebugger();

// Helper function to easily log API calls
export const logAPICall = (
  url: string,
  source: string,
  componentId: string,
): void => {
  apiDebugger.logCall(url, source, componentId);
};

// Auto-print summary every 30 seconds in development
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    const recent = apiDebugger.getRecentCalls(30000);
    if (recent.length > 10) {
      console.warn(
        `High API activity: ${recent.length} calls in last 30 seconds`,
      );
      apiDebugger.printSummary();
    }
  }, 30000);
}
