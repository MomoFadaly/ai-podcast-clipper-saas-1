/**
 * Centralized Error Handling Utilities
 * 
 * Provides consistent error handling patterns across the application
 */

import { NextResponse } from "next/server";
import { toast } from "sonner";

// Standard API error response interface
export interface ApiError {
  error: string;
  message?: string;
  code?: string;
  details?: any;
  requestId?: string;
  timestamp?: string;
}

// Standard server action result interface
export interface ActionResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

/**
 * Creates a standardized API error response
 */
export function createApiError(
  error: string,
  status: number = 500,
  options: {
    message?: string;
    code?: string;
    details?: any;
    requestId?: string;
  } = {}
): NextResponse {
  const errorResponse: ApiError = {
    error,
    message: options.message,
    code: options.code,
    details: process.env.NODE_ENV === 'development' ? options.details : undefined,
    requestId: options.requestId,
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(errorResponse, { status });
}

/**
 * Handles API route errors consistently
 */
export function handleApiError(
  error: unknown,
  context: string = "API operation",
  requestId?: string
): NextResponse {
  console.error(`[API_ERROR] ${context}:`, error);

  if (error instanceof Error) {
    return createApiError(
      "Operation failed",
      500,
      {
        message: error.message,
        code: "INTERNAL_ERROR",
        details: error.stack,
        requestId,
      }
    );
  }

  return createApiError(
    "Unknown error occurred",
    500,
    {
      code: "UNKNOWN_ERROR",
      requestId,
    }
  );
}

/**
 * Creates a standardized server action result
 */
export function createActionResult<T>(
  success: boolean,
  data?: T,
  error?: string,
  options: {
    message?: string;
    code?: string;
  } = {}
): ActionResult<T> {
  return {
    success,
    data,
    error,
    message: options.message,
    code: options.code,
  };
}

/**
 * Handles server action errors consistently
 */
export function handleActionError(
  error: unknown,
  context: string = "Server action"
): ActionResult {
  console.error(`[ACTION_ERROR] ${context}:`, error);

  if (error instanceof Error) {
    return createActionResult(
      false,
      undefined,
      error.message,
      {
        message: `Failed to ${context.toLowerCase()}`,
        code: "ACTION_FAILED",
      }
    );
  }

  return createActionResult(
    false,
    undefined,
    "Unknown error occurred",
    {
      message: `Failed to ${context.toLowerCase()}`,
      code: "UNKNOWN_ERROR",
    }
  );
}

/**
 * Shows user-friendly error notifications
 */
export function showErrorToast(
  error: string | Error | ActionResult,
  fallbackMessage: string = "Something went wrong"
) {
  let message = fallbackMessage;
  let description: string | undefined;

  if (typeof error === 'string') {
    message = error;
  } else if (error instanceof Error) {
    message = error.message || fallbackMessage;
  } else if (error && typeof error === 'object' && 'error' in error) {
    message = error.error || fallbackMessage;
    description = error.message;
  }

  toast.error(message, {
    description,
    duration: 5000,
  });
}

/**
 * Shows success notifications
 */
export function showSuccessToast(
  message: string,
  description?: string
) {
  toast.success(message, {
    description,
    duration: 3000,
  });
}

/**
 * Type-safe error boundary error handler
 */
export function handleBoundaryError(error: Error, errorInfo: any) {
  console.error('[ERROR_BOUNDARY]', error, errorInfo);
  
  // In production, you'd send this to an error tracking service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to error tracking service (Sentry, LogRocket, etc.)
  }
}

/**
 * Validates and formats database errors
 */
export function handleDatabaseError(error: unknown): ActionResult {
  console.error('[DATABASE_ERROR]', error);

  if (error && typeof error === 'object' && 'code' in error) {
    const dbError = error as any;
    
    // Handle specific Prisma/database error codes
    switch (dbError.code) {
      case 'P2002':
        return createActionResult(
          false,
          undefined,
          "Record already exists",
          { code: "DUPLICATE_ENTRY" }
        );
      case 'P2025':
        return createActionResult(
          false,
          undefined,
          "Record not found",
          { code: "NOT_FOUND" }
        );
      case 'P2003':
        return createActionResult(
          false,
          undefined,
          "Cannot delete record due to existing relationships",
          { code: "FOREIGN_KEY_CONSTRAINT" }
        );
      default:
        return createActionResult(
          false,
          undefined,
          "Database operation failed",
          { code: "DATABASE_ERROR" }
        );
    }
  }

  return handleActionError(error, "database operation");
}

/**
 * Handles authentication errors consistently
 */
export function handleAuthError(error: unknown): ActionResult {
  console.error('[AUTH_ERROR]', error);

  if (error instanceof Error) {
    if (error.message.includes('credentials')) {
      return createActionResult(
        false,
        undefined,
        "Invalid credentials",
        { code: "INVALID_CREDENTIALS" }
      );
    }
    
    if (error.message.includes('already exists')) {
      return createActionResult(
        false,
        undefined,
        "Account already exists",
        { code: "USER_EXISTS" }
      );
    }
  }

  return handleActionError(error, "authentication");
}