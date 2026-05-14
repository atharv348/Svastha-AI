// ── TreatmentPopup — Diagnosis mini-game ─────────────────────────
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, AlertCircle, CheckCircle, Stethoscope, Clock } from "lucide-react";
import { CONDITIONS, DEPARTMENTS, getUrgencyLabel, getUrgencyColor } from "./gameData";
import type { Patient } from "./useGameState";

interface Props {
  patient: Patient;
  onTreat: (patientId: string, treatment: string) => void;
  onClose: () => void;
}

export default function TreatmentPopup({ patient, onTreat, onClose }: Props) {
  const cond = CONDITIONS[patient.condition];
  const dept = DEPARTMENTS[cond.department];
  const [selectedTreatment, setSelectedTreatment] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Build treatment options: correct + 2 wrong
  const allTreatments = [cond.treatment, ...cond.wrongTreatments].sort(
    () => Math.random() - 0.5,
  );

  const handleSelect = (treatment: string) => {
    setSelectedTreatment(treatment);
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    if (selectedTreatment) {
      onTreat(patient.id, selectedTreatment);
    }
  };

  const patiencePercent = (patient.patienceLeft / patient.maxPatience) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.85, y: 30 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.85, y: 30 }}
        transition={{ type: "spring", damping: 22 }}
        className="medirush-treatment-panel w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-border/40">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{cond.emoji}</span>
            <div>
              <h3 className="font-bold text-lg">{patient.name}</h3>
              <p className="text-sm text-muted-foreground">{cond.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient Info */}
        <div className="p-4 space-y-4">
          {/* Urgency & Department */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full text-white ${getUrgencyColor(cond.urgency)}`}>
              {getUrgencyLabel(cond.urgency)} Priority
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${dept.color} text-white`}>
              {dept.emoji} {dept.name}
            </span>
          </div>

          {/* Patience Timer */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div className="flex-1">
              <div className="w-full h-2 bg-muted/50 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    patiencePercent < 30
                      ? "bg-rose-500"
                      : patiencePercent < 60
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  }`}
                  animate={{ width: `${patiencePercent}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
            <span className="text-xs font-mono font-bold">{patient.patienceLeft}s</span>
          </div>

          {/* Symptoms description */}
          <div className="p-3 bg-muted/30 rounded-xl border border-border/40">
            <div className="flex items-center gap-2 mb-1">
              <Stethoscope className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Symptoms</span>
            </div>
            <p className="text-sm">{cond.description}</p>
          </div>

          {/* Treatment Options */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Choose Treatment
            </p>
            <div className="space-y-2">
              {allTreatments.map((treatment) => (
                <motion.button
                  key={treatment}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSelect(treatment)}
                  className={`w-full p-3 rounded-xl text-left text-sm font-medium border transition-all ${
                    selectedTreatment === treatment
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border/40 bg-card hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💊</span>
                    {treatment}
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Confirm button */}
          <AnimatePresence>
            {showConfirm && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={handleConfirm}
                  className="w-full p-4 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base shadow-lg hover:shadow-xl transition-shadow"
                >
                  <div className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Administer Treatment
                  </div>
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Warning */}
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <AlertCircle className="w-3.5 h-3.5" />
            Wrong treatment will lower your hospital rating
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
