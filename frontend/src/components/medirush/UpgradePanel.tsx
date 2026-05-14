// ── UpgradePanel — Hospital upgrade tree ─────────────────────────
import { motion } from "framer-motion";
import { ArrowLeft, Lock, CheckCircle2, TrendingUp } from "lucide-react";
import { UPGRADES, UPGRADE_KEYS, getUpgradeCost } from "./gameData";
import type { GameSave, UpgradeKey } from "./gameData";

interface Props {
  save: GameSave;
  onPurchase: (key: UpgradeKey) => void;
  onBack: () => void;
}

export default function UpgradePanel({ save, onPurchase, onBack }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="font-bold text-lg">Hospital Upgrades</h2>
          <p className="text-xs text-muted-foreground">
            💰 {save.coins.toLocaleString()} coins available
          </p>
        </div>
      </div>

      {/* Upgrades grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {UPGRADE_KEYS.map((key, i) => {
            const upg = UPGRADES[key];
            const currentLevel = save.upgradeLevels[key];
            const isMaxed = currentLevel >= upg.maxLevel;
            const cost = isMaxed ? 0 : getUpgradeCost(upg, currentLevel);
            const canAfford = save.coins >= cost;
            const progressPercent = (currentLevel / upg.maxLevel) * 100;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`medirush-upgrade-card ${
                  isMaxed
                    ? "ring-2 ring-amber-400/30 bg-amber-50/50"
                    : canAfford
                    ? "hover:ring-2 hover:ring-primary/30"
                    : "opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-3xl">{upg.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm">{upg.name}</h4>
                      {isMaxed && (
                        <CheckCircle2 className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{upg.description}</p>
                    <p className="text-[10px] text-primary font-medium mt-0.5 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {upg.effect}
                    </p>

                    {/* Level progress */}
                    <div className="mt-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-medium text-muted-foreground">
                          Level {currentLevel}/{upg.maxLevel}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${
                            isMaxed
                              ? "bg-gradient-to-r from-amber-400 to-yellow-500"
                              : "bg-gradient-to-r from-primary to-accent"
                          }`}
                          animate={{ width: `${progressPercent}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Purchase button */}
                <div className="mt-3">
                  {isMaxed ? (
                    <div className="w-full py-2 rounded-xl bg-amber-100 text-amber-700 text-center text-xs font-bold">
                      ✅ MAX LEVEL
                    </div>
                  ) : (
                    <motion.button
                      whileHover={canAfford ? { scale: 1.02 } : {}}
                      whileTap={canAfford ? { scale: 0.97 } : {}}
                      onClick={() => canAfford && onPurchase(key)}
                      disabled={!canAfford}
                      className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                        canAfford
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md hover:shadow-lg"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {canAfford ? (
                        <>💰 {cost.toLocaleString()} coins</>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          {cost.toLocaleString()} coins needed
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
