// ── PatientCard — Individual patient in the queue ────────────────
import { motion } from "framer-motion";
import { CONDITIONS, getUrgencyLabel, getUrgencyColor } from "./gameData";
import type { Patient } from "./useGameState";

interface Props {
  patient: Patient;
  onSelect: (patient: Patient) => void;
}

export default function PatientCard({ patient, onSelect }: Props) {
  const cond = CONDITIONS[patient.condition];
  const patiencePercent = (patient.patienceLeft / patient.maxPatience) * 100;
  const isLowPatience = patiencePercent < 30;
  const isCritical = cond.urgency >= 4;

  if (patient.treated) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: 0.9, opacity: 0.6 }}
        className="medirush-patient-card medirush-patient-treated"
      >
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-sm font-semibold">{patient.name}</p>
            <p className="text-xs text-emerald-500">Treated successfully!</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (patient.failed) {
    return (
      <motion.div
        initial={{ scale: 1 }}
        animate={{ scale: 0.9, opacity: 0.5 }}
        className="medirush-patient-card medirush-patient-failed"
      >
        <div className="flex items-center gap-2 text-rose-600">
          <span className="text-xl">😢</span>
          <div>
            <p className="text-sm font-semibold">{patient.name}</p>
            <p className="text-xs text-rose-500">Left untreated...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        boxShadow: isLowPatience
          ? ["0 0 0 0 rgba(239,68,68,0)", "0 0 12px 4px rgba(239,68,68,0.3)", "0 0 0 0 rgba(239,68,68,0)"]
          : undefined,
      }}
      transition={{
        duration: 0.4,
        boxShadow: isLowPatience ? { duration: 1.2, repeat: Infinity } : undefined,
      }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onSelect(patient)}
      className={`medirush-patient-card cursor-pointer ${
        isCritical ? "ring-2 ring-rose-400/50" : ""
      } ${isLowPatience ? "medirush-patient-urgent" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-2xl flex-shrink-0">{cond.emoji}</span>
          <div className="min-w-0">
            <p className="text-sm font-bold truncate">{patient.name}</p>
            <p className="text-xs text-muted-foreground">{cond.name}</p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${getUrgencyColor(
            cond.urgency,
          )}`}
        >
          {getUrgencyLabel(cond.urgency)}
        </span>
      </div>

      {/* Patience bar */}
      <div className="mt-2">
        <div className="flex justify-between items-center mb-1">
          <span className="text-[10px] text-muted-foreground">Patience</span>
          <span
            className={`text-[10px] font-mono font-bold ${
              isLowPatience ? "text-rose-500" : "text-muted-foreground"
            }`}
          >
            {patient.patienceLeft}s
          </span>
        </div>
        <div className="w-full h-1.5 bg-muted/50 rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full transition-colors ${
              isLowPatience
                ? "bg-gradient-to-r from-rose-500 to-red-600"
                : patiencePercent < 50
                ? "bg-gradient-to-r from-amber-400 to-orange-500"
                : "bg-gradient-to-r from-emerald-400 to-teal-500"
            }`}
            animate={{ width: `${patiencePercent}%` }}
            transition={{ duration: 0.8, ease: "linear" }}
          />
        </div>
      </div>

      {/* Department hint */}
      <p className="text-[10px] text-muted-foreground mt-1.5 italic">
        Needs: {cond.description}
      </p>
    </motion.div>
  );
}
