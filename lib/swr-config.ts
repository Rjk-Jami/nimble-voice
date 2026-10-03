import { SWRConfiguration } from "swr";
import { apiClient } from "./axios";

export const defaultFetcher = async (url: string) => {
  return await apiClient.get(url);
};

export const swrGlobalConfig: SWRConfiguration = {
  fetcher: defaultFetcher,
  revalidateOnFocus: false,
  revalidateIfStale: true,
  revalidateOnReconnect: true,
  dedupingInterval: 5000,
  shouldRetryOnError: false,
};
