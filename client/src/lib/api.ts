import type {
  UserConfig,
  BriefingResponse,
  GenerateBriefingRequest,
  InkboxStatus,
} from "@shared/types";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const api = {
  getSettings: () => fetchJson<UserConfig>("/api/settings"),

  updateSettings: (settings: Partial<UserConfig>) =>
    fetchJson<UserConfig>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),

  generateBriefing: (req?: GenerateBriefingRequest) =>
    fetchJson<BriefingResponse>("/api/brief/generate", {
      method: "POST",
      body: JSON.stringify(req || {}),
    }),

  getLatestBriefing: () =>
    fetchJson<BriefingResponse | null>("/api/brief/latest"),

  setupInkbox: () =>
    fetchJson<InkboxStatus>("/api/inkbox/setup", { method: "POST" }),

  getInkboxStatus: () =>
    fetchJson<InkboxStatus>("/api/inkbox/status"),
};
