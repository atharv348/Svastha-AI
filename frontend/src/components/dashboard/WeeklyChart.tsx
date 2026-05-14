import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const data = [
  { day: "Mon", calories: 1800, steps: 8200 },
  { day: "Tue", calories: 2100, steps: 10500 },
  { day: "Wed", calories: 1950, steps: 7800 },
  { day: "Thu", calories: 2200, steps: 12000 },
  { day: "Fri", calories: 1750, steps: 6500 },
  { day: "Sat", calories: 2400, steps: 15000 },
  { day: "Sun", calories: 2000, steps: 9000 },
];

export function WeeklyChart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
      className="glass-card p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-heading font-semibold text-foreground">Weekly Overview</h3>
          <p className="text-xs text-muted-foreground">Calories & Steps this week</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-primary" /><span className="text-muted-foreground">Calories</span></div>
          <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-coral opacity-70" /><span className="text-muted-foreground">Steps</span></div>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "12px",
                boxShadow: "0 4px 20px -4px rgba(0,0,0,0.1)",
              }}
            />
            <Bar dataKey="calories" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            <Bar dataKey="steps" fill="hsl(var(--coral))" radius={[6, 6, 0, 0]} opacity={0.7} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
