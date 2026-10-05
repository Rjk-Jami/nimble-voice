import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ENV } from "@/constants";

export const apiClient = axios.create({
  baseURL: ENV.API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});


// Request interceptor: attach token (checking both 'token' and 'nimble_auth_token')
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("token") ||
        localStorage.getItem("nimble_auth_token");
      if (token && config.headers) {
        config.headers.Authorization = token.startsWith("Bearer ")
          ? token
          : `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor: automatically unwrap Go backend standard `{ status, message, data }`
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    if (response.data && response.data.data !== undefined) {
      return response.data.data;
    }
    return response.data;
  },
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("nimble_auth_token");
      }
    }
    return Promise.reject(error);
  }
);
