import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Star,
  Award,
  Zap,
  Heart,
  Target,
  Loader2,
  RefreshCw,
  Coins,
  HandHeart,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import api from "@/services/api";

type ApiAchievement = {
  id: number;
  achievement_type: string;
  title: string;
  description?: string | null;
  points: number;
  charity_contribution: number;
  unlocked_at: string;
};

type ProgressStats = {
  total_entries: number;
  progress_percentage: number;
  weight_change: number;
  total_points: number;
  total_charity: number;
  achievement_count: number;
};

type AchievementView = {
  key: string;
  title: string;
  description: string;
  points: number;
  unlockedAt?: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
};

const fallbackAchievements: AchievementView[] = [
  {
    key: "fallback-1",
    title: "First Milestone",
    description: "Add your first progress entry to unlock achievements.",
    points: 100,
    icon: Target,
    colorClass: "text-emerald-600",
    bgClass: "bg-emerald-500/10",
  },
  {
    key: "fallback-2",
    title: "Consistency Streak",
    description: "Log progress consistently to earn more points.",
    points: 250,
    icon: Zap,
    colorClass: "text-amber-500",
    bgClass: "bg-amber-500/10",
  },
  {
    key: "fallback-3",
    title: "Health Hero",
    description: "Every achievement contributes to your wellness journey.",
    points: 500,
    icon: Heart,
    colorClass: "text-rose-500",
    bgClass: "bg-rose-500/10",
  },
];

function getAchievementVisual(type: string, title: string): Pick<AchievementView, "icon" | "colorClass" | "bgClass"> {
  const key = `${type} ${title}`.toLowerCase();

  if (key.includes("5kg") || key.includes("hero")) {
    return { icon: Award, colorClass: "text-purple-500", bgClass: "bg-purple-500/10" };
  }
  if (key.includes("1kg") || key.includes("first")) {
    return { icon: Target, colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" };
  }
  if (key.includes("streak") || key.includes("consist")) {
    return { icon: Zap, colorClass: "text-amber-500", bgClass: "bg-amber-500/10" };
  }
  if (key.includes("heart") || key.includes("hydration")) {
    return { icon: Heart, colorClass: "text-blue-500", bgClass: "bg-blue-500/10" };
  }

  return { icon: Trophy, colorClass: "text-primary", bgClass: "bg-primary/10" };
}

export default function Achievements() {
  const [achievements, setAchievements] = useState<ApiAchievement[]>([]);
  const [stats, setStats] = useState<ProgressStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAchievements = async () => {
    setLoading(true);
    setError(null);

    try {
      const [achievementRes, statsRes] = await Promise.all([
        api.get<ApiAchievement[]>("/progress/achievements"),
        api.get<ProgressStats>("/progress/stats"),
      ]);

      setAchievements(Array.isArray(achievementRes.data) ? achievementRes.data : []);
      setStats(statsRes.data ?? null);
    } catch (err: any) {
      const apiError = err?.response?.data?.detail;
      setError(typeof apiError === "string" ? apiError : "Unable to load achievements right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAchievements();
  }, []);

  const achievementCards = useMemo<AchievementView[]>(() => {
    if (achievements.length === 0) {
      return fallbackAchievements;
    }

    return achievements.map((item) => {
      const visual = getAchievementVisual(item.achievement_type, item.title);
      return {
        key: String(item.id),
        title: item.title,
        description: item.description || "Great progress. Keep going.",
        points: item.points,
        unlockedAt: item.unlocked_at,
        ...visual,
      };
    });
  }, [achievements]);

  const totalPoints = stats?.total_points ?? achievements.reduce((sum, item) => sum + item.points, 0);
  const achievementCount = stats?.achievement_count ?? achievements.length;
  const totalCharity = stats?.total_charity ?? achievements.reduce((sum, item) => sum + item.charity_contribution, 0);
  const totalEntries = stats?.total_entries ?? 0;
  const progressPercentage = stats?.progress_percentage ?? 0;
  const weightChange = stats?.weight_change ?? 0;

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Achievements</h1>
          <p className="text-sm text-muted-foreground">Track your points, unlocked milestones, and progress impact.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void loadAchievements()} className="rounded-xl">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadAchievements()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Coins className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Total Points</p>
              <p className="text-xl font-bold">{totalPoints}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Star className="w-5 h-5 text-amber-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Unlocked</p>
              <p className="text-xl font-bold">{achievementCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <HandHeart className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Charity Impact</p>
              <p className="text-xl font-bold">Rs. {Number(totalCharity || 0).toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {loading ? (
        <Card className="border-border/40 shadow-sm">
          <CardContent className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading achievements...
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {achievementCards.map((item) => (
            <Card key={item.key} className="border-border/40 shadow-sm hover:shadow-md transition-all group">
              <CardHeader className="pb-2">
                <div className={`w-12 h-12 rounded-xl ${item.bgClass} flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                  <item.icon className={item.colorClass} size={24} />
                </div>
                <CardTitle className="text-lg leading-tight">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-primary">+{item.points} pts</span>
                  {item.unlockedAt ? (
                    <span className="text-muted-foreground">{new Date(item.unlockedAt).toLocaleDateString()}</span>
                  ) : (
                    <span className="text-muted-foreground">Locked</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/40">
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="text-primary" size={20} />
            Progress Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Entries Logged</p>
            <p className="text-lg font-bold">{totalEntries}</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Weight Change</p>
            <p className="text-lg font-bold">{Number(weightChange).toFixed(1)} kg</p>
          </div>
          <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Goal Progress</p>
            <p className="text-lg font-bold">{Number(progressPercentage).toFixed(1)}%</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
