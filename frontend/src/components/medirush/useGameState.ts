// ── MediRush Game State Hook ─────────────────────────────────────
import { useState, useCallback, useEffect, useRef } from "react";
import {
  type ConditionKey,
  type UpgradeKey,
  CONDITIONS,
  UPGRADES,
  UPGRADE_KEYS,
  OUTBREAK_SCENARIOS,
  type OutbreakScenario,
  getRandomCondition,
  getRandomPatientName,
  getUpgradeCost,
} from "./gameData";
import {
  soundCoinCollect,
  soundTreatmentSuccess,
  soundTreatmentFail,
  soundUpgrade,
  soundPatientArrival,
  soundOutbreakAlert,
  soundLevelUp,
  soundDisinfect,
} from "./gameSounds";

// ── Types ─────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  name: string;
  condition: ConditionKey;
  patienceLeft: number; // seconds remaining
  maxPatience: number;
  treated: boolean;
  failed: boolean;
  arrivedAt: number;
}

export interface OutbreakState {
  active: boolean;
  scenario: OutbreakScenario | null;
  infectedWards: number[]; // indices 0-6
  actionsCompleted: string[];
  ticksRemaining: number;
  contained: boolean;
}

export interface GameSave {
  coins: number;
  xp: number;
  level: number;
  hospitalRating: number; // 0-100
  totalPatientsTreated: number;
  totalPatientsLost: number;
  upgradeLevels: Record<UpgradeKey, number>;
  comboCount: number;
  bestCombo: number;
  lastPlayedAt: number; // timestamp
  idleEarnings: number;
  dailyRewardDay: number;
  lastDailyReward: string; // YYYY-MM-DD
  soundEnabled: boolean;
}

export type GameScreen =
  | "home"
  | "hospital"
  | "treatment"
  | "upgrades"
  | "outbreak";

export interface GameState {
  screen: GameScreen;
  save: GameSave;
  patients: Patient[];
  selectedPatient: Patient | null;
  outbreak: OutbreakState;
  isPaused: boolean;
  showDailyReward: boolean;
  showIdleEarnings: boolean;
  idleEarningsAmount: number;
  comboTimer: number; // seconds left in combo window
  notifications: GameNotification[];
}

export interface GameNotification {
  id: string;
  text: string;
  type: "success" | "error" | "warning" | "info" | "coins";
  timestamp: number;
}

// ── Constants ─────────────────────────────────────────────────────

const STORAGE_KEY = "medirush_save";
const XP_PER_LEVEL = 150;
const COMBO_WINDOW = 5; // seconds to chain combos
const MAX_PATIENTS = 8;
const IDLE_COINS_PER_MINUTE = 2; // base idle rate
const OUTBREAK_INTERVAL_MIN = 180; // seconds minimum between outbreaks
const OUTBREAK_INTERVAL_MAX = 300;
const PATIENT_SPAWN_MIN = 3000; // ms
const PATIENT_SPAWN_MAX = 7000;

// ── Default State ─────────────────────────────────────────────────

function defaultSave(): GameSave {
  return {
    coins: 50,
    xp: 0,
    level: 1,
    hospitalRating: 70,
    totalPatientsTreated: 0,
    totalPatientsLost: 0,
    upgradeLevels: Object.fromEntries(UPGRADE_KEYS.map((k) => [k, 0])) as Record<UpgradeKey, number>,
    comboCount: 0,
    bestCombo: 0,
    lastPlayedAt: Date.now(),
    idleEarnings: 0,
    dailyRewardDay: 0,
    lastDailyReward: "",
    soundEnabled: true,
  };
}

function loadSave(): GameSave {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Merge with defaults for forward-compat
      return { ...defaultSave(), ...parsed };
    }
  } catch {
    // corrupt save
  }
  return defaultSave();
}

function saveToDisk(save: GameSave) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
  } catch {
    // storage full
  }
}

// ── Calculate idle earnings ───────────────────────────────────────

function calculateIdleEarnings(save: GameSave): number {
  const now = Date.now();
  const elapsedMs = now - save.lastPlayedAt;
  const elapsedMinutes = elapsedMs / 60000;

  if (elapsedMinutes < 1) return 0;

  const bedsMultiplier = 1 + save.upgradeLevels.beds * 0.3;
  const nursesMultiplier = 1 + save.upgradeLevels.nurses * 0.2;
  const coinsPerMinute = IDLE_COINS_PER_MINUTE * bedsMultiplier * nursesMultiplier;

  // Cap at 8 hours
  const cappedMinutes = Math.min(elapsedMinutes, 480);
  return Math.floor(coinsPerMinute * cappedMinutes);
}

// ── Hook ──────────────────────────────────────────────────────────

export function useGameState() {
  const initialSave = loadSave();
  const idleEarnings = calculateIdleEarnings(initialSave);

  const [state, setState] = useState<GameState>({
    screen: "home",
    save: { ...initialSave, lastPlayedAt: Date.now() },
    patients: [],
    selectedPatient: null,
    outbreak: {
      active: false,
      scenario: null,
      infectedWards: [],
      actionsCompleted: [],
      ticksRemaining: 0,
      contained: false,
    },
    isPaused: false,
    showDailyReward: false,
    showIdleEarnings: idleEarnings > 0,
    idleEarningsAmount: idleEarnings,
    comboTimer: 0,
    notifications: [],
  });

  const patientSpawnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const gameLoopRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const outbreakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Save to localStorage on every save change ───────────────────

  useEffect(() => {
    saveToDisk(state.save);
  }, [state.save]);

  // ── Notification helper ─────────────────────────────────────────

  const addNotification = useCallback(
    (text: string, type: GameNotification["type"] = "info") => {
      const notif: GameNotification = {
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
        text,
        type,
        timestamp: Date.now(),
      };
      setState((prev) => ({
        ...prev,
        notifications: [notif, ...prev.notifications].slice(0, 5),
      }));
      // Auto-remove after 3s
      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          notifications: prev.notifications.filter((n) => n.id !== notif.id),
        }));
      }, 3000);
    },
    [],
  );

  // ── Navigation ──────────────────────────────────────────────────

  const setScreen = useCallback((screen: GameScreen) => {
    setState((prev) => ({ ...prev, screen, selectedPatient: null }));
  }, []);

  // ── Spawn patient ───────────────────────────────────────────────

  const spawnPatient = useCallback(() => {
    setState((prev) => {
      if (prev.patients.length >= MAX_PATIENTS + prev.save.upgradeLevels.beds * 2) {
        return prev;
      }

      const condKey = getRandomCondition();
      const cond = CONDITIONS[condKey];
      // Adjust patience based on nurse upgrade
      const nurseBonus = prev.save.upgradeLevels.nurses * 0.15;
      const patience = Math.floor(cond.patienceSeconds * (1 + nurseBonus));

      const patient: Patient = {
        id: crypto.randomUUID?.() ?? `p-${Date.now()}-${Math.random()}`,
        name: getRandomPatientName(),
        condition: condKey,
        patienceLeft: patience,
        maxPatience: patience,
        treated: false,
        failed: false,
        arrivedAt: Date.now(),
      };

      if (prev.save.soundEnabled) soundPatientArrival();

      return {
        ...prev,
        patients: [...prev.patients, patient],
      };
    });
  }, []);

  // ── Select patient ──────────────────────────────────────────────

  const selectPatient = useCallback((patient: Patient | null) => {
    setState((prev) => ({
      ...prev,
      selectedPatient: patient,
      screen: patient ? "treatment" : prev.screen,
    }));
  }, []);

  // ── Treat patient ───────────────────────────────────────────────

  const treatPatient = useCallback(
    (patientId: string, chosenTreatment: string) => {
      setState((prev) => {
        const patient = prev.patients.find((p) => p.id === patientId);
        if (!patient || patient.treated || patient.failed) return prev;

        const cond = CONDITIONS[patient.condition];
        const isCorrect = chosenTreatment === cond.treatment;

        let newSave = { ...prev.save };

        if (isCorrect) {
          // Reward calculation
          const labBonus = 1 + newSave.upgradeLevels.lab * 0.1;
          const medBonus = 1 + newSave.upgradeLevels.medicine * 0.15;
          const comboMultiplier = 1 + prev.comboTimer > 0 ? (newSave.comboCount + 1) * 0.2 : 0;
          const reward = Math.floor(cond.baseReward * labBonus * medBonus * (1 + comboMultiplier * 0.1));

          newSave.coins += reward;
          newSave.xp += Math.floor(reward * 0.5);
          newSave.totalPatientsTreated += 1;
          newSave.hospitalRating = Math.min(100, newSave.hospitalRating + 1);
          newSave.comboCount = prev.comboTimer > 0 ? newSave.comboCount + 1 : 1;
          newSave.bestCombo = Math.max(newSave.bestCombo, newSave.comboCount);

          // Level up check
          const xpNeeded = newSave.level * XP_PER_LEVEL;
          if (newSave.xp >= xpNeeded) {
            newSave.xp -= xpNeeded;
            newSave.level += 1;
            if (newSave.soundEnabled) soundLevelUp();
            addNotification(`🎉 Level Up! You're now Level ${newSave.level}!`, "success");
          }

          if (newSave.soundEnabled) {
            soundTreatmentSuccess();
            soundCoinCollect();
          }
          addNotification(`+${reward} coins! ${cond.name} treated correctly! 🏥`, "coins");
        } else {
          newSave.hospitalRating = Math.max(0, newSave.hospitalRating - 3);
          newSave.comboCount = 0;
          if (newSave.soundEnabled) soundTreatmentFail();
          addNotification(`Wrong treatment! Rating dropped. Correct: ${cond.treatment}`, "error");
        }

        return {
          ...prev,
          save: newSave,
          patients: prev.patients.map((p) =>
            p.id === patientId ? { ...p, treated: true } : p,
          ),
          selectedPatient: null,
          screen: "hospital",
          comboTimer: isCorrect ? COMBO_WINDOW : 0,
        };
      });
    },
    [addNotification],
  );

  // ── Purchase upgrade ────────────────────────────────────────────

  const purchaseUpgrade = useCallback(
    (key: UpgradeKey) => {
      setState((prev) => {
        const upgDef = UPGRADES[key];
        const currentLevel = prev.save.upgradeLevels[key];
        if (currentLevel >= upgDef.maxLevel) {
          addNotification("Already at max level!", "warning");
          return prev;
        }

        const cost = getUpgradeCost(upgDef, currentLevel);
        if (prev.save.coins < cost) {
          addNotification("Not enough coins!", "warning");
          return prev;
        }

        if (prev.save.soundEnabled) soundUpgrade();

        const newLevels = { ...prev.save.upgradeLevels, [key]: currentLevel + 1 };
        addNotification(`${upgDef.emoji} ${upgDef.name} upgraded to Level ${currentLevel + 1}!`, "success");

        return {
          ...prev,
          save: {
            ...prev.save,
            coins: prev.save.coins - cost,
            upgradeLevels: newLevels,
          },
        };
      });
    },
    [addNotification],
  );

  // ── Collect idle earnings ───────────────────────────────────────

  const collectIdleEarnings = useCallback(() => {
    setState((prev) => {
      if (prev.save.soundEnabled) soundCoinCollect();
      return {
        ...prev,
        save: { ...prev.save, coins: prev.save.coins + prev.idleEarningsAmount },
        showIdleEarnings: false,
        idleEarningsAmount: 0,
      };
    });
  }, []);

  // ── Daily reward ────────────────────────────────────────────────

  const collectDailyReward = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10);
    setState((prev) => {
      if (prev.save.lastDailyReward === today) {
        addNotification("Already collected today!", "warning");
        return prev;
      }

      const day = prev.save.dailyRewardDay + 1;
      const reward = 20 + day * 10; // escalating rewards
      if (prev.save.soundEnabled) soundCoinCollect();
      addNotification(`🎁 Day ${day} reward: +${reward} coins!`, "coins");

      return {
        ...prev,
        save: {
          ...prev.save,
          coins: prev.save.coins + reward,
          dailyRewardDay: day,
          lastDailyReward: today,
        },
        showDailyReward: false,
      };
    });
  }, [addNotification]);

  // ── Outbreak Actions ────────────────────────────────────────────

  const startOutbreak = useCallback(() => {
    const scenario = OUTBREAK_SCENARIOS[Math.floor(Math.random() * OUTBREAK_SCENARIOS.length)];
    const initialWard = Math.floor(Math.random() * 7);

    setState((prev) => {
      if (prev.save.soundEnabled) soundOutbreakAlert();
      addNotification(`⚠️ ${scenario.name} detected!`, "warning");

      return {
        ...prev,
        screen: "outbreak",
        outbreak: {
          active: true,
          scenario,
          infectedWards: [initialWard],
          actionsCompleted: [],
          ticksRemaining: 30, // 30 seconds to contain
          contained: false,
        },
      };
    });
  }, [addNotification]);

  const performOutbreakAction = useCallback(
    (action: string) => {
      setState((prev) => {
        if (!prev.outbreak.active || !prev.outbreak.scenario) return prev;

        const newCompleted = [...prev.outbreak.actionsCompleted, action];
        const allDone = prev.outbreak.scenario.requiredActions.every((a) =>
          newCompleted.includes(a),
        );

        if (prev.save.soundEnabled) soundDisinfect();

        if (allDone) {
          addNotification(
            `✅ ${prev.outbreak.scenario.name} contained! +${prev.outbreak.scenario.rewardCoins} coins`,
            "success",
          );
          return {
            ...prev,
            save: {
              ...prev.save,
              coins: prev.save.coins + prev.outbreak.scenario.rewardCoins,
              hospitalRating: Math.min(100, prev.save.hospitalRating + 5),
            },
            outbreak: { ...prev.outbreak, actionsCompleted: newCompleted, contained: true, active: false },
          };
        }

        return {
          ...prev,
          outbreak: { ...prev.outbreak, actionsCompleted: newCompleted },
        };
      });
    },
    [addNotification],
  );

  // ── Toggle sound ────────────────────────────────────────────────

  const toggleSound = useCallback(() => {
    setState((prev) => ({
      ...prev,
      save: { ...prev.save, soundEnabled: !prev.save.soundEnabled },
    }));
  }, []);

  // ── Game loop (1 Hz tick) ───────────────────────────────────────

  useEffect(() => {
    if (state.screen !== "hospital" && state.screen !== "treatment") return;

    gameLoopRef.current = setInterval(() => {
      setState((prev) => {
        let newSave = { ...prev.save };

        // Tick patient patience
        const updatedPatients = prev.patients.map((p) => {
          if (p.treated || p.failed) return p;
          const newPatience = p.patienceLeft - 1;
          if (newPatience <= 0) {
            newSave.totalPatientsLost += 1;
            newSave.hospitalRating = Math.max(0, newSave.hospitalRating - 2);
            newSave.comboCount = 0;
            return { ...p, patienceLeft: 0, failed: true };
          }
          return { ...p, patienceLeft: newPatience };
        });

        // Remove treated/failed patients after 3 seconds
        const now = Date.now();
        const filtered = updatedPatients.filter((p) => {
          if ((p.treated || p.failed) && now - p.arrivedAt > 5000) return false;
          return true;
        });

        // Tick combo timer
        const newComboTimer = Math.max(0, prev.comboTimer - 1);
        if (newComboTimer === 0 && prev.comboTimer > 0) {
          newSave.comboCount = 0;
        }

        return {
          ...prev,
          save: newSave,
          patients: filtered,
          comboTimer: newComboTimer,
        };
      });
    }, 1000);

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [state.screen]);

  // ── Patient spawner ─────────────────────────────────────────────

  useEffect(() => {
    if (state.screen !== "hospital") return;

    const scheduleSpawn = () => {
      const ambulanceBonus = state.save.upgradeLevels.ambulance * 0.15;
      const min = PATIENT_SPAWN_MIN * (1 - ambulanceBonus * 0.3);
      const max = PATIENT_SPAWN_MAX * (1 - ambulanceBonus * 0.3);
      const delay = Math.random() * (max - min) + min;

      patientSpawnRef.current = setTimeout(() => {
        spawnPatient();
        scheduleSpawn();
      }, delay);
    };

    // Spawn first patient immediately
    spawnPatient();
    scheduleSpawn();

    return () => {
      if (patientSpawnRef.current) clearTimeout(patientSpawnRef.current);
    };
  }, [state.screen, state.save.upgradeLevels.ambulance, spawnPatient]);

  // ── Outbreak trigger ────────────────────────────────────────────

  useEffect(() => {
    if (state.screen !== "hospital") return;

    const infectionReduction = state.save.upgradeLevels.infection_control * 0.25;
    const chance = Math.max(0.1, 1 - infectionReduction);

    const scheduleOutbreak = () => {
      const delay =
        (OUTBREAK_INTERVAL_MIN + Math.random() * (OUTBREAK_INTERVAL_MAX - OUTBREAK_INTERVAL_MIN)) *
        1000;

      outbreakTimerRef.current = setTimeout(() => {
        if (Math.random() < chance) {
          startOutbreak();
        } else {
          scheduleOutbreak();
        }
      }, delay);
    };

    scheduleOutbreak();

    return () => {
      if (outbreakTimerRef.current) clearTimeout(outbreakTimerRef.current);
    };
  }, [state.screen, state.save.upgradeLevels.infection_control, startOutbreak]);

  // ── Outbreak tick ───────────────────────────────────────────────

  useEffect(() => {
    if (!state.outbreak.active) return;

    const ticker = setInterval(() => {
      setState((prev) => {
        if (!prev.outbreak.active || !prev.outbreak.scenario) return prev;

        const newTicks = prev.outbreak.ticksRemaining - 1;

        // Spread bacteria
        let newInfected = [...prev.outbreak.infectedWards];
        if (newTicks % Math.max(1, 4 - prev.outbreak.scenario.spreadRate) === 0) {
          const newWard = Math.floor(Math.random() * 7);
          if (!newInfected.includes(newWard)) {
            newInfected.push(newWard);
          }
        }

        if (newTicks <= 0) {
          // Outbreak failed
          addNotification("💀 Outbreak not contained! Rating dropped significantly.", "error");
          return {
            ...prev,
            save: {
              ...prev.save,
              hospitalRating: Math.max(0, prev.save.hospitalRating - 15),
            },
            outbreak: {
              ...prev.outbreak,
              active: false,
              ticksRemaining: 0,
            },
          };
        }

        return {
          ...prev,
          outbreak: {
            ...prev.outbreak,
            infectedWards: newInfected,
            ticksRemaining: newTicks,
          },
        };
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [state.outbreak.active, addNotification]);

  // ── Reset game ──────────────────────────────────────────────────

  const resetGame = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setState({
      screen: "home",
      save: defaultSave(),
      patients: [],
      selectedPatient: null,
      outbreak: {
        active: false,
        scenario: null,
        infectedWards: [],
        actionsCompleted: [],
        ticksRemaining: 0,
        contained: false,
      },
      isPaused: false,
      showDailyReward: false,
      showIdleEarnings: false,
      idleEarningsAmount: 0,
      comboTimer: 0,
      notifications: [],
    });
  }, []);

  return {
    state,
    setScreen,
    spawnPatient,
    selectPatient,
    treatPatient,
    purchaseUpgrade,
    collectIdleEarnings,
    collectDailyReward,
    startOutbreak,
    performOutbreakAction,
    toggleSound,
    addNotification,
    resetGame,
  };
}
