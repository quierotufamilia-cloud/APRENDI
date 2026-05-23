export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  time: string; // "13:14"
  date: string; // "2026-05-21"
}

export interface DailySummary {
  consumedCalories: number;
  targetCalories: number;
  remainingCalories: number;
  protein: number;
  proteinTarget: number;
  carbs: number;
  carbsTarget: number;
  fat: number;
  fatTarget: number;
  entries: FoodEntry[];
}

export interface AppSettings {
  dailyCalorieTarget: number;
  weeklyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatTarget: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  imageUrl?: string; // photo upload
  audioUrl?: string; // voice recording
  detectedFoods?: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
}
