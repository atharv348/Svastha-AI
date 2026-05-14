import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface VitalCardProps {
  icon: LucideIcon;
  title: string;
  value: string;
  unit: string;
  trend?: string;
  trendUp?: boolean;
  variant?: "primary" | "coral" | "info" | "success";
}

const variantStyles = {
  primary: "border-primary/15 hover:border-primary/30",
  coral: "border-coral/15 hover:border-coral/30",
  info: "border-info/15 hover:border-info/30",
  success: "border-success/15 hover:border-success/30",
};

const iconVariants = {
  primary: "bg-primary/12 text-primary",
  coral: "bg-coral/12 text-coral",
  info: "bg-info/12 text-info",
  success: "bg-success/12 text-success",
};

const sparkData = {
  primary: [30, 45, 35, 50, 40, 55, 45],
  coral: [40, 35, 50, 30, 55, 45, 50],
  info: [20, 40, 35, 60, 45, 70, 55],
  success: [30, 40, 50, 45, 55, 60, 50],
};

function Sparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full h-10 mt-3" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" points={points} opacity="0.6" />
    </svg>
  );
}

const sparkColors = {
  primary: "hsl(168, 55%, 42%)",
  coral: "hsl(12, 80%, 62%)",
  info: "hsl(205, 75%, 55%)",
  success: "hsl(152, 60%, 45%)",
};

export function VitalCard({ icon: Icon, title, value, unit, trend, trendUp, variant = "primary" }: VitalCardProps) {
  return (
    <div className={cn(
      "glass-card p-5 border transition-all hover:scale-[1.02] cursor-default group",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110", iconVariants[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-semibold px-2.5 py-1 rounded-full",
            trendUp ? "bg-success/10 text-success" : "bg-coral/10 text-coral"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-0.5 uppercase tracking-wide">{title}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-heading font-bold text-foreground">{value}</span>
        <span className="text-xs text-muted-foreground">{unit}</span>
      </div>
      <Sparkline data={sparkData[variant]} color={sparkColors[variant]} />
    </div>
  );
}
