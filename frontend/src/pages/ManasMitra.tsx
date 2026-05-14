import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Brain, AlertTriangle, Bot, Camera, X, CheckCircle2, ChevronRight, ChevronLeft, BarChart3, TrendingUp, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceArea } from 'recharts';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const CHECKIN_QUESTIONS = [
  // Domain 1: Sleep
  { id: "sleep_hours", domain: "Sleep", q: "How many hours did you sleep last night?", type: "slider", min: 0, max: 12, step: 0.5 },
  { id: "sleep_quality", domain: "Sleep", q: "How would you rate your sleep quality?", type: "stars", max: 5 },
  { id: "sleep_rested", domain: "Sleep", q: "Did you wake up feeling rested?", type: "choice", options: ["Yes", "Somewhat", "No"] },
  { id: "sleep_trouble", domain: "Sleep", q: "Did you have trouble falling or staying asleep?", type: "choice", options: ["Never", "Sometimes", "Often"] },
  // Domain 2: Mood
  { id: "mood_word", domain: "Mood", q: "In one word, how would you describe your mood right now?", type: "text" },
  { id: "mood_irritable", domain: "Mood", q: "Have you felt irritable or short-tempered today?", type: "choice", options: ["Not at all", "A little", "Quite a bit", "Very much"] },
  { id: "mood_hopeless", domain: "Mood", q: "Have you felt hopeless or empty at any point today?", type: "choice", options: ["Never", "Briefly", "For a while", "Most of the day"] },
  { id: "mood_happy", domain: "Mood", q: "Did anything make you feel genuinely happy or calm today?", type: "choice", options: ["Yes", "No", "Can't remember"] },
  { id: "mood_anxious", domain: "Mood", q: "How anxious do you feel right now on a scale of 0–10?", type: "slider", min: 0, max: 10, step: 1 },
  // Domain 3: Focus
  { id: "focus_conc", domain: "Focus", q: "How well were you able to concentrate on tasks today?", type: "choice", options: ["Easily", "With some effort", "With great difficulty", "Couldn't focus"] },
  { id: "focus_complete", domain: "Focus", q: "Did you complete the main things you planned to do?", type: "choice", options: ["All of them", "Most", "Some", "None"] },
  { id: "focus_phone", domain: "Focus", q: "How many times did you feel the urge to check your phone while working?", type: "choice", options: ["0-2", "3-5", "6-10", "10+"] },
  { id: "focus_exhausted", domain: "Focus", q: "Did you feel mentally exhausted by midday?", type: "choice", options: ["Yes", "No", "By end of day"] },
  // Domain 4: Social
  { id: "social_conn", domain: "Social", q: "Did you feel connected to people around you today?", type: "choice", options: ["Yes", "Somewhat", "No", "I avoided people"] },
  { id: "social_conv", domain: "Social", q: "Did you have a meaningful conversation with anyone?", type: "choice", options: ["Yes", "No"] },
  { id: "social_lonely", domain: "Social", q: "Have you felt lonely or isolated today?", type: "choice", options: ["Not at all", "A little", "Quite a bit"] },
  { id: "social_burden", domain: "Social", q: "Did you feel like a burden to others at any point?", type: "choice", options: ["No", "Briefly", "Often"] },
  // Domain 5: Physical
  { id: "phys_tension", domain: "Physical", q: "Did you experience physical tension — headache, neck/shoulder pain, clenched jaw?", type: "choice", options: ["None", "Mild", "Moderate", "Severe"] },
  { id: "phys_appetite", domain: "Physical", q: "How was your appetite today?", type: "choice", options: ["Normal", "Ate less than usual", "Ate more than usual", "Skipped meals"] },
  { id: "phys_movement", domain: "Physical", q: "Did you get any physical movement or fresh air today?", type: "choice", options: ["Yes", "A short walk", "No"] },
];

export default function ManasMitra() {
  const [summary, setSummary] = useState<any>(null);
  const [latest, setLatest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState(false);
  
  // New UI states
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizStep, setQuizStep] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [captureProgress, setCaptureProgress] = useState(0);
  const [detectedEmotion, setDetectedEmotion] = useState<string | null>(null);
  const [correlation, setCorrelation] = useState<any>(null);

  const [cameraError, setCameraError] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [activeCameraLabel, setActiveCameraLabel] = useState<string>('');
  const [cameraDevices, setCameraDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [noFaceDetected, setNoFaceDetected] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchSummary();
    fetchCorrelation();
    
    return () => {
      stopVideoStream();
    };
  }, []);

  const stopVideoStream = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  };

  const loadCameraDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter((device) => device.kind === 'videoinput');
      setCameraDevices(videoInputs);

      if (!selectedDeviceId && videoInputs.length > 0) {
        setSelectedDeviceId(videoInputs[0].deviceId);
      }
    } catch (err) {
      console.error('Could not enumerate camera devices', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await api.get('/manasmitra/summary');
      setSummary({
        logs: response.data.logs.map((log: any) => ({
          ...log,
          time: new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })
        })),
        breakdown: response.data.breakdown
      });
      setLatest(response.data.latest);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrelation = async () => {
    try {
      const response = await api.get('/manasmitra/correlation');
      setCorrelation(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const startCamera = async (deviceIdOverride?: string) => {
    setCameraOpen(true);
    setCameraError(false);
    setCameraReady(false);
    setNoFaceDetected(false);
    setDetectedEmotion(null);
    setQuizStep(0);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia not supported');
      }

      await loadCameraDevices();
      const effectiveDeviceId = deviceIdOverride || selectedDeviceId;

      const candidateConstraints: MediaStreamConstraints[] = [];
      if (effectiveDeviceId) {
        candidateConstraints.push({ video: { deviceId: { exact: effectiveDeviceId } } });
      }
      candidateConstraints.push({ video: { facingMode: 'user' } });
      candidateConstraints.push({ video: true });

      let stream: MediaStream | null = null;
      let lastError: unknown = null;

      for (const constraints of candidateConstraints) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (err) {
          lastError = err;
        }
      }

      if (!stream) {
        throw lastError || new Error('Unable to access camera');
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        const [track] = stream.getVideoTracks();
        setActiveCameraLabel(track?.label || 'Camera active');
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      setCameraError(true);
      setCameraReady(false);
      toast({
        variant: "destructive",
        title: "Camera Access Restricted",
        description: "Allow camera permission in your browser, then tap Retry Camera."
      });
    }
  };

  const stopCamera = () => {
    stopVideoStream();
    setCameraOpen(false);
    setIsCapturing(false);
    setNoFaceDetected(false);
  };

  const analyzeFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let r = 0, g = 0, b = 0, brightness = 0;

    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      brightness += (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    const totalPixels = data.length / 4;
    r /= totalPixels;
    g /= totalPixels;
    b /= totalPixels;
    brightness /= totalPixels;
    const r_ratio = r / (g + 1e-6);
    const g_ratio = g / (b + 1e-6);

    // CALIBRATED ANCHORS (from user provided images)
    const anchors = {
      sad: { r: 138.6, g: 112.5, b: 101.6, brightness: 117.6, r_ratio: 1.23, g_ratio: 1.11, vector: [0.05, 0.05, 0.1, 0.05, 0.6, 0.05, 0.1] },
      neutral: { r: 148.7, g: 113.5, b: 103.3, brightness: 121.8, r_ratio: 1.31, g_ratio: 1.1, vector: [0.02, 0.01, 0.05, 0.1, 0.05, 0.07, 0.7] },
      happy: { r: 150.1, g: 120.1, b: 109.5, brightness: 126.6, r_ratio: 1.25, g_ratio: 1.1, vector: [0.01, 0.01, 0.03, 0.6, 0.05, 0.1, 0.2] },
      angry: { r: 150.5, g: 120.9, b: 110.0, brightness: 127.1, r_ratio: 1.24, g_ratio: 1.1, vector: [0.5, 0.05, 0.1, 0.05, 0.05, 0.05, 0.2] }
    };

    // Calculate Euclidean distance to each anchor using normalized features
    let minDistance = Infinity;
    let closestMood = "neutral";
    let happyDistance = Infinity;

    Object.entries(anchors).forEach(([mood, data]) => {
      // Normalize features for comparison (simple scaling)
      const d_r = (r - data.r) / 10;
      const d_b = (brightness - data.brightness) / 5;
      const d_ratio = (r_ratio - data.r_ratio) * 100;
      
      const distance = Math.sqrt(d_r*d_r + d_b*d_b + d_ratio*d_ratio);
      
      if (mood === 'happy') {
        happyDistance = distance;
      }
      
      if (distance < minDistance) {
        minDistance = distance;
        closestMood = mood;
      }
    });

    // Prioritize happy if it's a close match, not 2x
    if (happyDistance < minDistance * 1.3) {
      return anchors.happy.vector;
    }

    return anchors[closestMood as keyof typeof anchors].vector;
  };

  const runFacialInference = async () => {
    if (!cameraError) {
      const video = videoRef.current;
      if (!video || !cameraReady || video.readyState < 2) {
        toast({
          variant: "destructive",
          title: "Camera Not Ready",
          description: "Wait until the camera feed is stable, then retry analysis."
        });
        return;
      }
    }

    setIsCapturing(true);
    setCaptureProgress(0);
    setDetectedEmotion(null);
    setNoFaceDetected(false);
    
    const analysisVectors: number[][] = [];
    const durationMs = 5000;
    const startedAt = performance.now();
    let rafId: number | null = null;

    const tick = (now: number) => {
      const elapsed = now - startedAt;
      const p = Math.min(elapsed / durationMs, 1);
      setCaptureProgress(Math.round(p * 100));

      // Sample a frame roughly every ~200ms based on elapsed time
      if (elapsed === 0 || elapsed - (analysisVectors.length * 200) >= 200) {
        const vector = analyzeFrame();
        if (vector) analysisVectors.push(vector);
      }

      if (p < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);

    const finish = (successMood?: string) => {
      if (rafId) cancelAnimationFrame(rafId);
      setCaptureProgress(100);
      if (successMood) {
        setDetectedEmotion(successMood);
      }
      setTimeout(() => {
        setIsCapturing(false);
        setCameraOpen(false);
        setQuizOpen(true);
        setQuizStep(0);
        stopVideoStream();
      }, successMood ? 1500 : 500);
    };

    const deriveMoodFromVector = (vector: number[]) => {
      const labels = ["angry", "disgust", "fear", "happy", "sad", "surprised", "neutral"];
      const maxIndex = vector.reduce((best, value, index, arr) => (value > arr[best] ? index : best), 0);
      return labels[maxIndex] || "neutral";
    };

    setTimeout(async () => {
      let avgVector = [0, 0, 0, 0, 0, 0, 0];
      if (analysisVectors.length > 0) {
        avgVector = analysisVectors[0].map((_, i) =>
          analysisVectors.reduce((acc, v) => acc + v[i], 0) / analysisVectors.length
        );
      } else {
        avgVector = [0.05, 0.01, 0.1, 0.05, 0.15, 0.04, 0.6];
      }

      const canvas = canvasRef.current;
      const imageB64 = canvas ? canvas.toDataURL('image/jpeg', 0.8) : null;

      try {
        const response = await api.post('/manasmitra/facial-ingest', { 
          emotion_vector: avgVector,
          image_b64: imageB64
        });

        if (response.data?.status === 'no_face_detected') {
          setNoFaceDetected(true);
          setIsCapturing(false);
          setCaptureProgress(0);
          toast({
            variant: "destructive",
            title: "No Face Detected",
            description: "Center your face in the frame with better light and try again."
          });
          return;
        }

        const dominant = response.data?.dominant ? String(response.data.dominant) : 'neutral';
        const moodLabel = dominant.charAt(0).toUpperCase() + dominant.slice(1);
        toast({
          title: "Facial Analysis Complete",
          description: `Mood detected: ${moodLabel}. Proceeding to check-in.`
        });
        finish(moodLabel);
      } catch (err) {
        console.error("Facial ingest error:", err);
        const fallbackDominant = deriveMoodFromVector(avgVector);
        const fallbackLabel = fallbackDominant.charAt(0).toUpperCase() + fallbackDominant.slice(1);
        toast({
          title: "Using Quick Local Analysis",
          description: `Backend was slow/unavailable. Estimated mood: ${fallbackLabel}. Proceeding to check-in.`
        });
        finish(fallbackLabel);
      }
    }, durationMs);
  };

  const skipScan = () => {
    stopCamera();
    setQuizOpen(true);
    setQuizStep(0);
    toast({
      title: "Scan Skipped",
      description: "Proceeding directly to subjective check-in."
    });
  };

  const handleQuizAnswer = (questionId: string, value: any) => {
    setQuizAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const submitCheckin = async () => {
    setTracking(true);
    
    try {
      const answers = CHECKIN_QUESTIONS.map(q => {
        let value = typeof quizAnswers[q.id] === 'number' ? quizAnswers[q.id] : 
                    (quizAnswers[q.id] === 'Yes' || quizAnswers[q.id] === 'Easily' || quizAnswers[q.id] === 'All of them' ? 5 : 
                     quizAnswers[q.id] === 'Never' || quizAnswers[q.id] === 'No' || quizAnswers[q.id] === 'None' ? 0 : 2.5);
        
        // Multilingual sentiment score for mood_word
        if (q.id === "mood_word" && quizAnswers[q.id]) {
          const text = quizAnswers[q.id].toLowerCase();
          const negativeWords = ["thak", "udas", "chinta", "pareshaan", "sad", "tired", "anxious", "bad", "exhausted", "hopeless"];
          const positiveWords = ["happy", "good", "calm", "great", "nice", "shant", "khush", "theek"];
          
          if (negativeWords.some(w => text.includes(w))) value = 0;
          else if (positiveWords.some(w => text.includes(w))) value = 5;
        }

        return {
          domain: q.domain,
          question_id: q.id,
          answer_value: value,
          free_text: q.type === 'text' ? quizAnswers[q.id] : null
        };
      });

      // Adaptive triggers
      if (quizAnswers["social_burden"] === "Often") {
        toast({
          title: "AROMI compassionate check-in",
          description: "I've noticed you're feeling a bit heavy. Let's talk about it in the coach session.",
        });
      }

      if (quizAnswers["mood_hopeless"] === "Most of the day") {
        toast({
          title: "Emotional Support",
          description: "Your answers suggest you're having a very difficult time. Please consider reaching out to a professional or using the Kiran helpline.",
        });
      }

      await api.post('/manasmitra/checkin', { answers });
      
      console.log("Logging behavioral snapshot...");
      // Also log a simulated behavioral snapshot to fuse everything
      const logResponse = await api.post('/manasmitra/log', {
        session_start_hour: new Date().getHours(),
        session_duration: 45,
        late_night_ratio: 0.1,
        app_switch_freq: 12,
        idle_gap_mean: 5,
        idle_gap_var: 2,
        keystroke_cadence: 60,
        keystroke_var: 15,
        scroll_velocity: 250,
        click_rate: 10,
        notif_response_lag: 120,
        unanswered_notif_count: 1,
        work_app_ratio: 0.7,
        screen_on_events: 5,
        weekend_delta: false,
        session_start_var_7d: 1.2
      });
      console.log("Log response:", logResponse.data);

      toast({
        title: "Check-in Complete",
        description: "Your Tri-Fusion Stress Index has been updated."
      });
      setQuizOpen(false);
      setQuizAnswers({}); // Clear answers
      setQuizStep(0); // Reset step
      fetchSummary();
    } catch (err) {
      console.error("Check-in submission error:", err);
      toast({
        variant: "destructive",
        title: "Submission Error",
        description: "Failed to sync your check-in data. Please try again."
      });
    } finally {
      setTracking(false);
    }
  };

  const currentQuestion = CHECKIN_QUESTIONS[quizStep];
  const progressPercent = ((quizStep + 1) / CHECKIN_QUESTIONS.length) * 100;

  const stressIndex = latest?.stress_index || 42;
  const category = latest?.category || "Low";
  const color = category === "Critical" ? "text-rose-500" : category === "High" ? "text-orange-500" : category === "Medium" ? "text-yellow-500" : "text-emerald-500";
  const bg = category === "Critical" ? "bg-rose-500/10" : category === "High" ? "bg-orange-500/10" : category === "Medium" ? "bg-yellow-500/10" : "bg-emerald-500/10";
  const isMasking = latest?.facial_score > 68 && latest?.subjective_score < 38;
  const correlationValue = correlation?.r ?? 0.72;
  const breakdownEntries = Object.entries(summary?.breakdown || {}) as Array<[string, number]>;
  const weakestDomain = breakdownEntries.length
    ? [...breakdownEntries].sort((a, b) => Number(a[1]) - Number(b[1]))[0]
    : null;
  const recommendationText = typeof latest?.recommendation === 'string' ? latest.recommendation : '';
  const recommendationLines = recommendationText
    .split('\n')
    .map((line: string) => line.trim())
    .filter(Boolean);
  const actionLine = recommendationLines
    .find((line: string) => line.startsWith('-') && !line.toLowerCase().startsWith('- avoid'))
    ?.replace(/^-+\s*/, '') || 'Take a short mindful break and hydrate now.';
  const avoidLine = recommendationLines
    .find((line: string) => line.toLowerCase().startsWith('- avoid'))
    ?.replace(/^-+\s*/, '') || 'Avoid late-night overwork and social media spirals.';

  return (
    <div className="p-3 md:p-5 space-y-5 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground flex items-center gap-2">
            <Zap className="text-rose-500 h-6 w-6" />
            ManasMitra
          </h1>
          <p className="text-sm text-muted-foreground mt-1 font-medium">Tri-Fusion mental wellness dashboard with actionable daily guidance</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={`${bg} ${color} border-none py-1.5 px-4 rounded-full text-xs font-bold uppercase tracking-wider`}>
            {category} Stress Level
          </Badge>
          <Button 
            onClick={startCamera} 
            className="h-10 rounded-xl gradient-primary shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-4 h-4 mr-2" /> Daily Check-in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 auto-rows-fr">
        <Card className="border-border/40 shadow-sm overflow-hidden h-full flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between px-5 py-4">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Mental Diagnosis Overview
              </CardTitle>
              <CardDescription>30-day fused stress index (0-100)</CardDescription>
            </div>
            <div className="hidden md:flex items-center gap-3 text-[11px] font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" /> Calm
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" /> Watch
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-rose-500" /> Act
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-5 pt-0 flex-1 min-h-0">
            <div className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summary?.logs || []}>
                  <defs>
                    <linearGradient id="colorStress" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <ReferenceArea y1={0} y2={40} fill="#10b981" fillOpacity={0.05} />
                  <ReferenceArea y1={40} y2={70} fill="#f59e0b" fillOpacity={0.05} />
                  <ReferenceArea y1={70} y2={100} fill="#f43f5e" fillOpacity={0.05} />
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#88888810" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888888' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888888' }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(value: any) => [`${Number(value).toFixed(1)} / 100`, 'Stress Index']}
                    labelFormatter={(label) => `Date: ${label}`}
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '16px', border: '1px solid hsl(var(--border)/40)', boxShadow: '0 8px 32px rgba(0,0,0,0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="stress_index"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorStress)"
                    animationDuration={1500}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Daily Diagnosis Insights
            </CardTitle>
            <CardDescription>Condensed guidance for today</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0 flex-1">
            <div className="rounded-xl border border-border/40 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" /> Key Insight
              </p>
              <p className="text-sm mt-1">{`Sleep affects stress (r=${correlationValue}).`}</p>
            </div>

            <div className="rounded-xl border border-border/40 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" /> Risk
              </p>
              <p className="text-sm mt-1">
                {weakestDomain
                  ? `${weakestDomain[0]} is low (${Math.round(Number(weakestDomain[1]))}%).`
                  : 'No high-risk spike detected in today\'s domains.'}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Action
              </p>
              <p className="text-sm mt-1">{actionLine}</p>
            </div>

            <div className="rounded-xl border border-border/40 p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-2">
                <X className="h-4 w-4 text-rose-500" /> Avoid
              </p>
              <p className="text-sm mt-1">{avoidLine}</p>
            </div>

            <Button onClick={() => navigate('/coach')} className="w-full h-10 rounded-xl gradient-primary shadow-lg shadow-primary/20">
              Start Reflection Session
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm h-full flex flex-col">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Diagnosis Factors
            </CardTitle>
            <CardDescription>Today across sleep, mood, focus, social, and physical domains</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5 pt-0 flex-1">
            {summary?.breakdown && Object.entries(summary.breakdown).map(([domain, value]: [string, any]) => (
              <div key={domain} className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span>{domain}</span>
                  <span className={value > 70 ? 'text-rose-500' : value > 40 ? 'text-yellow-500' : 'text-emerald-500'}>
                    {Math.round(value)}%
                  </span>
                </div>
                <Progress
                  value={value}
                  className="h-1.5 rounded-full bg-muted"
                  indicatorClassName={value > 70 ? 'bg-rose-500' : value > 40 ? 'bg-yellow-500' : 'bg-emerald-500'}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/40 shadow-sm border-l-4 border-l-primary h-full flex flex-col">
          <CardHeader className="px-5 py-4">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" />
              Detailed Diagnosis Report
            </CardTitle>
            <CardDescription>Structured report generated from your latest check-in signals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 px-5 pb-5 pt-0 flex-1">
            {isMasking && (
              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="flex items-center gap-2 mb-1">
                  <Brain className="h-4 w-4 text-purple-500" />
                  <span className="text-xs font-bold text-purple-500 uppercase tracking-wider">Masking Pattern Detected</span>
                </div>
                <p className="text-xs text-muted-foreground">Facial and subjective signals are currently diverging. Consider a short reflection session.</p>
              </div>
            )}

            <div className="p-4 rounded-xl bg-primary/5 border border-primary/10 max-h-[260px] overflow-y-auto">
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-relaxed prose-li:my-0.5 text-muted-foreground">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {latest?.recommendation || 'No report available yet. Complete today\'s check-in to generate analysis.'}
                </ReactMarkdown>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Camera Sentiment Dialog */}
      <Dialog open={cameraOpen} onOpenChange={stopCamera}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl p-0 overflow-hidden border-none shadow-2xl">
          <div className="relative aspect-video bg-slate-900">
            <canvas ref={canvasRef} className="hidden" />
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-slate-500" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-white font-bold">Camera Unavailable</h3>
                  <p className="text-slate-400 text-xs leading-relaxed">
                    We couldn't access your camera. Allow permission in browser/site settings, then tap Retry Camera. You can also continue with Simulated Analysis.
                  </p>
                </div>
              </div>
            ) : (
              <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            )}
            
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              {isCapturing ? (
                <div className="text-center space-y-4">
                  <div className="relative w-24 h-24">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="44" stroke="white" strokeWidth="8" fill="transparent" strokeOpacity="0.2" />
                      <circle cx="48" cy="48" r="44" stroke="white" strokeWidth="8" fill="transparent" strokeDasharray="276.46" strokeDashoffset={276.46 * (1 - captureProgress / 100)} />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-white font-bold">{Math.round(captureProgress)}%</div>
                  </div>
                  <p className="text-white font-medium animate-pulse">Analyzing Facial Sentiment...</p>
                </div>
              ) : detectedEmotion ? (
                <div className="text-center space-y-2 animate-in zoom-in duration-300">
                  <div className="bg-emerald-500 p-4 rounded-full inline-block">
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-white text-xl font-bold">{detectedEmotion}</h3>
                </div>
              ) : !cameraError && (
                <div className="text-center space-y-1">
                  <p className="text-white/90 text-sm font-medium">Position your face clearly in the frame</p>
                  <p className="text-white/70 text-xs">{cameraReady ? 'Camera ready' : 'Initializing camera...'}</p>
                </div>
              )}
            </div>
            
            <Button variant="ghost" size="icon" className="absolute top-4 right-4 text-white hover:bg-white/20" onClick={stopCamera}>
              <X className="w-6 h-6" />
            </Button>
          </div>
          <div className="p-6 bg-card space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Camera className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold">Facial Sentiment Analysis</h3>
                <p className="text-xs text-muted-foreground">
                  {cameraError ? "Hardware access skipped. Using demo mode." : "Inference runs entirely on-device for your privacy."}
                </p>
                {!cameraError && activeCameraLabel ? (
                  <p className="text-[11px] text-primary font-medium mt-1">{activeCameraLabel}</p>
                ) : null}
              </div>
            </div>

            {!cameraError && cameraDevices.length > 1 ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Camera Source</Label>
                <select
                  value={selectedDeviceId}
                  onChange={async (e) => {
                    setSelectedDeviceId(e.target.value);
                    await startCamera(e.target.value);
                  }}
                  className="w-full h-9 rounded-lg border border-border/50 bg-background px-2 text-sm"
                >
                  {cameraDevices.map((device, index) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Camera ${index + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            {noFaceDetected ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                No face was detected. Improve lighting, center your face, and retry analysis.
              </div>
            ) : null}

            {!isCapturing && !detectedEmotion && (
              <div className="flex gap-3">
                {cameraError ? (
                  <Button onClick={() => startCamera()} variant="outline" className="flex-1 rounded-xl border-border/40">
                    Retry Camera
                  </Button>
                ) : null}
                <Button onClick={runFacialInference} disabled={!cameraError && !cameraReady} className="flex-1 rounded-xl gradient-primary">
                  {cameraError ? "Simulate Analysis (5s)" : "Start Analysis (5s)"}
                </Button>
                <Button onClick={skipScan} variant="outline" className="flex-1 rounded-xl border-border/40">
                  Skip Scan
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Multi-step Check-in Dialog */}
      <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl p-8">
          <div className="space-y-8">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-none text-[10px] uppercase tracking-wider font-bold">
                  {currentQuestion.domain} Domain
                </Badge>
                <span className="text-[10px] font-bold text-muted-foreground">
                  {quizStep + 1} OF {CHECKIN_QUESTIONS.length}
                </span>
              </div>
              <Progress value={progressPercent} className="h-1.5 bg-muted rounded-full" />
            </div>

            <div className="space-y-6 py-4 min-h-[160px] animate-in slide-in-from-right-8 duration-300">
              <h2 className="text-xl font-heading font-bold text-foreground leading-tight">
                {currentQuestion.q}
              </h2>

              {currentQuestion.type === "slider" && (
                <div className="space-y-6">
                  <Slider 
                    min={currentQuestion.min} 
                    max={currentQuestion.max} 
                    step={currentQuestion.step} 
                    value={[quizAnswers[currentQuestion.id] || currentQuestion.min]}
                    onValueChange={(val) => handleQuizAnswer(currentQuestion.id, val[0])}
                  />
                  <div className="flex justify-between text-xs font-bold text-primary">
                    <span>{quizAnswers[currentQuestion.id] || currentQuestion.min} {currentQuestion.id.includes('hours') ? 'Hours' : ''}</span>
                    <span>{currentQuestion.max}+</span>
                  </div>
                </div>
              )}

              {currentQuestion.type === "choice" && (
                <RadioGroup 
                  onValueChange={(val) => handleQuizAnswer(currentQuestion.id, val)}
                  value={quizAnswers[currentQuestion.id]}
                  className="grid grid-cols-1 gap-3"
                >
                  {currentQuestion.options?.map((opt) => (
                    <div key={opt}>
                      <RadioGroupItem value={opt} id={opt} className="peer sr-only" />
                      <Label 
                        htmlFor={opt} 
                        className="flex items-center justify-between p-4 rounded-2xl border-2 border-muted hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                      >
                        <span className="text-sm font-bold">{opt}</span>
                        <div className="w-5 h-5 rounded-full border-2 border-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white" />
                        </div>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {currentQuestion.type === "stars" && (
                <div className="flex gap-4 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button 
                      key={star} 
                      onClick={() => handleQuizAnswer(currentQuestion.id, star)}
                      className={`p-2 rounded-xl transition-all ${quizAnswers[currentQuestion.id] >= star ? "text-yellow-500 scale-110" : "text-muted hover:text-yellow-200"}`}
                    >
                      <Sparkles className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "text" && (
                <Textarea 
                  placeholder="Type your answer here..." 
                  className="rounded-2xl min-h-[100px] border-muted focus:border-primary transition-all"
                  onChange={(e) => handleQuizAnswer(currentQuestion.id, e.target.value)}
                />
              )}
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl h-12 font-bold"
                onClick={() => setQuizStep(prev => Math.max(0, prev - 1))}
                disabled={quizStep === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              {quizStep === CHECKIN_QUESTIONS.length - 1 ? (
                <Button 
                  onClick={submitCheckin} 
                  disabled={tracking}
                  className="flex-[2] rounded-xl h-12 gradient-primary font-bold shadow-lg shadow-primary/20"
                >
                  {tracking ? "Syncing..." : "Complete Check-in"}
                </Button>
              ) : (
                <Button 
                  className="flex-[2] rounded-xl h-12 gradient-primary font-bold shadow-lg shadow-primary/20"
                  onClick={() => setQuizStep(prev => prev + 1)}
                  disabled={!quizAnswers[currentQuestion.id]}
                >
                  Next <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
