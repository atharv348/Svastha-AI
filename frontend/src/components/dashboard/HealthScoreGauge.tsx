import React from 'react';

interface HealthScoreGaugeProps {
  score: number;
}

export function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center p-6 glass-card border-primary/20">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90">
          <circle
            cx="80"
            cy="80"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            fill="transparent"
            className="text-primary/10"
          />
          <circle
            cx="80"
            cy="80"
            r="45"
            stroke="currentColor"
            strokeWidth="10"
            strokeDasharray={circumference}
            style={{ strokeDashoffset, transition: 'stroke-dashoffset 1.5s ease-in-out' }}
            strokeLinecap="round"
            fill="transparent"
            className="text-primary drop-shadow-[0_0_8px_rgba(112,194,177,0.5)]"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-foreground font-heading">{score}</span>
          <span className="text-xs text-muted-foreground font-medium">HEALTH SCORE</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold text-success">Excellent Condition</p>
        <p className="text-xs text-muted-foreground mt-1">Based on recent vitals and activity</p>
      </div>
    </div>
  );
}
