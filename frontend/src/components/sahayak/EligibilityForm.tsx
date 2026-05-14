import { useState } from "react";
import { User, FileText, IndianRupee, MapPin, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { MultiSelect } from "@/components/ui/multi-select";
import api from "@/services/api";

export interface EligibilityProfile {
  disabilityType: string[];
  disabilityPercentage: number;
  annualIncome: number;
  state: string;
  age: number;
  gender: string;
  documentsAvailable: string[];
}

interface EligibilityFormProps {
  onSubmit: (profile: EligibilityProfile) => void;
}

const DISABILITY_TYPES = [
  "Visual Disability",
  "Hearing Disability",
  "Locomotor Disability",
  "Intellectual Disability",
  "Mental Illness",
  "Cerebral Palsy",
  "Autism Spectrum",
  "Multiple Disabilities",
  "Chronic Neurological",
  "Blood Disorder",
  "Acid Attack Victim",
  "Muscular Dystrophy",
  "Speech & Language",
  "Dwarfism",
  "Leprosy Cured",
  "Multiple Sclerosis",
  "Parkinson's Disease",
  "Sickle Cell Disease",
  "Thalassemia",
  "Hemophilia",
  "Specific Learning Disability",
];

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
];

const DOCUMENTS = [
  "UDID Card",
  "Aadhaar Card",
  "Disability Certificate",
  "Income Certificate",
  "Ration Card (BPL)",
  "Domicile Certificate",
  "Bank Account",
  "Voter ID",
  "PAN Card",
];

const EligibilityForm = ({ onSubmit }: EligibilityFormProps) => {
  const [profile, setProfile] = useState<EligibilityProfile>({
    disabilityType: [],
    disabilityPercentage: 40,
    annualIncome: 0,
    state: "",
    age: 0,
    gender: "",
    documentsAvailable: [],
  });

  const toggleDocument = (doc: string) => {
    setProfile((prev) => ({
      ...prev,
      documentsAvailable: prev.documentsAvailable.includes(doc)
        ? prev.documentsAvailable.filter((d) => d !== doc)
        : [...prev.documentsAvailable, doc],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Sync with backend profile
    try {
      const backendProfile = {
        disability_type: profile.disabilityType[0] || "",
        disability_types: profile.disabilityType,
        disability_percentage: profile.disabilityPercentage,
        income_annual: profile.annualIncome,
        state: profile.state,
      };
      await api.post("/sahayak/profile", backendProfile);
      console.log("Backend profile synced");
    } catch (err) {
      console.error("Failed to sync profile to backend:", err);
      // Even if sync fails, we still proceed with the local UI update
    }
    
    onSubmit(profile);
  };

  return (
    <section id="eligibility-form" className="px-0 py-0">
      <div className="mx-auto max-w-6xl">
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 md:p-5">
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground md:text-3xl">Check Your Eligibility</h2>
            <p className="mt-1.5 text-muted-foreground">
              Tell us about yourself - schemes will be ranked by how quickly you can apply.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-4 h-4 text-primary" /> Age
              </Label>
              <Input
                type="number"
                min={0}
                max={120}
                placeholder="Enter your age"
                value={profile.age || ""}
                onChange={(e) => setProfile({ ...profile, age: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <User className="w-4 h-4 text-primary" /> Gender
              </Label>
              <Select value={profile.gender} onValueChange={(v) => setProfile({ ...profile, gender: v })}>
                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <FileText className="w-4 h-4 text-primary" /> Disability Type
              </Label>
              <MultiSelect
                value={profile.disabilityType}
                onValueChange={(v) => setProfile({ ...profile, disabilityType: v })}
                placeholder="Select one or more disability types"
                options={DISABILITY_TYPES.map((t) => ({ label: t, value: t }))}
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                Disability Percentage (%)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 40"
                value={profile.disabilityPercentage || ""}
                onChange={(e) => setProfile({ ...profile, disabilityPercentage: Number(e.target.value) })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <IndianRupee className="w-4 h-4 text-primary" /> Annual Income (Rs)
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="e.g. 200000"
                value={profile.annualIncome || ""}
                onChange={(e) => setProfile({ ...profile, annualIncome: Number(e.target.value) })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-foreground font-medium">
                <MapPin className="w-4 h-4 text-primary" /> State
              </Label>
              <Select value={profile.state} onValueChange={(v) => setProfile({ ...profile, state: v })}>
                <SelectTrigger><SelectValue placeholder="Select state" /></SelectTrigger>
                <SelectContent>
                  {INDIAN_STATES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div>
              <Label className="text-lg font-semibold text-foreground">
                Documents you already have
              </Label>
              <p className="mt-0.5 text-sm text-muted-foreground">Helps rank schemes by ease of application.</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-3">
              {DOCUMENTS.map((doc) => (
                <label
                  key={doc}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm cursor-pointer transition-all ${
                    profile.documentsAvailable.includes(doc)
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-foreground hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={profile.documentsAvailable.includes(doc)}
                    onCheckedChange={() => toggleDocument(doc)}
                  />
                  {doc}
                </label>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            className="h-11 w-full rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
          >
            Find My Schemes <ChevronRight className="w-5 h-5 ml-2" />
          </Button>
        </form>
      </div>
    </section>
  );
};

export default EligibilityForm;
