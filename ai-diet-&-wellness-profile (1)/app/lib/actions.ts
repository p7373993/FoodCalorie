
'use server';

import { GoogleGenAI } from "@google/genai";
import type { DailyLog, UserProfile } from './types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateDietReport = async (logs: DailyLog[]): Promise<string> => {
  const simplifiedLogs = logs.map(log => ({
    date: log.date,
    meals: log.meals.map(m => ({
      name: m.name,
      calories: m.nutrients.calories,
      protein: m.nutrients.protein,
      carbs: m.nutrients.carbs,
      fat: m.nutrients.fat,
    })),
    totalCalories: log.meals.reduce((sum, meal) => sum + meal.nutrients.calories, 0),
  }));

  const prompt = `
    You are a friendly and encouraging AI diet coach.
    Based on the following user's meal logs, generate a personalized diet report in markdown format.

    The report should include:
    1.  **Overall Summary:** A brief, positive overview of the user's recent activity.
    2.  **Nutritional Analysis:** Insights into their calorie and macronutrient intake. Are they balanced? Any patterns?
    3.  **Actionable Advice:** One or two simple, concrete suggestions for improvement based on the food logs.
    4.  **Motivational Message:** A short, uplifting message to keep them going.

    User Data:
    - Last 7 days of meal logs: ${JSON.stringify(simplifiedLogs.slice(-7))}

    Please provide a helpful and easy-to-read report.
    `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI report:", error);
    return "I'm sorry, I couldn't generate the report at this moment. Please try again later.";
  }
};

export const generateDailySummary = async (log: DailyLog, goals: { calorieGoal: number, nutrientGoals: UserProfile['nutrientGoals'] }): Promise<string> => {
    const totalNutrients = log.meals.reduce((acc, meal) => {
        acc.calories += meal.nutrients.calories;
        acc.protein += meal.nutrients.protein;
        acc.carbs += meal.nutrients.carbs;
        acc.fat += meal.nutrients.fat;
        return acc;
    }, { calories: 0, protein: 0, carbs: 0, fat: 0 });

    const prompt = `
    You are an AI diet coach. Based on the user's single-day meal intake and their goals, provide a short, one or two-sentence summary comment.
    Be encouraging and focus on one key positive achievement or a gentle tip.

    User's Goals:
    - Calories: ${goals.calorieGoal} kcal
    - Protein: ${goals.nutrientGoals.protein} g
    - Carbs: ${goals.nutrientGoals.carbs} g
    - Fat: ${goals.nutrientGoals.fat} g

    Today's Intake:
    - Calories: ${totalNutrients.calories} kcal
    - Protein: ${totalNutrients.protein} g
    - Carbs: ${totalNutrients.carbs} g
    - Fat: ${totalNutrients.fat} g

    Example comments:
    - "Great job on keeping your calorie intake in check today!"
    - "Your protein intake was excellent, perfect for muscle recovery."
    - "A very balanced day! Consider adding a bit more fiber tomorrow."

    Generate a single, concise comment for today's performance.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        return response.text;
    } catch (error) {
        console.error("Error generating daily summary:", error);
        return "Keep up the great work logging your meals!";
    }
};
