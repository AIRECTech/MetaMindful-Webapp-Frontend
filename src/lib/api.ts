import axios from "axios";
import { getAccessToken, handleUnauthorized } from "./auth";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000/api/v1";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => {
    // Backend always returns HTTP 200, but includes error code in response body
    // Check if response has error code in body
    if (response.data?.code && response.data.code !== 200) {
      const errorMessage = response.data.message || response.data.error?.message || "Request failed";
      
      // Handle 401 errors (invalid token, login again)
      // Exception: Don't logout for password change endpoint (wrong password should not logout)
      const isPasswordChangeEndpoint = response.config?.url?.includes("/users/me/password");
      if (response.data.code === 401 && !isPasswordChangeEndpoint) {
        handleUnauthorized();
      }
      
      // Create an error that will be caught by the error handler
      const error: any = new Error(errorMessage);
      error.response = {
        status: response.data.code,
        statusText: response.statusText,
        data: response.data,
        headers: response.headers,
        config: response.config,
      };
      error.isAxiosError = true;
      // Mark password change errors to skip logout
      if (isPasswordChangeEndpoint && response.data.code === 401) {
        error.skipLogout = true;
      }
      throw error;
    }
    return response;
  },
  (error) => {
    // Don't logout for password change endpoint on 401 (wrong password)
    const isPasswordChangeEndpoint = error.config?.url?.includes("/users/me/password");
    if (error.response?.status === 401 && !isPasswordChangeEndpoint) {
      handleUnauthorized();
    }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "Unexpected error";
    const err = new Error(message);
    if (isPasswordChangeEndpoint && error.response?.status === 401) {
      (err as any).skipLogout = true;
    }
    return Promise.reject(err);
  }
);
