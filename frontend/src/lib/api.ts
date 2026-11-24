// All browser calls go through the Next.js proxy so the API key stays server-side.
async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/proxy/${path}`, { ...init, headers: { "content-type": "application/json" } });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}
export const api = {
  list: (qs: string) => req<{ items: import("./types").Submission[]; total: number; pages: number }>(`submissions?${qs}`),
  stats: () => req<import("./types").Stats>("submissions/stats"),
  setStatus: (id: string, status: string) => req<import("./types").Submission>(`submissions/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
  retriage: (id: string) => req<import("./types").Submission>(`submissions/${id}/retriage`, { method: "POST" }),
};
