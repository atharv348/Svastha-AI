// ── GameHUD — Top bar showing coins, XP, rating, level, combo ────
import { motion, AnimatePresence } from "framer-motion";
import { Coins, Star, Heart, Zap, Volume2, VolumeX, Trophy } from "lucide-react";
import type { GameSave, GameNotification } from "./useGameState";

interface Props {
  save: GameSave;
  comboCount: number;
  comboTimer: number;
  notifications: GameNotification[];
  onToggleSound: () => void;
  onBack: () => void;
}

export default function GameHUD({ save, comboCount, comboTimer, notifications, onToggleSound, onBack }: Props) {
  const ratingColor =
    save.hospitalRating >= 70 ? "text-emerald-400" : save.hospitalRating >= 40 ? "text-amber-400" : "text-rose-400";

  const xpForLevel = save.level * 150;
  const xpProgress = Math.min(100, (save.xp / xpForLevel) * 100);

  return (
    <>
      {/* Main HUD bar */}
      <div className="medirush-hud">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white/80 hover:text-white"
          >
            ←
          </button>
          <div className="flex items-center gap-1.5">
            <span className="text-lg">🏥</span>
            <span className="font-bold text-white text-sm hidden sm:inline">MediRush</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-end">
          {/* Level */}
          <div className="hud-stat">
            <Zap className="w-4 h-4 text-amber-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 leading-none">LVL</span>
              <span className="text-sm font-bold text-white leading-none">{save.level}</span>
            </div>
          </div>

          {/* Coins */}
          <motion.div
            className="hud-stat"
            key={save.coins}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 0.3 }}
          >
            <Coins className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-bold text-yellow-300">{save.coins.toLocaleString()}</span>
          </motion.div>

          {/* XP */}
          <div className="hud-stat">
            <Star className="w-4 h-4 text-purple-400" />
            <div className="flex flex-col">
              <span className="text-[10px] text-white/50 leading-none">XP</span>
              <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Rating */}
          <div className="hud-stat">
            <Heart className={`w-4 h-4 ${ratingColor} medirush-heartbeat`} />
            <span className={`text-sm font-bold ${ratingColor}`}>{save.hospitalRating}%</span>
          </div>

          {/* Combo */}
          <AnimatePresence>
            {comboTimer > 0 && comboCount > 1 && (
              <motion.div
                className="hud-stat"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <Trophy className="w-4 h-4 text-orange-400" />
                <span className="text-sm font-bold text-orange-300">x{comboCount}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            {save.soundEnabled ? (
              <Volume2 className="w-4 h-4 text-white/80" />
            ) : (
              <VolumeX className="w-4 h-4 text-white/40" />
            )}
          </button>
        </div>
      </div>

      {/* Floating notifications */}
      <div className="fixed top-16 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map((notif) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, x: 100, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.8 }}
              className={`px-4 py-2 rounded-xl text-sm font-medium shadow-lg backdrop-blur-md pointer-events-auto ${
                notif.type === "success"
                  ? "bg-emerald-500/90 text-white"
                  : notif.type === "error"
                  ? "bg-rose-500/90 text-white"
                  : notif.type === "warning"
                  ? "bg-amber-500/90 text-white"
                  : notif.type === "coins"
                  ? "bg-yellow-500/90 text-yellow-950"
                  : "bg-sky-500/90 text-white"
              }`}
            >
              {notif.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
}
