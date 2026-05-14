import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Clock, Filter, Trash2, Info, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const activities = [
  { type: "Workout", title: "Generated workout plan", description: "Intermediate Muscle Gain routine", date: "Today, 10:45 AM", status: "completed" },
  { type: "Diagnosis", title: "AI Diagnosis complete", description: "Skin scan - Melanocytic Nevi (Normal)", date: "Yesterday, 4:20 PM", status: "completed" },
  { type: "Meal", title: "Created meal plan", description: "7-day vegetarian weight loss plan", date: "Yesterday, 9:15 AM", status: "completed" },
  { type: "Vitals", title: "Logged heart rate", description: "Resting heart rate - 72 bpm", date: "2 days ago", status: "completed" },
];

export default function ActivityLog() {
  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Activity Log</h1>
          <p className="text-sm text-muted-foreground">Detailed history of all your health actions</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="rounded-xl">
            <Filter size={14} className="mr-2" />
            Filter
          </Button>
          <Button variant="outline" size="sm" className="rounded-xl text-destructive hover:bg-destructive/10">
            <Trash2 size={14} className="mr-2" />
            Clear Log
          </Button>
        </div>
      </div>

      <Card className="border-border/40 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/40">
          <CardTitle className="flex items-center gap-2">
            <Clock className="text-primary" size={20} />
            History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/40">
            {activities.map((a, i) => (
              <div key={i} className="p-4 hover:bg-muted/30 transition-colors flex items-start justify-between">
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                    <Activity className="text-primary" size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-primary uppercase tracking-wider">{a.type}</span>
                      <span className="text-[10px] text-muted-foreground">•</span>
                      <span className="text-[10px] text-muted-foreground">{a.date}</span>
                    </div>
                    <h3 className="text-sm font-bold text-foreground mt-1">{a.title}</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">{a.description}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={10} />
                    COMPLETED
                  </div>
                  <Button variant="ghost" size="sm" className="h-7 text-xs rounded-lg hover:bg-muted transition-colors">
                    <Info size={12} className="mr-1" />
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
