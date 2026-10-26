import type { ApiErrorBody } from "@/lib/errors";

/** Result type instead of throwing: callers must handle both cases explicitly. */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; message: string };

/** Call one of our API routes and unwrap { data } / { error }. */
export async function api<T>(url: string, init?: RequestInit): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, init);
    const json = (await res.json().catch(() => null)) as { data: T } | ApiErrorBody | null;
    if (!res.ok || !json || "error" in json) {
      return { ok: false, message: json && "error" in json ? json.error.message : "Request failed. Please try again." };
    }
    return { ok: true, data: json.data };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") return { ok: false, message: "aborted" };
    return { ok: false, message: "Network error. Check your connection and try again." };
  }
}

export const postForm = <T>(url: string, body: FormData) => api<T>(url, { method: "POST", body });

export const postJson = <T>(url: string, body: unknown) =>
  api<T>(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
