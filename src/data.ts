import { FoodEntry, AppSettings } from "./types";

// The local time provided is 2026-05-21
export const DEFAULT_TODAY = "2026-05-21";

export const DEFAULT_SETTINGS: AppSettings = {
  dailyCalorieTarget: 1843,
  weeklyCalorieTarget: 12901,
  proteinTarget: 110,
  carbsTarget: 200,
  fatTarget: 55,
};

// We want the total of current week to be exactly 11035.
// Thursday today is 441 kcal. "13:14 Almuerzo"
// Thus previous days (Mon 18, Tue 19, Wed 20) need to equal 10594 kcal.
// Let's divide 10594:
// - Mon 18 May: 3450 kcal
// - Tue 19 May: 3520 kcal
// - Wed 20 May: 3624 kcal
// Total Monday - Wednesday = 10594 kcal.
export const INITIAL_FOOD_LOGS: FoodEntry[] = [
  // --- Monday 18 May 2026 (Total: 3450 kcal) ---
  {
    id: "prev-1",
    name: "Tostadas con palta y huevos",
    calories: 550,
    protein: 22,
    carbs: 45,
    fat: 25,
    time: "08:30",
    date: "2026-05-18",
  },
  {
    id: "prev-2",
    name: "Milanesa con puré de papas",
    calories: 950,
    protein: 42,
    carbs: 95,
    fat: 28,
    time: "13:15",
    date: "2026-05-18",
  },
  {
    id: "prev-3",
    name: "Snack licuado banana y whey",
    calories: 450,
    protein: 30,
    carbs: 50,
    fat: 5,
    time: "17:30",
    date: "2026-05-18",
  },
  {
    id: "prev-4",
    name: "Asado con ensalada mixta y vino",
    calories: 1500,
    protein: 85,
    carbs: 20,
    fat: 95,
    time: "21:30",
    date: "2026-05-18",
  },

  // --- Tuesday 19 May 2026 (Total: 3520 kcal) ---
  {
    id: "prev-5",
    name: "Aparato de Café & 3 medialunas",
    calories: 820,
    protein: 12,
    carbs: 110,
    fat: 32,
    time: "09:00",
    date: "2026-05-19",
  },
  {
    id: "prev-6",
    name: "Sorrentinos de jamón y queso",
    calories: 1100,
    protein: 35,
    carbs: 140,
    fat: 30,
    time: "13:30",
    date: "2026-05-19",
  },
  {
    id: "prev-7",
    name: "Yogur con granola y miel",
    calories: 400,
    protein: 15,
    carbs: 60,
    fat: 8,
    time: "17:00",
    date: "2026-05-19",
  },
  {
    id: "prev-8",
    name: "Pizza casera (4 porciones) y birra",
    calories: 1200,
    protein: 45,
    carbs: 150,
    fat: 40,
    time: "21:45",
    date: "2026-05-19",
  },

  // --- Wednesday 20 May 2026 (Total: 3624 kcal) ---
  {
    id: "prev-9",
    name: "Café con leche y tostado de jamón",
    calories: 480,
    protein: 20,
    carbs: 50,
    fat: 18,
    time: "08:45",
    date: "2026-05-20",
  },
  {
    id: "prev-10",
    name: "Suprema de pollo con ensalada",
    calories: 750,
    protein: 50,
    carbs: 30,
    fat: 20,
    time: "13:05",
    date: "2026-05-20",
  },
  {
    id: "prev-11",
    name: "Porción de torta rogel y mate",
    calories: 850,
    protein: 10,
    carbs: 115,
    fat: 28,
    time: "17:15",
    date: "2026-05-20",
  },
  {
    id: "prev-12",
    name: "Hamburguesa doble cheddar con papas",
    calories: 1544,
    protein: 60,
    carbs: 120,
    fat: 75,
    time: "21:30",
    date: "2026-05-20",
  },

  // --- Thursday 21 May 2026 (Today, Initial: 441 kcal) ---
  {
    id: "today-1",
    name: "Almuerzo",
    calories: 441,
    protein: 32,
    carbs: 50,
    fat: 12,
    time: "13:14",
    date: "2026-05-21",
  },
];

// Elegant Spanish Date formatting helpers
export function formatDateLabel(dateStr: string): string {
  if (dateStr === DEFAULT_TODAY) return "Hoy";
  
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  
  // Custom format in Spanish: "Jueves 21 de Mayo"
  const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  
  const dayName = days[dateObj.getDay()];
  const dayNum = dateObj.getDate();
  const monthName = months[dateObj.getMonth()];
  
  return `${dayName} ${dayNum} de ${monthName}`;
}

export function getRelativeDaysInWeek(targetDateStr: string): string[] {
  // Let's generate the YYYY-MM-DD strings for Mon-Sun of that week
  const parts = targetDateStr.split("-");
  const dateObj = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
  const day = dateObj.getDay(); // 0 is Sun, 1 is Mon
  
  // Calculate distance to Monday
  const diffToMon = day === 0 ? -6 : 1 - day;
  const monday = new Date(dateObj);
  monday.setDate(dateObj.getDate() + diffToMon);
  
  const weekDays: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    weekDays.push(`${yr}-${mo}-${dy}`);
  }
  return weekDays;
}
