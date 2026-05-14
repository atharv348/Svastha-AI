import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  FileText, Download, Printer, ArrowLeft, Shield,
  Activity, AlertTriangle, MessageSquare, CheckCircle2,
  Brain, Clock, User, Stethoscope, Sparkles, Heart,
  Eye, TrendingUp, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/services/api';

interface ReportData {
  report_header: {
    title: string;
    subtitle: string;
    institution: string;
    report_id: string;
    generated_at: string;
  };
  patient_info: {
    name: string;
    patient_id: string;
    age: number | null;
    gender: string | null;
    report_date: string;
    report_time: string;
    report_id: string;
  };
  scan_details: {
    body_region: string;
    scan_type: string;
    modality: string;
    scan_date: string;
  };
  clinical_findings: {
    primary_diagnosis: string;
    common_name: string;
    local_name_hindi: string;
    local_name_marathi: string;
    confidence_score: number;
    risk_level: string;
    clinical_description: string;
    specialist_referral: string;
  };
  care_plan: {
    immediate_actions: string[];
    monitoring_signs: string[];
    questions_for_doctor: string[];
  };
  ai_analysis_summary: string;
  model_metrics: {
    body_part: string;
    diagnostic_confidence: number;
  };
  disclaimer: string;
}

const riskColorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  CRITICAL: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30', glow: 'shadow-red-500/20' },
  HIGH: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30', glow: 'shadow-orange-500/20' },
  MODERATE: { bg: 'bg-yellow-500/10', text: 'text-yellow-700', border: 'border-yellow-500/30', glow: 'shadow-yellow-500/20' },
  LOW: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30', glow: 'shadow-emerald-500/20' },
};

const bodyPartIcons: Record<string, typeof Heart> = {
  skin: Shield,
  eye: Eye,
  oral: Stethoscope,
  bone: Activity,
  lungs: Heart,
  muac: TrendingUp,
};

export default function MedicalReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const predictionId = searchParams.get('id');
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!predictionId) {
      setError('No prediction ID provided');
      setLoading(false);
      return;
    }
    fetchReport();
  }, [predictionId]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/medical-report/json/${predictionId}`);
      setReport(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!predictionId) return;
    try {
      setDownloadingPdf(true);
      const response = await api.get(`/medical-report/pdf/${predictionId}`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `SvasthaAI_Report_${predictionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF Download Error:", err);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/25 animate-pulse">
              <FileText className="text-white" size={28} />
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse font-medium">Generating Medical Report...</p>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center space-y-4">
          <AlertTriangle className="mx-auto text-destructive" size={48} />
          <p className="text-lg font-semibold text-destructive">{error || 'Report not found'}</p>
          <Button variant="outline" onClick={() => navigate('/diagnosis')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Diagnosis
          </Button>
        </div>
      </div>
    );
  }

  const risk = riskColorMap[report.clinical_findings.risk_level] || riskColorMap.LOW;
  const BodyIcon = bodyPartIcons[report.model_metrics.body_part] || Brain;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* ── Top bar (hidden on print) ── */}
      <div className="print:hidden sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/diagnosis')} className="gap-2">
            <ArrowLeft size={16} /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer size={14} /> Print
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
              className="gap-2 bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20"
            >
              {downloadingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Download PDF
            </Button>
          </div>
        </div>
      </div>

      {/* ── Report content ── */}
      <div ref={reportRef} className="max-w-4xl mx-auto px-4 py-8 space-y-8 print:px-0 print:py-0">

        {/* ═══════ HEADER ═══════ */}
        <div className="text-center space-y-3 pb-6 border-b-2 border-teal-500/30 print:border-teal-600">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/25">
              <Sparkles className="text-white" size={22} />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                {report.report_header.title}
              </h1>
              <p className="text-sm text-muted-foreground">{report.report_header.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><FileText size={12} /> {report.report_header.report_id}</span>
            <span className="flex items-center gap-1"><Clock size={12} /> {report.report_header.generated_at}</span>
          </div>
        </div>

        {/* ═══════ PATIENT INFO ═══════ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <User size={16} className="text-teal-500" /> Patient Information
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Patient Name', value: report.patient_info.name },
              { label: 'Patient ID', value: report.patient_info.patient_id },
              { label: 'Age', value: report.patient_info.age ? `${report.patient_info.age} years` : 'N/A' },
              { label: 'Gender', value: report.patient_info.gender ? report.patient_info.gender.charAt(0).toUpperCase() + report.patient_info.gender.slice(1) : 'N/A' },
              { label: 'Report Date', value: report.patient_info.report_date },
              { label: 'Report Time', value: report.patient_info.report_time },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/50 bg-white dark:bg-slate-800/50 p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ SCAN DETAILS ═══════ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <BodyIcon size={16} className="text-teal-500" /> Scan Details
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Body Region', value: report.scan_details.body_region },
              { label: 'Scan Type', value: report.scan_details.scan_type },
              { label: 'Analysis Method', value: report.scan_details.modality },
              { label: 'Scan Date', value: report.scan_details.scan_date },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-border/50 bg-white dark:bg-slate-800/50 p-3 space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                <p className="text-sm font-semibold text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════ PRIMARY FINDINGS (Hero Card) ═══════ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Brain size={16} className="text-teal-500" /> Clinical Findings
          </h2>
          <div className={`rounded-2xl border-2 ${risk.border} ${risk.bg} p-6 shadow-lg ${risk.glow} space-y-4`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Primary Diagnosis</p>
                <h3 className="text-xl md:text-2xl font-bold text-foreground">{report.clinical_findings.primary_diagnosis}</h3>
                {report.clinical_findings.common_name && (
                  <p className="text-sm text-muted-foreground">Also known as: {report.clinical_findings.common_name}</p>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className={`px-4 py-2 rounded-xl font-bold text-sm ${risk.bg} ${risk.text} border ${risk.border}`}>
                  {report.clinical_findings.risk_level}
                </div>
                <div className="px-4 py-2 rounded-xl font-bold text-sm bg-teal-500/10 text-teal-600 border border-teal-500/20">
                  {report.clinical_findings.confidence_score}%
                </div>
              </div>
            </div>

            {/* Confidence bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground font-semibold uppercase tracking-wider">
                <span>Diagnostic Confidence</span>
                <span>{report.clinical_findings.confidence_score}%</span>
              </div>
              <div className="w-full h-2.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-cyan-500 rounded-full transition-all duration-1000"
                  style={{ width: `${report.clinical_findings.confidence_score}%` }}
                />
              </div>
            </div>

            {/* Multilingual names */}
            {(report.clinical_findings.local_name_hindi || report.clinical_findings.local_name_marathi) && (
              <div className="flex gap-3 flex-wrap">
                {report.clinical_findings.local_name_hindi && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/60 dark:bg-slate-700/60 border border-border/40">
                    🇮🇳 Hindi: {report.clinical_findings.local_name_hindi}
                  </span>
                )}
                {report.clinical_findings.local_name_marathi && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/60 dark:bg-slate-700/60 border border-border/40">
                    🏛️ Marathi: {report.clinical_findings.local_name_marathi}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Clinical description & specialist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-xl border border-border/50 bg-white dark:bg-slate-800/50 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Clinical Description</p>
              <p className="text-sm text-foreground/80 leading-relaxed">{report.clinical_findings.clinical_description}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-white dark:bg-slate-800/50 p-4 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Specialist Referral</p>
              <div className="flex items-center gap-2">
                <Stethoscope size={16} className="text-teal-500" />
                <p className="text-sm font-semibold text-foreground">{report.clinical_findings.specialist_referral}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ AI ANALYSIS SUMMARY ═══════ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Sparkles size={16} className="text-teal-500" /> AI Analysis Summary
          </h2>
          <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-br from-teal-500/5 via-cyan-500/5 to-teal-500/5 p-5">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {report.ai_analysis_summary.split('\n').filter(line => line.trim()).map((paragraph, i) => (
                <p key={i} className="text-sm text-foreground/80 leading-relaxed mb-2 last:mb-0">
                  {paragraph.replace(/\*\*/g, '').replace(/##/g, '').replace(/#/g, '')}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ CARE PLAN ═══════ */}
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            <Activity size={16} className="text-teal-500" /> Recommended Care Plan
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Immediate Actions */}
            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <Activity className="text-blue-500" size={16} />
                </div>
                <p className="text-sm font-bold text-blue-600 dark:text-blue-400">Immediate Actions</p>
              </div>
              <ul className="space-y-2">
                {report.care_plan.immediate_actions.map((action, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-2 leading-relaxed">
                    <span className="text-blue-500 font-bold mt-0.5 shrink-0">●</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>

            {/* Signs to Monitor */}
            <div className="rounded-2xl border border-orange-500/20 bg-orange-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/15 flex items-center justify-center">
                  <AlertTriangle className="text-orange-500" size={16} />
                </div>
                <p className="text-sm font-bold text-orange-600 dark:text-orange-400">Signs to Monitor</p>
              </div>
              <ul className="space-y-2">
                {report.care_plan.monitoring_signs.map((sign, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-2 leading-relaxed">
                    <span className="text-orange-500 font-bold mt-0.5 shrink-0">▲</span>
                    {sign}
                  </li>
                ))}
              </ul>
            </div>

            {/* Ask Your Doctor */}
            <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center">
                  <MessageSquare className="text-purple-500" size={16} />
                </div>
                <p className="text-sm font-bold text-purple-600 dark:text-purple-400">Ask Your Doctor</p>
              </div>
              <ul className="space-y-2">
                {report.care_plan.questions_for_doctor.map((q, idx) => (
                  <li key={idx} className="text-xs text-foreground/80 flex items-start gap-2 leading-relaxed">
                    <span className="text-purple-500 font-bold mt-0.5 shrink-0">?</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* ═══════ DISCLAIMER ═══════ */}
        <section className="rounded-xl border border-border/50 bg-slate-50 dark:bg-slate-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Shield size={14} className="text-muted-foreground" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Important Disclaimer</p>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{report.disclaimer}</p>
          <p className="text-[10px] text-muted-foreground italic">
            This report was auto-generated by SvasthaAI Health Intelligence Platform on {report.report_header.generated_at}.
            Powered by multi-organ CNN diagnostics and Llama-3 AI analysis.
          </p>
        </section>

        {/* ── Print-only footer ── */}
        <div className="hidden print:block text-center py-4 border-t border-border text-xs text-muted-foreground">
          <p>SvasthaAI Health Intelligence Platform • {report.report_header.report_id} • {report.report_header.generated_at}</p>
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:px-0 { padding-left: 0 !important; padding-right: 0 !important; }
          .print\\:py-0 { padding-top: 0 !important; padding-bottom: 0 !important; }
          .print\\:border-teal-600 { border-color: #0D9488 !important; }
          body { background: white !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        }
      `}</style>
    </div>
  );
}
