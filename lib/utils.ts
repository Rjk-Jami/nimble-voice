export { cn } from "cn";

/**
 * Builds a clean URL query string from a key-value dictionary,
 * automatically removing null, undefined, and empty string properties.
 */
export function buildQueryString(params?: Record<string, any> | null): string {
  if (!params) return "";
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      query.append(key, String(value));
    }
  });
  return query.toString();
}
