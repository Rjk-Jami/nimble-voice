"use client";

import { apiClient } from "@/lib/axios";
import { buildQueryString } from "@/lib/utils";
import { toast } from "sonner";
import useSWR, { SWRConfiguration } from "swr";

export interface FetchConfig<T = any> {
  listUrl?: string;
  detailUrl?: string;
  createUrl?: string;
  updateUrlBase?: string;
  deleteUrlBase?: string;
  entityName?: string;
  options?: SWRConfiguration;
  externalMutate?: () => void;
  /** Optional custom data unwrapper if API structure deviates from standard */
  dataExtractor?: (raw: any) => T[];
}

const EMPTY_DATA: any[] = [];

/**
 * Universal, robust CRUD and data-fetching hook built on top of SWR and Axios.
 * Completely decouples frontend presentation components from network/API logic.
 */
export function useFetch<T = any>(
  config: FetchConfig<T>,
  params: Record<string, any> | null = {},
  options?: SWRConfiguration
) {
  const {
    listUrl,
    detailUrl,
    createUrl,
    updateUrlBase,
    deleteUrlBase,
    entityName = "Item",
    options: configOptions,
    externalMutate,
    dataExtractor,
  } = config;

  const swrOptions = options || configOptions;

  // Build query string cleanly, omitting undefined/null/empty strings
  const { page, limit, ...rest } = params || {};
  const queryParams = {
    ...(page !== undefined && { page }),
    ...(limit !== undefined && { limit }),
    ...rest,
  };

  const queryString = buildQueryString(queryParams);

  // Key resolves to detailUrl if provided without listUrl, or listUrl with query string
  const activeUrl = listUrl || detailUrl;
  const key =
    activeUrl && params !== null
      ? `${activeUrl}${queryString ? `?${queryString}` : ""}`
      : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    async (url: string) => {
      const res = await apiClient.get(url);
      return res;
    },
    swrOptions
  );

  const handleExternalMutate = () => {
    if (typeof externalMutate === "function") {
      externalMutate();
    }
  };

  // POST: Create entity
  const create = async (payload: any, isMultiPart = false, showToast = true) => {
    const targetUrl = createUrl || listUrl;
    if (!targetUrl) throw new Error("createUrl / listUrl is not configured");

    try {
      const useMultipart = isMultiPart || payload instanceof FormData;
      const res: any = useMultipart
        ? await apiClient.post(targetUrl, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await apiClient.post(targetUrl, payload);

      await mutate();
      handleExternalMutate();

      if (showToast) {
        if (res?.message) {
          toast.success(res.message);
        } else {
          toast.success(`${entityName} created successfully`);
        }
      }
      return res;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        `Failed to create ${entityName.toLowerCase()}`;
      toast.error(errorMsg);
      return null;
    }
  };

  // PUT / PATCH: Update entity
  const update = async (
    id: string,
    payload: any,
    isMultiPart = false,
    showToast = true,
    method: "put" | "patch" = "patch"
  ) => {
    const baseUrl = updateUrlBase || listUrl;
    if (!baseUrl) throw new Error("updateUrlBase is not configured");

    try {
      const useMultipart = isMultiPart || payload instanceof FormData;
      const targetUrl = `${baseUrl}/${id}`;
      const res: any = useMultipart
        ? await apiClient[method](targetUrl, payload, {
            headers: { "Content-Type": "multipart/form-data" },
          })
        : await apiClient[method](targetUrl, payload);

      await mutate();
      handleExternalMutate();

      if (showToast) {
        if (res?.message) {
          toast.success(res.message);
        } else {
          toast.success(`${entityName} updated successfully`);
        }
      }
      return res;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        `Failed to update ${entityName.toLowerCase()}`;
      toast.error(errorMsg);
      return null;
    }
  };

  // DELETE: Remove entity
  const remove = async (id: string, showToast = true) => {
    const baseUrl = deleteUrlBase || listUrl;
    if (!baseUrl) throw new Error("deleteUrlBase is not configured");

    try {
      const targetUrl = `${baseUrl}/${id}`;
      const res: any = await apiClient.delete(targetUrl);

      await mutate();
      handleExternalMutate();

      if (showToast) {
        if (res?.message) {
          toast.success(res.message);
        } else {
          toast.success(`${entityName} deleted successfully`);
        }
      }
      return res;
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        `Failed to delete ${entityName.toLowerCase()}`;
      toast.error(errorMsg);
      return null;
    }
  };

  // Dynamic extraction of collection or single record
  const rawDataAny = data as any;
  const resolvedList: T[] = dataExtractor
    ? dataExtractor(rawDataAny)
    : (rawDataAny?.rooms ||
       rawDataAny?.data?.list ||
       rawDataAny?.data ||
       (Array.isArray(rawDataAny) ? rawDataAny : EMPTY_DATA)) as T[];

  const resolvedTotal =
    rawDataAny?.pagination?.total ||
    rawDataAny?.totalCount ||
    rawDataAny?.total ||
    rawDataAny?.data?.total_count ||
    resolvedList.length;

  return {
    data: resolvedList,
    singleData: (rawDataAny?.room || rawDataAny?.user || rawDataAny?.data || rawDataAny) as T,
    totalCount: resolvedTotal,
    pagination: rawDataAny?.pagination,
    error,

    isLoading,
    isValidating,
    mutate,
    create,
    update,
    remove,
    rawData: data,
  };
}
