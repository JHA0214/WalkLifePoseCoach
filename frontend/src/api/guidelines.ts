import type { Guideline, GuidelineDraft } from "../guideline/types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000";

export async function fetchGuidelines(): Promise<Guideline[]> {
  const res = await fetch(`${API_BASE}/api/guidelines`);
  if (!res.ok) throw new Error("가이드라인 목록을 불러오지 못했습니다");
  return res.json();
}

export async function createGuideline(draft: GuidelineDraft): Promise<Guideline> {
  const res = await fetch(`${API_BASE}/api/guidelines`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(draft),
  });
  if (!res.ok) throw new Error("가이드라인 저장에 실패했습니다");
  return res.json();
}

export async function deleteGuideline(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/guidelines/${id}`, { method: "DELETE" });
  if (!res.ok && res.status !== 204) throw new Error("가이드라인 삭제에 실패했습니다");
}
