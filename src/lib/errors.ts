import { isAxiosError } from "axios";

export type ApiErrorDetail = {
  path?: string;
  code?: string;
  message: string;
};

export type ParsedApiError = {
  message: string;
  details?: ApiErrorDetail[];
};

export function parseApiError(error: unknown, fallback = "Something went wrong"): ParsedApiError {
  // Check if it's an axios error or a custom error with response structure
  if (isAxiosError(error) || (error && typeof error === "object" && "response" in error)) {
    const err = error as any;
    const payload = (err.response?.data?.error ?? err.response?.data) as {
      message?: string;
      details?: ApiErrorDetail[];
    };

    return {
      message: payload?.message ?? err.message ?? fallback,
      details: Array.isArray(payload?.details) ? payload?.details : undefined,
    };
  }

  if (error instanceof Error) {
    return { message: error.message || fallback };
  }

  return { message: fallback };
}

export function extractErrorMessage(error: unknown, fallback = "Something went wrong") {
  return parseApiError(error, fallback).message;
}
