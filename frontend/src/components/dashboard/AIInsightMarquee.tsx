import React from 'react';
import { Sparkles } from 'lucide-react';

const insights = [
  "💡 Tip: Staying hydrated can improve your focus and energy levels by up to 20%.",
  "⚡ Your activity is up 15% this week! Keep it up for better cardiovascular health.",
  "🧘 Deep breathing for just 5 minutes can significantly lower your stress index.",
  "🍎 Fact: Eating fiber-rich foods helps maintain stable blood sugar levels.",
  "😴 You slept 7.5 hours yesterday—that's within your optimal recovery window.",
  "🏃 A quick 10-minute walk after meals can aid digestion and glucose metabolism.",
];

export function AIInsightMarquee() {
  return (
    <div className="relative w-full overflow-hidden bg-primary/5 border-y border-primary/10 py-2 group">
      <div className="flex animate-marquee whitespace-nowrap">
        <div className="flex items-center gap-12 pr-12">
          {insights.map((insight, index) => (
            <div key={index} className="flex items-center gap-3 text-sm font-medium text-primary-foreground/70">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-12 pr-12">
          {insights.map((insight, index) => (
            <div key={`dup-${index}`} className="flex items-center gap-3 text-sm font-medium text-primary-foreground/70">
              <Sparkles className="w-4 h-4 text-accent animate-pulse" />
              <span>{insight}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
