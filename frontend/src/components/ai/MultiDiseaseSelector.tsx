import { useEffect, useMemo, useState } from "react";
import { AlertCircle, Loader2, Stethoscope } from "lucide-react";

import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { MultiSelect } from "@/components/ui/multi-select";

export type EnhancedSeverity = "mild" | "moderate" | "severe" | "critical";

export interface AdvancedDiagnosisPayload {
  selectedDiseaseIds: number[];
  selectedDiseaseNames: string[];
  symptomIds: number[];
  symptomLabels: string[];
  severity: EnhancedSeverity;
}

interface DiseaseDto {
  id: number;
  name: string;
  category?: string;
  severity_level?: string;
  description?: string;
}

interface SymptomDto {
  id: number;
  name: string;
  body_part?: string;
  description?: string;
}

interface MultiDiseaseSelectorProps {
  onAnalyze: (payload: AdvancedDiagnosisPayload) => void | Promise<void>;
  loading?: boolean;
  variant?: "card" | "embedded";
}

const severityChoices: EnhancedSeverity[] = ["mild", "moderate", "severe", "critical"];

const normalizeDiseases = (payload: unknown): DiseaseDto[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is DiseaseDto => Boolean(item && typeof item === "object" && "id" in item && "name" in item))
      .map((item) => ({ ...item }));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;

  if (Array.isArray(record.diseases)) {
    return normalizeDiseases(record.diseases);
  }

  return Object.entries(record).flatMap(([category, entries]) => {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .filter((entry): entry is DiseaseDto => Boolean(entry && typeof entry === "object" && "id" in entry && "name" in entry))
      .map((entry) => ({
        ...entry,
        category: entry.category || category,
      }));
  });
};

const normalizeSymptoms = (payload: unknown): SymptomDto[] => {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is SymptomDto => Boolean(item && typeof item === "object" && "id" in item && "name" in item))
      .map((item) => ({ ...item }));
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const record = payload as Record<string, unknown>;
  if (Array.isArray(record.symptoms)) {
    return normalizeSymptoms(record.symptoms);
  }

  return [];
};

export function MultiDiseaseSelector({ onAnalyze, loading = false, variant = "card" }: MultiDiseaseSelectorProps) {
  const [diseases, setDiseases] = useState<DiseaseDto[]>([]);
  const [symptoms, setSymptoms] = useState<SymptomDto[]>([]);
  const [selectedDiseaseIds, setSelectedDiseaseIds] = useState<string[]>([]);
  const [selectedSymptomIds, setSelectedSymptomIds] = useState<string[]>([]);
  const [severity, setSeverity] = useState<EnhancedSeverity>("moderate");
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const diseaseById = useMemo(
    () => new Map(diseases.map((item) => [String(item.id), item])),
    [diseases]
  );

  const symptomById = useMemo(
    () => new Map(symptoms.map((item) => [String(item.id), item])),
    [symptoms]
  );

  useEffect(() => {
    let alive = true;

    const fetchCatalog = async () => {
      setBootstrapping(true);
      setError(null);

      try {
        // Keep catalog current for existing databases and new deployments.
        try {
          await api.post("/enhanced/catalog/seed");
        } catch {
          // If seeding is unavailable, continue with existing catalog data.
        }

        const [diseasesRes, symptomsRes] = await Promise.all([
          api.get("/enhanced/diseases"),
          api.get("/enhanced/symptoms"),
        ]);

        const flattenedDiseases = normalizeDiseases(diseasesRes.data);
        const normalizedSymptoms = normalizeSymptoms(symptomsRes.data);

        if (!alive) {
          return;
        }

        setDiseases(flattenedDiseases);
        setSymptoms(normalizedSymptoms);

        if (flattenedDiseases.length === 0 && normalizedSymptoms.length === 0) {
          setError("Medical catalog is empty. Please check backend connection or seed the catalog.");
        }
      } catch (err: any) {
        if (!alive) {
          return;
        }

        const detail = err?.response?.data?.detail;
        setError(typeof detail === "string" ? detail : "Unable to load the medical condition list.");
      } finally {
        if (alive) {
          setBootstrapping(false);
        }
      }
    };

    void fetchCatalog();

    return () => {
      alive = false;
    };
  }, []);

  const diseaseOptions = useMemo(
    () =>
      diseases.map((disease) => ({
        value: String(disease.id),
        label: disease.category ? `${disease.name} (${disease.category})` : disease.name,
      })),
    [diseases]
  );

  const symptomOptions = useMemo(
    () =>
      symptoms.map((symptom) => ({
        value: String(symptom.id),
        label: symptom.body_part ? `${symptom.name} (${symptom.body_part})` : symptom.name,
      })),
    [symptoms]
  );

  const submit = async () => {
    const diseaseIds = selectedDiseaseIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));
    const symptomIds = selectedSymptomIds.map((id) => Number(id)).filter((id) => Number.isFinite(id));

    const payload: AdvancedDiagnosisPayload = {
      selectedDiseaseIds: diseaseIds,
      selectedDiseaseNames: selectedDiseaseIds
        .map((id) => diseaseById.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
      symptomIds,
      symptomLabels: selectedSymptomIds
        .map((id) => symptomById.get(id)?.name)
        .filter((name): name is string => Boolean(name)),
      severity,
    };

    await onAnalyze(payload);
  };

  const disabled = loading || bootstrapping || selectedSymptomIds.length === 0;

  const content = (
    <>
      {bootstrapping ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading medical conditions and symptoms...
        </div>
      ) : null}

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5" />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="space-y-3">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 1: Symptoms and Conditions</p>

        <div className="space-y-2">
          <Label>Current Symptoms</Label>
          <MultiSelect
            options={symptomOptions}
            value={selectedSymptomIds}
            onValueChange={setSelectedSymptomIds}
            placeholder="Select all symptoms you currently have"
            maxVisibleBadges={4}
            emptyMessage="No symptoms available. Check backend connection or catalog seed."
          />
        </div>

        <div className="space-y-2">
          <Label>Possible Conditions</Label>
          <MultiSelect
            options={diseaseOptions}
            value={selectedDiseaseIds}
            onValueChange={setSelectedDiseaseIds}
            placeholder="Select one or more possible conditions"
            maxVisibleBadges={3}
            emptyMessage="No conditions available. Check backend connection or catalog seed."
          />
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 2: Condition Severity</p>
        <Label>Current Severity</Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {severityChoices.map((choice) => (
            <Button
              key={choice}
              type="button"
              variant={severity === choice ? "default" : "outline"}
              className="capitalize"
              onClick={() => setSeverity(choice)}
            >
              {choice}
            </Button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">Section 3: Generate Guidance</p>
        <Button type="button" className="w-full" disabled={disabled} onClick={() => void submit()}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Generate Detailed Medical Guidance
        </Button>
      </div>
    </>
  );

  if (variant === "embedded") {
    return <div className="space-y-5">{content}</div>;
  }

  return (
    <Card className="border-border/40 shadow-xl overflow-hidden">
      <CardHeader className="bg-muted/20 border-b border-border/40">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Stethoscope className="text-primary" size={18} />
          Symptoms and Severity
        </CardTitle>
        <CardDescription>Add symptoms, pick possible conditions, set severity, and generate guidance.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 p-4">{content}</CardContent>
    </Card>
  );
}

export default MultiDiseaseSelector;
