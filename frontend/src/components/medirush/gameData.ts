// ── MediRush Game Data ──────────────────────────────────────────────

export type Urgency = 1 | 2 | 3 | 4 | 5;

export type ConditionKey =
  | "fever"
  | "fracture"
  | "infection"
  | "dehydration"
  | "cardiac"
  | "burn"
  | "allergy"
  | "migraine"
  | "asthma"
  | "food_poisoning";

export type DepartmentKey =
  | "triage"
  | "general_ward"
  | "icu"
  | "lab"
  | "pharmacy"
  | "surgery"
  | "er";

export type UpgradeKey =
  | "beds"
  | "nurses"
  | "lab"
  | "icu"
  | "medicine"
  | "ambulance"
  | "infection_control";

export interface Condition {
  key: ConditionKey;
  name: string;
  emoji: string;
  urgency: Urgency;
  department: DepartmentKey;
  treatment: string;
  wrongTreatments: string[];
  baseReward: number;
  patienceSeconds: number;
  description: string;
}

export interface Department {
  key: DepartmentKey;
  name: string;
  emoji: string;
  color: string;
  description: string;
}

export interface UpgradeDef {
  key: UpgradeKey;
  name: string;
  emoji: string;
  description: string;
  effect: string;
  baseCost: number;
  costMultiplier: number;
  maxLevel: number;
}

export interface PatientName {
  first: string;
  last: string;
}

// ── Patient Names ─────────────────────────────────────────────────

export const PATIENT_FIRST_NAMES = [
  "Aarav", "Priya", "Rahul", "Sneha", "Vikram", "Anjali", "Rohan", "Meera",
  "Arjun", "Kavya", "Dev", "Isha", "Karan", "Nisha", "Siddharth", "Pooja",
  "Amit", "Riya", "Raj", "Divya", "Omar", "Fatima", "Yuki", "Chen",
  "Maria", "James", "Sofia", "Liam", "Emma", "Noah", "Olivia", "Aiden",
];

export const PATIENT_LAST_NAMES = [
  "Sharma", "Patel", "Singh", "Kumar", "Gupta", "Mehta", "Joshi", "Reddy",
  "Nair", "Rao", "Khan", "Ahmed", "Tanaka", "Wang", "Garcia", "Smith",
  "Johnson", "Williams", "Brown", "Davis", "Wilson", "Martinez", "Lee",
];

// ── Conditions ────────────────────────────────────────────────────

export const CONDITIONS: Record<ConditionKey, Condition> = {
  fever: {
    key: "fever",
    name: "High Fever",
    emoji: "🌡️",
    urgency: 2,
    department: "general_ward",
    treatment: "Paracetamol & Rest",
    wrongTreatments: ["Surgery", "Insulin"],
    baseReward: 20,
    patienceSeconds: 45,
    description: "Temperature above 102°F, needs antipyretics",
  },
  fracture: {
    key: "fracture",
    name: "Bone Fracture",
    emoji: "🦴",
    urgency: 3,
    department: "surgery",
    treatment: "Cast & Splint",
    wrongTreatments: ["Antibiotics", "Paracetamol"],
    baseReward: 40,
    patienceSeconds: 35,
    description: "Suspected fracture, needs imaging and immobilization",
  },
  infection: {
    key: "infection",
    name: "Bacterial Infection",
    emoji: "🦠",
    urgency: 3,
    department: "lab",
    treatment: "Antibiotics Course",
    wrongTreatments: ["Cast & Splint", "Insulin"],
    baseReward: 35,
    patienceSeconds: 40,
    description: "Signs of bacterial infection, needs culture and antibiotics",
  },
  dehydration: {
    key: "dehydration",
    name: "Severe Dehydration",
    emoji: "💧",
    urgency: 2,
    department: "general_ward",
    treatment: "IV Fluids & ORS",
    wrongTreatments: ["Surgery", "Antibiotics Course"],
    baseReward: 25,
    patienceSeconds: 50,
    description: "Severely dehydrated, needs fluid resuscitation",
  },
  cardiac: {
    key: "cardiac",
    name: "Cardiac Emergency",
    emoji: "❤️‍🩹",
    urgency: 5,
    department: "icu",
    treatment: "Emergency CPR & Meds",
    wrongTreatments: ["Paracetamol & Rest", "Cast & Splint"],
    baseReward: 100,
    patienceSeconds: 15,
    description: "Critical cardiac event, immediate intervention needed",
  },
  burn: {
    key: "burn",
    name: "Burn Injury",
    emoji: "🔥",
    urgency: 3,
    department: "er",
    treatment: "Cool Water & Dressing",
    wrongTreatments: ["Insulin", "Antibiotics Course"],
    baseReward: 30,
    patienceSeconds: 35,
    description: "Second-degree burn, needs cooling and sterile dressing",
  },
  allergy: {
    key: "allergy",
    name: "Allergic Reaction",
    emoji: "🤧",
    urgency: 4,
    department: "er",
    treatment: "Epinephrine & Antihistamine",
    wrongTreatments: ["Cast & Splint", "IV Fluids & ORS"],
    baseReward: 50,
    patienceSeconds: 20,
    description: "Anaphylactic reaction, needs immediate epinephrine",
  },
  migraine: {
    key: "migraine",
    name: "Severe Migraine",
    emoji: "🤕",
    urgency: 1,
    department: "general_ward",
    treatment: "Pain Relief & Dark Room",
    wrongTreatments: ["Surgery", "Emergency CPR & Meds"],
    baseReward: 15,
    patienceSeconds: 60,
    description: "Intense headache with sensitivity to light and sound",
  },
  asthma: {
    key: "asthma",
    name: "Asthma Attack",
    emoji: "😮‍💨",
    urgency: 4,
    department: "er",
    treatment: "Bronchodilator Inhaler",
    wrongTreatments: ["Cast & Splint", "Paracetamol & Rest"],
    baseReward: 45,
    patienceSeconds: 25,
    description: "Acute bronchospasm, needs immediate respiratory support",
  },
  food_poisoning: {
    key: "food_poisoning",
    name: "Food Poisoning",
    emoji: "🤢",
    urgency: 2,
    department: "general_ward",
    treatment: "Anti-emetics & Hydration",
    wrongTreatments: ["Surgery", "Epinephrine & Antihistamine"],
    baseReward: 20,
    patienceSeconds: 45,
    description: "Nausea, vomiting, needs fluid support and anti-emetics",
  },
};

export const CONDITION_KEYS = Object.keys(CONDITIONS) as ConditionKey[];

// ── Departments ───────────────────────────────────────────────────

export const DEPARTMENTS: Record<DepartmentKey, Department> = {
  triage: {
    key: "triage",
    name: "Triage",
    emoji: "🏷️",
    color: "bg-amber-500",
    description: "Initial assessment and sorting",
  },
  general_ward: {
    key: "general_ward",
    name: "General Ward",
    emoji: "🛏️",
    color: "bg-sky-500",
    description: "Standard care for stable patients",
  },
  icu: {
    key: "icu",
    name: "ICU",
    emoji: "🫀",
    color: "bg-rose-500",
    description: "Intensive care for critical patients",
  },
  lab: {
    key: "lab",
    name: "Laboratory",
    emoji: "🔬",
    color: "bg-purple-500",
    description: "Diagnostics and testing",
  },
  pharmacy: {
    key: "pharmacy",
    name: "Pharmacy",
    emoji: "💊",
    color: "bg-emerald-500",
    description: "Medicine dispensary",
  },
  surgery: {
    key: "surgery",
    name: "Surgery",
    emoji: "🔪",
    color: "bg-indigo-500",
    description: "Surgical procedures",
  },
  er: {
    key: "er",
    name: "Emergency Room",
    emoji: "🚨",
    color: "bg-red-500",
    description: "Emergency treatments",
  },
};

// ── Upgrades ──────────────────────────────────────────────────────

export const UPGRADES: Record<UpgradeKey, UpgradeDef> = {
  beds: {
    key: "beds",
    name: "More Beds",
    emoji: "🛏️",
    description: "Increase ward capacity",
    effect: "+2 bed capacity per level",
    baseCost: 100,
    costMultiplier: 1.6,
    maxLevel: 10,
  },
  nurses: {
    key: "nurses",
    name: "Faster Nurses",
    emoji: "👩‍⚕️",
    description: "Speed up treatments",
    effect: "-15% treatment time per level",
    baseCost: 200,
    costMultiplier: 1.7,
    maxLevel: 8,
  },
  lab: {
    key: "lab",
    name: "Better Lab",
    emoji: "🔬",
    description: "Improve diagnosis accuracy",
    effect: "+10% diagnosis bonus per level",
    baseCost: 300,
    costMultiplier: 1.8,
    maxLevel: 8,
  },
  icu: {
    key: "icu",
    name: "ICU Upgrade",
    emoji: "🫀",
    description: "Handle critical patients better",
    effect: "+20% critical success rate",
    baseCost: 500,
    costMultiplier: 2.0,
    maxLevel: 5,
  },
  medicine: {
    key: "medicine",
    name: "Medicine Storage",
    emoji: "💊",
    description: "Better medicine availability",
    effect: "+25% treatment effectiveness",
    baseCost: 150,
    costMultiplier: 1.5,
    maxLevel: 10,
  },
  ambulance: {
    key: "ambulance",
    name: "Ambulance Speed",
    emoji: "🚑",
    description: "Patients arrive faster",
    effect: "+20% patient arrival rate",
    baseCost: 250,
    costMultiplier: 1.6,
    maxLevel: 6,
  },
  infection_control: {
    key: "infection_control",
    name: "Infection Control",
    emoji: "🧴",
    description: "Reduce outbreak risk",
    effect: "-30% outbreak chance per level",
    baseCost: 400,
    costMultiplier: 1.9,
    maxLevel: 5,
  },
};

export const UPGRADE_KEYS = Object.keys(UPGRADES) as UpgradeKey[];

// ── Outbreak Scenarios ────────────────────────────────────────────

export interface OutbreakScenario {
  name: string;
  emoji: string;
  bacteria: string;
  spreadRate: number; // wards per tick
  severity: "low" | "medium" | "high";
  requiredActions: string[];
  rewardCoins: number;
}

export const OUTBREAK_SCENARIOS: OutbreakScenario[] = [
  {
    name: "MRSA Outbreak",
    emoji: "🦠",
    bacteria: "Methicillin-resistant Staphylococcus",
    spreadRate: 1,
    severity: "high",
    requiredActions: ["isolate", "disinfect", "medicate"],
    rewardCoins: 200,
  },
  {
    name: "Norovirus Spread",
    emoji: "🤮",
    bacteria: "Norovirus",
    spreadRate: 2,
    severity: "medium",
    requiredActions: ["isolate", "disinfect"],
    rewardCoins: 120,
  },
  {
    name: "C. Diff Contamination",
    emoji: "⚠️",
    bacteria: "Clostridioides difficile",
    spreadRate: 1,
    severity: "medium",
    requiredActions: ["disinfect", "medicate"],
    rewardCoins: 150,
  },
  {
    name: "Flu Season Surge",
    emoji: "🤒",
    bacteria: "Influenza A/B",
    spreadRate: 3,
    severity: "low",
    requiredActions: ["isolate", "medicate"],
    rewardCoins: 80,
  },
  {
    name: "Tuberculosis Alert",
    emoji: "😷",
    bacteria: "Mycobacterium tuberculosis",
    spreadRate: 1,
    severity: "high",
    requiredActions: ["isolate", "disinfect", "medicate"],
    rewardCoins: 250,
  },
];

// ── Helper Functions ──────────────────────────────────────────────

export function getUpgradeCost(upgrade: UpgradeDef, currentLevel: number): number {
  return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMultiplier, currentLevel));
}

export function getRandomCondition(): ConditionKey {
  // Weight toward lower urgency conditions
  const weights: Record<ConditionKey, number> = {
    fever: 15,
    fracture: 10,
    infection: 12,
    dehydration: 14,
    cardiac: 3,
    burn: 8,
    allergy: 5,
    migraine: 16,
    asthma: 7,
    food_poisoning: 10,
  };

  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (const [key, weight] of Object.entries(weights)) {
    random -= weight;
    if (random <= 0) return key as ConditionKey;
  }
  return "fever";
}

export function getRandomPatientName(): string {
  const first = PATIENT_FIRST_NAMES[Math.floor(Math.random() * PATIENT_FIRST_NAMES.length)];
  const last = PATIENT_LAST_NAMES[Math.floor(Math.random() * PATIENT_LAST_NAMES.length)];
  return `${first} ${last}`;
}

export function getUrgencyLabel(urgency: Urgency): string {
  const labels: Record<Urgency, string> = {
    1: "Low",
    2: "Moderate",
    3: "High",
    4: "Urgent",
    5: "Critical",
  };
  return labels[urgency];
}

export function getUrgencyColor(urgency: Urgency): string {
  const colors: Record<Urgency, string> = {
    1: "bg-emerald-500",
    2: "bg-sky-500",
    3: "bg-amber-500",
    4: "bg-orange-500",
    5: "bg-rose-600",
  };
  return colors[urgency];
}
