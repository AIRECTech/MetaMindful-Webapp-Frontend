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
  if (isAxiosError(error)) {
    const payload = (error.response?.data?.error ?? error.response?.data) as {
      message?: string;
      details?: ApiErrorDetail[];
    };

    return {
      message: payload?.message ?? error.message ?? fallback,
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
