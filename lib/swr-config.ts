import { SWRConfiguration } from "swr";
import { apiClient } from "./axios";

/**
 * Universal SWR fetcher backed by the centralized Axios apiClient.
 * Automatically handles auth token headers and standard response formatting.
 */
export const defaultFetcher = async <T = any>(url: string): Promise<T> => {
  const res = await apiClient.get<T>(url);
  // apiClient interceptor already unwraps response.data, or returns direct payload
  return res as unknown as T;
};

/**
 * Platform-wide standard SWR configuration for real-time voice & room discovery.
 */
export const swrGlobalConfig: SWRConfiguration = {
  fetcher: defaultFetcher,
  revalidateOnFocus: false,        // Avoid unwanted refetches during active voice conversations
  revalidateIfStale: true,         // Serve cached data immediately, update in background
  revalidateOnReconnect: true,     // Auto-sync rooms catalog after network drop
  dedupingInterval: 4000,          // Deduplicate parallel component requests within 4 seconds
  focusThrottleInterval: 10000,
  errorRetryCount: 3,
  shouldRetryOnError: (error) => {
    // Never retry on 401 Unauthorized, 403 Forbidden, or 404 Not Found
    const status = error?.response?.status;
    if (status === 401 || status === 403 || status === 404) return false;
    return true;
  },
};
