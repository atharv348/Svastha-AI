import os
from groq import Groq

api_key = os.environ.get("GROQ_API_KEY")
if not api_key or "your-groq-api-key" in api_key:
    client = None
else:
    client = Groq(api_key=api_key)


def get_groq_client():
    return client

def generate_ai_content(prompt: str, system_prompt: str = None) -> str:
    if client is None:
        # Provide high-quality mock response for demo purposes if API key is not set
        if "meal plan" in prompt.lower() or "nutrition" in prompt.lower():
            return """# 🍏 Your Personalized 7-Day Meal Plan

Based on your profile, here is a balanced Indian-focused meal plan for weight loss and optimal nutrition.

### Daily Targets
- **Calories**: 1,800 kcal
- **Protein**: 120g (25%)
- **Carbs**: 180g (40%)
- **Fats**: 70g (35%)

---

### Weekly Schedule

| Meal | Recommended Food | Calories | Protein |
| :--- | :--- | :--- | :--- |
| **Breakfast** | Vegetable Poha with peanuts + 2 Boiled Egg Whites | 350 | 18g |
| **Mid-Morning** | 1 Medium Apple + 5 Almonds | 120 | 2g |
| **Lunch** | 2 Whole Wheat Chapatis + 1 Cup Dal + 1 Cup Mixed Veg Sabzi + Salad | 550 | 22g |
| **Evening** | Green Tea + Roasted Makhana (1 cup) | 100 | 3g |
| **Dinner** | Grilled Chicken Breast (150g) OR Paneer Tikka + 1/2 Cup Brown Rice + Sauteed Broccoli | 480 | 35g |
| **Before Bed** | 1 Cup Warm Turmeric Milk (no sugar) | 150 | 8g |

---

### Key Recommendations
- **Hydration**: Drink 3-4 liters of water daily.
- **Sodium**: Limit salt intake to under 5g per day.
- **Consistency**: Try to eat within a 10-hour window (Intermittent Fasting 14:10).

*Note: This is a demo response as the AI service is currently in mock mode.*"""

        return """# 🤖 AROMI Health Assistant (Demo Mode)

Hello! I'm AROMI, your AI Health Coach. Currently, I'm running in **Demo Mode** because the Groq API key hasn't been configured yet.

### How I can help you:
- **Meal Planning**: I can design personalized nutrition guides.
- **Workout Coaching**: I can create exercise routines tailored to your fitness level.
- **Health Insights**: I can explain your clinical data and scan results.

### Your Health Summary:
Based on your profile, I recommend focusing on a **High Protein, Low Carb** approach to reach your target weight safely.

Please set a valid `GROQ_API_KEY` in the `.env` file to unlock my full real-time capabilities!"""
    
    if system_prompt is None:
        system_prompt = """You are AROMI, a helpful, clear, and friendly AI assistant.
        
        RESPONSE FORMATTING RULES:
        - Write in short paragraphs of 2–4 sentences. One idea per paragraph.
        - Use bullet points ONLY when listing 3 or more parallel items or steps.
        - Bold (**text**) key terms or action words only — never full sentences.
        - Use headers (## Title) only for long multi-section answers.
        - Never pad answers with filler phrases like "Great question!" or "Of course!".
        - Match response length to the question: short questions get short answers.
        - End when the answer is complete. No closing pleasantries.
        
        TONE:
        - Conversational but precise. Warm but not sycophantic.
        - Use "you" to speak directly to the user.
        - Prefer simple words over jargon unless the user uses jargon first."""

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": prompt,
                }
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.7,
            max_tokens=2048,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        error_msg = str(e)
        print(f"Groq API Error: {error_msg}")
        return f"⚠️ AI Service Error: {error_msg}"

def get_workout_plan(prompt: str) -> str:
    if client is None:
        return """# 🏋️ Your Personalized 7-Day Workout Routine

This routine is designed for balanced strength and cardio, optimized for your profile.

### Workout Summary
- **Goal**: Functional Fitness & Fat Loss
- **Frequency**: 4 Days Active, 3 Days Rest
- **Intensity**: Moderate (RPE 6-7)

---

### Weekly Schedule

| Day | Focus | Exercises (sets x reps) |
| :--- | :--- | :--- |
| **Mon** | Full Body Strength | **Squats** (3x12), **Push-ups** (3xMax), **Plank** (3x45s) |
| **Tue** | Cardio (LISS) | 30-min Brisk Walk or Cycling |
| **Wed** | Rest & Recovery | Light Stretching / Yoga |
| **Thu** | Upper Body Focus | **Shoulder Press** (3x10), **Dumbbell Rows** (3x12), **Tricep Dips** (3x10) |
| **Fri** | Lower Body & Core | **Lunges** (3x12), **Glute Bridges** (3x15), **Deadbugs** (3x12) |
| **Sat** | Active Recovery | 20-min Swimming or Leisurely Walk |
| **Sun** | Full Rest | Deep Breathing / Meditation |

---

### Important Notes
- **Warm-up**: 5 mins dynamic stretching before every session.
- **Cool-down**: 5-10 mins static stretching after every session.
- **Progress**: Increase weights or reps by 5% every 2 weeks.

*Note: This is a demo response as the AI service is currently in mock mode.*"""

    system_prompt = """You are an expert fitness coach AI.
    
    FILE ANALYSIS:
    - If the user has uploaded a health report or file (indicated in the prompt), analyze its contents (Vitals, BMI, Risks, etc.) meticulously to tailor the workout plan.
    - Reference specific data points from the file to show you've read it (e.g., "Given your reported BMI of X...").
    
    RESPONSE STRUCTURE:
    - Begin with a 1-paragraph overview of the plan's goal and approach (under 3 sentences).
    - MANDATORY: Use a markdown table for the weekly schedule. 
    - Table columns: | Day | Focus | Exercises (sets x reps) |
    - Include a "Rest & Recovery" section at the end.
    - Bold **exercise names**. Italicize *muscle groups*.
    
    FORMATTING:
    - ALWAYS use markdown tables for the main routine.
    - Be specific: foods, weights, reps. No vague advice.
    - Use metric (kg, cm) or imperial (lbs, inches) based on user preference.
    - Use horizontal rules (---) to separate sections.
    
    TONE:
    - Motivating but realistic. Science-backed. No hype."""
    
    return generate_ai_content(prompt, system_prompt)

def get_meal_plan(prompt: str) -> str:
    if client is None:
        return """# 🍏 Your Personalized 7-Day Meal Plan

Based on your profile, here is a balanced Indian-focused meal plan for weight loss and optimal nutrition.

### Daily Targets
- **Calories**: 1,800 kcal
- **Protein**: 120g (25%)
- **Carbs**: 180g (40%)
- **Fats**: 70g (35%)

---

### Weekly Schedule

| Meal | Recommended Food | Calories | Protein |
| :--- | :--- | :--- | :--- |
| **Breakfast** | Vegetable Poha with peanuts + 2 Boiled Egg Whites | 350 | 18g |
| **Mid-Morning** | 1 Medium Apple + 5 Almonds | 120 | 2g |
| **Lunch** | 2 Whole Wheat Chapatis + 1 Cup Dal + 1 Cup Mixed Veg Sabzi + Salad | 550 | 22g |
| **Evening** | Green Tea + Roasted Makhana (1 cup) | 100 | 3g |
| **Dinner** | Grilled Chicken Breast (150g) OR Paneer Tikka + 1/2 Cup Brown Rice + Sauteed Broccoli | 480 | 35g |
| **Before Bed** | 1 Cup Warm Turmeric Milk (no sugar) | 150 | 8g |

---

### Key Recommendations
- **Hydration**: Drink 3-4 liters of water daily.
- **Sodium**: Limit salt intake to under 5g per day.
- **Consistency**: Try to eat within a 10-hour window (Intermittent Fasting 14:10).

*Note: This is a demo response as the AI service is currently in mock mode.*"""

    system_prompt = """You are an expert nutrition coach AI.
    
    FILE ANALYSIS:
    - If the user has uploaded a health report (e.g., blood sugar, cholesterol, weight), read the extracted content in the prompt and tailor the nutrition plan to address those health markers.
    - Mention specific values from the report to show you've analyzed them (e.g., "Since your hemoglobin is X g/dL...").
    
    RESPONSE STRUCTURE:
    - Start with daily calorie target and macro split (protein/carbs/fat).
    - MANDATORY: Use a markdown table for each day or the overall weekly structure.
    - Table columns: | Meal | Recommended Food | Calories | Protein |
    - Group by: Breakfast, Lunch, Dinner, Snacks.
    - End with a hydration and supplement note.
    
    FORMATTING:
    - ALWAYS use markdown tables for the meal details.
    - Be specific: foods, weights, portions. No vague advice.
    - Use metric or imperial based on user preference.
    - Use horizontal rules (---) to separate sections.
    
    TONE:
    - Motivating but realistic. Science-backed."""
    
    return generate_ai_content(prompt, system_prompt)

def get_sahayak_guidance(profile_data: dict, schemes: list) -> str:
    if client is None:
        # Provide a smart mock response
        disability_type = profile_data.get("disability_type", "your disability")
        percentage = profile_data.get("disability_percentage", 0)
        
        if not schemes:
            return f"I see you have a {percentage}% {disability_type} disability. Based on your current profile, I couldn't find any matching schemes. Try updating your annual income or ensuring your state is correct to see more options."
        
        top_scheme = schemes[0]["name"]
        return f"I see you have a {percentage}% {disability_type} disability. You're highly eligible for the **{top_scheme}**. I can help you fill the form in **Hindi** or **Marathi**!"

    system_prompt = """You are AROMI, a specialized disability entitlement assistant.
    
    Your goal is to provide a concise, 2-sentence summary of the user's eligibility and offer guidance on the next steps.
    
    RULES:
    - Reference the user's disability percentage and type.
    - Mention 1 or 2 specific schemes from the provided list that are the best match.
    - Mention that you can help them fill the application form in their preferred language (e.g. Hindi, Marathi).
    - Be warm, supportive, and direct.
    - Maximum 3 sentences.
    """
    
    prompt = f"User Profile: {profile_data}\n\nEligible Schemes: {schemes}\n\nPlease provide guidance."
    return generate_ai_content(prompt, system_prompt)

def get_ai_coach_response(prompt: str, history: list = None) -> str:
    if client is None:
        return """# 🤖 AROMI Health Assistant (Demo Mode)

Hello! I'm AROMI, your AI Health Coach. Currently, I'm running in **Demo Mode** because the Groq API key hasn't been configured yet.

### How I can help you:
- **Meal Planning**: I can design personalized nutrition guides.
- **Workout Coaching**: I can create exercise routines tailored to your fitness level.
- **Health Insights**: I can explain your clinical data and scan results.

### Your Health Summary:
Based on your profile, I recommend focusing on a **High Protein, Low Carb** approach to reach your target weight safely.

Please set a valid `GROQ_API_KEY` in the `.env` file to unlock my full real-time capabilities!"""

    system_prompt = """You are AROMI, a professional and highly intelligent AI Health Coach. 
    
    Your role is to engage in open, helpful, and insightful conversations about health, wellness, and medical data. 
    
    GUIDELINES:
    - Be conversational, empathetic, and direct. 
    - Provide expert-level insights based on clinical and biometric context.
    - Feel free to discuss topics in depth or keep them brief based on the user's needs.
    - No rigid formatting rules — use your intelligence to structure responses naturally using markdown.
    - Always prioritize accuracy and user safety in your health advice.
    
    TONE:
    - Think of yourself as a brilliant friend who is also an expert in medical science and coaching.
    - Warm, professional, and non-judgmental."""
    
    return generate_ai_content(prompt, system_prompt)
