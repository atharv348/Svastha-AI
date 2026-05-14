// ── HomeScreen — Main game menu ──────────────────────────────────
import { motion } from "framer-motion";
import { Play, ArrowUpCircle, AlertTriangle, Gift, RotateCcw, TrendingUp } from "lucide-react";
import type { GameSave, GameScreen } from "./useGameState";

interface Props {
  save: GameSave;
  onPlay: () => void;
  onNavigate: (screen: GameScreen) => void;
  onDailyReward: () => void;
  onReset: () => void;
}

const menuItems = [
  { key: "hospital" as GameScreen, label: "Play Hospital Rush", icon: Play, color: "from-teal-500 to-emerald-600", emoji: "🏥" },
  { key: "upgrades" as GameScreen, label: "Upgrade Hospital", icon: ArrowUpCircle, color: "from-indigo-500 to-purple-600", emoji: "⬆️" },
  { key: "outbreak" as GameScreen, label: "Outbreak Training", icon: AlertTriangle, color: "from-rose-500 to-red-600", emoji: "🦠" },
];

export default function HomeScreen({ save, onPlay, onNavigate, onDailyReward, onReset }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const canClaimDaily = save.lastDailyReward !== today;

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-4 sm:p-6">
      {/* Hero */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 20 }}
        className="text-center mb-8"
      >
        <motion.div
          className="text-7xl sm:text-8xl mb-4"
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          🏥
        </motion.div>
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-teal-600 via-emerald-500 to-cyan-500 bg-clip-text text-transparent">
          MediRush
        </h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Hospital Idle & Triage Game
        </p>
      </motion.div>

      {/* Stats summary */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3 w-full max-w-md mb-8"
      >
        <div className="medirush-stat-pill">
          <TrendingUp className="w-4 h-4 text-emerald-500" />
          <div>
            <p className="text-[10px] text-muted-foreground">Treated</p>
            <p className="text-lg font-bold">{save.totalPatientsTreated}</p>
          </div>
        </div>
        <div className="medirush-stat-pill">
          <span className="text-lg">🏆</span>
          <div>
            <p className="text-[10px] text-muted-foreground">Best Combo</p>
            <p className="text-lg font-bold">x{save.bestCombo}</p>
          </div>
        </div>
        <div className="medirush-stat-pill">
          <span className="text-lg">⭐</span>
          <div>
            <p className="text-[10px] text-muted-foreground">Level</p>
            <p className="text-lg font-bold">{save.level}</p>
          </div>
        </div>
      </motion.div>

      {/* Menu buttons */}
      <div className="w-full max-w-md space-y-3">
        {menuItems.map((item, i) => (
          <motion.button
            key={item.key}
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => (item.key === "hospital" ? onPlay() : onNavigate(item.key))}
            className={`w-full flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r ${item.color} text-white shadow-lg hover:shadow-xl transition-shadow`}
          >
            <span className="text-3xl">{item.emoji}</span>
            <div className="flex-1 text-left">
              <p className="font-bold text-base">{item.label}</p>
            </div>
            <item.icon className="w-6 h-6 opacity-70" />
          </motion.button>
        ))}

        {/* Daily Reward */}
        <motion.button
          initial={{ x: -40, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onDailyReward}
          disabled={!canClaimDaily}
          className={`w-full flex items-center gap-4 p-4 rounded-2xl shadow-lg transition-shadow ${
            canClaimDaily
              ? "bg-gradient-to-r from-amber-500 to-yellow-500 text-white hover:shadow-xl"
              : "bg-muted text-muted-foreground opacity-60 cursor-not-allowed"
          }`}
        >
          <Gift className="w-7 h-7" />
          <div className="flex-1 text-left">
            <p className="font-bold text-base">
              {canClaimDaily ? `Day ${save.dailyRewardDay + 1} Reward` : "Daily Reward Claimed ✓"}
            </p>
            {canClaimDaily && (
              <p className="text-xs opacity-80">
                +{20 + (save.dailyRewardDay + 1) * 10} coins waiting!
              </p>
            )}
          </div>
        </motion.button>

        {/* Reset */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          onClick={onReset}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors text-sm"
        >
          <RotateCcw className="w-4 h-4" />
          Reset Progress
        </motion.button>
      </div>
    </div>
  );
}
