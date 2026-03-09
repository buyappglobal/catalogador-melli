import React, { useState, useRef } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, Package, FileText, Settings, ShieldCheck, Tag, Copy, RefreshCw, Lightbulb, ChevronDown, Sparkles } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

interface FichaTecnicaItem {
  caracteristica: string;
  valor: string;
}

interface CatalogData {
  Referencia_OE: string;
  Titulo_Comercial: string;
  Compatibilidades: string[];
  Ficha_Tecnica: FichaTecnicaItem[];
  Texto_Venta_Persuasivo: string;
}

const CopyButton = ({ textToCopy, className = "" }: { textToCopy: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`transition-colors p-1.5 rounded-md hover:bg-slate-100 ${copied ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'} ${className}`}
      title="Copiar al portapapeles"
    >
      {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
    </button>
  );
};

const ImprovementsAccordion = () => {
  const [isOpen, setIsOpen] = useState(false);

  const improvements = [
    { title: "Cámara Fija Conectada", desc: "Opción de conectar una cámara fija o webcam a la aplicación para capturar las fotos directamente desde la interfaz, agilizando el proceso." },
    { title: "Procesamiento por Lotes (Bulk)", desc: "Capacidad de subir 10, 20 o 50 fotos de etiquetas a la vez y descargar un Excel/CSV con todas las catalogaciones listas para importar." },
    { title: "Lectura de Códigos de Barras y QR", desc: "Detección automática de códigos en la imagen para extraer referencias con 100% de precisión y cruzar con bases de datos." },
    { title: "Generación de Precios Sugeridos", desc: "Estimación inteligente del precio de venta basándose en la marca, tipo de pieza y valor de mercado actual." },
    { title: "Traducción Multilingüe", desc: "Generación del texto de venta y ficha técnica en varios idiomas (Inglés, Francés, Alemán) para potenciar las ventas internacionales." },
    { title: "Análisis de Estado de la Pieza", desc: "Subir fotos de la pieza física (además de la etiqueta) para que la IA evalúe daños visibles y asigne un Grado (A, B, C)." },
    { title: "Historial y Guardado en la Nube", desc: "Registro histórico de todas las etiquetas procesadas, con buscador por referencia o fecha." },
    { title: "Generador de Etiquetas Internas", desc: "Creación automática de un PDF con la etiqueta interna del desguace (código de barras propio, ubicación en almacén) lista para imprimir." }
  ];

  return (
    <div className="mt-12 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-amber-100 text-amber-600 p-2 rounded-lg">
            <Lightbulb className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-slate-800">Posibles Mejoras y Evolución de la App</h2>
        </div>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="p-6 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {improvements.map((item, idx) => (
                  <div key={idx} className="flex gap-3 p-4 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <div className="mt-0.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-1">{item.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CatalogData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const processImage = async () => {
    if (!image) return;

    setLoading(true);
    setError(null);

    try {
      const base64Data = image.split(',')[1];
      const mimeType = image.split(';')[0].split(':')[1];

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          {
            inlineData: {
              data: base64Data,
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
                description: "Texto persuasivo para la venta, mencionando garantía y calidad de origen de Desguaces Melli",
              },
            },
            required: [
              "Referencia_OE",
              "Titulo_Comercial",
              "Compatibilidades",
              "Ficha_Tecnica",
              "Texto_Venta_Persuasivo",
            ],
          },
        },
      });

      if (response.text) {
        const parsedData = JSON.parse(response.text) as CatalogData;
        setResult(parsedData);
      } else {
        throw new Error("No se recibió respuesta del modelo.");
      }
    } catch (err) {
      console.error(err);
      setError("Hubo un error al procesar la imagen. Por favor, inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-200">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcTFzX7PGeyjhspjCxuhGTTbeWE112np1FKO2Q&s" 
              alt="Desguaces Melli Logo" 
              className="h-8 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <h1 className="font-semibold text-lg tracking-tight text-slate-800 ml-2 border-l border-slate-200 pl-4">Catalogador AI</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Panel Izquierdo: Visor de foto y botón */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Imagen de la Etiqueta
              </h2>
              
              {!image ? (
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 hover:border-emerald-500 transition-colors cursor-pointer group"
                >
                  <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 transition-colors">
                    <Upload className="w-6 h-6 text-emerald-600" />
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">Haz clic o arrastra una imagen</p>
                  <p className="text-xs text-slate-500">Soporta JPG, PNG, WEBP</p>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept="image/*"
                    className="hidden"
                  />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square flex items-center justify-center">
                    <img src={image} alt="Etiqueta subida" className="max-w-full max-h-full object-contain" />
                    <button
                      onClick={() => {
                        setImage(null);
                        setResult(null);
                      }}
                      className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm text-slate-700 p-1.5 rounded-lg shadow-sm hover:bg-white transition-colors"
                      title="Cambiar imagen"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={processImage}
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Procesando con IA...
                      </>
                    ) : (
                      <>
                        <Settings className="w-5 h-5" />
                        Extraer Información
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm"
              >
                {error}
              </motion.div>
            )}
          </div>

          {/* Panel Derecho: Resultados */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {!result && !loading && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50"
                >
                  <FileText className="w-12 h-12 mb-4 opacity-20" />
                  <p className="text-sm">Sube una imagen y procesa para ver los resultados aquí.</p>
                </motion.div>
              )}

              {loading && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full min-h-[400px] flex flex-col items-center justify-center text-emerald-600 border border-slate-200 rounded-2xl bg-white shadow-sm"
                >
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="text-sm font-medium animate-pulse">Analizando etiqueta y generando catálogo...</p>
                </motion.div>
              )}

              {result && !loading && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Título y OE */}
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <h2 className="text-2xl font-bold text-slate-900 leading-tight pr-4">
                        {result.Titulo_Comercial}
                      </h2>
                      <CopyButton textToCopy={result.Titulo_Comercial} />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-sm font-medium border border-slate-200">
                        <Tag className="w-3.5 h-3.5" />
                        OE: <span className="font-mono">{result.Referencia_OE}</span>
                      </span>
                      <CopyButton textToCopy={result.Referencia_OE} />
                    </div>
                  </div>

                  {/* Bloque Superior: Texto de Venta */}
                  <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <ShieldCheck className="w-24 h-24 text-emerald-600" />
                    </div>
                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          Texto de Venta
                        </h3>
                        <CopyButton 
                          textToCopy={result.Texto_Venta_Persuasivo} 
                          className="text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-100/50"
                        />
                      </div>
                      <p className="text-emerald-900/80 leading-relaxed">
                        {result.Texto_Venta_Persuasivo}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bloque Inferior Izq: Compatibilidades */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500" />
                          Compatibilidades
                        </h3>
                        <CopyButton textToCopy={result.Compatibilidades.join('\n')} />
                      </div>
                      <ul className="space-y-2">
                        {result.Compatibilidades.map((comp, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-center justify-between group">
                            <div className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                              <span>{comp}</span>
                            </div>
                            <CopyButton textToCopy={comp} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Bloque Inferior Der: Ficha Técnica */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Settings className="w-4 h-4 text-slate-400" />
                          Ficha Técnica
                        </h3>
                        <CopyButton textToCopy={result.Ficha_Tecnica.map(f => `${f.caracteristica}: ${f.valor}`).join('\n')} />
                      </div>
                      <div className="space-y-3">
                        {result.Ficha_Tecnica.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center border-b border-slate-100 pb-2 last:border-0 last:pb-0 group">
                            <span className="text-xs font-medium text-slate-500">{item.caracteristica}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-slate-800 font-medium text-right">{item.valor}</span>
                              <CopyButton textToCopy={item.valor} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Accordion de Posibles Mejoras */}
        <ImprovementsAccordion />
      </main>
    </div>
  );
}
