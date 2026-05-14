import { motion } from "framer-motion";
import { Brain, ScanLine, Dumbbell, Utensils, HeartPulse } from "lucide-react";

const activities = [
  { icon: Brain, label: "AI Diagnosis: Clear Skin Scan", time: "2 hours ago", color: "bg-primary/10 text-primary" },
  { icon: Dumbbell, label: "Generated Workout Plan", time: "5 hours ago", color: "bg-coral/10 text-coral" },
  { icon: Utensils, label: "Logged Meal: 520 cal", time: "6 hours ago", color: "bg-success/10 text-success" },
  { icon: ScanLine, label: "Lung X-Ray Analysis", time: "1 day ago", color: "bg-info/10 text-info" },
  { icon: HeartPulse, label: "Vitals Check Complete", time: "1 day ago", color: "bg-primary/10 text-primary" },
];

export function ActivityFeed() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
      className="glass-card p-5"
    >
      <h3 className="font-heading font-semibold text-foreground mb-4">Recent Activity</h3>
      <div className="space-y-2">
        {activities.map((activity, i) => (
          <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-all group cursor-default">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110 ${activity.color}`}>
              <activity.icon className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{activity.label}</p>
              <p className="text-xs text-muted-foreground">{activity.time}</p>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-border group-hover:bg-primary transition-colors" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}
