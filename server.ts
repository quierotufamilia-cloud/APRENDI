import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "20mb" }));

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
    } catch (e) {
      console.error("Error al inicializar cliente Gemini:", e);
    }
  }
  return aiClient;
}

const systemInstruction = `Actuá como un asesor de nutrición experto de la aplicación "mis calorías".
Hablás en un tono rioplatense (de Argentina o Uruguay): descontracturado, súper amigable, motivador, empático y cálido. Usá palabras de uso cotidiano como "vos", "comiste", "tenés", "buenísimo", "metele", "tranqui", etc.

IMPORTANTE: No abuses bajo ningún concepto de la palabra "che". Tratala de evitar en lo posible o usala de manera sumamente sutil. El tono rioplatense se caracteriza por el voseo ("vos", "tenés", "querés", "contame") y la calidez del trato, no por repetir "che" a cada rato, lo cual suena falso y artificial.

El usuario puede reportarte un plato que comió, subir fotos de comidas, simular audios o simplemente charlar de forma libre, consultarte dudas de salud, pedir consejos, recetas, debatir mitos o quejarse de su dieta.

CRÍTICO PARA LA EXTREMA FLUIDEZ DEL CHAT Y EVITAR FALSOS REGISTROS:
1. SÓLO debés meter elementos descriptivos en 'detectedFoods' si el usuario te está REPORTANDO explícitamente una ingesta que ya realizó o quiere registrar en su diario hoy (por ejemplo: "me comí un alfajor", "desayuné dos huevos", "anotame un bife").
2. Si el usuario sólo está HACIENDO PREGUNTAS generales, pidiendo recetas, consejos, quejándose, bromeando o charlando de forma hipotética (por ejemplo: "¿cuántas calorías tiene una pizza de promedio?", "la verdad tengo ganas de comer chocolate, ¿está mal si lo hago?", "¿qué puedo cenar hoy?", "¿la palta tiene grasa buena?"), NO debes detectar ningún alimento en 'detectedFoods' (devolvé 'detectedFoods' como un array vacío []). En cambio, responde con lujos de detalle, con tu carisma rioplatense, explicándole con muchísima empatía y sabiduría científica en la propiedad 'reply'.
3. La propiedad 'reply' debe contener toda tu respuesta en formato Markdown enriquecido con espaciados cómodos y un tono increíblemente motivador y consultivo.`;

// API routes go here FIRST
function analyzeFoodLocally(message: string): { reply: string; detectedFoods: any[] } {
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
      // Avoid duplicate food logging if already matched a more specific/parent item
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
    reply = `¡Hola! Qué bueno que registres todo. Te anoté ${names} en la lista de hoy. Representa unas ${totalCal} calorías en total. ¡Seguí cuidándote así, venís impecable!`;
  } else {
    reply = "¡Hola! Contame qué comiste o anduviste picando hoy así te lo registro al toque. O mandame una foto del plato, ¡dale!";
  }

  return { reply, detectedFoods: matchedFoods };
}

// Save-key and key-status endpoints have been removed to keep key configuration exclusively server-side.

app.post("/api/chat", async (req, res) => {
  const { message, image } = req.body;

  if (!message && !image) {
    return res.status(400).json({ error: "Mensaje o imagen requerido." });
  }

  const ai = getGeminiClient();

  if (!ai) {
    console.warn("GEMINI_API_KEY no configurado o fallido. Usando simulación de IA local.");
    const fallback = analyzeFoodLocally(message || "");
    return res.json(fallback);
  }

  try {
    const parts: any[] = [];
    
    // Process base64 image if uploaded
    if (image) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }

    parts.push({ text: message || "Analizá el plato de la imagen." });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: {
              type: Type.STRING,
              description: "Mensaje motivador y cálido con el estilo rioplatense.",
            },
            detectedFoods: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Nombre de la comida" },
                  calories: { type: Type.INTEGER, description: "Calorías aproximadas" },
                  protein: { type: Type.INTEGER, description: "Gramos de proteína" },
                  carbs: { type: Type.INTEGER, description: "Gramos de carbohidratos" },
                  fat: { type: Type.INTEGER, description: "Gramos de grasa" },
                },
                required: ["name", "calories", "protein", "carbs", "fat"],
              },
            },
          },
          required: ["reply", "detectedFoods"],
        },
      },
    });

    const text = response.text;
    if (!text) {
      throw new Error("No se obtuvo texto de respuesta de Gemini.");
    }

    const parsed = JSON.parse(text.trim());
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error en endpoint de chat con Gemini, activando fallback local:", error);
    // Graceful fallback to local simulation instead of returning 500 error!
    const fallback = analyzeFoodLocally(message || "hola");
    return res.json(fallback);
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Mis Calorías] Servidor corriendo en http://localhost:${PORT}`);
  });
}

startServer();
