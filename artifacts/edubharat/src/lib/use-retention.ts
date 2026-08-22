import { useCallback, useEffect, useState } from "react";
import { useAuth } from "./use-auth";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";
export type RetentionData = {
  challenge: { id: number; title: string; missionType: string; focusSkill: string; prompt: string; retest: number; status: string };
  streak: number; recoveryUsed: boolean; recoveryAvailable: boolean;
  level: string; demonstratedScore: number; assessmentCount: number;
  strongestSkill: string | null; weakestSkill: string | null;
  skillAverages: Record<string, number>; weeklyAverage: number; weeklyImprovement: number;
  retestPriority: Array<{ skill: string; latestScore: number; nextRetestAt: string }>;
};

export function useRetention() {
  const { user } = useAuth();
  const [data, setData] = useState<RetentionData | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const refresh = useCallback(() => {
    if (!user) { setData(null); setLoading(false); return; }
    setLoading(true);
    fetch(`${BASE}/api/retention/dashboard`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject(new Error("retention unavailable")))
      .then(setData).catch(() => setData(null)).finally(() => setLoading(false));
  }, [user]);
  useEffect(() => { refresh(); }, [refresh]);

  const startChallenge = useCallback(async () => {
    if (!data?.challenge) return;
    await fetch(`${BASE}/api/retention/challenges/${data.challenge.id}/start`, {
      method: "POST", credentials: "include",
    });
    setData(current => current ? { ...current, challenge: { ...current.challenge, status: "started" } } : current);
  }, [data?.challenge]);

  return { data, loading, refresh, startChallenge };
}