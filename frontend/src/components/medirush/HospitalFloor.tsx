// ── HospitalFloor — Patient queue + Ward map ────────────────────
import { motion, AnimatePresence } from "framer-motion";
import { Users, BedDouble, Activity } from "lucide-react";
import { DEPARTMENTS, CONDITIONS } from "./gameData";
import type { Patient, GameSave } from "./useGameState";
import PatientCard from "./PatientCard";

interface Props {
  patients: Patient[];
  save: GameSave;
  onSelectPatient: (patient: Patient) => void;
  onOpenUpgrades: () => void;
}

const WARD_KEYS = ["triage", "general_ward", "icu", "lab", "pharmacy", "surgery", "er"] as const;

export default function HospitalFloor({ patients, save, onSelectPatient, onOpenUpgrades }: Props) {
  const activePatients = patients.filter((p) => !p.treated && !p.failed);
  const maxCapacity = 8 + save.upgradeLevels.beds * 2;

  return (
    <div className="flex flex-col h-full">
      {/* Stats bar */}
      <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-sm">
          <Users className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">
            {activePatients.length}/{maxCapacity} patients
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <BedDouble className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium">{save.upgradeLevels.beds * 2 + 8} beds</span>
        </div>
        <div className="ml-auto">
          <button
            onClick={onOpenUpgrades}
            className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
          >
            ⬆️ Upgrades
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Ward map */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5" />
            Hospital Map
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {WARD_KEYS.map((wk) => {
              const dept = DEPARTMENTS[wk];
              const wardPatients = patients.filter(
                (p) => !p.treated && !p.failed && CONDITIONS[p.condition].department === wk,
              );
              return (
                <motion.div
                  key={wk}
                  className={`p-3 rounded-xl border border-border/40 bg-card text-center transition-all ${
                    wardPatients.length > 0 ? "ring-2 ring-primary/30 shadow-md" : ""
                  }`}
                  whileHover={{ scale: 1.05 }}
                >
                  <span className="text-2xl block">{dept.emoji}</span>
                  <p className="text-[10px] font-bold mt-1 truncate">{dept.name}</p>
                  {wardPatients.length > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className={`inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${dept.color}`}
                    >
                      {wardPatients.length}
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Patient Queue */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Patient Queue
            {activePatients.length > 0 && (
              <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[10px] font-bold">
                {activePatients.length} waiting
              </span>
            )}
          </h3>

          {patients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12 text-muted-foreground"
            >
              <motion.span
                className="text-5xl block mb-3"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                🏥
              </motion.span>
              <p className="text-sm">Waiting for patients...</p>
              <p className="text-xs mt-1">They'll arrive shortly!</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              <AnimatePresence mode="popLayout">
                {patients.map((p) => (
                  <PatientCard key={p.id} patient={p} onSelect={onSelectPatient} />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
