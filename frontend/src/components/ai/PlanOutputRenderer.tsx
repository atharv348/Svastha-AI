import { useMemo, useRef, useState } from "react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  Dumbbell,
  FileText,
  Lightbulb,
  Loader2,
  RefreshCw,
  UtensilsCrossed,
} from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface SummaryStat {
  value: string;
  label: string;
}

interface WorkoutExercise {
  name: string;
  note?: string;
  sets: string;
}

interface WorkoutDay {
  day: string;
  focus: string;
  isRest?: boolean;
  rest?: string;
  exercises: WorkoutExercise[];
}

interface MealRow {
  label: string;
  food: string;
  qty: string;
  calories: string;
  protein: string;
}

interface PlanPayload {
  type: "combined" | "meal" | "workout" | "answer";
  summary?: SummaryStat[];
  workout?: { days: WorkoutDay[] };
  meal?: {
    totalCalories: string;
    macros?: {
      protein?: string;
      carbs?: string;
      fats?: string;
    };
    meals: MealRow[];
  };
  coachNote?: string[];
  answer?: string;
  tips?: string[];
  followUp?: string;
}

interface PlanOutputRendererProps {
  content: string;
  userProfile?: {
    age?: number | null;
    gender?: string | null;
    current_weight?: number | null;
    fitness_level?: string | null;
    fitness_goal?: string | null;
    dietary_restrictions?: string[];
  };
  onRegenerate?: () => void;
}

function parsePlanJSON(content: string): PlanPayload | null {
  try {
    const fenced = content.match(/```json\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1]) as PlanPayload;
    }
    if (content.trim().startsWith("{")) {
      return JSON.parse(content.trim()) as PlanPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function MacroPill({ label, value, color = "green" }: { label: string; value: string; color?: "green" | "amber" | "blue" | "purple" }) {
  const colors: Record<string, string> = {
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    blue: "bg-blue-50 text-blue-800",
    purple: "bg-violet-50 text-violet-800",
  };

  return (
    <span className={`text-xs font-medium px-3 py-1 rounded-full ${colors[color]}`}>
      {label}: <strong>{value}</strong>
    </span>
  );
}

function SummaryBar({ stats }: { stats: SummaryStat[] }) {
  return (
    <div className="grid border-b border-emerald-100" style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
      {stats.map((s, i) => (
        <div key={`${s.label}-${i}`} className={`py-2.5 px-3 text-center ${i < stats.length - 1 ? "border-r border-emerald-100" : ""}`}>
          <div className="text-lg font-bold text-emerald-700">{s.value}</div>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 mt-0.5">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function WorkoutSection({ days }: { days: WorkoutDay[] }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-emerald-50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-emerald-50/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
          <Dumbbell size={12} className="text-emerald-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1 text-left">Part 1 - Weekly Workout Plan</span>
        <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">{days.length} days</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <div className="flex flex-col gap-1.5">
            {days.map((day, i) => (
              <div
                key={`${day.day}-${i}`}
                className={`grid gap-2 items-start px-3 py-2 rounded-lg border text-xs ${
                  day.isRest
                    ? "bg-gray-50 border-gray-200 text-gray-400"
                    : "bg-emerald-50/40 border-emerald-100"
                }`}
                style={{ gridTemplateColumns: "52px 72px 1fr auto" }}
              >
                <span className={`font-bold text-[11px] ${day.isRest ? "text-gray-400" : "text-emerald-700"}`}>{day.day}</span>
                <span className="text-gray-500 text-[11px] pt-px">{day.focus}</span>
                <div className="flex flex-col gap-0.5">
                  {day.exercises?.map((ex, j) => (
                    <div key={`${ex.name}-${j}`} className="text-gray-800 leading-snug">
                      {ex.name}
                      {ex.note ? <span className="text-gray-400 text-[10px]"> · {ex.note}</span> : null}
                    </div>
                  ))}
                  {day.isRest ? <div className="text-gray-400">Light walk · Stretching · Mobility</div> : null}
                </div>
                <div className="text-right text-[10px] text-gray-500 whitespace-nowrap leading-relaxed">
                  {day.exercises?.map((ex, j) => (
                    <div key={`${ex.sets}-${j}`}>{ex.sets}</div>
                  ))}
                  {!day.isRest && day.rest ? <div className="text-emerald-600 font-medium">{day.rest}</div> : null}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3 px-3 py-2 bg-emerald-50 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
            Warm up 5-10 min before each session · Cool down with static stretches · Sleep 7-9 hrs for recovery
          </div>
        </div>
      )}
    </div>
  );
}

function MealSection({
  meals,
  macros,
  totalCalories,
}: {
  meals: MealRow[];
  macros?: { protein?: string; carbs?: string; fats?: string };
  totalCalories: string;
}) {
  const [expanded, setExpanded] = useState(true);

  const totalProtein = useMemo(() => {
    return meals.reduce((sum, row) => {
      const parsed = parseInt(String(row.protein).replace(/[^0-9]/g, ""), 10);
      return sum + (Number.isFinite(parsed) ? parsed : 0);
    }, 0);
  }, [meals]);

  return (
    <div className="border-b border-emerald-50">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-amber-50/40 transition-colors"
      >
        <div className="w-6 h-6 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
          <UtensilsCrossed size={12} className="text-amber-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1 text-left">Part 2 - Daily Meal Plan</span>
        <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">{totalCalories} kcal</span>
        {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <div
            className="grid gap-2 px-2.5 py-2 rounded-lg bg-amber-100 text-[10px] font-bold text-amber-800 uppercase tracking-wide mb-1.5"
            style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
          >
            <div>Meal</div>
            <div>Food Item</div>
            <div>Qty</div>
            <div>Cal</div>
            <div>Protein</div>
          </div>

          <div className="flex flex-col gap-1">
            {meals.map((meal, i) => (
              <div
                key={`${meal.label}-${i}`}
                className="grid gap-2 px-2.5 py-2 rounded-lg bg-amber-50/50 border border-amber-100 text-xs items-center"
                style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
              >
                <span className="font-semibold text-amber-800 text-[11px]">{meal.label}</span>
                <span className="text-gray-800 leading-snug">{meal.food}</span>
                <span className="text-gray-500 text-right text-[11px]">{meal.qty}</span>
                <span className="text-gray-700 text-right font-medium text-[11px]">{meal.calories}</span>
                <span className="text-emerald-700 text-right font-semibold text-[11px]">{meal.protein}</span>
              </div>
            ))}

            <div
              className="grid gap-2 px-2.5 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs items-center mt-1"
              style={{ gridTemplateColumns: "72px 1fr 52px 60px 52px" }}
            >
              <span className="font-bold text-emerald-800 text-[11px]">Daily Total</span>
              <div />
              <div />
              <span className="text-emerald-800 font-bold text-right text-[11px]">{totalCalories}</span>
              <span className="text-emerald-800 font-bold text-right text-[11px]">{totalProtein}g</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {macros?.protein ? <MacroPill label="Protein" value={macros.protein} color="green" /> : null}
            {macros?.carbs ? <MacroPill label="Carbs" value={macros.carbs} color="amber" /> : null}
            {macros?.fats ? <MacroPill label="Fats" value={macros.fats} color="amber" /> : null}
            <MacroPill label="Water" value="2.5L/day" color="blue" />
          </div>
        </div>
      )}
    </div>
  );
}

function CoachNote({ tips }: { tips: string[] }) {
  return (
    <div className="px-3 py-3">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
          <Lightbulb size={12} className="text-violet-700" />
        </div>
        <span className="text-sm font-bold text-gray-900 flex-1">Part 3 - Coach Note</span>
        <span className="text-[10px] font-semibold bg-violet-100 text-violet-800 px-2 py-0.5 rounded-full">Synergy tips</span>
      </div>
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-2.5 flex flex-col gap-1.5">
        {tips.map((tip, i) => (
          <div key={`${tip}-${i}`} className="text-xs text-violet-900 leading-relaxed pl-3 relative">
            <span className="absolute left-0 text-violet-400 font-bold">·</span>
            {tip}
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBar({
  onRegenerate,
  onCopy,
}: {
  onRegenerate?: () => void;
  onCopy?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    onCopy?.();
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2.5 bg-emerald-50/60 border-t border-emerald-100">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
      >
        <Copy size={11} /> {copied ? "Copied" : "Copy"}
      </button>
      <button
        onClick={onRegenerate}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
      >
        <RefreshCw size={11} /> Regenerate
      </button>
    </div>
  );
}

function DownloadReportSection({
  onDownloadPdf,
  onSaveText,
  isSavingPdf,
}: {
  onDownloadPdf?: () => void;
  onSaveText?: () => void;
  isSavingPdf?: boolean;
}) {
  return (
    <div className="px-3 py-3 border-t border-emerald-100 bg-white">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-emerald-900">Download Report</p>
          <p className="text-[11px] text-emerald-700 leading-relaxed">
            Export the original generated report in PDF format.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onDownloadPdf}
            disabled={isSavingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-300 bg-emerald-700 text-white hover:bg-emerald-800 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSavingPdf ? <Loader2 size={11} className="animate-spin" /> : <Download size={11} />} {isSavingPdf ? "Preparing..." : "Download PDF"}
          </button>
          <button
            onClick={onSaveText}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-colors"
          >
            <FileText size={11} /> Save Text
          </button>
        </div>
      </div>
    </div>
  );
}

function PlainTextMessage({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="px-3 py-2.5 text-sm text-gray-800 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-2" />;

        if (/^#+\s/.test(line)) {
          const text = line.replace(/^#+\s/, "");
          return (
            <p key={i} className="font-bold text-gray-900 mt-2">
              {text}
            </p>
          );
        }

        if (/^\d+\.\s/.test(line)) {
          return (
            <p key={i} className="pl-4 text-gray-700">
              {line}
            </p>
          );
        }

        if (/^[-*]\s/.test(line)) {
          return (
            <p key={i} className="pl-4 text-gray-700 flex gap-2">
              <span className="text-emerald-500">·</span>
              {line.slice(2)}
            </p>
          );
        }

        const bold = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return <p key={i} dangerouslySetInnerHTML={{ __html: bold }} />;
      })}
    </div>
  );
}

export function PlanOutputRenderer({ content, userProfile, onRegenerate }: PlanOutputRendererProps) {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isSavingPdf, setIsSavingPdf] = useState(false);
  const { toast } = useToast();
  const plan = parsePlanJSON(content);

  const subtitle = userProfile
    ? `${userProfile.age ?? "-"} yrs · ${userProfile.gender ?? "-"} · ${userProfile.current_weight ?? "-"}kg · ${
        userProfile.fitness_level ?? "-"
      } · ${userProfile.fitness_goal ?? "-"}`
    : "Personalized guidance";

  const title =
    plan?.type === "meal"
      ? "Meal Plan"
      : plan?.type === "workout"
      ? "Workout Plan"
      : plan?.type === "combined"
      ? "Combined Plan"
      : "Coach Answer";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
    } catch {
      // ignore clipboard errors
    }
  };

  const save = () => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ai-hub-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const savePdf = async () => {
    const reportNode = reportRef.current;
    if (!reportNode || isSavingPdf) return;

    setIsSavingPdf(true);

    try {
      const canvas = await html2canvas(reportNode, {
        backgroundColor: "#ffffff",
        useCORS: true,
        scale: 2,
      });

      const imageData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const printableWidth = pageWidth - margin * 2;
      const renderedHeight = (canvas.height * printableWidth) / canvas.width;
      const printablePageHeight = pageHeight - margin * 2;

      let heightLeft = renderedHeight;
      let offsetY = margin;

      pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, renderedHeight, undefined, "FAST");
      heightLeft -= printablePageHeight;

      while (heightLeft > 0) {
        offsetY = margin - (renderedHeight - heightLeft);
        pdf.addPage();
        pdf.addImage(imageData, "PNG", margin, offsetY, printableWidth, renderedHeight, undefined, "FAST");
        heightLeft -= printablePageHeight;
      }

      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "report";
      const stamp = new Date().toISOString().slice(0, 10);
      pdf.save(`ai-hub-${safeTitle}-${stamp}.pdf`);

      toast({
        title: "PDF Downloaded",
        description: "Your report has been saved in PDF format.",
      });
    } catch (error) {
      console.error("Failed to create PDF report:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "Could not generate the PDF report. Please try again.",
      });
    } finally {
      setIsSavingPdf(false);
    }
  };

  return (
    <div className="rounded-2xl overflow-hidden border border-emerald-200 bg-white text-sm shadow-sm">
      <div ref={reportRef}>
        <div className="flex items-center gap-3 px-3 py-2.5 bg-emerald-700">
          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-emerald-700 font-bold text-xs flex-shrink-0">
            AI
          </div>
          <div>
            <div className="text-white font-semibold text-sm">AI Hub - {title}</div>
            <div className="text-emerald-200 text-[11px]">{subtitle}</div>
          </div>
        </div>

        {plan ? (
          <>
            {plan.summary && plan.summary.length ? <SummaryBar stats={plan.summary} /> : null}
            {plan.workout?.days && plan.workout.days.length ? <WorkoutSection days={plan.workout.days} /> : null}
            {plan.meal?.meals && plan.meal.meals.length ? (
              <MealSection meals={plan.meal.meals} macros={plan.meal.macros} totalCalories={plan.meal.totalCalories} />
            ) : null}
            {plan.coachNote && plan.coachNote.length ? <CoachNote tips={plan.coachNote} /> : null}

            {plan.type === "answer" ? (
              <div className="px-3 py-3 space-y-3">
                <p className="text-sm text-gray-800 leading-relaxed">{plan.answer}</p>
                {plan.tips && plan.tips.length ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5">
                    <p className="text-xs font-semibold text-emerald-800 mb-2">Tips</p>
                    <ul className="text-xs text-emerald-900 space-y-1 list-disc pl-4">
                      {plan.tips.map((tip, i) => (
                        <li key={`${tip}-${i}`}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                {plan.followUp ? <p className="text-xs text-gray-500">{plan.followUp}</p> : null}
              </div>
            ) : null}
          </>
        ) : (
          <PlainTextMessage content={content} />
        )}
      </div>

      <DownloadReportSection onDownloadPdf={savePdf} onSaveText={save} isSavingPdf={isSavingPdf} />
      <ActionBar onCopy={copy} onRegenerate={onRegenerate} />
    </div>
  );
}

export default PlanOutputRenderer;
