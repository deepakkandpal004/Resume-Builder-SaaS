"use client";
import toast from "react-hot-toast";

/**
 * Centralized error handling utility
 * Provides user-friendly error messages and retry capabilities
 */

export const ErrorMessages = {
  NETWORK: "Network error. Please check your connection and try again.",
  TIMEOUT: "Request timed out. Please try again.",
  UNAUTHORIZED: "Session expired. Please log in again.",
  FORBIDDEN: "You don't have permission to perform this action.",
  NOT_FOUND: "The requested resource was not found.",
  SERVER_ERROR: "Server error. Please try again later.",
  RATE_LIMIT: "Too many requests. Please wait a moment and try again.",
  VALIDATION: "Please check your input and try again.",
  AI_BUSY: "AI service is busy. Please try again in a moment.",
  AI_QUOTA: "Daily limit reached. Upgrade to premium for unlimited access.",
  UNKNOWN: "Something went wrong. Please try again.",
} as const;

export interface ParsedApiError {
  message: string;
  code: string;
}

interface ApiErrorShape {
  response?: {
    status?: number;
    data?: {
      message?: string;
      error?: string;
    };
  };
  code?: string;
  message?: string;
}

const asErrorShape = (error: unknown): ApiErrorShape => {
  if (typeof error === "object" && error !== null) return error as ApiErrorShape;
  return {};
};

/**
 * Parse error from API response
 */
export const parseApiError = (error: unknown): ParsedApiError => {
  const err = asErrorShape(error);

  // Network error (no response)
  if (!err.response) {
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      return { message: ErrorMessages.TIMEOUT, code: "TIMEOUT" };
    }
    return { message: ErrorMessages.NETWORK, code: "NETWORK" };
  }

  const status = err.response.status;
  const data = err.response.data;

  // Extract message from API response
  const apiMessage = data?.message || data?.error || "";

  switch (status) {
    case 400:
      return { message: apiMessage || ErrorMessages.VALIDATION, code: "BAD_REQUEST" };
    case 401:
      return { message: ErrorMessages.UNAUTHORIZED, code: "UNAUTHORIZED" };
    case 403:
      return { message: ErrorMessages.FORBIDDEN, code: "FORBIDDEN" };
    case 404:
      return { message: apiMessage || ErrorMessages.NOT_FOUND, code: "NOT_FOUND" };
    case 429:
      if (apiMessage.toLowerCase().includes("quota") || apiMessage.toLowerCase().includes("limit")) {
        return { message: ErrorMessages.AI_QUOTA, code: "QUOTA_EXCEEDED" };
      }
      return { message: apiMessage || ErrorMessages.RATE_LIMIT, code: "RATE_LIMIT" };
    case 500:
    case 502:
    case 503:
    case 504:
      if (apiMessage.toLowerCase().includes("ai") || apiMessage.toLowerCase().includes("groq")) {
        return { message: ErrorMessages.AI_BUSY, code: "AI_ERROR" };
      }
      return { message: apiMessage || ErrorMessages.SERVER_ERROR, code: "SERVER_ERROR" };
    default:
      return { message: apiMessage || ErrorMessages.UNKNOWN, code: "UNKNOWN" };
  }
};

/**
 * Handle error with toast notification
 */
export const handleError = (error: unknown, customMessage: string | null = null): ParsedApiError => {
  const { message, code } = parseApiError(error);
  const displayMessage = customMessage || message;

  toast.error(displayMessage, {
    duration: code === "QUOTA_EXCEEDED" ? 6000 : 4000,
  });

  if (process.env.NODE_ENV === "development") {
    console.error("[Error Handler]", { code, message, error });
  }

  return { message, code };
};

export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
  retryableErrors?: string[];
  onRetry?: ((attempt: number, maxRetries: number) => void) | null;
}

/**
 * Retry wrapper for async functions
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    retryableErrors = ["NETWORK", "TIMEOUT", "SERVER_ERROR"],
    onRetry = null,
  } = options;

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const { code } = parseApiError(error);

      // Don't retry if error is not retryable
      if (!retryableErrors.includes(code)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = retryDelay * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Call retry callback
      if (onRetry) {
        onRetry(attempt + 1, maxRetries);
      }
    }
  }

  throw lastError;
};

/**
 * Create an AbortController with timeout
 */
export const createAbortController = (
  timeoutMs = 30000
): { controller: AbortController; cleanup: () => void } => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId),
  };
};

interface TrackedOperation {
  controller: AbortController;
  cleanup: () => void;
}

/**
 * Async operation state manager
 */
export class AsyncState {
  private operations = new Map<string, TrackedOperation>();

  start(operationId: string): AbortSignal {
    const { controller, cleanup } = createAbortController();
    this.operations.set(operationId, { controller, cleanup });
    return controller.signal;
  }

  cancel(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.controller.abort();
      operation.cleanup();
      this.operations.delete(operationId);
    }
  }

  complete(operationId: string): void {
    const operation = this.operations.get(operationId);
    if (operation) {
      operation.cleanup();
      this.operations.delete(operationId);
    }
  }

  cancelAll(): void {
    this.operations.forEach((operation) => {
      operation.controller.abort();
      operation.cleanup();
    });
    this.operations.clear();
  }
}

export default {
  parseApiError,
  handleError,
  withRetry,
  createAbortController,
  AsyncState,
  ErrorMessages,
};
