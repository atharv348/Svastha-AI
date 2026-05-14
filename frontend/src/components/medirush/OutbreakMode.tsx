// ── OutbreakMode — Infection containment mini-game ───────────────
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Shield, AlertTriangle, Droplets, Pill, ShieldCheck, Timer } from "lucide-react";
import { DEPARTMENTS, OUTBREAK_SCENARIOS } from "./gameData";
import type { OutbreakState, GameSave } from "./useGameState";

interface Props {
  outbreak: OutbreakState;
  save: GameSave;
  onAction: (action: string) => void;
  onStartOutbreak: () => void;
  onBack: () => void;
}

const WARD_NAMES = ["triage", "general_ward", "icu", "lab", "pharmacy", "surgery", "er"] as const;

const ACTION_META: Record<string, { label: string; emoji: string; icon: typeof Shield; color: string }> = {
  isolate: { label: "Isolate Ward", emoji: "🔒", icon: Shield, color: "from-amber-500 to-orange-600" },
  disinfect: { label: "Disinfect Area", emoji: "🧴", icon: Droplets, color: "from-sky-500 to-blue-600" },
  medicate: { label: "Administer Meds", emoji: "💊", icon: Pill, color: "from-emerald-500 to-teal-600" },
};

export default function OutbreakMode({ outbreak, save, onAction, onStartOutbreak, onBack }: Props) {
  const isActive = outbreak.active && outbreak.scenario;

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
          <h2 className="font-bold text-lg flex items-center gap-2">
            🦠 Outbreak {isActive ? "ACTIVE" : "Training"}
          </h2>
          <p className="text-xs text-muted-foreground">
            Contain bacterial outbreaks to protect patients
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isActive ? (
          // ── No active outbreak — Training mode ──
          <div className="flex flex-col items-center justify-center py-12 space-y-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-24 h-24 bg-emerald-100 rounded-3xl flex items-center justify-center"
            >
              <ShieldCheck className="w-12 h-12 text-emerald-600" />
            </motion.div>
            <div className="text-center">
              <h3 className="text-xl font-bold">Hospital is Clean</h3>
              <p className="text-sm text-muted-foreground mt-1">
                No active outbreaks detected. Start a training drill!
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onStartOutbreak}
              className="px-8 py-4 rounded-2xl bg-gradient-to-r from-rose-500 to-red-600 text-white font-bold text-base shadow-lg"
            >
              🦠 Start Outbreak Drill
            </motion.button>

            {/* Outbreak info cards */}
            <div className="w-full max-w-lg">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Possible Outbreaks
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {OUTBREAK_SCENARIOS.map((s, i) => (
                  <div key={i} className="p-3 rounded-xl border border-border/40 bg-card">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{s.emoji}</span>
                      <span className="font-semibold text-sm">{s.name}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">{s.bacteria}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${
                        s.severity === "high" ? "bg-rose-500" : s.severity === "medium" ? "bg-amber-500" : "bg-emerald-500"
                      }`}>
                        {s.severity.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold ml-auto">+{s.rewardCoins} 💰</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // ── Active Outbreak ──
          <>
            {/* Alert banner */}
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: "auto" }}
              className="p-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 text-white"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.span
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity }}
                    className="text-3xl"
                  >
                    {outbreak.scenario!.emoji}
                  </motion.span>
                  <div>
                    <h3 className="font-bold text-lg">{outbreak.scenario!.name}</h3>
                    <p className="text-xs text-white/80">{outbreak.scenario!.bacteria}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-5 h-5" />
                  <span className="text-2xl font-mono font-bold">{outbreak.ticksRemaining}s</span>
                </div>
              </div>
            </motion.div>

            {/* Infection Map */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Infection Spread Map
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {WARD_NAMES.map((wk, idx) => {
                  const dept = DEPARTMENTS[wk];
                  const isInfected = outbreak.infectedWards.includes(idx);

                  return (
                    <motion.div
                      key={wk}
                      animate={
                        isInfected
                          ? {
                              boxShadow: [
                                "0 0 0 0 rgba(239,68,68,0)",
                                "0 0 12px 4px rgba(239,68,68,0.4)",
                                "0 0 0 0 rgba(239,68,68,0)",
                              ],
                            }
                          : {}
                      }
                      transition={isInfected ? { duration: 1.5, repeat: Infinity } : {}}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        isInfected
                          ? "border-rose-400 bg-rose-50 ring-2 ring-rose-300/50"
                          : "border-border/40 bg-card"
                      }`}
                    >
                      <span className="text-2xl block">{isInfected ? "🦠" : dept.emoji}</span>
                      <p className="text-[10px] font-bold mt-1 truncate">{dept.name}</p>
                      {isInfected && (
                        <span className="text-[9px] font-bold text-rose-600 uppercase">INFECTED</span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
                Containment Actions
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {outbreak.scenario!.requiredActions.map((actionKey) => {
                  const meta = ACTION_META[actionKey];
                  const isCompleted = outbreak.actionsCompleted.includes(actionKey);

                  return (
                    <motion.button
                      key={actionKey}
                      whileHover={!isCompleted ? { scale: 1.03 } : {}}
                      whileTap={!isCompleted ? { scale: 0.97 } : {}}
                      onClick={() => !isCompleted && onAction(actionKey)}
                      disabled={isCompleted}
                      className={`p-4 rounded-xl font-bold text-sm transition-all ${
                        isCompleted
                          ? "bg-emerald-100 text-emerald-700 border-2 border-emerald-300"
                          : `bg-gradient-to-r ${meta.color} text-white shadow-lg hover:shadow-xl`
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-xl">{isCompleted ? "✅" : meta.emoji}</span>
                        {isCompleted ? "Done!" : meta.label}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Contained success */}
            <AnimatePresence>
              {outbreak.contained && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="p-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-center"
                >
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 0.5 }}
                    className="text-5xl mb-3"
                  >
                    🎉
                  </motion.div>
                  <h3 className="text-xl font-bold">Outbreak Contained!</h3>
                  <p className="text-sm text-white/80 mt-1">
                    +{outbreak.scenario!.rewardCoins} coins earned
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}
