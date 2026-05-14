import { motion } from "framer-motion";
import { Trophy, Flame, Star, Zap, Target, Award } from "lucide-react";

const badges = [
  { icon: Flame, label: "7-Day Streak", earned: true, color: "text-coral" },
  { icon: Star, label: "First Scan", earned: true, color: "text-warning" },
  { icon: Zap, label: "Speed Logger", earned: true, color: "text-info" },
  { icon: Target, label: "Goal Crusher", earned: false, color: "text-primary" },
  { icon: Award, label: "Health Hero", earned: false, color: "text-success" },
];

export function AchievementPanel() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading font-semibold text-foreground">Achievements</h3>
        <div className="flex items-center gap-1.5 bg-gradient-to-r from-warning/15 to-warning/5 text-warning px-3 py-1.5 rounded-full border border-warning/20">
          <Trophy className="h-3.5 w-3.5" />
          <span className="text-sm font-bold">1,250</span>
          <span className="text-xs opacity-70">pts</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5 p-3 rounded-xl bg-gradient-to-r from-coral/8 to-transparent border border-coral/10">
        <div className="w-10 h-10 rounded-xl bg-coral/15 flex items-center justify-center">
          <Flame className="h-5 w-5 text-coral" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">12 Day Streak 🔥</p>
          <p className="text-xs text-muted-foreground">Your longest streak yet!</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-heading font-bold text-coral">12</p>
          <p className="text-[10px] text-muted-foreground">days</p>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.label}
            className={`flex flex-col items-center gap-1.5 p-2.5 rounded-xl transition-all cursor-default ${
              badge.earned
                ? "bg-secondary border border-border hover:scale-105"
                : "bg-muted/30 opacity-35 grayscale"
            }`}
          >
            <badge.icon className={`h-5 w-5 ${badge.earned ? badge.color : "text-muted-foreground"}`} />
            <span className="text-[10px] text-center text-muted-foreground leading-tight font-medium">{badge.label}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
