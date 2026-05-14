from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from database import (
    GameAchievementUnlock,
    GameActionEvent,
    GameProfile,
    GameQuestProgress,
    GameTriviaAttempt,
    User,
)


GAME_SYSTEM_PROMPT = """
You are the SvasthaQuest Game Master inside SvasthaAI.

Your job is to turn user health progress into an engaging, game-style update while staying medically safe.

Core behavior:
1) Celebrate progress with energy and clarity.
2) Use exact values from provided game state for XP, levels, streaks, quest progress, and achievements.
3) Never invent rewards, quest completions, stats, or milestones.
4) If no reward is unlocked, still motivate with a small next-step challenge.
5) Keep language friendly, concise, and action-oriented.

Safety guardrails:
1) Do not diagnose diseases.
2) Do not prescribe medicines or dosages.
3) For red-flag symptoms, advise urgent professional care immediately.
4) Keep advice as wellness coaching, not clinical treatment.

Response format:
- Quest Status: one short summary line.
- Rewards: XP gained, quest bonus, and any unlocked achievements.
- Progress: level and streak update.
- Next Move: 1-2 concrete actions for today.
- Motivation Line: one uplifting closing sentence.

Style:
- Max 120 words.
- Use simple language.
- Use at most 2 emoji.
"""


PLAYER_CLASS_TIERS = [
    (1, "Health Seeker"),
    (5, "Wellness Explorer"),
    (10, "Vitality Warrior"),
    (15, "Guardian Healer"),
    (20, "SvasthaLegend"),
]

# XP needed to reach levels 1..20.
LEVEL_XP_THRESHOLDS = [
    0,
    200,
    450,
    750,
    1100,
    1500,
    1950,
    2450,
    3000,
    3600,
    4250,
    4950,
    5700,
    6500,
    7350,
    8250,
    9200,
    10200,
    11300,
    12500,
]

DAILY_QUESTS = [
    {
        "code": "drink_8_glasses",
        "title": "Hydration Hero",
        "description": "Drink 8 glasses of water.",
        "target": 8.0,
        "action": "water",
        "xp_reward": 120,
        "unit": "glasses",
    },
    {
        "code": "walk_5000_steps",
        "title": "Step Strider",
        "description": "Walk 5,000 steps.",
        "target": 5000.0,
        "action": "steps",
        "xp_reward": 150,
        "unit": "steps",
    },
    {
        "code": "complete_scan",
        "title": "Scan Complete",
        "description": "Complete one diagnosis scan.",
        "target": 1.0,
        "action": "diagnosis",
        "xp_reward": 180,
        "unit": "scan",
    },
    {
        "code": "log_meal",
        "title": "Nutrition Logged",
        "description": "Log one meal-plan action.",
        "target": 1.0,
        "action": "meal_log",
        "xp_reward": 120,
        "unit": "entry",
    },
    {
        "code": "manasmitra_session",
        "title": "Mindful Minute",
        "description": "Complete one ManasMitra session.",
        "target": 1.0,
        "action": "manasmitra",
        "xp_reward": 180,
        "unit": "session",
    },
    {
        "code": "check_vitals",
        "title": "Vitals Verified",
        "description": "Log one vitals check.",
        "target": 1.0,
        "action": "vitals",
        "xp_reward": 140,
        "unit": "check",
    },
    {
        "code": "sleep_7_hours",
        "title": "Sleep Shield",
        "description": "Log 7 hours of sleep.",
        "target": 7.0,
        "action": "sleep_hours",
        "xp_reward": 140,
        "unit": "hours",
    },
    {
        "code": "brain_trainer",
        "title": "Brain Trainer",
        "description": "Answer 3 trivia questions correctly.",
        "target": 3.0,
        "action": "trivia_correct",
        "xp_reward": 160,
        "unit": "correct",
    },
]

TRIVIA_QUESTION_BANK = [
    {
        "id": "tq_1",
        "question": "Which nutrient helps build and repair muscles?",
        "options": ["Protein", "Vitamin C", "Sodium", "Fiber"],
        "answer": 0,
    },
    {
        "id": "tq_2",
        "question": "A normal resting adult heart rate is usually between:",
        "options": ["20-40 bpm", "60-100 bpm", "120-160 bpm", "160-200 bpm"],
        "answer": 1,
    },
    {
        "id": "tq_3",
        "question": "Which mosquito commonly spreads dengue in India?",
        "options": ["Anopheles", "Aedes aegypti", "Culex", "Tsetse"],
        "answer": 1,
    },
    {
        "id": "tq_4",
        "question": "In Ayurveda, digestion fire is commonly called:",
        "options": ["Prana", "Agni", "Vata", "Ojas"],
        "answer": 1,
    },
    {
        "id": "tq_5",
        "question": "Which vitamin is essential for calcium absorption?",
        "options": ["Vitamin D", "Vitamin A", "Vitamin B12", "Vitamin K"],
        "answer": 0,
    },
    {
        "id": "tq_6",
        "question": "Malaria is caused by and spread through:",
        "options": ["Virus and droplets", "Bacteria and water", "Parasite and mosquito bite", "Fungus and food"],
        "answer": 2,
    },
    {
        "id": "tq_7",
        "question": "How much sleep is generally recommended for most adults?",
        "options": ["3-4 hours", "5-6 hours", "7-9 hours", "10-12 hours"],
        "answer": 2,
    },
    {
        "id": "tq_8",
        "question": "Which number in blood pressure is the top value?",
        "options": ["Diastolic", "Systolic", "Pulse", "Oxygen"],
        "answer": 1,
    },
    {
        "id": "tq_9",
        "question": "Which food is richest in dietary fiber?",
        "options": ["White rice", "Refined sugar", "Lentils and vegetables", "Butter"],
        "answer": 2,
    },
    {
        "id": "tq_10",
        "question": "What is a common early symptom of dehydration?",
        "options": ["Dry mouth", "Improved focus", "Low body temperature", "Excess sweating only"],
        "answer": 0,
    },
    {
        "id": "tq_11",
        "question": "Which activity best supports heart health?",
        "options": ["Daily brisk walking", "Skipping all meals", "Sleeping less", "Only weekend exercise"],
        "answer": 0,
    },
    {
        "id": "tq_12",
        "question": "Dengue warning signs can include:",
        "options": ["Persistent vomiting", "Extreme hunger only", "Hair fall only", "Mild sneezing only"],
        "answer": 0,
    },
    {
        "id": "tq_13",
        "question": "In Ayurveda, which dosha is linked to movement and nervous activity?",
        "options": ["Kapha", "Pitta", "Vata", "Rasa"],
        "answer": 2,
    },
    {
        "id": "tq_14",
        "question": "A healthy way to reduce stress daily is:",
        "options": ["Deep breathing for 5 minutes", "Skipping hydration", "Overworking at night", "Ignoring sleep"],
        "answer": 0,
    },
    {
        "id": "tq_15",
        "question": "Which mineral is important for oxygen transport in blood?",
        "options": ["Iron", "Sodium", "Calcium", "Iodine"],
        "answer": 0,
    },
]

ACHIEVEMENT_DEFINITIONS = [
    # Common (10)
    {"code": "quest_rookie", "title": "Quest Rookie", "rarity": "Common", "metric": "total_actions", "threshold": 1, "xp_bonus": 40, "description": "Complete your first health action."},
    {"code": "first_scan", "title": "First Scan", "rarity": "Common", "metric": "diagnosis_count", "threshold": 1, "xp_bonus": 60, "description": "Complete your first diagnosis scan."},
    {"code": "mindful_start", "title": "Mindful Start", "rarity": "Common", "metric": "manas_count", "threshold": 1, "xp_bonus": 60, "description": "Finish your first ManasMitra session."},
    {"code": "first_vitals", "title": "Vitals Debut", "rarity": "Common", "metric": "vitals_count", "threshold": 1, "xp_bonus": 60, "description": "Log your first vitals check."},
    {"code": "hydration_hatchling", "title": "Hydration Hatchling", "rarity": "Common", "metric": "water_amount", "threshold": 8, "xp_bonus": 70, "description": "Log 8 glasses of water."},
    {"code": "brain_spark", "title": "Brain Spark", "rarity": "Common", "metric": "trivia_correct", "threshold": 1, "xp_bonus": 50, "description": "Get your first trivia answer correct."},
    {"code": "sleep_seed", "title": "Sleep Seed", "rarity": "Common", "metric": "sleep_hours_total", "threshold": 7, "xp_bonus": 70, "description": "Log 7 hours of sleep."},
    {"code": "meal_starter", "title": "Meal Starter", "rarity": "Common", "metric": "meal_count", "threshold": 1, "xp_bonus": 50, "description": "Log your first meal activity."},
    {"code": "day_one_win", "title": "Day One Win", "rarity": "Common", "metric": "streak_days", "threshold": 1, "xp_bonus": 50, "description": "Complete at least one day in streak."},
    {"code": "first_badge", "title": "First Badge", "rarity": "Common", "metric": "quest_completed_count", "threshold": 1, "xp_bonus": 70, "description": "Finish your first daily quest."},

    # Uncommon (9)
    {"code": "scanner_apprentice", "title": "Scanner Apprentice", "rarity": "Uncommon", "metric": "diagnosis_count", "threshold": 5, "xp_bonus": 120, "description": "Complete 5 diagnosis scans."},
    {"code": "calm_collector", "title": "Calm Collector", "rarity": "Uncommon", "metric": "manas_count", "threshold": 5, "xp_bonus": 120, "description": "Complete 5 ManasMitra sessions."},
    {"code": "vitals_guardian", "title": "Vitals Guardian", "rarity": "Uncommon", "metric": "vitals_count", "threshold": 5, "xp_bonus": 120, "description": "Log vitals 5 times."},
    {"code": "trivia_tactician", "title": "Trivia Tactician", "rarity": "Uncommon", "metric": "trivia_correct", "threshold": 10, "xp_bonus": 140, "description": "Answer 10 trivia questions correctly."},
    {"code": "hydration_habit", "title": "Hydration Habit", "rarity": "Uncommon", "metric": "water_amount", "threshold": 40, "xp_bonus": 130, "description": "Log 40 glasses of water."},
    {"code": "sleep_rhythm", "title": "Sleep Rhythm", "rarity": "Uncommon", "metric": "sleep_hours_total", "threshold": 35, "xp_bonus": 130, "description": "Log 35 hours of sleep."},
    {"code": "consistent_three", "title": "3-Day Flow", "rarity": "Uncommon", "metric": "streak_days", "threshold": 3, "xp_bonus": 160, "description": "Maintain a 3-day streak."},
    {"code": "level_five", "title": "Wellness Explorer", "rarity": "Uncommon", "metric": "level", "threshold": 5, "xp_bonus": 180, "description": "Reach level 5."},
    {"code": "quest_runner", "title": "Quest Runner", "rarity": "Uncommon", "metric": "quest_completed_count", "threshold": 10, "xp_bonus": 160, "description": "Complete 10 daily quests."},

    # Rare (8)
    {"code": "diagnostician", "title": "Diagnostician", "rarity": "Rare", "metric": "diagnosis_count", "threshold": 15, "xp_bonus": 260, "description": "Complete 15 diagnosis scans."},
    {"code": "zen_master", "title": "Zen Master", "rarity": "Rare", "metric": "manas_count", "threshold": 15, "xp_bonus": 260, "description": "Complete 15 ManasMitra sessions."},
    {"code": "pulse_keeper", "title": "Pulse Keeper", "rarity": "Rare", "metric": "vitals_count", "threshold": 15, "xp_bonus": 260, "description": "Log vitals 15 times."},
    {"code": "brain_trainer_plus", "title": "Brain Trainer", "rarity": "Rare", "metric": "trivia_correct", "threshold": 30, "xp_bonus": 300, "description": "Answer 30 trivia questions correctly."},
    {"code": "week_warrior", "title": "Week Warrior", "rarity": "Rare", "metric": "streak_days", "threshold": 7, "xp_bonus": 280, "description": "Maintain a 7-day streak."},
    {"code": "streak_sentinel", "title": "Streak Sentinel", "rarity": "Rare", "metric": "streak_days", "threshold": 14, "xp_bonus": 320, "description": "Maintain a 14-day streak."},
    {"code": "level_ten", "title": "Vitality Warrior", "rarity": "Rare", "metric": "level", "threshold": 10, "xp_bonus": 340, "description": "Reach level 10."},
    {"code": "quest_hunter", "title": "Quest Hunter", "rarity": "Rare", "metric": "quest_completed_count", "threshold": 30, "xp_bonus": 300, "description": "Complete 30 daily quests."},

    # Epic (6)
    {"code": "elite_scanner", "title": "Elite Scanner", "rarity": "Epic", "metric": "diagnosis_count", "threshold": 40, "xp_bonus": 500, "description": "Complete 40 diagnosis scans."},
    {"code": "serenity_sage", "title": "Serenity Sage", "rarity": "Epic", "metric": "manas_count", "threshold": 40, "xp_bonus": 500, "description": "Complete 40 ManasMitra sessions."},
    {"code": "marathon_mind", "title": "Marathon Mind", "rarity": "Epic", "metric": "trivia_correct", "threshold": 75, "xp_bonus": 550, "description": "Answer 75 trivia questions correctly."},
    {"code": "month_momentum", "title": "Month Momentum", "rarity": "Epic", "metric": "streak_days", "threshold": 30, "xp_bonus": 600, "description": "Maintain a 30-day streak."},
    {"code": "level_fifteen", "title": "Guardian Healer", "rarity": "Epic", "metric": "level", "threshold": 15, "xp_bonus": 650, "description": "Reach level 15."},
    {"code": "quest_champion", "title": "Quest Champion", "rarity": "Epic", "metric": "quest_completed_count", "threshold": 75, "xp_bonus": 600, "description": "Complete 75 daily quests."},

    # Legendary (4)
    {"code": "centurion", "title": "Centurion", "rarity": "Legendary", "metric": "streak_days", "threshold": 100, "xp_bonus": 2000, "description": "Maintain a 100-day streak."},
    {"code": "vaidya_legend", "title": "VaidyaLegend", "rarity": "Legendary", "metric": "level", "threshold": 20, "xp_bonus": 2000, "description": "Reach level 20."},
    {"code": "grandmaster_quest", "title": "Grandmaster Quest", "rarity": "Legendary", "metric": "quest_completed_count", "threshold": 200, "xp_bonus": 750, "description": "Complete 200 daily quests."},
    {"code": "immortal_streak", "title": "Immortal Streak", "rarity": "Legendary", "metric": "streak_days", "threshold": 365, "xp_bonus": 1000, "description": "Maintain a 365-day streak."},
]


_QUEST_BY_CODE = {quest["code"]: quest for quest in DAILY_QUESTS}

INDIA_TZ = timezone(timedelta(hours=5, minutes=30))


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _india_now() -> datetime:
    return datetime.now(INDIA_TZ)


def _today_key() -> str:
    return _india_now().date().isoformat()


def _to_date(date_key: str) -> datetime.date:
    return datetime.strptime(date_key, "%Y-%m-%d").date()


def _calculate_level(total_xp: int) -> int:
    level = 1
    for idx, threshold in enumerate(LEVEL_XP_THRESHOLDS, start=1):
        if total_xp >= threshold:
            level = idx
    return min(level, len(LEVEL_XP_THRESHOLDS))


def _resolve_player_class(level: int) -> str:
    resolved = PLAYER_CLASS_TIERS[0][1]
    for min_level, class_name in PLAYER_CLASS_TIERS:
        if level >= min_level:
            resolved = class_name
    return resolved


def _update_level_fields(profile: GameProfile) -> None:
    profile.level = _calculate_level(int(profile.total_xp or 0))
    profile.player_class = _resolve_player_class(profile.level)


def _action_xp(action: str, amount: float) -> int:
    action = (action or "").strip().lower()
    amount = max(0.0, float(amount or 0.0))

    fixed = {
        "diagnosis": 120,
        "manasmitra": 110,
        "vitals": 100,
        "meal_log": 90,
        "workout": 90,
        "progress_entry": 75,
    }
    if action in fixed:
        return fixed[action]

    if action == "trivia_correct":
        return int(round(amount * 10))
    if action == "water":
        return int(round(amount * 3))
    if action == "sleep_hours":
        return int(round(amount * 5))
    if action == "steps":
        # 2 XP per 500 steps (~20 XP for 5000 steps)
        return int((amount // 500) * 2)

    return 0


def _get_or_create_profile(db: Session, user_id: int) -> GameProfile:
    profile = db.query(GameProfile).filter(GameProfile.user_id == user_id).first()
    if profile:
        return profile

    profile = GameProfile(user_id=user_id)
    db.add(profile)
    db.flush()
    return profile


def _update_streak(profile: GameProfile, date_key: str) -> None:
    if profile.last_active_date == date_key:
        return

    if profile.last_active_date:
        last_date = _to_date(profile.last_active_date)
        current_date = _to_date(date_key)
        day_diff = (current_date - last_date).days
        if day_diff == 1:
            profile.streak_days = int(profile.streak_days or 0) + 1
        elif day_diff > 1:
            profile.streak_days = 1
        else:
            # Future or same-day anomalies: keep current streak stable.
            profile.streak_days = max(1, int(profile.streak_days or 0))
    else:
        profile.streak_days = 1

    profile.last_active_date = date_key
    profile.longest_streak = max(int(profile.longest_streak or 0), int(profile.streak_days or 0))


def _ensure_daily_quest_rows(db: Session, user_id: int, date_key: str) -> None:
    existing_codes = {
        row.quest_code
        for row in db.query(GameQuestProgress).filter(
            GameQuestProgress.user_id == user_id,
            GameQuestProgress.quest_date == date_key,
        ).all()
    }

    for quest in DAILY_QUESTS:
        if quest["code"] in existing_codes:
            continue

        db.add(
            GameQuestProgress(
                user_id=user_id,
                quest_code=quest["code"],
                quest_date=date_key,
                progress_value=0.0,
                target_value=float(quest["target"]),
                completed=False,
                updated_at=_utc_now(),
            )
        )


def _collect_metrics(db: Session, user_id: int, profile: GameProfile) -> Dict[str, float]:
    def sum_action(action_type: str) -> float:
        value = db.query(func.coalesce(func.sum(GameActionEvent.amount), 0.0)).filter(
            GameActionEvent.user_id == user_id,
            GameActionEvent.action_type == action_type,
        ).scalar()
        return float(value or 0.0)

    total_actions = db.query(func.count(GameActionEvent.id)).filter(
        GameActionEvent.user_id == user_id
    ).scalar() or 0

    quest_completed_count = db.query(func.count(GameQuestProgress.id)).filter(
        GameQuestProgress.user_id == user_id,
        GameQuestProgress.completed == True,  # noqa: E712
    ).scalar() or 0

    return {
        "total_actions": float(total_actions),
        "diagnosis_count": sum_action("diagnosis"),
        "manas_count": sum_action("manasmitra"),
        "vitals_count": sum_action("vitals"),
        "meal_count": sum_action("meal_log"),
        "water_amount": sum_action("water"),
        "sleep_hours_total": sum_action("sleep_hours"),
        "trivia_correct": sum_action("trivia_correct"),
        "quest_completed_count": float(quest_completed_count),
        "streak_days": float(profile.streak_days or 0),
        "level": float(profile.level or 1),
    }


def _evaluate_achievements(db: Session, user_id: int, profile: GameProfile, date_key: str) -> List[Dict[str, Any]]:
    unlocked_codes = {
        row.achievement_code
        for row in db.query(GameAchievementUnlock).filter(
            GameAchievementUnlock.user_id == user_id
        ).all()
    }

    metrics = _collect_metrics(db, user_id, profile)
    newly_unlocked: List[Dict[str, Any]] = []

    for definition in ACHIEVEMENT_DEFINITIONS:
        code = definition["code"]
        if code in unlocked_codes:
            continue

        metric_name = definition["metric"]
        threshold = float(definition["threshold"])
        metric_value = float(metrics.get(metric_name, 0.0))
        if metric_value < threshold:
            continue

        unlock = GameAchievementUnlock(
            user_id=user_id,
            achievement_code=code,
            title=definition["title"],
            rarity=definition["rarity"],
            description=definition["description"],
            xp_bonus=int(definition["xp_bonus"]),
            unlocked_at=_utc_now(),
        )
        db.add(unlock)

        xp_bonus = int(definition["xp_bonus"])
        if xp_bonus > 0:
            profile.total_xp = int(profile.total_xp or 0) + xp_bonus
            db.add(
                GameActionEvent(
                    user_id=user_id,
                    action_type=f"achievement_unlock:{code}",
                    amount=1.0,
                    xp_earned=xp_bonus,
                    event_date=date_key,
                    created_at=_utc_now(),
                )
            )

        newly_unlocked.append(
            {
                "code": code,
                "title": definition["title"],
                "rarity": definition["rarity"],
                "xp_bonus": xp_bonus,
            }
        )

    if newly_unlocked:
        _update_level_fields(profile)

    return newly_unlocked


def auto_trigger_quest(user_id: int, action: str, db: Session, amount: float = 1.0) -> Dict[str, Any]:
    """Apply XP, streaks, and daily quest progress for a health action."""
    action = (action or "").strip().lower()
    amount = max(0.0, float(amount or 0.0))
    if amount <= 0:
        amount = 1.0

    date_key = _today_key()
    profile = _get_or_create_profile(db, user_id)
    _ensure_daily_quest_rows(db, user_id, date_key)

    _update_streak(profile, date_key)

    xp_earned = _action_xp(action, amount)
    if xp_earned > 0:
        profile.total_xp = int(profile.total_xp or 0) + xp_earned

    profile.total_actions = int(profile.total_actions or 0) + 1
    profile.updated_at = _utc_now()

    db.add(
        GameActionEvent(
            user_id=user_id,
            action_type=action,
            amount=amount,
            xp_earned=xp_earned,
            event_date=date_key,
            created_at=_utc_now(),
        )
    )

    completed_quests: List[Dict[str, Any]] = []
    quest_bonus_total = 0

    relevant_quests = [quest for quest in DAILY_QUESTS if quest["action"] == action]
    for quest in relevant_quests:
        row = db.query(GameQuestProgress).filter(
            GameQuestProgress.user_id == user_id,
            GameQuestProgress.quest_code == quest["code"],
            GameQuestProgress.quest_date == date_key,
        ).first()
        if not row:
            continue

        if not row.completed:
            row.progress_value = min(float(row.target_value), float(row.progress_value) + amount)
            row.updated_at = _utc_now()

            if row.progress_value >= float(row.target_value):
                row.completed = True
                row.completed_at = _utc_now()
                reward = int(quest["xp_reward"])
                quest_bonus_total += reward
                profile.total_xp = int(profile.total_xp or 0) + reward
                db.add(
                    GameActionEvent(
                        user_id=user_id,
                        action_type=f"quest_complete:{quest['code']}",
                        amount=1.0,
                        xp_earned=reward,
                        event_date=date_key,
                        created_at=_utc_now(),
                    )
                )
                completed_quests.append(
                    {
                        "code": quest["code"],
                        "title": quest["title"],
                        "xp_reward": reward,
                    }
                )

    _update_level_fields(profile)
    unlocked_achievements = _evaluate_achievements(db, user_id, profile, date_key)
    _update_level_fields(profile)

    db.flush()

    return {
        "action": action,
        "amount": amount,
        "xp_earned": int(xp_earned + quest_bonus_total + sum(a["xp_bonus"] for a in unlocked_achievements)),
        "base_xp": xp_earned,
        "quest_bonus": quest_bonus_total,
        "completed_quests": completed_quests,
        "unlocked_achievements": unlocked_achievements,
        "profile": {
            "total_xp": int(profile.total_xp or 0),
            "level": int(profile.level or 1),
            "player_class": profile.player_class,
            "streak_days": int(profile.streak_days or 0),
            "longest_streak": int(profile.longest_streak or 0),
        },
    }


def get_daily_quests(db: Session, user_id: int, date_key: Optional[str] = None) -> List[Dict[str, Any]]:
    resolved_date = date_key or _today_key()
    _ensure_daily_quest_rows(db, user_id, resolved_date)

    rows = db.query(GameQuestProgress).filter(
        GameQuestProgress.user_id == user_id,
        GameQuestProgress.quest_date == resolved_date,
    ).all()
    row_by_code = {row.quest_code: row for row in rows}

    quests: List[Dict[str, Any]] = []
    for quest in DAILY_QUESTS:
        row = row_by_code.get(quest["code"])
        progress_value = float(row.progress_value) if row else 0.0
        target_value = float(row.target_value) if row else float(quest["target"])
        quests.append(
            {
                "code": quest["code"],
                "title": quest["title"],
                "description": quest["description"],
                "target": target_value,
                "progress": progress_value,
                "unit": quest["unit"],
                "completed": bool(row.completed) if row else False,
                "xp_reward": int(quest["xp_reward"]),
                "action": quest["action"],
            }
        )

    return quests


def get_trivia_questions(date_key: Optional[str] = None) -> List[Dict[str, Any]]:
    resolved_date = date_key or _today_key()
    shift = int(resolved_date.replace("-", "")) % len(TRIVIA_QUESTION_BANK)
    rotated = TRIVIA_QUESTION_BANK[shift:] + TRIVIA_QUESTION_BANK[:shift]

    return [
        {
            "id": question["id"],
            "question": question["question"],
            "options": question["options"],
        }
        for question in rotated
    ]


def submit_trivia_answer(db: Session, user_id: int, question_id: str, selected_option: int) -> Dict[str, Any]:
    date_key = _today_key()
    shift = int(date_key.replace("-", "")) % len(TRIVIA_QUESTION_BANK)
    rotated = TRIVIA_QUESTION_BANK[shift:] + TRIVIA_QUESTION_BANK[:shift]

    question = next((item for item in rotated if item["id"] == question_id), None)
    if not question:
        raise ValueError("Trivia question not found for today's rotation")

    existing_attempt = db.query(GameTriviaAttempt).filter(
        GameTriviaAttempt.user_id == user_id,
        GameTriviaAttempt.question_id == question_id,
        GameTriviaAttempt.attempt_date == date_key,
    ).first()
    if existing_attempt:
        return {
            "question_id": question_id,
            "already_answered": True,
            "correct": bool(existing_attempt.correct),
            "correct_option": int(question["answer"]),
            "correct_answer": question["options"][int(question["answer"])],
            "trigger_result": None,
        }

    is_correct = int(selected_option) == int(question["answer"])

    db.add(
        GameTriviaAttempt(
            user_id=user_id,
            question_id=question_id,
            attempt_date=date_key,
            selected_option=int(selected_option),
            correct=is_correct,
            attempted_at=_utc_now(),
        )
    )

    trigger_result: Optional[Dict[str, Any]] = None
    if is_correct:
        trigger_result = auto_trigger_quest(user_id, "trivia_correct", db, amount=1.0)

    return {
        "question_id": question_id,
        "already_answered": False,
        "correct": is_correct,
        "correct_option": int(question["answer"]),
        "correct_answer": question["options"][int(question["answer"])],
        "trigger_result": trigger_result,
    }


def _profile_payload(profile: GameProfile) -> Dict[str, Any]:
    total_xp = int(profile.total_xp or 0)
    level = int(profile.level or 1)

    current_floor = LEVEL_XP_THRESHOLDS[max(0, level - 1)]
    next_threshold = None
    if level < len(LEVEL_XP_THRESHOLDS):
        next_threshold = LEVEL_XP_THRESHOLDS[level]

    xp_in_level = total_xp - current_floor
    if next_threshold is None:
        xp_for_level = max(1, LEVEL_XP_THRESHOLDS[-1] - LEVEL_XP_THRESHOLDS[-2])
        xp_to_next_level = 0
        progress_pct = 100.0
    else:
        xp_for_level = max(1, next_threshold - current_floor)
        xp_to_next_level = max(0, next_threshold - total_xp)
        progress_pct = max(0.0, min(100.0, (xp_in_level / xp_for_level) * 100.0))

    return {
        "total_xp": total_xp,
        "level": level,
        "player_class": profile.player_class,
        "streak_days": int(profile.streak_days or 0),
        "longest_streak": int(profile.longest_streak or 0),
        "xp_in_level": int(max(0, xp_in_level)),
        "xp_for_level": int(xp_for_level),
        "xp_to_next_level": int(xp_to_next_level),
        "level_progress_pct": round(progress_pct, 1),
    }


def get_achievement_catalog(db: Session, user_id: int) -> Dict[str, Any]:
    unlocks = db.query(GameAchievementUnlock).filter(
        GameAchievementUnlock.user_id == user_id
    ).all()
    unlocked_by_code = {item.achievement_code: item for item in unlocks}

    items: List[Dict[str, Any]] = []
    for definition in ACHIEVEMENT_DEFINITIONS:
        unlocked = unlocked_by_code.get(definition["code"])
        items.append(
            {
                "code": definition["code"],
                "title": definition["title"],
                "rarity": definition["rarity"],
                "description": definition["description"],
                "xp_bonus": int(definition["xp_bonus"]),
                "unlocked": bool(unlocked),
                "unlocked_at": unlocked.unlocked_at.isoformat() if unlocked else None,
            }
        )

    return {
        "total": len(items),
        "unlocked": len(unlocks),
        "items": items,
    }


def get_leaderboard(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    rows = (
        db.query(GameProfile, User)
        .join(User, User.id == GameProfile.user_id)
        .order_by(GameProfile.total_xp.desc(), GameProfile.updated_at.asc())
        .limit(limit)
        .all()
    )

    leaderboard: List[Dict[str, Any]] = []
    for idx, (profile, user) in enumerate(rows, start=1):
        leaderboard.append(
            {
                "rank": idx,
                "user_id": int(user.id),
                "username": user.username,
                "full_name": user.full_name,
                "total_xp": int(profile.total_xp or 0),
                "level": int(profile.level or 1),
                "player_class": profile.player_class,
                "streak_days": int(profile.streak_days or 0),
            }
        )

    return leaderboard


def get_streak_calendar(db: Session, user_id: int, days: int = 7) -> List[Dict[str, Any]]:
    end_date = _india_now().date()
    start_date = end_date - timedelta(days=max(0, days - 1))

    active_dates = {
        row[0]
        for row in db.query(GameActionEvent.event_date).filter(
            GameActionEvent.user_id == user_id,
            GameActionEvent.event_date >= start_date.isoformat(),
            GameActionEvent.event_date <= end_date.isoformat(),
        ).distinct().all()
    }

    tiles: List[Dict[str, Any]] = []
    for offset in range(days):
        day = start_date + timedelta(days=offset)
        key = day.isoformat()
        tiles.append(
            {
                "date": key,
                "label": day.strftime("%a"),
                "completed": key in active_dates,
            }
        )

    return tiles


def get_svasthaquest_state(db: Session, user_id: int) -> Dict[str, Any]:
    date_key = _today_key()
    profile = _get_or_create_profile(db, user_id)
    _update_level_fields(profile)
    _ensure_daily_quest_rows(db, user_id, date_key)

    answered_today = [
        row.question_id
        for row in db.query(GameTriviaAttempt).filter(
            GameTriviaAttempt.user_id == user_id,
            GameTriviaAttempt.attempt_date == date_key,
        ).all()
    ]

    db.flush()

    return {
        "profile": _profile_payload(profile),
        "daily_quests": get_daily_quests(db, user_id, date_key=date_key),
        "trivia": {
            "total_questions": len(TRIVIA_QUESTION_BANK),
            "questions": get_trivia_questions(date_key=date_key),
            "answered_today": answered_today,
        },
        "achievements": get_achievement_catalog(db, user_id),
        "leaderboard": get_leaderboard(db, limit=10),
        "streak_calendar": get_streak_calendar(db, user_id, days=7),
        "meta": {
            "resets_at": "00:00 IST",
            "today": date_key,
        },
    }
