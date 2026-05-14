import { useEffect, useState } from "react";
import { motion } from "framer-motion";

export function HeartRateMonitor() {
  const [rate, setRate] = useState(72);

  useEffect(() => {
    const interval = setInterval(() => {
      setRate((prev) => Math.max(65, Math.min(85, prev + Math.floor(Math.random() * 5) - 2)));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const ecgPath = "M0,30 L10,30 L15,30 L18,10 L22,50 L26,5 L30,55 L34,30 L40,30 L50,30 L55,30 L58,10 L62,50 L66,5 L70,55 L74,30 L80,30 L90,30 L95,30 L98,10 L102,50 L106,5 L110,55 L114,30 L120,30";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      className="glass-card p-5 h-full"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Heart Rate Monitor</h3>
          <p className="text-xs text-muted-foreground">Real-time ECG simulation</p>
        </div>
        <div className="flex items-center gap-3 bg-coral/8 rounded-xl px-4 py-2">
          <div className="w-3 h-3 rounded-full bg-coral pulse-dot" />
          <span className="text-3xl font-heading font-bold text-coral tabular-nums">{rate}</span>
          <span className="text-xs text-muted-foreground">bpm</span>
        </div>
      </div>
      <div className="relative h-20 overflow-hidden rounded-xl bg-gradient-to-b from-muted/30 to-muted/60 border border-border">
        <svg className="absolute inset-0 w-[200%] h-full ecg-animate" viewBox="0 0 240 60" preserveAspectRatio="none">
          <path d={ecgPath} fill="none" stroke="hsl(var(--coral))" strokeWidth="2" opacity="0.9" />
        </svg>
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-card/80" />
      </div>
    </motion.div>
  );
}
