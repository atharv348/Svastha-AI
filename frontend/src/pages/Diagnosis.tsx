import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { Brain, Upload, Loader2, ScanLine, Info, CheckCircle2, Camera, Smartphone, RefreshCw, Pill, Sparkles, Activity, AlertTriangle, MessageSquare, FileText, Download } from "lucide-react";
import api from '../services/api';
import MultiDiseaseSelector, { AdvancedDiagnosisPayload } from "@/components/ai/MultiDiseaseSelector";
import EmergencySOSButton from "@/components/ai/EmergencySOSButton";

interface EnhancedDiagnosisResult {
  diagnosis_result?: {
    diagnosis?: string;
    confidence?: number | string;
    urgency_level?: string;
    recommendations?: string[];
    required_medicines?: string[];
    explanation?: string;
  };
  emergency_required?: boolean;
  recommended_actions?: string[];
}

interface MedicineRecommendation {
  medicine_name: string;
  generic_name?: string;
  category?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  side_effects?: string[];
  contraindications?: string[];
  pregnancy_safe?: boolean;
  price_inr?: number;
  prescription_required?: boolean;
  notes?: string;
}

interface MedicalReport {
  scan_meta: {
    body_part: string;
    scan_type: string;
    scan_date: string;
    specialist_needed: string;
  };
  conditions: Array<{
    rank: number;
    rank_label: string;
    condition: string;
    display_name: string;
    local_name: string;
    common_name: string;
    confidence: number;
    risk_level: string;
    what_it_means: string;
  }>;
  overall_risk: string;
  immediate_actions: string[];
  watch_for_signs: string[];
  ask_doctor: string[];
  next_step: string;
  disclaimer: string;
}

export default function Diagnosis() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [medicalReport, setMedicalReport] = useState<MedicalReport | null>(null);
  const [bodyPart, setBodyPart] = useState('skin');
  const [mode, setMode] = useState<'upload' | 'camera' | 'ip_webcam'>('upload');
  const [cameraActive, setCameraActive] = useState(false);
  const [ipUrl, setIpUrl] = useState('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<any>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const [enhancedLoading, setEnhancedLoading] = useState(false);
  const [enhancedResult, setEnhancedResult] = useState<EnhancedDiagnosisResult | null>(null);
  const [medicineRecommendations, setMedicineRecommendations] = useState<MedicineRecommendation[]>([]);
  const [medicineWarnings, setMedicineWarnings] = useState<string[]>([]);
  const [isPregnant, setIsPregnant] = useState(false);
  const [allergyInput, setAllergyInput] = useState('');
  const [allergies, setAllergies] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const setPreviewFromBlob = useCallback((blob: Blob) => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    const nextUrl = URL.createObjectURL(blob);
    previewUrlRef.current = nextUrl;
    setCapturedImage(nextUrl);
  }, []);

  const normalizeImageFile = useCallback(async (inputFile: File): Promise<File> => {
    const supportedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (supportedTypes.has(inputFile.type)) {
      return inputFile;
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.readAsDataURL(inputFile);
    });

    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('This image format is not supported. Please use JPG, PNG, or WEBP.'));
      img.src = dataUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to process image. Please try another file.');
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
          return;
        }
        reject(new Error('Unable to convert image for diagnosis.'));
      }, 'image/jpeg', 0.92);
    });

    const baseName = inputFile.name.replace(/\.[^/.]+$/, '');
    return new File([blob], `${baseName || 'diagnosis-image'}.jpg`, { type: 'image/jpeg' });
  }, []);

  const handleSelectedFile = useCallback(async (inputFile: File | null) => {
    if (!inputFile) return;

    setProcessingImage(true);
    try {
      const normalized = await normalizeImageFile(inputFile);
      setFile(normalized);
      setPreviewFromBlob(normalized);
      setResult(null);
      toast({ title: 'Image Ready', description: 'Image uploaded successfully and is ready for diagnosis.' });
    } catch (err: any) {
      setFile(null);
      toast({
        variant: 'destructive',
        title: 'Unsupported Image',
        description: err?.message || 'Please upload a JPG, PNG, or WEBP image.',
      });
    } finally {
      setProcessingImage(false);
    }
  }, [normalizeImageFile, setPreviewFromBlob, toast]);

  const loadVideoDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(device => device.kind === 'videoinput');
      setVideoDevices(videoInputs);
      
      // Auto-select laptop webcam (look for 'integrated', 'webcam', 'laptop' in label)
      if (videoInputs.length > 0) {
        const laptopCam = videoInputs.find(device => 
          device.label.toLowerCase().includes('integrated') ||
          device.label.toLowerCase().includes('webcam') ||
          device.label.toLowerCase().includes('laptop') ||
          device.label.toLowerCase().includes('built-in')
        );
        if (laptopCam) {
          setSelectedDeviceId(laptopCam.deviceId);
        } else {
          setSelectedDeviceId(videoInputs[0].deviceId);
        }
      }
    } catch (err) {
      console.error('Failed to load video devices:', err);
    }
  }, []);

  useEffect(() => {
    console.log('Diagnosis component mounted');
    fetchMetrics();
    fetchUserProfile();
    loadVideoDevices();
    return () => {
      console.log('Diagnosis component unmounting');
      stopCamera();
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, [loadVideoDevices]);

  const fetchMetrics = async () => {
    try {
      const response = await api.get('/predictions/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error("Failed to fetch metrics:", err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/users/me');
      setUserProfile(response.data);
    } catch {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    if (mode === 'camera' && cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [mode, cameraActive]);

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API not available');
      }
      
      // Use selected device or default
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      
      if (selectedDeviceId) {
        constraints.video = {
          ...constraints.video,
          deviceId: { exact: selectedDeviceId }
        };
      }
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      
      // Reload devices after getting permission to get proper labels
      await loadVideoDevices();
    } catch (err) {
      console.error("Camera access error:", err);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check if your webcam is connected and permissions are granted.",
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const captureFrame = () => {
    try {
      if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        if (!video.videoWidth || !video.videoHeight) {
          toast({
            variant: 'destructive',
            title: 'Camera Not Ready',
            description: 'Please wait a moment and try capturing again.',
          });
          return;
        }

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const capturedFile = new File([blob], "capture.jpg", { type: "image/jpeg" });
            setPreviewFromBlob(blob);
            void handleSelectedFile(capturedFile);
            setResult(null);
            setCameraActive(false);
          }
        }, 'image/jpeg', 0.92);
      }
    } catch (err) {
      console.error("Capture error:", err);
      toast({
        variant: "destructive",
        title: "Capture Failed",
        description: "An error occurred while taking the picture.",
      });
    }
  };

  const handleIpWebcamCapture = async () => {
    if (!ipUrl) {
      toast({ variant: "destructive", title: "Missing Link", description: "Please enter your phone camera image link (e.g., http://192.168.1.5:8080/shot.jpg)" });
      return;
    }
    
    setLoading(true);
    try {
      // We'll try to fetch the image from the IP URL. 
      // Note: This might hit CORS issues if the IP Webcam doesn't have CORS enabled.
      // A workaround is to proxy through backend, but let's try direct first.
      const response = await fetch(ipUrl);
      if (!response.ok) {
        throw new Error(`IP webcam returned HTTP ${response.status}`);
      }
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('image/')) {
        throw new Error('The provided URL did not return an image');
      }
      const blob = await response.blob();
      const capturedFile = new File([blob], "ip_capture.jpg", { type: "image/jpeg" });
      setPreviewFromBlob(blob);
      await handleSelectedFile(capturedFile);
      setResult(null);
      toast({ title: "Image Captured", description: "Successfully retrieved image from your phone camera link." });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Phone Camera Link Error",
        description: "Could not fetch image from the provided link. Please make sure the link is reachable.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePredict = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processingImage) {
      toast({
        title: 'Preparing image',
        description: 'Please wait for image processing to finish, then submit again.',
      });
      return;
    }
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('body_part', bodyPart);

    try {
      const response = await api.post('/predictions/predict', formData, {
        params: { body_part: bodyPart },
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const diagnosisResult = response.data;
      console.log('Diagnosis result received:', diagnosisResult);
      
      // Check if it's the new medical report format
      if (diagnosisResult && diagnosisResult.scan_meta && diagnosisResult.conditions) {
        setMedicalReport(diagnosisResult);
        // Also store in result so report action buttons can access result.id
        setResult(diagnosisResult);
      } else {
        // Fallback to old format for backward compatibility
        setResult(diagnosisResult);
        setMedicalReport(null);
      }
      
      toast({
        title: "Report Ready",
        description: "Your medical diagnosis result is ready.",
      });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.detail;
      toast({
        variant: "destructive",
        title: "Prediction Failed",
        description: typeof serverMessage === 'string' ? serverMessage : "Error processing the image. Please try another clear image.",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEnhancedAnalyze = async (payload: AdvancedDiagnosisPayload) => {
    setEnhancedLoading(true);
    try {
      const diagnosisPayload = {
        selected_diseases: payload.selectedDiseaseIds,
        symptoms: payload.symptomIds,
        symptom_labels: payload.symptomLabels,
        severity: payload.severity,
        patient_info: {
          age: userProfile?.age,
          gender: userProfile?.gender,
          weight: userProfile?.current_weight,
          medical_history: [],
        },
      };

      const diagnosisResponse = await api.post('/enhanced/diagnose', diagnosisPayload);
      const diagnosisData = diagnosisResponse.data || {};
      const rawDiagnosis = diagnosisData?.diagnosis || {};

      const normalizedDiagnosis = {
        diagnosis:
          diagnosisData?.diagnosis_result?.diagnosis ||
          rawDiagnosis?.diagnosis ||
          'Clinical assessment generated',
        confidence:
          diagnosisData?.diagnosis_result?.confidence ??
          rawDiagnosis?.confidence ??
          0,
        urgency_level:
          diagnosisData?.diagnosis_result?.urgency_level ||
          rawDiagnosis?.severity_assessment ||
          payload.severity,
        recommendations:
          diagnosisData?.diagnosis_result?.recommendations ||
          rawDiagnosis?.context_sources ||
          [],
        required_medicines:
          diagnosisData?.diagnosis_result?.required_medicines ||
          (Array.isArray(diagnosisData?.catalog_medicines)
            ? diagnosisData.catalog_medicines
                .map((med: any) => med?.name || med?.generic_name)
                .filter((name: any) => typeof name === 'string' && name.trim().length > 0)
            : []),
        explanation:
          diagnosisData?.diagnosis_result?.explanation ||
          (Array.isArray(rawDiagnosis?.context_sources) && rawDiagnosis.context_sources.length > 0
            ? `Context sources: ${rawDiagnosis.context_sources.join(', ')}`
            : undefined),
      };

      const normalizedRecommendedActions = Array.isArray(diagnosisData?.recommended_actions)
        ? diagnosisData.recommended_actions
        : Array.isArray(normalizedDiagnosis.recommendations)
        ? normalizedDiagnosis.recommendations
        : [];

      const normalizedEmergencyRequired =
        Boolean(diagnosisData?.emergency_required) ||
        ['critical', 'severe'].includes(String(normalizedDiagnosis.urgency_level || '').toLowerCase());

      setEnhancedResult({
        diagnosis_result: normalizedDiagnosis,
        recommended_actions: normalizedRecommendedActions,
        emergency_required: normalizedEmergencyRequired,
      });

      const medicineResponse = await api.post('/enhanced/medicines/recommendations', {
        diagnosis:
          diagnosisResponse.data?.diagnosis_result?.diagnosis ||
          diagnosisResponse.data?.diagnosis?.diagnosis ||
          payload.selectedDiseaseNames.join(', ') ||
          'Medical condition',
        patient_age: Number(userProfile?.age) || 30,
        is_pregnant: isPregnant,
        allergies,
        disease_ids: payload.selectedDiseaseIds,
      });

      const medicineData = medicineResponse.data || {};
      const medicineRows = Array.isArray(medicineData?.recommended_medicines)
        ? medicineData.recommended_medicines
        : Array.isArray(medicineData?.catalog_recommendations)
        ? medicineData.catalog_recommendations
        : [];

      // Combine and deduplicate medicines from both sources
      const diagnoseMedicines = normalizedDiagnosis.required_medicines || [];
      const allMedicines = [
        ...diagnoseMedicines.map((med: any) => ({
          medicine_name: typeof med === 'string' ? med : (med?.medicine_name || med?.name || med?.generic_name),
          generic_name: typeof med === 'string' ? undefined : med?.generic_name,
          category: typeof med === 'string' ? undefined : med?.category,
          dosage: typeof med === 'string' ? undefined : med?.dosage,
          frequency: typeof med === 'string' ? undefined : med?.frequency,
          duration: typeof med === 'string' ? undefined : med?.duration,
          notes: typeof med === 'string' ? undefined : med?.notes,
        })),
        ...medicineRows.map((med: any) => ({
          medicine_name: med?.medicine_name || med?.name || med?.generic_name,
          generic_name: med?.generic_name,
          category: med?.category,
          dosage: med?.dosage,
          frequency: med?.frequency,
          duration: med?.duration,
          side_effects: Array.isArray(med?.side_effects) ? med.side_effects : [],
          contraindications: Array.isArray(med?.contraindications) ? med.contraindications : [],
          pregnancy_safe: typeof med?.pregnancy_safe === 'boolean' ? med.pregnancy_safe : undefined,
          price_inr: typeof med?.price_inr === 'number' ? med.price_inr : undefined,
          prescription_required: typeof med?.prescription_required === 'boolean' ? med.prescription_required : undefined,
          notes: med?.notes,
        }))
      ];

      const uniqueMedicinesMap = new Map();
      allMedicines.forEach(med => {
        if (!med.medicine_name) return;
        const key = med.medicine_name.toLowerCase().trim();
        if (!uniqueMedicinesMap.has(key)) {
          uniqueMedicinesMap.set(key, med);
        } else {
          // Merge existing with new, keeping non-undefined values
          const existing = uniqueMedicinesMap.get(key);
          const merged = { ...existing };
          Object.keys(med).forEach(prop => {
            if (med[prop] !== undefined && (existing[prop] === undefined || (Array.isArray(med[prop]) && med[prop].length > 0))) {
              merged[prop] = med[prop];
            }
          });
          uniqueMedicinesMap.set(key, merged);
        }
      });

      setMedicineRecommendations(Array.from(uniqueMedicinesMap.values()));

      const normalizedWarnings = [
        ...(Array.isArray(medicineData?.warnings) ? medicineData.warnings : []),
      ];

      if (typeof medicineData?.safety_note === 'string' && medicineData.safety_note.trim()) {
        normalizedWarnings.push(medicineData.safety_note.trim());
      }

      if (typeof medicineData?.ai_recommendations === 'string' && medicineData.ai_recommendations.trim()) {
        normalizedWarnings.push(`Clinical guidance: ${medicineData.ai_recommendations.trim()}`);
      }

      setMedicineWarnings(
        normalizedWarnings
      );

      toast({
        title: 'Detailed Guidance Ready',
        description: 'Your detailed diagnosis and medicine guidance are ready.',
      });
    } catch (err: any) {
      const serverMessage = err?.response?.data?.detail;
      toast({
        variant: 'destructive',
        title: 'Detailed Guidance Failed',
        description:
          typeof serverMessage === 'string'
            ? serverMessage
            : 'Unable to generate detailed medical guidance right now. Please try again shortly.',
      });
    } finally {
      setEnhancedLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 md:p-6 space-y-6 overflow-y-auto">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground">Medical Diagnosis Dashboard</h1>
          <p className="text-sm text-muted-foreground">Upload scan images, add symptoms, and get clear medical guidance in one place</p>
        </div>
        <div className="flex gap-2 p-1 bg-muted rounded-2xl border border-border/40">
          <Button 
            variant={mode === 'upload' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('upload'); setCameraActive(false); }}
            className="rounded-xl h-9 px-4"
          >
            <Upload className="w-4 h-4 mr-2" /> Upload
          </Button>
          <Button 
            variant={mode === 'camera' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('camera'); setCameraActive(true); }}
            className="rounded-xl h-9 px-4"
          >
            <Camera className="w-4 h-4 mr-2" /> Camera
          </Button>
          <Button 
            variant={mode === 'ip_webcam' ? 'default' : 'ghost'} 
            size="sm" 
            onClick={() => { setMode('ip_webcam'); setCameraActive(false); }}
            className="rounded-xl h-9 px-4"
          >
            <Smartphone className="w-4 h-4 mr-2" /> Phone Link
          </Button>
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Clinical Review Area</p>
      </div>

      <div className="space-y-6">
        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/40">
            <CardTitle className="flex items-center gap-2">
              <Upload className="text-primary" size={20} />
              Patient Details and Scan
            </CardTitle>
            <CardDescription>Add scan details and symptoms for a complete medical review</CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 1: Scan Details</p>
                <p className="text-sm text-muted-foreground">Select body area, choose scan source, and generate your report.</p>

                <form onSubmit={handlePredict} className="space-y-4 rounded-2xl border border-border/40 bg-muted/10 p-4">
                  <div className="space-y-3">
                    <Label>Body Area</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {['skin', 'eye', 'oral', 'bone', 'lungs', 'muac'].map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setBodyPart(p)}
                          className={`px-3 py-2 text-xs font-semibold rounded-xl border-2 transition-all ${
                            bodyPart === p
                              ? 'border-primary bg-primary/10 text-primary shadow-sm'
                              : 'border-border/50 hover:border-border hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {p.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label>Scan Source</Label>
                    
                    {/* Camera selector */}
                    {mode === 'camera' && videoDevices.length > 1 && (
                      <div className="space-y-2">
                        <Label htmlFor="camera-select">Select Camera</Label>
                        <select
                          id="camera-select"
                          value={selectedDeviceId || ''}
                          onChange={(e) => {
                            setSelectedDeviceId(e.target.value);
                            if (cameraActive) {
                              stopCamera();
                              setCameraActive(false);
                            }
                          }}
                          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
                        >
                          {videoDevices.map((device) => (
                            <option key={device.deviceId} value={device.deviceId}>
                              {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {mode === 'upload' && (
                      <div
                        className={`relative border-2 border-dashed rounded-2xl p-5 md:p-6 text-center transition-all min-h-[160px] flex items-center justify-center ${
                          file ? 'border-primary bg-primary/5' : 'border-border/50 hover:border-primary/50'
                        }`}
                        onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (e.dataTransfer.files?.[0]) {
                            void handleSelectedFile(e.dataTransfer.files[0]);
                          }
                        }}
                      >
                        <input
                          type="file"
                          id="file-upload"
                          className="hidden"
                          onChange={(e) => {
                            void handleSelectedFile(e.target.files?.[0] || null);
                          }}
                          accept="image/*"
                        />
                        {capturedImage ? (
                          <div className="absolute inset-0 w-full h-full p-2">
                            <div className="relative w-full h-full rounded-xl overflow-hidden group">
                              <img src={capturedImage} alt="Selected" className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <label htmlFor="file-upload" className="cursor-pointer bg-white/20 hover:bg-white/30 p-3 rounded-full backdrop-blur-md transition-all">
                                  <Upload className="text-white" size={24} />
                                </label>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="file-upload" className="cursor-pointer space-y-3 block w-full">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
                              <ScanLine className={file ? 'text-primary' : 'text-muted-foreground'} size={24} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold">{file ? file.name : 'Tap or drag scan image to upload'}</p>
                              <p className="text-xs text-muted-foreground mt-1">Supports PNG, JPG, WEBP up to 10MB</p>
                            </div>
                          </label>
                        )}
                      </div>
                    )}

                    {mode === 'camera' && (
                      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border-2 border-border/50">
                        {cameraActive ? (
                          <>
                            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              {!videoRef.current?.srcObject && (
                                <div className="text-center p-6 bg-black/60 backdrop-blur-sm rounded-2xl border border-white/10 animate-in fade-in zoom-in">
                                  <Camera size={40} className="text-white/40 mx-auto mb-3" />
                                  <p className="text-sm font-medium text-white/90">Allow camera access to start scan</p>
                                  <p className="text-[10px] text-white/50 mt-1">Check your browser permission settings</p>
                                </div>
                              )}
                            </div>
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                              <Button type="button" onClick={captureFrame} className="rounded-full w-14 h-14 p-0 gradient-primary shadow-lg shadow-primary/40 border-2 border-white/20">
                                <Camera size={24} />
                              </Button>
                              <Button type="button" variant="secondary" onClick={() => setCameraActive(false)} className="rounded-full w-14 h-14 p-0 bg-white/10 hover:bg-white/20 border-white/10 backdrop-blur-md">
                                <RefreshCw size={24} className="text-white" />
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-white gap-4 bg-muted/5">
                            {capturedImage ? (
                              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
                            ) : (
                              <div className="text-center space-y-3">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                  <Camera size={32} className="text-muted-foreground" />
                                </div>
                                <p className="text-sm font-medium text-muted-foreground">Ready to capture clinical scan</p>
                              </div>
                            )}
                            <Button type="button" variant="secondary" onClick={() => setCameraActive(true)} className="rounded-xl shadow-sm">
                              {capturedImage ? <RefreshCw className="mr-2 h-4 w-4" /> : <Camera className="mr-2 h-4 w-4" />}
                              {capturedImage ? 'Retake Photo' : 'Start Camera'}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {mode === 'ip_webcam' && (
                      <div className="space-y-4">
                        <div className="flex gap-2">
                          <Input
                            placeholder="http://192.168.1.5:8080/shot.jpg"
                            value={ipUrl}
                            onChange={(e) => setIpUrl(e.target.value)}
                            className="rounded-xl"
                          />
                          <Button type="button" onClick={handleIpWebcamCapture} disabled={loading} className="rounded-xl gradient-primary">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Smartphone className="h-4 w-4" />}
                          </Button>
                        </div>
                        <div className="p-4 rounded-2xl border border-dashed border-border/40 bg-muted/5">
                          {capturedImage ? (
                            <div className="relative rounded-xl overflow-hidden aspect-video">
                              <img src={capturedImage} alt="Captured from IP" className="w-full h-full object-cover" />
                              <div className="absolute top-2 left-2 px-2 py-1 rounded bg-black/60 text-[10px] text-white font-bold">LIVE FEED CAPTURE</div>
                            </div>
                          ) : (
                            <div className="py-8 text-center space-y-3">
                              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                                <Smartphone size={32} className="text-muted-foreground" />
                              </div>
                              <p className="text-sm font-medium text-muted-foreground">Phone Link (IP Webcam)</p>
                              <p className="text-xs text-muted-foreground max-w-[200px] mx-auto leading-relaxed">
                                Enter the 'shot.jpg' URL from your IP Webcam app to sync your phone camera.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                  </div>

                  <Button type="submit" disabled={loading || processingImage || !file} className="w-full gradient-primary hover:opacity-90 transition-all rounded-xl py-6 shadow-lg shadow-primary/20">
                    {loading || processingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Medical Report'}
                  </Button>
                </form>
              </div>

              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 2: Symptoms and Severity</p>
                <p className="text-sm text-muted-foreground">Add symptoms, possible conditions, and severity for detailed guidance.</p>
                <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-4">
                  <div className="rounded-xl border border-border/40 bg-background/70 p-3 space-y-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Medicine Safety Filters</p>
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="pregnancy-toggle" className="text-xs text-foreground/80">Pregnancy consideration</Label>
                      <input
                        id="pregnancy-toggle"
                        type="checkbox"
                        checked={isPregnant}
                        onChange={(e) => setIsPregnant(e.target.checked)}
                        className="h-4 w-4 accent-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="allergy-input" className="text-xs text-foreground/80">Known allergies (optional)</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="allergy-input"
                          placeholder="e.g., penicillin"
                          value={allergyInput}
                          onChange={(e) => setAllergyInput(e.target.value)}
                          className="h-8 text-xs rounded-lg"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className="h-8"
                          onClick={() => {
                            const value = allergyInput.trim();
                            if (!value) return;
                            if (allergies.some((a) => a.toLowerCase() === value.toLowerCase())) {
                              setAllergyInput('');
                              return;
                            }
                            setAllergies((prev) => [...prev, value]);
                            setAllergyInput('');
                          }}
                        >
                          Add
                        </Button>
                      </div>
                      {allergies.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {allergies.map((allergy) => (
                            <button
                              key={allergy}
                              type="button"
                              className="px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/25 text-[11px] text-orange-700"
                              onClick={() => setAllergies((prev) => prev.filter((item) => item !== allergy))}
                              title="Click to remove"
                            >
                              {allergy} x
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <MultiDiseaseSelector onAnalyze={handleEnhancedAnalyze} loading={enhancedLoading} variant="embedded" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm overflow-hidden">
          <CardHeader className="bg-muted/20 border-b border-border/40">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-primary" size={20} />
              Medical Findings and Guidance
            </CardTitle>
            <CardDescription>
              View likely condition, severity, care plan, and medicine guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-4">
                <div className="space-y-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 3: Clinical Findings</p>
                </div>

                {(() => {
                  const backendBase = api.defaults.baseURL?.replace(/\/api$/, '') || '';
                  const backendPreviewPath =
                    typeof result?.image_path === 'string' && result.image_path
                      ? `${backendBase}/${String(result.image_path).replace(/\\/g, '/').replace(/^\/+/, '')}`
                      : null;
                  const previewSrc = capturedImage || backendPreviewPath;

                  if (!previewSrc) {
                    return (
                      <div className="rounded-2xl border border-dashed border-border/40 bg-muted/10 p-8 text-center">
                        <Brain size={36} className="text-muted-foreground mx-auto mb-3" />
                        <p className="text-sm font-medium text-muted-foreground">Upload or capture a scan image to view medical findings.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="relative rounded-2xl overflow-hidden border border-border/40 bg-black aspect-video">
                      <img src={previewSrc} alt="Diagnosis preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-rose-500/20 pointer-events-none" />
                      <div className="absolute top-2 left-2 text-[10px] px-2 py-1 rounded-md bg-black/60 text-white uppercase tracking-wide font-semibold">
                        Scan Preview
                      </div>
                      <div className="absolute bottom-2 right-2 text-[10px] px-2 py-1 rounded-md bg-primary/80 text-primary-foreground uppercase tracking-wide font-semibold">
                        Clinical View
                      </div>
                    </div>
                  );
                })()}

                {medicalReport ? (
                  <>
                    {medicalReport.conditions.map((condition) => (
                      <div key={condition.rank} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">{condition.rank_label}</p>
                          <p className="text-xl font-heading font-bold mt-1 text-foreground">{condition.display_name}</p>
                          <p className="text-sm text-foreground/70 mt-1">{condition.what_it_means}</p>
                        </div>
                        <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                          condition.risk_level === 'CRITICAL' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                          condition.risk_level === 'HIGH' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                          condition.risk_level === 'MODERATE' ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' :
                          'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                        }`}>
                          {condition.risk_level}
                        </div>
                      </div>
                    ))}

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Diagnostic Confidence</span>
                        <span>
                          {medicalReport.conditions.length > 0 ? `${medicalReport.conditions[0].confidence.toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary transition-all duration-1000"
                          style={{ width: `${medicalReport.conditions.length > 0 ? medicalReport.conditions[0].confidence : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-start gap-3">
                        <Activity className="text-blue-500 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-blue-600">Immediate Actions</p>
                          <ul className="mt-2 space-y-1">
                            {medicalReport.immediate_actions.map((action, idx) => (
                              <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                                <span className="text-blue-500 font-bold">•</span>
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="text-orange-500 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-orange-600">Watch For Signs</p>
                          <ul className="mt-2 space-y-1">
                            {medicalReport.watch_for_signs.map((sign, idx) => (
                              <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                                <span className="text-orange-500 font-bold">•</span>
                                {sign}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10">
                      <div className="flex items-start gap-3">
                        <MessageSquare className="text-purple-500 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-purple-600">Ask Your Doctor</p>
                          <ul className="mt-2 space-y-1">
                            {medicalReport.ask_doctor.map((question, idx) => (
                              <li key={idx} className="text-sm text-foreground/80 flex items-start gap-2">
                                <span className="text-purple-500 font-bold">•</span>
                                {question}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="text-emerald-500 mt-1" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-emerald-600">Next Step</p>
                          <p className="text-sm text-foreground/80 mt-1">{medicalReport.next_step}</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-gray-100/50 border border-gray-200">
                      <p className="text-xs text-gray-500">{medicalReport.disclaimer}</p>
                    </div>

                    {/* Report Actions */}
                    {result?.id && (
                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 rounded-xl h-11 border-teal-500/30 text-teal-600 hover:bg-teal-500/10"
                          onClick={() => navigate(`/medical-report?id=${result.id}`)}
                        >
                          <FileText size={16} /> View Full Report
                        </Button>
                        <Button
                          className="flex-1 gap-2 rounded-xl h-11 bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20"
                          onClick={async () => {
                            const predictionId = result.id;
                            if (!predictionId) return;
                            
                            try {
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
                              
                              toast({
                                title: "Report Downloaded",
                                description: "Your PDF medical report has been saved.",
                              });
                            } catch (err) {
                              console.error("PDF Download Error:", err);
                              toast({
                                variant: "destructive",
                                title: "Download Failed",
                                description: "Could not generate or download the PDF. Please try again.",
                              });
                            }
                          }}
                        >
                          <Download size={16} /> Download PDF Report
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/40">
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Likely Condition</p>
                        <p className="text-xl font-heading font-bold mt-1 text-foreground">{result?.predicted_name || 'Waiting for scan result'}</p>
                      </div>
                      <div className={`px-4 py-2 rounded-xl font-bold text-sm ${
                        String(result?.priority || 'low') === 'critical' ? 'bg-destructive/10 text-destructive border border-destructive/20' :
                        String(result?.priority || 'low') === 'high' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' :
                        'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                      }`}>
                        {String(result?.priority || 'pending').toUpperCase()}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        <span>Diagnostic Confidence</span>
                        <span>
                          {result ? `${(Number(result.confidence || 0) * 100).toFixed(1)}%` : '0.0%'}
                        </span>
                      </div>
                      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full gradient-primary transition-all duration-1000"
                          style={{ width: `${result ? Number(result.confidence || 0) * 100 : 0}%` }}
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                      <div className="flex items-start gap-3">
                        <Info className="text-primary mt-1" size={18} />
                        <div>
                          <p className="text-sm font-semibold text-primary">Medical Summary</p>
                          <p className="text-sm text-foreground/80 mt-1 leading-relaxed">
                            {result?.ai_advice || 'Generate your report to see personalized medical next steps.'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Report Actions for legacy format */}
                    {result?.id && (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Button
                          variant="outline"
                          className="flex-1 gap-2 rounded-xl h-11 border-teal-500/30 text-teal-600 hover:bg-teal-500/10"
                          onClick={() => navigate(`/medical-report?id=${result.id}`)}
                        >
                          <FileText size={16} /> View Full Report
                        </Button>
                        <Button
                          className="flex-1 gap-2 rounded-xl h-11 bg-gradient-to-r from-teal-600 to-cyan-600 text-white hover:from-teal-700 hover:to-cyan-700 shadow-md shadow-teal-500/20"
                          onClick={async () => {
                            const predictionId = result.id;
                            if (!predictionId) return;
                            
                            try {
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
                              
                              toast({
                                title: "Report Downloaded",
                                description: "Your PDF medical report has been saved.",
                              });
                            } catch (err) {
                              console.error("PDF Download Error:", err);
                              toast({
                                variant: "destructive",
                                title: "Download Failed",
                                description: "Could not generate or download the PDF. Please try again.",
                              });
                            }
                          }}
                        >
                          <Download size={16} /> Download PDF Report
                        </Button>
                      </div>
                    )}

                    {result && metrics && metrics[bodyPart] ? (
                      <div className="rounded-2xl border border-border/40 bg-muted/10 p-4 space-y-3">
                        <p className="text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                          <Brain size={16} className="text-primary" />
                          {bodyPart?.toUpperCase() || ''} Clinical Reliability
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Diagnosis Match</p>
                            <p className="text-lg font-bold text-primary">{((metrics[bodyPart]?.accuracy || 0) * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Consistency</p>
                            <p className="text-lg font-bold text-foreground">{((metrics[bodyPart]?.f1 || 0) * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Report Precision</p>
                            <p className="text-lg font-bold text-foreground">{((metrics[bodyPart]?.precision || 0) * 100).toFixed(1)}%</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-[10px] font-bold text-muted-foreground uppercase">Cases Reviewed</p>
                            <p className="text-lg font-bold text-foreground">{(metrics[bodyPart]?.samples || 0).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Section 4: Treatment Guidance</p>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="text-primary" size={16} />
                    Detailed Diagnosis and Medicine Guidance
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Guidance based on your symptoms, severity, and condition selection.
                  </p>
                </div>

                {enhancedLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Preparing detailed medical guidance...
                  </div>
                ) : enhancedResult ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-border/50 p-4 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-foreground">
                          {enhancedResult.diagnosis_result?.diagnosis || 'Clinical assessment generated'}
                        </p>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                            enhancedResult.diagnosis_result?.urgency_level === 'critical'
                              ? 'bg-destructive/15 text-destructive border border-destructive/30'
                              : enhancedResult.diagnosis_result?.urgency_level === 'high'
                              ? 'bg-orange-500/15 text-orange-600 border border-orange-500/30'
                              : 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                          }`}
                        >
                          {(enhancedResult.diagnosis_result?.urgency_level || 'moderate').toUpperCase()}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {enhancedResult.diagnosis_result?.explanation ||
                          'Detailed medical review is complete. Please consult a clinician for final confirmation.'}
                      </p>

                      <div className="space-y-1">
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Confidence Score</p>
                        <p className="text-sm font-semibold text-primary">
                          {(() => {
                            const rawConfidence = Number(enhancedResult.diagnosis_result?.confidence || 0);
                            const normalizedConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
                            return `${normalizedConfidence.toFixed(1)}%`;
                          })()}
                        </p>
                      </div>

                      {Array.isArray(enhancedResult.recommended_actions) && enhancedResult.recommended_actions.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Care Plan</p>
                          <ul className="space-y-1 text-sm text-foreground/90">
                            {enhancedResult.recommended_actions.slice(0, 5).map((action, idx) => (
                              <li key={`${action}-${idx}`} className="rounded-lg bg-muted/30 px-3 py-2 border border-border/40">
                                {action}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-border/50 p-4 space-y-3">
                      <p className="text-sm font-semibold flex items-center gap-2">
                        <Pill size={15} className="text-primary" />
                        Medicine Recommendations
                      </p>

                      {medicineRecommendations.length > 0 ? (
                        <div className="space-y-2">
                          {medicineRecommendations.map((med, idx) => (
                            <div key={`${med.medicine_name}-${idx}`} className="rounded-lg border border-border/40 bg-muted/20 px-3 py-2">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold">{med.medicine_name}</p>
                                  {med.generic_name ? (
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Generic: {med.generic_name}</p>
                                  ) : null}
                                </div>
                                <div className="flex items-center gap-1.5 flex-wrap justify-end">
                                  {med.category ? (
                                    <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide bg-primary/10 text-primary border border-primary/20">
                                      {med.category}
                                    </span>
                                  ) : null}
                                  {typeof med.prescription_required === 'boolean' ? (
                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wide border ${
                                      med.prescription_required
                                        ? 'bg-orange-500/10 text-orange-700 border-orange-500/25'
                                        : 'bg-emerald-500/10 text-emerald-700 border-emerald-500/25'
                                    }`}>
                                      {med.prescription_required ? 'Rx Needed' : 'OTC'}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {[med.dosage, med.frequency, med.duration].filter(Boolean).join(' • ') || 'Use only as advised by a clinician.'}
                              </p>
                              <div className="mt-1 flex items-center gap-2 flex-wrap text-[11px]">
                                {typeof med.price_inr === 'number' ? (
                                  <span className="text-foreground/80">Approx price: INR {med.price_inr.toFixed(0)}</span>
                                ) : null}
                                {typeof med.pregnancy_safe === 'boolean' ? (
                                  <span className={`font-medium ${med.pregnancy_safe ? 'text-emerald-700' : 'text-orange-700'}`}>
                                    {med.pregnancy_safe ? 'Pregnancy-safe (contextual)' : 'Pregnancy caution'}
                                  </span>
                                ) : null}
                              </div>
                              {Array.isArray(med.side_effects) && med.side_effects.length > 0 ? (
                                <p className="text-[11px] text-foreground/80 mt-1">
                                  Side effects: {med.side_effects.join(', ')}
                                </p>
                              ) : null}
                              {Array.isArray(med.contraindications) && med.contraindications.length > 0 ? (
                                <p className="text-[11px] text-foreground/80 mt-1">
                                  Avoid if: {med.contraindications.join(', ')}
                                </p>
                              ) : null}
                              {med.notes ? <p className="text-xs text-foreground/80 mt-1">{med.notes}</p> : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No medicine guidance was generated for the current selection.</p>
                      )}

                      {medicineWarnings.length > 0 ? (
                        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3">
                          <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-1">Safety Notes</p>
                          <ul className="space-y-1 text-xs text-orange-700">
                            {medicineWarnings.map((warning, idx) => (
                              <li key={`${warning}-${idx}`}>{warning}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>

                    {enhancedResult.emergency_required ? (
                      <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive font-medium">
                        Serious condition indicators detected. Please use Emergency SOS for immediate help.
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/40 p-6 text-sm text-muted-foreground">
                    Add symptoms and possible conditions to receive detailed treatment guidance.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmergencySOSButton />
    </div>
  );
}
