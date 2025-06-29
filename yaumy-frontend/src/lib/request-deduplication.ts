// Global request deduplication utility to prevent multiple simultaneous requests
// This helps prevent database overload from repeated API calls

interface PendingRequest {
  promise: Promise<Response>;
  timestamp: number;
}

class RequestDeduplicator {
  private pendingRequests = new Map<string, PendingRequest>();
  private readonly TIMEOUT_MS = 10000; // 10 seconds timeout

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    const key = this.getRequestKey(url, options);

    // Check if there's already a pending request for this key
    const existing = this.pendingRequests.get(key);
    if (existing) {
      return existing.promise;
    }

    // Create new request
    const promise = fetch(url, options);

    // Store the pending request
    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
    });

    // Clean up when request completes
    void promise.finally(() => {
      this.pendingRequests.delete(key);
    });

    // Set timeout to prevent stuck requests
    setTimeout(() => {
      if (this.pendingRequests.has(key)) {
        console.warn(
          `Request timeout for ${url}, removing from deduplication cache`,
        );
        this.pendingRequests.delete(key);
      }
    }, this.TIMEOUT_MS);

    return promise;
  }

  private getRequestKey(url: string, options?: RequestInit): string {
    // Create a unique key based on URL and important request options
    const method = options?.method ?? "GET";
    const headers = options?.headers ? JSON.stringify(options.headers) : "";

    let bodyString = "";
    if (options?.body) {
      if (typeof options.body === "string") {
        bodyString = options.body;
      } else if (options.body instanceof URLSearchParams) {
        bodyString = options.body.toString();
      } else if (
        typeof options.body === "object" &&
        options.body !== null && // Ensure body is not null before instanceof checks
        !(options.body instanceof ReadableStream) &&
        !(options.body instanceof Blob) &&
        !(options.body instanceof FormData)
      ) {
        try {
          bodyString = JSON.stringify(options.body);
        } catch {
          bodyString = "[object Object_Serialization_Failed]";
        }
      } else {
        // For FormData, Blob, ReadableStream, ArrayBuffer, TypedArray, DataView etc.
        // Using constructor name as a placeholder.
        bodyString = `[object ${options.body.constructor.name}]`;
      }
    }

    return `${method}:${url}:${headers}:${bodyString}`;
  }

  // Method to clear all pending requests (useful for cleanup)
  clear(): void {
    this.pendingRequests.clear();
  }

  // Get current pending requests count for debugging
  getPendingCount(): number {
    return this.pendingRequests.size;
  }
}

// Global instance
export const requestDeduplicator = new RequestDeduplicator();

// Enhanced fetch function that uses deduplication
export const deduplicatedFetch = (
  url: string,
  options?: RequestInit,
): Promise<Response> => {
  return requestDeduplicator.fetch(url, options);
};
