import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useRetention } from "@/lib/use-retention";
import { useAuth } from "@/lib/use-auth";
import { useLocation } from "wouter";
import { Flame, Target, TrendingUp, RotateCcw, ArrowRight, Clock } from "lucide-react";

const labels: Record<string, string> = {
  pronunciation: "Pronunciation", grammar: "Grammar", vocabulary: "Vocabulary",
  fluency: "Fluency", sentenceFormation: "Sentence formation",
};

export function RetentionCard() {
  const { user } = useAuth();
  const { data, loading, startChallenge } = useRetention();
  const [, navigate] = useLocation();
  if (!user || loading || !data) return null;
  const improvement = data.weeklyImprovement;
  return (
    <Card className="border-2 border-primary/15 bg-gradient-to-br from-orange-50/80 via-white to-amber-50/40 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Target className="w-4 h-4 text-primary" /> Speaking improvement
          <Badge variant="secondary" className="ml-auto">{data.level}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded-xl bg-white/80 border p-3"><Flame className="w-4 h-4 text-orange-500 mb-1" /><b className="text-xl">{data.streak}</b><p className="text-[11px] text-muted-foreground">day streak</p></div>
          <div className="rounded-xl bg-white/80 border p-3"><TrendingUp className="w-4 h-4 text-green-600 mb-1" /><b className="text-xl">{data.weeklyAverage || "—"}%</b><p className="text-[11px] text-muted-foreground">this week</p></div>
          <div className="rounded-xl bg-white/80 border p-3"><Target className="w-4 h-4 text-blue-600 mb-1" /><b className="text-xl">{data.demonstratedScore || "—"}%</b><p className="text-[11px] text-muted-foreground">ability score</p></div>
          <div className="rounded-xl bg-white/80 border p-3"><RotateCcw className="w-4 h-4 text-purple-600 mb-1" /><b className="text-xl">{data.recoveryAvailable ? "Ready" : "Used"}</b><p className="text-[11px] text-muted-foreground">recovery day</p></div>
        </div>
        <div className="flex items-start justify-between gap-4 rounded-xl border bg-white/70 p-4">
          <div className="min-w-0">
            <div className="flex gap-2 flex-wrap items-center mb-1">
              <Badge variant="outline" className="text-[10px]">{data.challenge.missionType}</Badge>
              {data.challenge.retest === 1 && <Badge className="text-[10px] bg-purple-100 text-purple-700 hover:bg-purple-100">Retest</Badge>}
            </div>
            <h3 className="font-bold text-sm text-secondary">{data.challenge.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{data.challenge.prompt}</p>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Clock className="w-3 h-3" /> 5 minutes · Focus: {labels[data.challenge.focusSkill] ?? data.challenge.focusSkill}</p>
          </div>
          <Button size="sm" className="shrink-0" onClick={() => { void startChallenge(); navigate("/english-guru"); }}>
            Practice <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {data.weakestSkill && <span>Focus next: <b className="text-secondary">{labels[data.weakestSkill] ?? data.weakestSkill}</b></span>}
          {data.strongestSkill && <span>Strongest: <b className="text-secondary">{labels[data.strongestSkill] ?? data.strongestSkill}</b></span>}
          {data.assessmentCount > 0 && <span className={improvement > 0 ? "text-green-700 font-semibold" : ""}>{improvement > 0 ? `Up ${improvement}% vs last week` : "Keep practising to unlock your trend"}</span>}
        </div>
        {data.weakestSkill && <Progress value={data.skillAverages[data.weakestSkill] ?? 0} className="h-1.5" />}
      </CardContent>
    </Card>
  );
}