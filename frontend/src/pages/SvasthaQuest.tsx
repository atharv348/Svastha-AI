import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Trophy,
  Flame,
  Brain,
  Crown,
  CheckCircle2,
  Lock,
  Medal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Swords,
} from "lucide-react";
import api from "@/services/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type QuestItem = {
  code: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  unit: string;
  completed: boolean;
  xp_reward: number;
  action: string;
};

type TriviaQuestion = {
  id: string;
  question: string;
  options: string[];
};

type AchievementItem = {
  code: string;
  title: string;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  description: string;
  xp_bonus: number;
  unlocked: boolean;
  unlocked_at?: string | null;
};

type LeaderboardRow = {
  rank: number;
  username: string;
  full_name?: string | null;
  total_xp: number;
  level: number;
  player_class: string;
  streak_days: number;
};

type StreakTile = {
  date: string;
  label: string;
  completed: boolean;
};

type GameState = {
  profile: {
    total_xp: number;
    level: number;
    player_class: string;
    streak_days: number;
    longest_streak: number;
    xp_in_level: number;
    xp_for_level: number;
    xp_to_next_level: number;
    level_progress_pct: number;
  };
  daily_quests: QuestItem[];
  trivia: {
    total_questions: number;
    questions: TriviaQuestion[];
    answered_today: string[];
  };
  achievements: {
    total: number;
    unlocked: number;
    items: AchievementItem[];
  };
  leaderboard: LeaderboardRow[];
  streak_calendar: StreakTile[];
  meta: {
    resets_at: string;
    today: string;
  };
};

const rarityStyles: Record<string, string> = {
  Common: "bg-slate-500/15 text-slate-700 border-slate-500/30",
  Uncommon: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30",
  Rare: "bg-sky-500/15 text-sky-700 border-sky-500/30",
  Epic: "bg-fuchsia-500/15 text-fuchsia-700 border-fuchsia-500/30",
  Legendary: "bg-amber-500/15 text-amber-700 border-amber-500/30",
};

function formatQuestProgress(quest: QuestItem): string {
  if (quest.unit === "steps") {
    return `${Math.floor(quest.progress)} / ${Math.floor(quest.target)} steps`;
  }
  if (quest.unit === "hours") {
    return `${quest.progress.toFixed(1)} / ${quest.target.toFixed(1)} hours`;
  }
  if (quest.unit === "glasses") {
    return `${Math.floor(quest.progress)} / ${Math.floor(quest.target)} glasses`;
  }
  return `${Math.floor(quest.progress)} / ${Math.floor(quest.target)}`;
}

export default function SvasthaQuest() {
  const [state, setState] = useState<GameState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [questBusyCode, setQuestBusyCode] = useState<string | null>(null);
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [triviaBusy, setTriviaBusy] = useState(false);
  const [triviaFeedback, setTriviaFeedback] = useState<string>("");

  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [levelUpText, setLevelUpText] = useState("");

  const loadState = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get<GameState>("/svasthaquest/state");
      setState(response.data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Unable to load SvasthaQuest right now.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadState();
  }, []);

  const answeredTodaySet = useMemo(() => {
    return new Set(state?.trivia?.answered_today ?? []);
  }, [state]);

  const activeTriviaQuestion = useMemo(() => {
    if (!state?.trivia?.questions?.length) {
      return null;
    }
    const boundedIndex = Math.min(Math.max(triviaIndex, 0), state.trivia.questions.length - 1);
    return state.trivia.questions[boundedIndex];
  }, [state, triviaIndex]);

  const completedQuestCount = useMemo(() => {
    return state?.daily_quests?.filter((quest) => quest.completed).length ?? 0;
  }, [state]);

  const handleQuestClick = async (quest: QuestItem) => {
    if (!state || quest.completed || questBusyCode) {
      return;
    }

    const amountNeeded = Math.max(0, quest.target - quest.progress);
    if (amountNeeded <= 0 && quest.action !== "custom") {
      return;
    }

    setQuestBusyCode(quest.code);
    setError(null);
    try {
      if (quest.action === "custom") {
        // Handle custom quest locally
        setState((prev) => {
          if (!prev) return prev;
          const updatedQuests = prev.daily_quests.map((q) =>
            q.code === quest.code ? { ...q, completed: true, progress: q.target } : q
          );
          const newXp = prev.profile.total_xp + quest.xp_reward;
          const xpInLevel = prev.profile.xp_in_level + quest.xp_reward;
          
          let level = prev.profile.level;
          let xpForLevel = prev.profile.xp_for_level;
          let xpRemaining = xpInLevel;
          let leveledUp = false;

          if (xpRemaining >= xpForLevel) {
            level++;
            xpRemaining -= xpForLevel;
            xpForLevel = Math.floor(xpForLevel * 1.2);
            leveledUp = true;
          }

          if (leveledUp) {
            setLevelUpText(`Level Up! You are now Level ${level}. Keep up the incredible momentum!`);
            setShowLevelUpModal(true);
          }

          return {
            ...prev,
            profile: {
              ...prev.profile,
              total_xp: newXp,
              level: level,
              xp_in_level: xpRemaining,
              xp_for_level: xpForLevel,
              xp_to_next_level: xpForLevel - xpRemaining,
              level_progress_pct: (xpRemaining / xpForLevel) * 100,
            },
            daily_quests: updatedQuests,
          };
        });
      } else {
        const response = await api.post("/svasthaquest/trigger", {
          action: quest.action,
          amount: amountNeeded,
        });
        if (response.data?.state) {
          const oldLevel = state.profile.level;
          const newState = response.data.state as GameState;
          setState(newState);
          
          if (newState.profile.level > oldLevel) {
            setLevelUpText(`Level Up! You are now Level ${newState.profile.level}. Keep up the incredible momentum!`);
            setShowLevelUpModal(true);
          }
        }
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Quest action failed.");
    } finally {
      setQuestBusyCode(null);
    }
  };

  const handleTriviaAnswer = async (optionIndex: number) => {
    if (!state || !activeTriviaQuestion || triviaBusy) {
      return;
    }

    setTriviaBusy(true);
    setTriviaFeedback("");
    setError(null);

    try {
      const response = await api.post("/svasthaquest/trivia/answer", {
        question_id: activeTriviaQuestion.id,
        selected_option: optionIndex,
      });

      const answer = response.data?.answer;
      const nextState = response.data?.state as GameState | undefined;
      if (nextState) {
        const oldLevel = state.profile.level;
        setState(nextState);
        
        if (nextState.profile.level > oldLevel) {
          setLevelUpText(`Level Up! You are now Level ${nextState.profile.level}. Keep up the incredible momentum!`);
          setShowLevelUpModal(true);
        }
      }

      if (answer?.already_answered) {
        setTriviaFeedback("Already answered today. Try the next question.");
      } else if (answer?.correct) {
        const xpEarned = answer?.trigger_result?.xp_earned ?? 10;
        setTriviaFeedback(`Correct! +${xpEarned} XP`);
      } else {
        setTriviaFeedback(`Not this time. Correct: ${answer?.correct_answer}`);
      }

      if (nextState?.trivia?.questions?.length) {
        const unansweredIndex = nextState.trivia.questions.findIndex(
          (question) => !(nextState.trivia.answered_today || []).includes(question.id)
        );
        if (unansweredIndex >= 0) {
          setTriviaIndex(unansweredIndex);
        }
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Trivia answer failed.");
    } finally {
      setTriviaBusy(false);
    }
  };

  const goToPrevTrivia = () => {
    if (!state?.trivia?.questions?.length) {
      return;
    }
    setTriviaIndex((index) => Math.max(0, index - 1));
    setTriviaFeedback("");
  };

  const goToNextTrivia = () => {
    if (!state?.trivia?.questions?.length) {
      return;
    }
    setTriviaIndex((index) => Math.min(state.trivia.questions.length - 1, index + 1));
    setTriviaFeedback("");
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <Card className="border-border/40 shadow-md overflow-hidden">
        <CardHeader className="bg-muted/25 border-b border-border/40">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Swords className="text-primary" size={24} />
            SvasthaQuest Health RPG
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Every healthy action gives XP. Level up your class while improving real health.
          </p>
        </CardHeader>
        <CardContent className="p-4 md:p-5 space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading your quest state...</p>
          ) : state ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Total XP</p>
                  <p className="text-2xl font-bold">{state.profile.total_xp}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Level & Class</p>
                  <p className="text-2xl font-bold">Lv {state.profile.level}</p>
                  <p className="text-sm text-muted-foreground">{state.profile.player_class}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-muted/20 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Streak</p>
                  <p className="text-2xl font-bold flex items-center gap-1">
                    <Flame className="text-rose-500 streak-fire" size={20} />
                    {state.profile.streak_days} days
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level Progress</span>
                  <span className="font-medium">
                    {state.profile.xp_in_level}/{state.profile.xp_for_level} XP
                  </span>
                </div>
                <Progress value={state.profile.level_progress_pct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {state.profile.xp_to_next_level > 0
                    ? `${state.profile.xp_to_next_level} XP to next level`
                    : "Max tier reached"}
                </p>
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void loadState()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {state ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle2 className="text-emerald-600" size={18} />
                Daily Quests
                <Badge variant="outline" className="ml-auto">
                  {completedQuestCount}/{state.daily_quests.length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {state.daily_quests.map((quest) => {
                const questPct = quest.target > 0 ? Math.min(100, (quest.progress / quest.target) * 100) : 0;
                return (
                  <div key={quest.code} className="rounded-xl border border-border/40 p-3 bg-background/70">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm">{quest.title}</p>
                        <p className="text-xs text-muted-foreground">{quest.description}</p>
                      </div>
                      {quest.completed ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">Completed</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs"
                          disabled={questBusyCode === quest.code}
                          onClick={() => void handleQuestClick(quest)}
                        >
                          {questBusyCode === quest.code ? "Applying..." : "Complete"}
                        </Button>
                      )}
                    </div>
                    <div className="mt-2 space-y-1">
                      <Progress value={questPct} className="h-2" />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{formatQuestProgress(quest)}</span>
                        <span>+{quest.xp_reward} XP</span>
                      </div>
                    </div>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground">Resets daily at {state.meta.resets_at}.</p>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Brain className="text-primary" size={18} />
                Health Trivia
                <Badge variant="outline" className="ml-auto">
                  {state.trivia.answered_today.length}/{state.trivia.total_questions}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeTriviaQuestion ? (
                <>
                  <div className="rounded-xl border border-border/40 p-3 bg-background/70">
                    <p className="text-sm font-medium">{activeTriviaQuestion.question}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {activeTriviaQuestion.options.map((option, optionIndex) => {
                      const answered = answeredTodaySet.has(activeTriviaQuestion.id);
                      return (
                        <Button
                          key={`${activeTriviaQuestion.id}-${optionIndex}`}
                          variant="outline"
                          className="justify-start h-auto py-2"
                          disabled={answered || triviaBusy}
                          onClick={() => void handleTriviaAnswer(optionIndex)}
                        >
                          {option}
                        </Button>
                      );
                    })}
                  </div>

                  {triviaFeedback ? (
                    <p className="text-sm font-medium text-primary">{triviaFeedback}</p>
                  ) : null}

                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={goToPrevTrivia} disabled={triviaIndex <= 0}>
                      <ChevronLeft size={16} className="mr-1" />
                      Previous
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Question {Math.min(triviaIndex + 1, state.trivia.questions.length)} / {state.trivia.questions.length}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={goToNextTrivia}
                      disabled={triviaIndex >= state.trivia.questions.length - 1}
                    >
                      Next
                      <ChevronRight size={16} className="ml-1" />
                    </Button>
                  </div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No trivia questions available.</p>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Sparkles className="text-amber-500" size={18} />
                Achievements
                <Badge variant="outline" className="ml-auto">
                  {state.achievements.unlocked}/{state.achievements.total}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {state.achievements.items.map((badge) => (
                  <div
                    key={badge.code}
                    className={`rounded-xl border p-3 ${badge.unlocked ? "bg-background/70" : "bg-muted/20 opacity-80"}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-sm leading-tight">{badge.title}</p>
                      {badge.unlocked ? (
                        <Trophy className="text-amber-500" size={16} />
                      ) : (
                        <Lock className="text-muted-foreground" size={16} />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{badge.description}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <Badge variant="outline" className={rarityStyles[badge.rarity] || rarityStyles.Common}>
                        {badge.rarity}
                      </Badge>
                      <span className="text-xs font-semibold text-primary">+{badge.xp_bonus} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="text-amber-500" size={18} />
                Leaderboard (Top 10)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {state.leaderboard.map((entry) => (
                <div key={`${entry.rank}-${entry.username}`} className="rounded-xl border border-border/40 p-2 bg-background/70">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-muted-foreground w-6">#{entry.rank}</span>
                      <Medal size={14} className={entry.rank <= 3 ? "text-amber-500" : "text-muted-foreground"} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{entry.full_name || entry.username}</p>
                        <p className="text-xs text-muted-foreground truncate">{entry.player_class}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{entry.total_xp} XP</p>
                      <p className="text-xs text-muted-foreground">Lv {entry.level} • {entry.streak_days}d streak</p>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/40 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="text-rose-500" size={18} />
                Streak Calendar (7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-2">
                {state.streak_calendar.map((tile) => (
                  <div
                    key={tile.date}
                    className={`rounded-lg border p-2 text-center ${
                      tile.completed
                        ? "bg-emerald-500/20 border-emerald-500/40"
                        : "bg-muted/20 border-border/40"
                    }`}
                  >
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{tile.label}</p>
                    <p className="text-xs font-semibold mt-1">{tile.completed ? "Done" : "Miss"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Level Up Modal */}
      <Dialog open={showLevelUpModal} onOpenChange={setShowLevelUpModal}>
        <DialogContent className="sm:max-w-md text-center p-8 rounded-3xl">
          <DialogHeader>
            <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
              <Trophy size={40} />
            </div>
            <DialogTitle className="text-2xl font-bold text-center">Level Up!</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground">{levelUpText}</p>
          </div>
          <Button
            onClick={() => setShowLevelUpModal(false)}
            className="w-full py-6 text-lg font-bold rounded-2xl"
          >
            Continue Quest
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
