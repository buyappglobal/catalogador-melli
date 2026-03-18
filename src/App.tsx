import React, { useState, useRef, useEffect } from 'react';
import { Upload, Image as ImageIcon, Loader2, CheckCircle, Package, FileText, Settings, ShieldCheck, Tag, Copy, RefreshCw, Lightbulb, ChevronDown, Sparkles, Camera, Smartphone, LogIn, LogOut } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { motion, AnimatePresence } from 'motion/react';
import { MobileCameraView } from './MobileCameraView';
import { QRModal } from './QRModal';
import { db, auth } from './firebase';
import { doc, onSnapshot, increment, updateDoc } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';

// Soporta tanto el entorno de AI Studio como el despliegue en GitHub Pages con VITE_GEMINI_API_KEY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey });

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

interface ProcessedItem {
  id: string;
  image: string;
  loading: boolean;
  result: CatalogData | null;
  error: string | null;
}

const copyToClipboard = async (text: string) => {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (err) {
      console.warn("Clipboard API failed, using fallback", err);
    }
  }
  // Fallback para navegadores móviles antiguos o webviews
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    document.execCommand('copy');
    textArea.remove();
  } catch (error) {
    console.error("Fallback copy failed", error);
  }
};

const CopyButton = ({ textToCopy, className = "" }: { textToCopy: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    await copyToClipboard(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={`transition-colors p-2.5 sm:p-1.5 rounded-lg hover:bg-slate-100 active:bg-slate-200 ${copied ? 'text-emerald-600' : 'text-slate-400 hover:text-emerald-600'} ${className}`}
      title="Copiar al portapapeles"
    >
      {copied ? <CheckCircle className="w-5 h-5 sm:w-4 sm:h-4" /> : <Copy className="w-5 h-5 sm:w-4 sm:h-4" />}
    </button>
  );
};

const FichaTecnicaRow = ({ item, key }: { item: FichaTecnicaItem, key?: any }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(item.valor);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      type="button"
      onClick={handleCopy}
      className="w-full flex justify-between items-center border-b border-slate-100 py-3 sm:py-2 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors active:bg-slate-100 text-left"
      title="Clic para copiar valor"
    >
      <span className="text-sm sm:text-xs font-medium text-slate-500 pr-2">{item.caracteristica}</span>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-base sm:text-sm font-medium text-right transition-colors ${copied ? 'text-emerald-600' : 'text-slate-800'}`}>
          {copied ? '¡Copiado!' : item.valor}
        </span>
        {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-300" />}
      </div>
    </button>
  );
};

const CompatibilidadRow = ({ comp, key }: { comp: string, key?: any }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await copyToClipboard(comp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <li>
      <button 
        type="button"
        onClick={handleCopy}
        className="w-full text-left text-base sm:text-sm flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-lg px-2 py-2 sm:py-1.5 -mx-2 transition-colors active:bg-slate-100"
        title="Clic para copiar referencia"
      >
        <div className="flex items-start gap-2 pr-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 sm:mt-1.5 shrink-0" />
          <span className={`leading-snug transition-colors ${copied ? 'text-emerald-600 font-medium' : 'text-slate-600'}`}>
            {copied ? '¡Copiado!' : comp}
          </span>
        </div>
        {copied ? <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-slate-300 shrink-0" />}
      </button>
    </li>
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

import { v4 as uuidv4 } from 'uuid';

export default function App() {
  const [items, setItems] = useState<ProcessedItem[]>([]);
  const [totalScans, setTotalScans] = useState<number>(0);
  const [showQR, setShowQR] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [newScanCount, setNewScanCount] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribeAuth();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error logging in:", error);
    }
  };

  const handleSetScanCount = async () => {
    const count = parseInt(newScanCount);
    if (isNaN(count)) return;
    try {
      const statsRef = doc(db, 'stats', 'global');
      await updateDoc(statsRef, { totalScans: count });
      setNewScanCount('');
    } catch (error) {
      console.error("Error updating scan count:", error);
    }
  };

  useEffect(() => {
    const statsRef = doc(db, 'stats', 'global');
    const unsubscribe = onSnapshot(statsRef, (doc) => {
      if (doc.exists()) {
        setTotalScans(doc.data().totalScans || 0);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Check if we are in mobile camera mode
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('session');

  if (sessionId) {
    return <MobileCameraView sessionId={sessionId} />;
  }

  const processImageWithData = async (imageData: string, id: string) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, loading: true, error: null } : item));

    try {
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1];

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

Limpieza de Datos y Literalidad:
- LITERALIDAD ABSOLUTA PARA REFERENCIA OE: Transcribe EXACTAMENTE lo que está impreso o grabado en la pieza/etiqueta que se ve en la foto. NO autocompletes, NO deduzcas, NO inventes números que falten basándote en tu conocimiento. Si en la foto pone "98 3226 W", la referencia es "983226W". NO añadas dígitos extra que no se vean claramente.
- Regla de Referencia: Extrae la referencia OE principal eliminando cualquier guion (-), punto (.) o espacio innecesario. El resultado debe ser una cadena alfanumérica limpia (Ej: de AV11-19D629-BA a AV1119D629BA). Mantén las letras si aparecen (ej. W, A, B).
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
        setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false, result: parsedData } : item));
        
        // Increment global counter
        const statsRef = doc(db, 'stats', 'global');
        updateDoc(statsRef, { totalScans: increment(1) });
      } else {
        throw new Error("No se recibió respuesta del modelo.");
      }
    } catch (err) {
      console.error(err);
      setItems(prev => prev.map(item => item.id === id ? { ...item, loading: false, error: "Hubo un error al procesar la imagen. Por favor, inténtalo de nuevo." } : item));
    }
  };

  const handleNewImage = (base64: string) => {
    const newId = uuidv4();
    const newItem: ProcessedItem = {
      id: newId,
      image: base64,
      loading: true,
      result: null,
      error: null
    };
    setItems(prev => [newItem, ...prev]);
    processImageWithData(base64, newId);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleNewImage(reader.result as string);
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
        handleNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const clipboardItems = e.clipboardData?.items;
      if (!clipboardItems) return;

      for (let i = 0; i < clipboardItems.length; i++) {
        if (clipboardItems[i].type.indexOf('image') !== -1) {
          const file = clipboardItems[i].getAsFile();
          if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
              handleNewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
          }
          break;
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="flex items-center gap-3">
            {user && user.email === 'buyappglobal@gmail.com' && (
              <div className="flex items-center gap-2 bg-amber-50 text-amber-800 px-3 py-1.5 rounded-lg border border-amber-200">
                <input
                  type="number"
                  value={newScanCount}
                  onChange={(e) => setNewScanCount(e.target.value)}
                  placeholder="Nuevo total"
                  className="w-20 bg-transparent border-b border-amber-300 focus:outline-none text-sm font-mono"
                />
                <button onClick={handleSetScanCount} className="text-xs font-bold uppercase hover:text-amber-600">Set</button>
              </div>
            )}
            {user ? (
              <button onClick={() => signOut(auth)} className="text-slate-500 hover:text-slate-800"><LogOut className="w-5 h-5" /></button>
            ) : (
              <button onClick={handleLogin} className="text-slate-500 hover:text-slate-800"><LogIn className="w-5 h-5" /></button>
            )}
            {deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="text-sm font-semibold bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg hover:bg-emerald-200 transition-colors flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Instalar App</span>
              </button>
            )}
            <div className="text-sm font-semibold bg-slate-100 text-slate-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <Package className="w-4 h-4" />
              <span>{totalScans} escaneos</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Panel Superior: Subida de foto */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-sm font-medium text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <ImageIcon className="w-4 h-4" />
            Nueva Etiqueta
          </h2>
          
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors group"
          >
            <div className="bg-emerald-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 transition-colors">
              <Upload className="w-6 h-6 text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-slate-700 mb-1">Sube, arrastra o pega (Ctrl+V) la foto de la etiqueta</p>
            <p className="text-xs text-slate-500 mb-6">Soporta JPG, PNG, WEBP</p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center w-full">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-white border-2 border-slate-300 rounded-xl text-base sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition-colors w-full"
              >
                <ImageIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                Galería / Archivo
              </button>
              <button 
                onClick={() => setShowQR(true)}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-4 sm:py-3 bg-emerald-600 border-2 border-emerald-600 rounded-xl text-base sm:text-sm font-semibold text-white hover:bg-emerald-700 active:bg-emerald-800 transition-colors shadow-sm w-full"
              >
                <Smartphone className="w-5 h-5 sm:w-4 sm:h-4" />
                Conectar Móvil
              </button>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <input
              type="file"
              ref={cameraInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              capture="environment"
              className="hidden"
            />
          </div>
        </div>

        {/* Lista de Resultados */}
        <div className="space-y-12">
          <AnimatePresence>
            {items.map((item, index) => (
              <motion.div 
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`grid grid-cols-1 lg:grid-cols-12 gap-8 ${index === 0 ? 'ring-4 ring-emerald-100 rounded-3xl p-4 -mx-4 bg-white/50' : ''}`}
              >
                {/* Panel Izquierdo: Visor de foto */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-square flex items-center justify-center">
                      <img src={item.image} alt="Etiqueta subida" className="max-w-full max-h-full object-contain" />
                    </div>
                    {item.error && (
                      <button
                        onClick={() => processImageWithData(item.image, item.id)}
                        className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-md"
                      >
                        <RefreshCw className="w-5 h-5" />
                        Reintentar Procesamiento
                      </button>
                    )}
                  </div>
                  
                  {item.error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm">
                      {item.error}
                    </div>
                  )}
                </div>

                {/* Panel Derecho: Resultados */}
                <div className="lg:col-span-7">
                  {item.loading && (
                    <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-emerald-600 border border-slate-200 rounded-2xl bg-white shadow-sm">
                      <Loader2 className="w-10 h-10 animate-spin mb-4" />
                      <p className="text-sm font-medium animate-pulse">Analizando etiqueta y generando catálogo...</p>
                    </div>
                  )}

                  {item.result && !item.loading && (
                    <div className="space-y-6">
                      {/* Título y OE */}
                      <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-start mb-2 gap-4">
                          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-tight">
                            {item.result.Titulo_Comercial}
                          </h2>
                          <CopyButton textToCopy={item.result.Titulo_Comercial} className="shrink-0" />
                        </div>
                        <div className="flex items-center justify-between sm:justify-start gap-2 mt-4">
                          <span className="inline-flex items-center gap-1.5 px-4 py-2 sm:px-3 sm:py-1 rounded-full bg-slate-100 text-slate-700 text-base sm:text-sm font-medium border border-slate-200">
                            <Tag className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                            OE: <span className="font-mono">{item.result.Referencia_OE}</span>
                          </span>
                          <CopyButton textToCopy={item.result.Referencia_OE} />
                        </div>
                      </div>

                      {/* Bloque Superior: Texto de Venta */}
                      <div className="bg-emerald-50 p-5 sm:p-6 rounded-2xl border border-emerald-100 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                          <ShieldCheck className="w-24 h-24 text-emerald-600" />
                        </div>
                        <div className="relative z-10">
                          <div className="flex justify-between items-center mb-3">
                            <h3 className="text-sm font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-2">
                              <ShieldCheck className="w-4 h-4" />
                              Texto de Venta
                            </h3>
                            <CopyButton 
                              textToCopy={item.result.Texto_Venta_Persuasivo} 
                              className="text-emerald-600/60 hover:text-emerald-700 hover:bg-emerald-100/50"
                            />
                          </div>
                          <p className="text-base sm:text-sm text-emerald-900/80 leading-relaxed">
                            {item.result.Texto_Venta_Persuasivo}
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Bloque Inferior Izq: Compatibilidades */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-500" />
                              Compatibilidades
                            </h3>
                            <CopyButton textToCopy={item.result.Compatibilidades.join('\n')} />
                          </div>
                          <ul className="space-y-1">
                            {item.result.Compatibilidades.map((comp, idx) => (
                              <CompatibilidadRow key={idx} comp={comp} />
                            ))}
                          </ul>
                        </div>

                        {/* Bloque Inferior Der: Ficha Técnica */}
                        <div className="bg-white p-5 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                          <div className="flex justify-between items-center mb-4">
                            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                              <Settings className="w-4 h-4 text-slate-400" />
                              Ficha Técnica
                            </h3>
                            <CopyButton textToCopy={item.result.Ficha_Tecnica.map(f => `${f.caracteristica}: ${f.valor}`).join('\n')} />
                          </div>
                          <div className="space-y-1">
                            {item.result.Ficha_Tecnica.map((fItem, idx) => (
                              <FichaTecnicaRow key={idx} item={fItem} />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {items.length === 0 && (
            <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <FileText className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-sm">Sube una imagen y procesa para ver los resultados aquí.</p>
            </div>
          )}
        </div>

        {/* Accordion de Posibles Mejoras */}
        <ImprovementsAccordion />
      </main>

      {showQR && (
        <QRModal 
          onClose={() => setShowQR(false)} 
          onPhotoReceived={(base64) => {
            handleNewImage(base64);
          }} 
        />
      )}
    </div>
  );
}
