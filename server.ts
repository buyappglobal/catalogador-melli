import express from 'express';
import cors from 'cors';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Límite alto para imágenes en base64

// Inicializar Gemini con la clave de entorno del servidor
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

app.post('/api/analyze', async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: 'Falta la imagen o el tipo MIME' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          inlineData: {
            data: image,
            mimeType: mimeType,
          },
        },
        {
          text: `Eres el experto en catalogación de Desguaces Melli. Tu función es recibir fotos de etiquetas de recambios y devolver SIEMPRE un objeto JSON con: Referencia_OE, Titulo_Comercial, Compatibilidades, Ficha_Tecnica y Texto_Venta_Persuasivo. Responde siempre en español y asegúrate de que el texto de venta mencione la garantía y calidad de origen.

Limpieza de Datos:
- Regla de Referencia: Extrae la referencia OE principal eliminando cualquier guion (-), punto (.) o espacio innecesario. El resultado debe ser una cadena alfanumérica limpia (Ej: de AV11-19D629-BA a AV1119D629BA).
- Asegúrate de incluir la Referencia OE limpia dentro de la Ficha_Tecnica como un dato clave, además de otros datos relevantes que encuentres (ej. Refrigerante, Aceite, etc.).
- En Compatibilidades, incluye no solo modelos de vehículos, sino también referencias de otros constructores y referencias equivalentes que encuentres o deduzcas. IMPORTANTE: Las referencias equivalentes o de otros constructores también deben ir limpias, sin guiones, puntos ni espacios (los nombres de vehículos y años sí pueden mantenerlos).
- CRÍTICO PARA COMPATIBILIDADES: NO inventes ni asumas referencias equivalentes bajo ningún concepto. SOLO incluye referencias que estén EXPLÍCITAMENTE escritas en la etiqueta de la foto, o referencias cruzadas que estés 100% seguro que pertenecen a la misma pieza exacta. Si tienes la más mínima duda sobre una referencia, NO la incluyas. Es preferible tener menos compatibilidades que incluir una referencia incorrecta.`,
        },
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            Referencia_OE: {
              type: Type.STRING,
              description: "Referencia original del fabricante (OE) extraída de la etiqueta, sin guiones ni espacios",
            },
            Titulo_Comercial: {
              type: Type.STRING,
              description: "Título comercial descriptivo y atractivo del recambio",
            },
            Compatibilidades: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de vehículos, marcas, modelos compatibles, referencias equivalentes o referencias de otros constructores deducidos o leídos. Las referencias deben ir limpias sin guiones ni espacios.",
            },
            Ficha_Tecnica: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  caracteristica: { type: Type.STRING },
                  valor: { type: Type.STRING },
                },
                required: ["caracteristica", "valor"],
              },
              description: "Ficha técnica con características clave del recambio (incluyendo la referencia limpia, refrigerante, aceite, etc.)",
            },
            Texto_Venta_Persuasivo: {
              type: Type.STRING,
              description: "Texto de venta persuasivo en español, mencionando garantía y calidad de origen",
            },
          },
          required: ["Referencia_OE", "Titulo_Comercial", "Compatibilidades", "Ficha_Tecnica", "Texto_Venta_Persuasivo"],
        },
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error('Error en el servidor:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
