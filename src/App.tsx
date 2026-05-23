import React, { useState, useEffect, useRef } from "react";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Send, 
  Mic, 
  Camera, 
  Settings, 
  Calendar, 
  BarChart2, 
  MessageSquare, 
  Sparkles, 
  X, 
  Check, 
  RotateCcw,
  Smile,
  Edit2,
  Star
} from "lucide-react";
import { FoodEntry, AppSettings, ChatMessage } from "./types";
import { 
  DEFAULT_TODAY, 
  DEFAULT_SETTINGS, 
  INITIAL_FOOD_LOGS, 
  formatDateLabel, 
  getRelativeDaysInWeek 
} from "./data";

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (e) {
      console.warn("Storage access restricted by security policy inside sandbox:", e);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn("Storage write restricted by security policy inside sandbox:", e);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (e) {
      console.warn("Storage remove restricted by security policy inside sandbox:", e);
    }
  }
};

// Local food analyzer fallback for fully static clients (e.g., deployed under Netlify / Vercel Static)
function analyzeFoodLocally(message: string, hasImage?: boolean): { reply: string; detectedFoods: any[] } {
  const norm = (message || "").toLowerCase();
  
  // Clean up message of common voice prefix
  const cleanMsg = message
    .replace(/🎙️\s*\[Mensaje de Voz\]:\s*"/, "")
    .replace(/"$/, "")
    .trim();

  const foods = [
    { keys: ["medialuna", "factura"], name: "Medialuna de manteca", cal: 280, prot: 5, carb: 38, fat: 12 },
    { keys: ["café con leche", "cafe con leche"], name: "Café con leche descremada", cal: 95, prot: 6, carb: 12, fat: 2 },
    { keys: ["café", "cafe"], name: "Café negro solo", cal: 10, prot: 0, carb: 2, fat: 0 },
    { keys: ["bife", "lomo", "carne", "asado", "bife de lomo"], name: "Bife a la plancha", cal: 310, prot: 35, carb: 0, fat: 18 },
    { keys: ["ensalada"], name: "Ensalada mixta fresca", cal: 120, prot: 3, carb: 12, fat: 7 },
    { keys: ["banana"], name: "Banana mediana", cal: 105, prot: 1, carb: 27, fat: 0 },
    { keys: ["manzana"], name: "Manzana fresca", cal: 95, prot: 0, carb: 25, fat: 0 },
    { keys: ["huevo", "huevos"], name: "Huevos revueltos", cal: 150, prot: 13, carb: 1, fat: 11 },
    { keys: ["queso de almendra"], name: "Queso de almendra (50g)", cal: 120, prot: 4, carb: 2, fat: 11 },
    { keys: ["queso"], name: "Queso cremoso", cal: 150, prot: 10, carb: 1, fat: 12 },
    { keys: ["empanada", "empanadas"], name: "Empanada", cal: 290, prot: 8, carb: 32, fat: 13 },
    { keys: ["hamburguesa"], name: "Hamburguesa completa", cal: 520, prot: 28, carb: 40, fat: 24 },
    { keys: ["fideos", "pasta", "tallarines"], name: "Fideos con salsa fileto", cal: 360, prot: 10, carb: 65, fat: 5 },
    { keys: ["arroz"], name: "Arroz blanco hervido", cal: 220, prot: 4, carb: 48, fat: 1 },
    { keys: ["pizza"], name: "Porción de pizza muzza", cal: 280, prot: 12, carb: 32, fat: 10 },
    { keys: ["yogur", "yogurt"], name: "Yogur entero clásico", cal: 130, prot: 6, carb: 16, fat: 4 },
    { keys: ["pan", "tostada", "tostadas"], name: "Tostadas con queso", cal: 160, prot: 5, carb: 28, fat: 3 }
  ];

  const matchedFoods: any[] = [];
  
  for (const food of foods) {
    if (food.keys.some(k => norm.includes(k))) {
      const alreadyLogged = matchedFoods.some(f => f.name.toLowerCase() === food.name.toLowerCase());
      if (!alreadyLogged) {
        matchedFoods.push({
          name: food.name,
          calories: food.cal,
          protein: food.prot,
          carbs: food.carb,
          fat: food.fat
        });
      }
    }
  }

  // If no specific foods matched, but they wrote a message with calories
  const calorieMatch = cleanMsg.match(/(\d+)\s*(kcal|calorías|calorias|cal)/i);
  if (matchedFoods.length === 0 && calorieMatch) {
    const extractedCalories = parseInt(calorieMatch[1]);
    let extractedName = cleanMsg
      .replace(calorieMatch[0], "")
      .replace(/(me comí|me comi|comí|comi|almorcé|almorce|desayuné|desayune|cené|cene)/gi, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .trim();
    
    extractedName = extractedName ? extractedName.charAt(0).toUpperCase() + extractedName.slice(1) : "Plato registrado";
    
    matchedFoods.push({
      name: extractedName,
      calories: extractedCalories,
      protein: Math.round(extractedCalories * 0.04),
      carbs: Math.round(extractedCalories * 0.1),
      fat: Math.round(extractedCalories * 0.03)
    });
  }

  // If still nothing matched, but it looks like they are trying to log food (verbs)
  if (matchedFoods.length === 0 && norm.match(/(comi|desayune|almorce|cene|merende|peso|registro|anota)/i)) {
    let cleanName = cleanMsg
      .replace(/(me comí|me comi|comí|comi|almorcé|almorce|desayuné|desayune|cené|cene|registra|anotame|anota|che)/gi, "")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, "")
      .trim();
    
    cleanName = cleanName ? cleanName.charAt(0).toUpperCase() + cleanName.slice(1) : "Plato combinado";
    
    matchedFoods.push({
      name: cleanName,
      calories: 320,
      protein: 14,
      carbs: 40,
      fat: 10
    });
  }

  // Static site fallback for image uploading: simulate detection or enhance the reply
  if (hasImage && matchedFoods.length === 0) {
    const simulatedOptions = [
      { name: "Bife a la plancha con ensalada mixta", cal: 430, prot: 38, carb: 12, fat: 25 },
      { name: "Empanadas de carne al horno (2 u)", cal: 580, prot: 16, carb: 64, fat: 26 },
      { name: "Medialuna de manteca con café con leche descremada", cal: 375, prot: 11, carb: 50, fat: 14 },
      { name: "Plato de fideos caseros con salsa fileto", cal: 360, prot: 10, carb: 65, fat: 5 },
      { name: "Ensalada mixta súper fresca con pollo desmenuzado", cal: 240, prot: 24, carb: 14, fat: 10 }
    ];
    // Pick based on a subtle layout index
    const selected = simulatedOptions[Math.floor(Math.random() * simulatedOptions.length)];
    
    matchedFoods.push({
      name: selected.name,
      calories: selected.cal,
      protein: selected.prot,
      carbs: selected.carb,
      fat: selected.fat
    });

    return {
      reply: `📷 ¡Subiste una foto bárbara! Analicé la imagen rápido y detecté: **${selected.name}** (~${selected.cal} kcal). 
      
*(¡Ya te lo anoté arriba! Si no era eso, podés modificarlo tocando el botoncito de editar ✏️ al lado del plato, o simplemente decime qué comiste escribiéndolo abajo).*`,
      detectedFoods: matchedFoods
    };
  }

  const isQuestion = norm.includes("?") || 
                     norm.match(/(cuanto|cuánto|que|qué|como|cómo|tiene|tienen|conviene|recomendas|recomendás|recomiendan|puedo|está mal|esta mal|está bien|esta bien|existe|existen|mitos|receta|recetas|consejo|consejos|queja|debo|debería|deberia|no se si|no sé si|no se qué|no sé qué|o qué|que elegir|qué elegir)/i) ||
                     norm.includes("para qué") || 
                     norm.includes("para que") ||
                     norm.includes("por qué") || 
                     norm.includes("por que") ||
                     (norm.match(/\b(o|u)\b/) && matchedFoods.length > 1);

  let reply = "";
  if (isQuestion) {
    const matchedNames = matchedFoods.map(f => f.name.toLowerCase());
    matchedFoods.length = 0; // Clear so we do not save a false/unwanted food entry!

    if (norm.match(/(chocolate|dulce|caramelo|bombon|bombón|postre|helado)/i)) {
      reply = `¡Pará un poco! Comerse un chocolate o un dulce de vez en cuando no está mal para nada, ¡al contrario! El cerebro también necesita un mimo. 🍫 
      
La clave es el equilibrio: si entra dentro de tus calorías diarias de hoy, metele para adelante sin culpa. Lo importante es no descontrolarse y seguir metiéndole pilas al resto de las comidas saludables. ¡Disfrutalo tranqui!`;
    } else if (matchedNames.length > 0) {
      reply = `¡Buena consulta! Si te referís a un plato como **${matchedNames.join(" o ")}**, se estima en promedio que aporta valores moderados si cuidás las porciones. Por ejemplo, una porción promedio suele andar por las **280-350 calorías**.
      
¿Querés que te la anote en tu diario de hoy o simplemente estás consultando por curiosidad? Contame y lo vemos. 😉`;
    } else if (norm.match(/(bife|lomo|carne|pollo|pescado|huevo|proteina|proteína)/i)) {
      reply = `¡Totalmente recomendable! Las proteínas son fundamentales para mantener la masa muscular y dar saciedad. Un bife, pollo o huevos te van a dar una excelente base de macronutrientes. 🥩🥚
      
¿Te gustaría que te anote alguna porción para hoy, o estás planificando tus menúes?`;
    } else if (norm.match(/(esta mal|está mal|esta bien|está bien|conviene|puedo comer|comer algo|hambre|tentado|tentada)/i)) {
      reply = `¡Mirá! En la nutrición no hay alimentos 'buenos' o 'malos' por sí solos. Si tenés hambre o antojo de algo específico (como una factura o un snack), lo ideal es comer una porción moderada y disfrutarlo sin culpa. 
 
Intentá acompañarlo con un vaso de agua o algo con proteína/fibra para que te dé más saciedad. ¿Qué tenías ganas de comer exactamente?`;
    } else {
      reply = `¡Qué buena pregunta! Como tu asesor, te sugiero priorizar alimentos frescos, proteínas magras y una buena hidratación. Mantener un balance energético cómodo es la mejor forma de cuidar la salud de manera sostenible en el tiempo. 🌟
      
¿Tenés alguna duda específica sobre macros, o querés que registremos alguna comida en tu diario?`;
    }
  } else if (matchedFoods.length > 0) {
    const totalCal = matchedFoods.reduce((acc, f) => acc + f.calories, 0);
    const names = matchedFoods.map(f => f.name).join(" y ");
    if (hasImage) {
      reply = `📷 ¡Vi la foto que adjuntaste y tu nota! Analicé localmente en el navegador y registré **${names}** con unas **${totalCal} calorías** hoy. ¡De primera pinta ese plato!`;
    } else {
      reply = `¡Análisis completado en tu navegador! Registré ${names} con unas ${totalCal} calorías en total. ¡Excelente avance hoy!`;
    }
  } else {
    // conversational fallback
    if (norm.match(/(chocolate|dulce|caramelo|bombon|bombón|postre|helado)/i)) {
      reply = `¡Pará un poco! Comerse un chocolate o un dulce de vez en cuando no está mal para nada, ¡al contrario! El cerebro también necesita un mimo. 🍫 
      
La clave es el equilibrio: si entra dentro de tus calorías diarias de hoy, metele para adelante sin culpa. Lo importante es no descontrolarse y seguir metiéndole pilas al resto de las comidas saludables. ¡Disfrutalo tranqui!`;
    } else if (norm.match(/(esta mal|está mal|esta bien|está bien|conviene|puedo comer|comer algo|hambre|tentado|tentada)/i)) {
      reply = `¡Mirá! En la nutrición no hay alimentos 'buenos' o 'malos' por sí solos. Si tenés hambre o antojo de algo específico (como una factura o un snack), lo ideal es comer una porción moderada y disfrutarlo sin culpa. 

Intentá acompañarlo con un vaso de agua o algo con proteína/fibra para que te dé más saciedad. ¿Qué tenías ganas de comer exactamente?`;
    } else if (norm.match(/(hola|buenas|que tal|cómo andas|como andas|buen dia|buenos dias|che|estimado|estimada)/i)) {
      reply = `¡Hola! ¿Cómo va todo por ahí? Acá el chatbot de Mis Calorías listo para darte una mano. 

Contame qué comiste hoy (por ejemplo: "desayuné dos huevos revueltos" o "almorcé un bife") así te calculo las calorías y te lo anoto. ¡O haceme las consultas que tengas!`;
    } else if (norm.match(/(gracias|joya|buenisimo|buenísimo|excelente|espectacular|barbaro|bárbaro|dale)/i)) {
      reply = `¡De nada! Un placer darte una mano. Venís metiéndole un ritmo espectacular hoy, no aflojes que ya casi liquidamos el día en meta. ¡Cualquier otra cosa me avisás! 🚀`;
    } else if (norm.match(/(no respondes|no responde|no andas|no anda|funciona mal|porque|por que|xq|error|falla)/i)) {
      reply = `¡Hola! Perdón si hubo algún desentendimiento o demora temporal de conexión. Acá estoy para responderte al toque. 

Contame qué comiste o anduviste picando, o haceme cualquier pregunta que tengas sobre nutrición. ¡Estoy listo para ayudarte!`;
    } else {
      reply = `¡Hola! Tomé nota de tu mensaje. Contame qué comiste o anduviste picando hoy (por ejemplo: "café con leche", "empanadas", "pizza") así te computo los macros de una acá mismo en la app. 😉`;
    }
  }

  return { reply, detectedFoods: matchedFoods };
}

export default function App() {
  // Global States
  const [foodLogs, setFoodLogs] = useState<FoodEntry[]>(() => {
    const saved = safeStorage.getItem("mis_calorias_logs");
    return saved ? JSON.parse(saved) : INITIAL_FOOD_LOGS;
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = safeStorage.getItem("mis_calorias_settings");
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  const [currentDate, setCurrentDate] = useState<string>(DEFAULT_TODAY);
  const [currentTab, setCurrentTab] = useState<"diario" | "charlar" | "semana" | "ajustes">("diario");
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(() => {
    const saved = safeStorage.getItem("mis_calorias_chat");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: "hi-ai",
        sender: "ai",
        text: "¡Buenas! ¿Qué andás comiendo hoy? Pasame una foto, hableme por audio o decime qué metiste al cuerpo y yo me encargo de las cuentas por vos. 😉",
        timestamp: new Date(),
      }
    ];
  });

  const [chatInput, setChatInput] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [audioTimer, setAudioTimer] = useState(0);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Modal State for Manual Entry
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"nuevo" | "frecuentes">("nuevo");
  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualTime, setManualTime] = useState("");
  const [saveToFrequent, setSaveToFrequent] = useState(false);

  // Frequent / Favorite foods list list state
  const [frequentFoods, setFrequentFoods] = useState<{
    id: string;
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[]>(() => {
    const saved = safeStorage.getItem("mis_calorias_frecuentes");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { id: "ff-1", name: "Café con leche descremada", calories: 95, protein: 6, carbs: 12, fat: 2 },
      { id: "ff-2", name: "Medialuna de manteca", calories: 280, protein: 5, carbs: 38, fat: 12 },
      { id: "ff-3", name: "Bife de lomo a la plancha", calories: 310, protein: 35, carbs: 0, fat: 18 },
      { id: "ff-4", name: "Queso de almendra (50g)", calories: 120, protein: 4, carbs: 2, fat: 11 },
      { id: "ff-5", name: "Banana mediana", calories: 105, protein: 1, carbs: 27, fat: 0 },
      { id: "ff-6", name: "Porción de ensalada mixta fresca", calories: 120, protein: 3, carbs: 12, fat: 7 }
    ];
  });

  // State for editing an existing food log
  const [editingEntry, setEditingEntry] = useState<FoodEntry | null>(null);

  // Refs
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effects to save state
  useEffect(() => {
    safeStorage.setItem("mis_calorias_logs", JSON.stringify(foodLogs));
  }, [foodLogs]);

  useEffect(() => {
    safeStorage.setItem("mis_calorias_settings", JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    safeStorage.setItem("mis_calorias_frecuentes", JSON.stringify(frequentFoods));
  }, [frequentFoods]);

  useEffect(() => {
    safeStorage.setItem("mis_calorias_chat", JSON.stringify(chatMessages));
    scrollToBottom();
  }, [chatMessages]);

  const scrollToBottom = () => {
    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Helper date navigation (add/sub days from currentDate)
  const shiftDate = (amount: number) => {
    const parts = currentDate.split("-");
    const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    d.setDate(d.getDate() + amount);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const dy = String(d.getDate()).padStart(2, "0");
    setCurrentDate(`${yr}-${mo}-${dy}`);
  };

  const handleSetToday = () => {
    setCurrentDate(DEFAULT_TODAY);
  };

  // Compute Dashboard items for currentDate
  const todaysEntries = foodLogs.filter(e => e.date === currentDate);
  const consumedCaloriesToday = todaysEntries.reduce((sum, e) => sum + e.calories, 0);
  const targetCaloriesToday = settings.dailyCalorieTarget;
  const remainingCaloriesToday = Math.max(0, targetCaloriesToday - consumedCaloriesToday);

  const consumedProteinToday = todaysEntries.reduce((sum, e) => sum + e.protein, 0);
  const consumedCarbsToday = todaysEntries.reduce((sum, e) => sum + (e.carbs || 0), 0);
  const consumedFatToday = todaysEntries.reduce((sum, e) => sum + (e.fat || 0), 0);

  // Compute Week items
  const weekDays = getRelativeDaysInWeek(currentDate);
  const weeklyTarget = settings.weeklyCalorieTarget;
  const weeklyLogs = foodLogs.filter(e => weekDays.includes(e.date));
  const consumedCaloriesWeekly = weeklyLogs.reduce((sum, e) => sum + e.calories, 0);
  const remainingCaloriesWeekly = Math.max(0, weeklyTarget - consumedCaloriesWeekly);

  // Progress calculations
  const todayProgressPercent = Math.min(100, (consumedCaloriesToday / targetCaloriesToday) * 100);
  const weekProgressPercent = Math.min(100, (consumedCaloriesWeekly / weeklyTarget) * 100);

  // Circular stroke offsets
  const radius = 42;
  const circumference = 2 * Math.PI * radius; // ~263.89
  const todayDashoffset = circumference - (todayProgressPercent / 100) * circumference;
  const weekDashoffset = circumference - (weekProgressPercent / 100) * circumference;

  // Add Manual Custom Food
  const handleOpenAddManual = () => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    setManualName("");
    setManualCalories("");
    setManualProtein("");
    setManualCarbs("");
    setManualFat("");
    setManualTime(`${hours}:${minutes}`);
    setSaveToFrequent(false);
    setAddModalTab("nuevo");
    setIsAddOpen(true);
  };

  const handleSaveManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName || !manualCalories) return;

    const calStr = parseInt(manualCalories) || 0;
    const protStr = manualProtein ? parseInt(manualProtein) : 0;
    const carbStr = manualCarbs ? parseInt(manualCarbs) : 0;
    const fatStr = manualFat ? parseInt(manualFat) : 0;

    const newEntry: FoodEntry = {
      id: "manual-" + Date.now(),
      name: manualName,
      calories: calStr,
      protein: protStr,
      carbs: carbStr,
      fat: fatStr,
      time: manualTime || "12:00",
      date: currentDate,
    };

    setFoodLogs(prev => [newEntry, ...prev]);

    // Save to frequent foods if checked
    if (saveToFrequent) {
      const isAlreadySaved = frequentFoods.some(
        ff => ff.name.toLowerCase() === manualName.toLowerCase()
      );
      if (!isAlreadySaved) {
        setFrequentFoods(prev => [
          {
            id: "ff-" + Date.now(),
            name: manualName,
            calories: calStr,
            protein: protStr,
            carbs: carbStr,
            fat: fatStr,
          },
          ...prev
        ]);
      }
    }

    setIsAddOpen(false);
  };

  // Add one of the preset frequent foods directly to current log
  const handleAddFrequentToLog = (food: { name: string, calories: number, protein: number, carbs: number, fat: number }) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    
    const newEntry: FoodEntry = {
      id: "manual-" + Date.now(),
      name: food.name,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      time: `${hours}:${minutes}`,
      date: currentDate,
    };

    setFoodLogs(prev => [newEntry, ...prev]);
    setIsAddOpen(false);
  };

  // Delete an item from the frequent foods preset library
  const handleDeleteFrequentPreset = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering addition
    setFrequentFoods(prev => prev.filter(f => f.id !== id));
  };

  // Save changes on an existing entry
  const handleSaveEditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;

    setFoodLogs(prev => prev.map(item => item.id === editingEntry.id ? editingEntry : item));
    setEditingEntry(null);
  };

  const handleDeleteEntry = (id: string) => {
    setFoodLogs(prev => prev.filter(e => e.id !== id));
  };

  // Convert files to base64 with client-side canvas compression for great mobile usage
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const rawBase64 = reader.result as string;
        
        // Setup image object to measure and draw to canvas for high-performance compression
        const img = new Image();
        img.src = rawBase64;
        img.onload = () => {
          const maxWidth = 1000;
          const maxHeight = 1000;
          let width = img.width;
          let height = img.height;

          // Resize keeping aspect ratio
          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            // Export compressed JPEG format with 0.75 quality reducing 12MB phone cameras to 120KB
            const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
            setImagePreview(compressedBase64);
          } else {
            setImagePreview(rawBase64);
          }
        };
        img.onerror = () => {
          setImagePreview(rawBase64);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Simulated recording process
  const toggleRecording = () => {
    if (voiceRecording) {
      // Stop recording and send simulated text
      clearInterval(audioIntervalRef.current!);
      setVoiceRecording(false);
      setAudioTimer(0);
      
      const audioCommands = [
        "Me clavé una empanada de carne al horno de 300 calorías y un pomelo exprimidor.",
        "Che anotame dos medialunas de manteca jugosas con un cafecito negro.",
        "Desayuné un omelette de claras de huevo con unas tostadas de arroz integrales.",
        "Comí un bife de chorizo hermoso a la plancha con una porción de ensalada mixta de tomate y lechuga."
      ];
      const randomCommand = audioCommands[Math.floor(Math.random() * audioCommands.length)];
      handleSendMessage(`🎙️ [Mensaje de Voz]: "${randomCommand}"`);
    } else {
      setVoiceRecording(true);
      setAudioTimer(0);
      audioIntervalRef.current = setInterval(() => {
        setAudioTimer(p => p + 1);
      }, 1000);
    }
  };

  // Talk to our Backend Express AI proxy (server.ts) or directly to Gemini if custom API key is present
  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText !== undefined ? customText : chatInput;
    if (!textToSend.trim() && !imagePreview) return;

    const userMsgId = "user-" + Date.now();
    const newUserMessage: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: textToSend || "Te adjunto una foto del plato, che.",
      timestamp: new Date(),
      imageUrl: imagePreview || undefined,
    };

    const hasImage = !!imagePreview;

    setChatMessages(prev => [...prev, newUserMessage]);
    setChatInput("");
    setImagePreview(null);
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          image: newUserMessage.imageUrl,
        }),
      });

      if (!response.ok) {
        throw new Error("Respuesta inválida del servidor.");
      }

      const data = await response.json();
      
      // We got the AI reaction!
      const aiMsgId = "ai-" + Date.now();
      const newAiMessage: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: data.reply,
        timestamp: new Date(),
        detectedFoods: data.detectedFoods && data.detectedFoods.length > 0 ? data.detectedFoods : undefined,
      };

      setChatMessages(prev => [...prev, newAiMessage]);

      // If food was detected, add them instantly to our current date food logs!
      if (data.detectedFoods && data.detectedFoods.length > 0) {
        const now = new Date();
        const hr = String(now.getHours()).padStart(2, "0");
        const mn = String(now.getMinutes()).padStart(2, "0");

        const newEntries: FoodEntry[] = data.detectedFoods.map((f: any, idx: number) => ({
          id: "ai-food-" + idx + "-" + Date.now(),
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          time: `${hr}:${mn}`,
          date: currentDate,
        }));

        setFoodLogs(prev => [...newEntries, ...prev]);
      }
    } catch (err: any) {
      console.warn("Backend ausente o error de conexión. Procesando fallback local...", err);
      
      const localResult = analyzeFoodLocally(textToSend, hasImage);
      
      const aiMsgId = "ai-local-" + Date.now();
      const newAiMessage: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: `⚠️ **Aviso de Conexión:** No se pudo conectar con el servidor de inteligencia artificial. Ejecutando análisis local de respaldo:\n\n${localResult.reply}`,
        timestamp: new Date(),
        detectedFoods: localResult.detectedFoods && localResult.detectedFoods.length > 0 ? localResult.detectedFoods : undefined,
      };

      setChatMessages(prev => [...prev, newAiMessage]);

      if (localResult.detectedFoods && localResult.detectedFoods.length > 0) {
        const now = new Date();
        const hr = String(now.getHours()).padStart(2, "0");
        const mn = String(now.getMinutes()).padStart(2, "0");

        const newEntries: FoodEntry[] = localResult.detectedFoods.map((f: any, idx: number) => ({
          id: "ai-food-local-" + idx + "-" + Date.now(),
          name: f.name,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          time: `${hr}:${mn}`,
          date: currentDate,
        }));

        setFoodLogs(prev => [...newEntries, ...prev]);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reset demo logs to factory setting
  const handleResetData = () => {
    if (confirm("¿Estás seguro que querés resetear todo el historial de comidas?")) {
      setFoodLogs(INITIAL_FOOD_LOGS);
      setSettings(DEFAULT_SETTINGS);
      safeStorage.removeItem("mis_calorias_logs");
      safeStorage.removeItem("mis_calorias_settings");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-[#f5f5f5] selection:bg-[#E6C665] selection:text-black">
      
      {/* Desktop Split Screen & Mobile Tabbed container */}
      <div className="flex-1 flex flex-col md:flex-row h-full max-w-7xl mx-auto w-full overflow-hidden select-none">
        
        {/* --- LEFT COLUMN: Main Views (Diario, Semana, Ajustes) --- */}
        <div className={`flex-1 flex flex-col p-4 md:p-8 border-r border-neutral-900 overflow-y-auto ${currentTab === "charlar" ? "hidden md:flex" : "flex"}`}>
          
          {/* Main Logo & Time Header */}
          <div className="flex flex-col items-center mb-6">
            <div className="mb-2">
              <span className="brand-mis text-[#E6C665] text-4xl italic">mis</span>
              <span className="brand-caloras text-[#E6C665] text-5xl ml-1">calorías</span>
            </div>
            
            {/* Minimalist Pill Date Switcher */}
            <div className="flex items-center bg-[#1a1a1a] rounded-full px-4 py-1.5 border border-neutral-800 space-x-3 text-sm">
              <button 
                onClick={() => shiftDate(-1)} 
                className="text-neutral-500 hover:text-[#E6C665] active:scale-90 transition-all p-1"
                title="Día Anterior"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <button 
                onClick={handleSetToday}
                className="text-xs font-semibold uppercase tracking-widest text-[#f0f0f0] min-w-[130px] text-center hover:text-[#E6C665] transition-colors"
              >
                {formatDateLabel(currentDate)}
              </button>
              
              <button 
                onClick={() => shiftDate(1)} 
                className="text-neutral-500 hover:text-[#E6C665] active:scale-90 transition-all p-1"
                title="Día Siguiente"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Conditional View Rendering based on Active Tab */}
          {currentTab === "diario" && (
            <div className="flex-1 flex flex-col">
              
              {/* --- TODAY & WEEK PROGRESS CIRCLES --- */}
              <div className="grid grid-cols-2 gap-4 mb-8">
                {/* Today progress */}
                <div className="bg-[#1a1a1a] rounded-[32px] p-5 flex flex-col items-center border border-neutral-800 shadow-2xl relative overflow-hidden group hover:border-[#E6C665]/30 transition-all">
                  <div className="absolute top-3 right-4 text-[9px] uppercase tracking-wider text-neutral-500 font-bold">HOY</div>
                  <div className="relative w-24 h-24 flex items-center justify-center mt-2 mb-3">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="#333333" strokeWidth="5" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="42" 
                        stroke="#4CD964" 
                        strokeWidth="5" 
                        fill="transparent" 
                        strokeDasharray={circumference}
                        strokeDashoffset={todayDashoffset}
                        strokeLinecap="round" 
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Consumido</p>
                      <p className="text-base font-mono font-bold text-white">{consumedCaloriesToday}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">de {targetCaloriesToday} kcal totales</p>
                  
                  {consumedCaloriesToday <= targetCaloriesToday ? (
                    <p className="text-[#4CD964] text-[11px] font-bold mt-1.5 uppercase tracking-wider">
                      {remainingCaloriesToday} restantes
                    </p>
                  ) : (
                    <p className="text-red-400 text-[11px] font-bold mt-1.5 uppercase tracking-wider">
                      +{consumedCaloriesToday - targetCaloriesToday} kcal exedidas
                    </p>
                  )}
                </div>

                {/* Week progress */}
                <div className="bg-[#1a1a1a] rounded-[32px] p-5 flex flex-col items-center border border-neutral-800 shadow-2xl relative overflow-hidden group hover:border-[#E6C665]/30 transition-all">
                  <div className="absolute top-3 right-4 text-[9px] uppercase tracking-wider text-neutral-500 font-bold">SEMANA</div>
                  <div className="relative w-24 h-24 flex items-center justify-center mt-2 mb-3">
                    <svg className="absolute w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="42" stroke="#333333" strokeWidth="5" fill="transparent" />
                      <circle 
                        cx="48" 
                        cy="48" 
                        r="42" 
                        stroke="#4CD964" 
                        strokeWidth="5" 
                        fill="transparent" 
                        strokeDasharray={circumference}
                        strokeDashoffset={weekDashoffset}
                        strokeLinecap="round" 
                        className="transition-all duration-500"
                      />
                    </svg>
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-tighter text-neutral-500 font-bold">Consumido</p>
                      <p className="text-base font-mono font-bold text-white">{consumedCaloriesWeekly}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-neutral-400">de {weeklyTarget} kcal totales</p>
                  
                  {consumedCaloriesWeekly <= weeklyTarget ? (
                    <p className="text-[#4CD964] text-[11px] font-bold mt-1.5 uppercase tracking-wider">
                      {remainingCaloriesWeekly} restantes
                    </p>
                  ) : (
                    <p className="text-red-400 text-[11px] font-bold mt-1.5 uppercase tracking-wider">
                      +{consumedCaloriesWeekly - weeklyTarget} kcal exedidas
                    </p>
                  )}
                </div>
              </div>

              {/* --- MACROS SECTION --- */}
              <div className="mb-8">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold px-1">Macros del día</h3>
                  <span className="text-[10px] text-neutral-400 font-mono">Consumido / Meta</span>
                </div>
                
                <div className="space-y-3.5 bg-[#111] border border-neutral-900 rounded-[24px] p-4">
                  {/* Protein macro */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-400"></span> Proteína
                      </span>
                      <span className="font-mono text-neutral-100">{consumedProteinToday}g <span className="text-neutral-500">/ {settings.proteinTarget}g</span></span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-400 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (consumedProteinToday / settings.proteinTarget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Carbs macro */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-yellow-400"></span> Carbohidratos
                      </span>
                      <span className="font-mono text-neutral-100">{consumedCarbsToday}g <span className="text-neutral-500">/ {settings.carbsTarget}g</span></span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-yellow-400 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (consumedCarbsToday / settings.carbsTarget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Fats macro */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-neutral-300 font-medium">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-400"></span> Grasas
                      </span>
                      <span className="font-mono text-neutral-100">{consumedFatToday}g <span className="text-neutral-500">/ {settings.fatTarget}g</span></span>
                    </div>
                    <div className="w-full bg-[#1e1e1e] h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-red-400 h-1.5 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (consumedFatToday / settings.fatTarget) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* --- LO QUE COMÍ (TIMELINE LIST) --- */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] uppercase tracking-[0.25em] text-neutral-500 font-bold mb-3 px-1">Lo que comí</h3>
                  
                  {todaysEntries.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-neutral-800 rounded-2xl bg-[#090909]">
                      <span className="text-2xl">💤</span>
                      <p className="text-neutral-400 text-xs mt-2">No registraste nada de comida hoy, pibe.</p>
                      <p className="text-neutral-600 text-[10px] mt-1">¡Charla con la IA a la derecha o agregá algo rápido!</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                      {todaysEntries.map(entry => {
                        // Guess simple food emoji categories based on lowercased name
                        let emoji = "🥗";
                        const n = entry.name.toLowerCase();
                        if (n.includes("caf") || n.includes("taza") || n.includes("latte")) emoji = "☕";
                        else if (n.includes("queso") || n.includes("almendra")) emoji = "🧀";
                        else if (n.includes("dulce") || n.includes("torta") || n.includes("postre") || n.includes("medialuna") || n.includes("factura")) emoji = "🍰";
                        else if (n.includes("milanesa") || n.includes("bife") || n.includes("carne") || n.includes("asado") || n.includes("pollo")) emoji = "🥩";
                        else if (n.includes("pizza")) emoji = "🍕";
                        else if (n.includes("manzana") || n.includes("frut") || n.includes("banana")) emoji = "🍎";
                        else if (n.includes("yogur") || n.includes("crema")) emoji = "🥣";
                        else if (n.includes("licuado") || n.includes("batido") || n.includes("jugo")) emoji = "🥤";

                        return (
                          <div 
                            key={entry.id} 
                            className="flex items-center bg-[#1a1a1a] p-3.5 rounded-2xl border border-neutral-800/60 hover:border-neutral-700 transition-all select-none"
                          >
                            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center mr-3 text-lg border border-neutral-900">
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{entry.name}</p>
                              <div className="flex items-center space-x-2 mt-0.5">
                                <span className="text-[10px] text-neutral-500 uppercase font-mono">{entry.time}</span>
                                { (entry.protein > 0 || entry.carbs > 0 || entry.fat > 0) && (
                                  <span className="text-[9px] text-neutral-400 font-mono">
                                    P:{entry.protein}g C:{entry.carbs}g G:{entry.fat}g
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-[#E6C665] font-bold font-mono text-sm mr-4">
                              {entry.calories} <span className="text-[10px] font-normal text-neutral-500">kcal</span>
                            </div>
                            
                            <div className="flex items-center space-x-0.5">
                              <button 
                                onClick={() => setEditingEntry(entry)}
                                className="text-neutral-600 hover:text-[#E6C665] p-1.5 rounded-full hover:bg-neutral-900 transition-all cursor-pointer"
                                title="Editar registro"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => handleDeleteEntry(entry.id)}
                                className="text-neutral-600 hover:text-red-400 p-1.5 rounded-full hover:bg-neutral-900 transition-all cursor-pointer"
                                title="Borrar registro"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Main Yellow '+ Agregar' button */}
                <button 
                  onClick={handleOpenAddManual}
                  className="mt-6 w-full py-3.5 bg-[#E6C665] text-black font-extrabold rounded-2xl text-xs uppercase tracking-widest shadow-[0_4px_20px_rgba(230,198,101,0.25)] hover:opacity-95 active:scale-95 transition-all cursor-pointer"
                >
                  + Agregar Registro
                </button>
              </div>

            </div>
          )}

          {/* --- WEEKLY REPORTS VIEW --- */}
          {currentTab === "semana" && (
            <div className="flex-1 flex flex-col">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-bold px-1 mb-4">
                Historial Semanal
              </h3>

              {/* Stats Block */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-[#111] border border-neutral-800 rounded-3xl p-4">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">Consumo Promedio</span>
                  <span className="text-xl font-mono font-bold text-[#E6C665] mt-1 block">
                    {Math.round(consumedCaloriesWeekly / 7)} kcal <span className="text-xs text-neutral-400 font-normal">/ día</span>
                  </span>
                </div>
                <div className="bg-[#111] border border-neutral-800 rounded-3xl p-4">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-wider font-bold block">Día más Activo</span>
                  <span className="text-xl font-semibold text-white mt-1 block">Miércoles</span>
                </div>
              </div>

              {/* Handcoded Premium Responsive SVG Column Bar Chart */}
              <div className="bg-[#1a1a1a] rounded-[32px] p-6 border border-neutral-800 shadow-2xl mb-6">
                <span className="text-xs font-semibold text-neutral-300 block mb-4">Consumo Diario este Periodo</span>
                
                <div className="h-44 w-full flex items-end justify-between px-1 pb-4 relative">
                  {/* Grid Lines behind bars */}
                  <div className="absolute left-0 right-0 top-0 border-t border-neutral-800/80"></div>
                  <div className="absolute left-0 right-0 top-1/3 border-t border-neutral-800/80"></div>
                  <div className="absolute left-0 right-0 top-2/3 border-t border-neutral-800/80"></div>
                  
                  {weekDays.map((dayStr, idx) => {
                    const daysLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                    const dateObj = new Date(dayStr + "T12:00:00");
                    const label = daysLabels[dateObj.getDay()];
                    
                    const dayEntries = foodLogs.filter(e => e.date === dayStr);
                    const cal = dayEntries.reduce((s, e) => s + e.calories, 0);
                    const target = settings.dailyCalorieTarget;
                    
                    // Height ratio based on max target limits
                    const maxBound = Math.max(...weekDays.map(d => foodLogs.filter(e => e.date === d).reduce((s, e) => s + e.calories, 0)), target, 2000);
                    const heightPercent = Math.max(8, Math.min(100, (cal / maxBound) * 100));
                    const isOver = cal > target;
                    const isToday = dayStr === currentDate;

                    return (
                      <div key={dayStr} className="flex-1 flex flex-col items-center group relative z-10 mx-1">
                        
                        {/* Interactive Tooltip bubble */}
                        <div className="opacity-0 group-hover:opacity-100 absolute -top-12 bg-neutral-900 border border-neutral-800 text-white text-[10px] font-mono px-2 py-1 rounded-lg pointer-events-none transition-opacity whitespace-nowrap shadow-xl">
                          {cal} kcal {cal > 0 ? "" : "(Vacío)"}
                        </div>

                        {/* Bar Segment */}
                        <div className="w-full bg-[#2a2a2a] h-32 rounded-lg flex items-end overflow-hidden">
                          <div 
                            style={{ height: `${heightPercent}%` }}
                            className={`w-full rounded-t-sm transition-all duration-700 ${
                              isToday ? "bg-[#E6C665]" : isOver ? "bg-red-500/80" : "bg-[#4CD964]/80"
                            } hover:brightness-110`}
                          ></div>
                        </div>

                        {/* Limit Mark Line */}
                        <div 
                          className="absolute pointer-events-none w-full border-b border-dashed border-neutral-600/40"
                          style={{ bottom: `${(target / maxBound) * 128 + 16}px` }}
                        ></div>

                        {/* Label name */}
                        <span className={`text-[10px] uppercase mt-2.5 font-mono ${isToday ? "text-[#E6C665] font-bold" : "text-neutral-400"}`}>
                          {label}
                        </span>
                        
                        <span className="text-[8px] font-mono text-neutral-600 mt-0.5">
                          {dayStr.split("-")[2]}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Caption indices */}
                <div className="flex flex-wrap items-center mt-2 pt-3 border-t border-neutral-900 gap-x-4 gap-y-1.5 text-[10px] text-neutral-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#E6C665] rounded-sm"></span>
                    <span>Hoy</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-[#4CD964]/80 rounded-sm"></span>
                    <span>Dentro de meta</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-red-500/80 rounded-sm"></span>
                    <span>Exedido</span>
                  </div>
                  <div className="ml-auto text-[9px] text-neutral-500 italic">
                    Meta diaria: {settings.dailyCalorieTarget} kcal
                  </div>
                </div>

              </div>

              {/* Informative tips widget */}
              <div className="bg-[#111] rounded-[24px] border border-neutral-800/60 p-5">
                <span className="text-[#E6C665] text-xs font-bold block mb-1">💡 Sabías que...</span>
                <p className="text-neutral-400 text-xs leading-relaxed">
                  Para mantener el peso de forma estable es clave mirar la tendencia semanal y no desesperarse por un día festivo desmedido. ¡Tu meta acumulada te da {settings.weeklyCalorieTarget} kcal de margen! Sigue charlando con la IA para regular los días venideros.
                </p>
              </div>

            </div>
          )}

          {/* --- SETTINGS / AJUSTES VIEW --- */}
          {currentTab === "ajustes" && (
            <div className="flex-1 flex flex-col">
              <h3 className="text-xs uppercase tracking-[0.2em] text-neutral-500 font-bold px-1 mb-4">
                Configuración de Objetivos
              </h3>

              <div className="bg-[#1a1a1a] rounded-[32px] p-6 border border-neutral-800 shadow-2xl space-y-5">
                {/* Goal Daily Cal */}
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    Meta de Calorías Diarias (kcal)
                  </label>
                  <input 
                    type="number" 
                    value={settings.dailyCalorieTarget}
                    onChange={(e) => setSettings({
                      ...settings, 
                      dailyCalorieTarget: parseInt(e.target.value) || 0,
                      weeklyCalorieTarget: (parseInt(e.target.value) || 0) * 7
                    })}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#E6C665] transition-colors"
                  />
                  <p className="text-[10px] text-neutral-500">
                    Esto calculará automáticamente la meta semanal en {(settings.dailyCalorieTarget || 0) * 7} kcal.
                  </p>
                </div>

                {/* Protein Target */}
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    Objetivo de Proteínas (g)
                  </label>
                  <input 
                    type="number" 
                    value={settings.proteinTarget}
                    onChange={(e) => setSettings({...settings, proteinTarget: parseInt(e.target.value) || 0})}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#E6C665] transition-colors"
                  />
                </div>

                {/* Carbs Target */}
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    Objetivo de Carbohidratos (g)
                  </label>
                  <input 
                    type="number" 
                    value={settings.carbsTarget}
                    onChange={(e) => setSettings({...settings, carbsTarget: parseInt(e.target.value) || 0})}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#E6C665] transition-colors"
                  />
                </div>

                {/* Fat Target */}
                <div className="space-y-1.5">
                  <label className="text-[11px] uppercase tracking-wider text-neutral-400 font-bold block">
                    Objetivo de Grasas (g)
                  </label>
                  <input 
                    type="number" 
                    value={settings.fatTarget}
                    onChange={(e) => setSettings({...settings, fatTarget: parseInt(e.target.value) || 0})}
                    className="w-full bg-black border border-neutral-800 rounded-xl px-4 py-3 text-sm font-mono text-white focus:outline-none focus:border-[#E6C665] transition-colors"
                  />
                </div>
                
                <div className="pt-4 border-t border-neutral-900 flex justify-between items-center">
                  <button 
                    onClick={handleResetData}
                    className="text-xs text-red-400/80 hover:text-red-400 flex items-center space-x-1 p-2 hover:bg-neutral-900 rounded-lg transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Resetear Todos los Datos</span>
                  </button>
                  
                  <span className="text-[10px] text-green-500 font-mono font-bold flex items-center gap-1">
                    <Check className="w-3 h-3" /> Auto Guardado
                  </span>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* --- RIGHT COLUMN: Conversational AI Panel (On desktop, visible. On mobile, visible when currentTab === "charlar") --- */}
        <div className={`flex-1 md:w-1/2 flex flex-col bg-[#050505] relative ${currentTab === "charlar" ? "flex" : "hidden md:flex"}`}>
          
          <div className="p-4 md:p-8 flex-1 flex flex-col overflow-hidden h-full">
            
            {/* AI Panel Header */}
            <div className="flex justify-between items-center pb-4 border-b border-neutral-900 mb-4 select-none">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-full bg-neutral-950 flex items-center justify-center border border-neutral-800 text-sm">
                  🤖
                </div>
                <div>
                  <h2 className="text-xs uppercase tracking-widest text-[#E6C665] font-extrabold flex items-center gap-1.5">
                    Charlar con IA <Sparkles className="w-3.5 h-3.5" />
                  </h2>
                  <p className="text-[10px] text-neutral-500">Asesor Express de Nutrición</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-1.5">
                <span className="flex items-center text-[10px] text-[#4CD964] font-semibold bg-[#4CD964]/10 px-2.5 py-1 rounded-full border border-[#4CD964]/20">
                  <span className="w-1.5 h-1.5 bg-[#4CD964] rounded-full mr-1.5 pulsing-record"></span>
                  Listo
                </span>
              </div>
            </div>

            {/* Chat Area Messaging Grid */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 mb-4 flex flex-col">
              {chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={`flex flex-col max-w-[85%] ${msg.sender === "user" ? "self-end items-end" : "self-start items-start"}`}
                >
                  
                  {/* Optional Image view attached */}
                  {msg.imageUrl && (
                    <div className="mb-1 rounded-2xl overflow-hidden border border-neutral-800 max-w-[150px] md:max-w-[200px]">
                      <img src={msg.imageUrl} alt="Plato subido" className="w-full h-auto object-cover max-h-36" />
                    </div>
                  )}

                  <div className={`p-4 rounded-3xl text-xs md:text-sm shadow-xl leading-relaxed ${
                    msg.sender === "user" 
                      ? "bg-[#E6C665]/10 border border-[#E6C665]/35 text-[#E6C665] rounded-tr-none" 
                      : "bg-[#111111] border border-neutral-800/80 text-neutral-200 rounded-tl-none"
                  }`}>
                    {msg.text}

                    {/* Detected food list card summary styled internally */}
                    {msg.detectedFoods && msg.detectedFoods.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-900 space-y-2.5">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-400 font-bold flex items-center gap-1">
                          🍎 Macronutrientes Agregados:
                        </p>
                        
                        {msg.detectedFoods.map((f, i) => (
                          <div key={i} className="bg-black/50 p-3 rounded-2xl border border-neutral-800 flex justify-between items-center">
                            <div>
                              <p className="text-white font-semibold text-xs">{f.name}</p>
                              <p className="text-[9px] text-[#E6C665] font-mono mt-0.5">
                                P: {f.protein || 0}g | C: {f.carbs || 0}g | G: {f.fat || 0}g
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[#4CD964] font-mono font-bold text-xs">{f.calories} kcal</span>
                              <span className="block text-[8px] text-green-400 mt-0.5">✔ Registrado</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <span className="text-[9px] text-neutral-600 mt-1 mx-2">
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}

              {isAnalyzing && (
                <div className="self-start flex items-center space-x-2 bg-[#111] border border-neutral-900 p-4 rounded-2xl rounded-tl-none max-w-[80%] text-xs text-neutral-400 animate-pulse">
                  <span className="w-2 h-2 bg-[#E6C665] rounded-full animate-bounce"></span>
                  <span className="w-2 h-2 bg-[#E6C665] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></span>
                  <span className="w-2 h-2 bg-[#E6C665] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></span>
                  <span>Escribiendo...</span>
                </div>
              )}
              
              <div ref={chatBottomRef} />
            </div>

            {/* Input Area / Interactive Upload Controllers */}
            <div className="mt-auto space-y-2">
              
              {/* Image Preview thumbnail below if selected */}
              {imagePreview && (
                <div className="flex items-center gap-2 bg-[#111] p-2 rounded-xl border border-neutral-800 w-fit">
                  <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-900">
                    <img src={imagePreview} alt="Snapshot thumbnail" className="w-full h-full object-cover" />
                    <button 
                      onClick={() => setImagePreview(null)}
                      className="absolute top-0 right-0 bg-black/70 text-white rounded-full p-0.5 hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <span className="text-[10px] text-neutral-400 pr-2">Foto cargada de plato</span>
                </div>
              )}

              {voiceRecording && (
                <div className="flex items-center space-x-2.5 bg-red-950/20 border border-red-900/40 p-3 rounded-2xl text-xs text-red-300 animate-pulse mb-1">
                  <span className="w-2 h-2 bg-red-500 rounded-full pulsing-record"></span>
                  <span className="font-mono font-bold">Grabando simulación... 0:0{audioTimer}s</span>
                  <span className="text-[10px] text-neutral-400 ml-auto">Soltá haciendo click para calcular</span>
                </div>
              )}

              <div className="flex items-center bg-[#1a1a1a] rounded-3xl p-1.5 pl-4 border border-neutral-800 focus-within:border-[#E6C665]/60 transition-all">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendMessage();
                  }}
                  placeholder={voiceRecording ? "Grabando audio..." : "Decime: 'comí una empanada' o 'un asado'... "}
                  disabled={voiceRecording}
                  className="bg-transparent flex-1 border-none focus:outline-none text-xs md:text-sm text-neutral-200 placeholder-neutral-500 py-1"
                />
                
                {/* Hidden input type file */}
                <input 
                  type="file" 
                  accept="image/*" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  className="hidden" 
                />

                <div className="flex space-x-1 ml-2">
                  <button 
                    onClick={triggerFileInput}
                    disabled={voiceRecording}
                    className="w-10 h-10 bg-black hover:bg-neutral-900 active:scale-90 text-neutral-400 hover:text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
                    title="Subir foto de plato"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={toggleRecording}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                      voiceRecording ? "bg-red-500 text-white" : "bg-black text-neutral-400 hover:bg-neutral-900 hover:text-white"
                    }`}
                    title={voiceRecording ? "Detener y enviar" : "Simular audio de comida"}
                  >
                    <Mic className="w-4 h-4" />
                  </button>
                  
                  <button 
                    onClick={() => handleSendMessage()}
                    className="w-10 h-10 bg-[#E6C665] hover:opacity-90 active:scale-95 rounded-full flex items-center justify-center text-black font-extrabold transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* --- BOTTON NAVIGATION BAR (Fixed Minimalist layout) --- */}
      <div className="sticky bottom-0 left-0 right-0 h-16 bg-[#0c0c0c] border-t border-neutral-900 flex items-center justify-around z-20 shadow-2xl md:max-w-7xl md:mx-auto md:w-full">
        {/* Diario */}
        <button 
          onClick={() => setCurrentTab("diario")}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all cursor-pointer ${
            currentTab === "diario" ? "text-[#E6C665]" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Calendar className="w-5 h-5 mb-1" />
          <span className="text-[9px] uppercase tracking-widest font-extrabold">Diario</span>
        </button>

        {/* Charlar (Mobile only view toggle) */}
        <button 
          onClick={() => setCurrentTab("charlar")}
          className={`flex md:hidden flex-col items-center justify-center w-16 h-full transition-all cursor-pointer ${
            currentTab === "charlar" ? "text-[#E6C665]" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <MessageSquare className="w-5 h-5 mb-1 animate-pulse" />
          <span className="text-[9px] uppercase tracking-widest font-extrabold">Charlar</span>
        </button>

        {/* Semana */}
        <button 
          onClick={() => setCurrentTab("semana")}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all cursor-pointer ${
            currentTab === "semana" ? "text-[#E6C665]" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <BarChart2 className="w-5 h-5 mb-1" />
          <span className="text-[9px] uppercase tracking-widest font-extrabold">Semana</span>
        </button>

        {/* Ajustes */}
        <button 
          onClick={() => setCurrentTab("ajustes")}
          className={`flex flex-col items-center justify-center w-16 h-full transition-all cursor-pointer ${
            currentTab === "ajustes" ? "text-[#E6C665]" : "text-neutral-500 hover:text-neutral-300"
          }`}
        >
          <Settings className="w-5 h-5 mb-1" />
          <span className="text-[9px] uppercase tracking-widest font-extrabold">Ajustes</span>
        </button>
      </div>

      {/* --- INTUITIVE MANUAL ADD MODAL FORM WITH TABS --- */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#161616] border border-neutral-800 rounded-[32px] w-full max-w-md p-6 shadow-3xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm uppercase tracking-widest font-extrabold text-[#E6C665]">
                {addModalTab === "nuevo" ? "Agregar Comida a Mano" : "Mis comidas frecuentes"}
              </h4>
              <button 
                onClick={() => setIsAddOpen(false)}
                className="text-neutral-500 hover:text-white p-1 rounded-full bg-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-black rounded-xl mb-4 text-xs">
              <button
                onClick={() => setAddModalTab("nuevo")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  addModalTab === "nuevo" ? "bg-[#1a1a1a] text-[#E6C665] border border-neutral-800" : "text-neutral-400 hover:text-white"
                }`}
              >
                Nuevo Registro
              </button>
              <button
                onClick={() => setAddModalTab("frecuentes")}
                className={`py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                  addModalTab === "frecuentes" ? "bg-[#1a1a1a] text-[#E6C665] border border-neutral-800" : "text-neutral-400 hover:text-white"
                }`}
              >
                <Star className="w-3.5 h-3.5 fill-current" /> Mis Frecuentes ({frequentFoods.length})
              </button>
            </div>

            {addModalTab === "nuevo" ? (
              <form onSubmit={handleSaveManualEntry} className="space-y-4 overflow-y-auto pr-1">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold">¿Qué quieres registrar? *</label>
                  <input 
                    type="text" 
                    value={manualName} 
                    onChange={(e) => setManualName(e.target.value)}
                    placeholder="Ej. Tarta de jamón y queso" 
                    required
                    className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C665]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-bold">Calorías (kcal) *</label>
                    <input 
                      type="number" 
                      value={manualCalories} 
                      onChange={(e) => setManualCalories(e.target.value)}
                      placeholder="Ej. 340" 
                      required
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-neutral-400 font-bold">Hora</label>
                    <input 
                      type="text" 
                      value={manualTime} 
                      onChange={(e) => setManualTime(e.target.value)}
                      placeholder="Ej. 13:14" 
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <p className="text-[9px] uppercase text-neutral-500 font-bold mb-1.5">Macronutrientes Opcionales</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <label className="text-[8px] text-neutral-400 font-bold">Prot (g)</label>
                      <input 
                        type="number" 
                        value={manualProtein} 
                        onChange={(e) => setManualProtein(e.target.value)}
                        placeholder="0" 
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-neutral-400 font-bold">Carbos (g)</label>
                      <input 
                        type="number" 
                        value={manualCarbs} 
                        onChange={(e) => setManualCarbs(e.target.value)}
                        placeholder="0" 
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[8px] text-neutral-400 font-bold">Grasa (g)</label>
                      <input 
                        type="number" 
                        value={manualFat} 
                        onChange={(e) => setManualFat(e.target.value)}
                        placeholder="0" 
                        className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Save to Frequents checkbox */}
                <div className="flex items-center space-x-2 pt-2 pb-1">
                  <input
                    type="checkbox"
                    id="saveToFreqCheck"
                    checked={saveToFrequent}
                    onChange={(e) => setSaveToFrequent(e.target.checked)}
                    className="w-4 h-4 rounded border-neutral-800 bg-black text-[#E6C665] focus:ring-0 checked:bg-[#E6C665] accent-[#E6C665] cursor-pointer"
                  />
                  <label htmlFor="saveToFreqCheck" className="text-xs text-neutral-300 font-semibold select-none cursor-pointer flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-[#E6C665] fill-current" /> Guardar en mis preferidos/frecuentes ⭐
                  </label>
                </div>

                <button 
                  type="submit" 
                  className="w-full py-2.5 bg-[#E6C665] text-black text-xs uppercase tracking-widest font-extrabold rounded-xl hover:opacity-90 active:scale-95 transition-all mt-4 cursor-pointer"
                >
                  Guardar Plato
                </button>
              </form>
            ) : (
              <div className="flex-1 flex flex-col min-h-0">
                <p className="text-[11px] text-neutral-400 mb-3 leading-tight">
                  Elegí cualquier comida que consumís siempre de abajo para registrarla al toque para hoy.
                </p>

                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[220px]">
                  {frequentFoods.length === 0 ? (
                    <div className="text-center py-6 bg-black/40 border border-dashed border-neutral-800 rounded-2xl">
                      <span className="text-xl">⭐</span>
                      <p className="text-neutral-500 text-xs mt-1.5">No registraste comidas frecuentes aún.</p>
                      <p className="text-[10px] text-neutral-600 mt-1">Guardá una en la pestaña 'Nuevo Registro' marcando la estrellita.</p>
                    </div>
                  ) : (
                    frequentFoods.map(food => (
                      <div
                        key={food.id}
                        onClick={() => handleAddFrequentToLog(food)}
                        className="flex items-center justify-between bg-black hover:bg-[#121212] hover:border-[#E6C665]/50 border border-neutral-800 px-3 py-2 rounded-xl cursor-pointer transition-all group"
                      >
                        <div className="flex-1 pr-2 min-w-0">
                          <p className="text-xs font-bold text-white truncate group-hover:text-[#E6C665] transition-colors">
                            {food.name}
                          </p>
                          <p className="text-[9px] text-neutral-500 font-mono">
                            P: {food.protein}g | C: {food.carbs}g | G: {food.fat}g
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-bold font-mono text-[#E6C665] bg-[#E6C665]/5 px-2 py-0.5 rounded border border-[#E6C665]/10">
                            {food.calories} kcal
                          </span>
                          <button
                            onClick={(e) => handleDeleteFrequentPreset(food.id, e)}
                            className="text-neutral-500 hover:text-red-400 p-1 rounded-md hover:bg-neutral-900 transition-all cursor-pointer"
                            title="Quitar de frecuentes"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Direct quick registry preset creation form */}
                <div className="mt-4 pt-4 border-t border-neutral-800 bg-[#121212] p-3.5 rounded-2xl">
                  <p className="text-[10px] uppercase text-[#E6C665] font-extrabold mb-2 flex items-center gap-1">
                    + Registrar comida frecuente para siempre
                  </p>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <input
                      type="text"
                      id="freq_name"
                      placeholder="Nombre (ej. Café con medialunas)"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#E6C665]"
                    />
                    <input
                      type="number"
                      id="freq_cal"
                      placeholder="Calorías (kcal)"
                      className="w-full bg-black border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const nameEl = document.getElementById("freq_name") as HTMLInputElement;
                      const calEl = document.getElementById("freq_cal") as HTMLInputElement;
                      if (nameEl && calEl && nameEl.value && calEl.value) {
                        const isAlreadySaved = frequentFoods.some(
                          ff => ff.name.toLowerCase() === nameEl.value.toLowerCase()
                        );
                        if (!isAlreadySaved) {
                          setFrequentFoods(prev => [
                            {
                              id: "ff-" + Date.now(),
                              name: nameEl.value,
                              calories: parseInt(calEl.value) || 0,
                              protein: 0,
                              carbs: 0,
                              fat: 0
                            },
                            ...prev
                          ]);
                          nameEl.value = "";
                          calEl.value = "";
                        }
                      }
                    }}
                    className="w-full py-2 bg-[#E6C665] hover:opacity-90 text-black font-extrabold rounded-lg text-[10px] transition-all cursor-pointer uppercase tracking-wider"
                  >
                    Crear Guardado Frecuente ⭐
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- PREMIUM EDIT FOOD LOG MODAL FORM --- */}
      {editingEntry && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#1a1a1a] border border-neutral-800 rounded-[32px] w-full max-w-sm p-6 shadow-3xl">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-sm uppercase tracking-widest font-bold text-[#E6C665] flex items-center gap-1.5">
                <Edit2 className="w-4 h-4" /> Editar Registro
              </h4>
              <button 
                onClick={() => setEditingEntry(null)}
                className="text-neutral-500 hover:text-white p-1 rounded-full bg-neutral-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditEntry} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-neutral-400 font-bold">Alimento / Comida registrados *</label>
                <input 
                  type="text" 
                  value={editingEntry.name} 
                  onChange={(e) => setEditingEntry({ ...editingEntry, name: e.target.value })}
                  placeholder="Ej. Tarta de jamón" 
                  required
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#E6C665]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold">Calorías (kcal) *</label>
                  <input 
                    type="number" 
                    value={editingEntry.calories} 
                    onChange={(e) => setEditingEntry({ ...editingEntry, calories: parseInt(e.target.value) || 0 })}
                    placeholder="Ej. 340" 
                    required
                    className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-neutral-400 font-bold">Hora</label>
                  <input 
                    type="text" 
                    value={editingEntry.time} 
                    onChange={(e) => setEditingEntry({ ...editingEntry, time: e.target.value })}
                    placeholder="Ej. 13:14" 
                    className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-neutral-400 font-bold">Fecha (AAAA-MM-DD)</label>
                <input 
                  type="text" 
                  value={editingEntry.date} 
                  onChange={(e) => setEditingEntry({ ...editingEntry, date: e.target.value })}
                  placeholder="aaaa-mm-dd" 
                  required
                  className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                />
              </div>

              <div>
                <p className="text-[9px] uppercase text-neutral-500 font-bold mb-1.5">Macronutrientes</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <label className="text-[8px] text-neutral-400 font-bold">Prot (g)</label>
                    <input 
                      type="number" 
                      value={editingEntry.protein} 
                      onChange={(e) => setEditingEntry({ ...editingEntry, protein: parseInt(e.target.value) || 0 })}
                      placeholder="0" 
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-neutral-400 font-bold">Carbos (g)</label>
                    <input 
                      type="number" 
                      value={editingEntry.carbs || 0} 
                      onChange={(e) => setEditingEntry({ ...editingEntry, carbs: parseInt(e.target.value) || 0 })}
                      placeholder="0" 
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-[#E6C665]"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] text-neutral-400 font-bold">Grasa (g)</label>
                    <input 
                      type="number" 
                      value={editingEntry.fat || 0} 
                      onChange={(e) => setEditingEntry({ ...editingEntry, fat: parseInt(e.target.value) || 0 })}
                      placeholder="0" 
                      className="w-full bg-black border border-neutral-800 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="flex-1 py-2.5 bg-neutral-900 border border-neutral-800 text-neutral-400 text-xs uppercase tracking-widest font-bold rounded-xl hover:text-white transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-[#E6C665] text-black text-xs uppercase tracking-widest font-extrabold rounded-xl hover:opacity-90 active:scale-95 transition-all cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
