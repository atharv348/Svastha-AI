import { Activity, Heart, Flame, Moon, Plus, Zap, Accessibility } from "lucide-react";
import { VitalCard } from "@/components/dashboard/VitalCard";
import { WeeklyChart } from "@/components/dashboard/WeeklyChart";
import { HeartRateMonitor } from "@/components/dashboard/HeartRateMonitor";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AchievementPanel } from "@/components/dashboard/AchievementPanel";
import { ProgressRing } from "@/components/dashboard/ProgressRing";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import jsPDF from "jspdf";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const buildDetailedReportText = () => {
    const generatedAt = new Date().toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const reportId = `VR-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(1000 + Math.random() * 9000)}`;

    return [
      "SVASTHAAI - DETAILED MEDICAL REPORT",
      `Report ID: ${reportId}`,
      `Generated: ${generatedAt}`,
      "Source: Dashboard health snapshot",
      "",
      "Patient Context",
      "- Patient Name: Not specified (dashboard user)",
      "- Age/Sex: Not specified",
      "- Reason for Report: Periodic health status review",
      "",
      "Clinical Snapshot",
      "- Overall Status: Stable profile without immediate red-flag trend in displayed metrics.",
      "- Functional Summary: Good activity output, adequate sleep duration, moderate stress load.",
      "",
      "Vital Assessment",
      "- Heart Rate: 72 bpm | Trend: +2% | Reference: 60-100 bpm | Interpretation: Normal resting pulse.",
      "- Blood Pressure: 120/80 mmHg | Trend: Normal | Reference: <130/80 mmHg | Interpretation: Acceptable resting pressure.",
      "- Sleep Duration: 7.5 hours | Trend: +5% | Target: 7-9 hours | Interpretation: Adequate recovery window.",
      "- Stress Index: 42/100 | Trend: -8% | Range: 34-66 = moderate | Interpretation: Moderate stress burden.",
      "- Calories Burned: 1240 kcal/day | Trend: +15% | Interpretation: Positive activity engagement.",
      "- Entitlements: 3 active (2 new) | Interpretation: Current support benefits are available.",
      "",
      "Trend and Functional Correlation",
      "- Cardiovascular profile remains stable with normal heart rate and acceptable blood pressure.",
      "- Improved activity trend (+15%) and better sleep trend (+5%) support favorable recovery.",
      "- Persistent moderate stress suggests need for routine stress modulation despite improvement.",
      "",
      "Clinical Impression",
      "- Cardiometabolic Snapshot: Stable and low immediate concern based on current panel.",
      "- Recovery Profile: Satisfactory in this interval with adequate sleep duration.",
      "- Psychophysiological Load: Mild-to-moderate stress pattern; monitor for persistence.",
      "",
      "Risk Stratification",
      "- Immediate Cardiovascular Risk: Low (current resting vitals within expected limits).",
      "- Lifestyle Risk: Moderate (stress remains above low-risk band).",
      "- Follow-Up Priority: Routine monitoring with focused stress and recovery optimization.",
      "",
      "Doctor-Style Recommendations",
      "1. Maintain 30-45 minutes of moderate physical activity at least 5 days/week.",
      "2. Continue sleep hygiene: fixed bedtime, reduced late screen exposure, and caffeine cutoff after evening.",
      "3. Add daily stress regulation (10-15 min breathing, mindfulness, or relaxation protocol).",
      "4. Keep hydration and balanced diet consistent; avoid prolonged high-sodium/high-sugar intake.",
      "5. Reassess trend in 7 days; earlier review if stress index worsens or symptoms appear.",
      "",
      "Red-Flag Symptoms Requiring Prompt Clinical Review",
      "- Chest pain, unexplained shortness of breath, syncope, persistent severe headache, or palpitations.",
      "- Sustained BP elevation beyond usual readings or sudden abnormal heart-rate episodes.",
      "",
      "Follow-Up Plan",
      "- Daily: Monitor heart rate, blood pressure, sleep duration, and stress index.",
      "- Weekly: Review trend changes and adjust activity/recovery plan.",
      "- Clinical: Seek physician evaluation for persistent abnormalities or warning symptoms.",
      "",
      "Medical Disclaimer",
      "- This is an AI-generated monitoring report and not a confirmed medical diagnosis.",
      "- Final clinical decisions must be made by a licensed medical professional.",
    ].join("\n");
  };

  const downloadTextFallback = (content: string) => {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `svasthaai-detailed-medical-report-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadReport = async () => {
    try {
      toast({
        title: "Preparing Report",
        description: "Generating your health summary PDF...",
      });

      const response = await api.get("/medical-report/dashboard-summary/pdf", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `svastha-ai-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Report Downloaded",
        description: "Detailed medical report saved to your device.",
      });
    } catch (error) {
      console.error("PDF generation failed:", error);
      toast({
        variant: "destructive",
        title: "Download Failed",
        description: "The server encountered an error generating your PDF. Please try again later.",
      });
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-heading font-bold text-foreground">Health Overview</h1>
          <p className="text-muted-foreground mt-1 font-medium">Welcome back! Here's your status for today.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            className="rounded-xl border-border/50 bg-background/50 backdrop-blur-sm"
            onClick={handleDownloadReport}
          >
            Download Report
          </Button>
          <Button
            className="rounded-xl gradient-primary shadow-lg shadow-primary/20"
            onClick={() => navigate("/activity")}
          >
            <Plus className="w-4 h-4 mr-2" /> Log Activity
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <VitalCard
          icon={Heart}
          title="Heart Rate"
          value="72"
          unit="bpm"
          trend="+2%"
          trendUp={true}
          variant="coral"
        />
        <VitalCard
          icon={Activity}
          title="Blood Pressure"
          value="120/80"
          unit="mmHg"
          trend="Normal"
          trendUp={true}
          variant="primary"
        />
        <VitalCard
          icon={Flame}
          title="Calories Burned"
          value="1,240"
          unit="kcal"
          trend="+15%"
          trendUp={true}
          variant="info"
        />
        <VitalCard
          icon={Moon}
          title="Sleep Quality"
          value="7.5"
          unit="hours"
          trend="+5%"
          trendUp={true}
          variant="success"
        />
        <VitalCard
          icon={Zap}
          title="Stress Index"
          value="42"
          unit="/100"
          trend="-8%"
          trendUp={true}
          variant="coral"
        />
        <VitalCard
          icon={Accessibility}
          title="Entitlements"
          value="3"
          unit="Active"
          trend="2 New"
          trendUp={true}
          variant="primary"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        <div className="xl:col-span-8 space-y-8">
          <WeeklyChart />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <HeartRateMonitor />
            <ActivityFeed />
          </div>
        </div>
        <div className="xl:col-span-4 space-y-8">
          <QuickActions />
          <AchievementPanel />
          <div className="glass-card p-5 flex items-center justify-center">
            <ProgressRing value={72} max={100} label="Weekly Goal" sublabel="Activity completion" />
          </div>
        </div>
      </div>
    </div>
  );
}
