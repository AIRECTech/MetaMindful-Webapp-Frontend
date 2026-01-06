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
      if (response.data.code === 401) {
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
      throw error;
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized();
    }
    const message =
      error.response?.data?.error?.message ||
      error.response?.data?.message ||
      error.message ||
      "Unexpected error";
    return Promise.reject(new Error(message));
  }
);
