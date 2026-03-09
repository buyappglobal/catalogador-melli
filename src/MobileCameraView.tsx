import React, { useState, useRef, useEffect } from 'react';
import { Camera, Upload, CheckCircle, Loader2 } from 'lucide-react';
import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export const MobileCameraView = ({ sessionId }: { sessionId: string }) => {
  const [status, setStatus] = useState<'connecting' | 'ready' | 'uploading' | 'success' | 'error'>('connecting');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await updateDoc(doc(db, 'photoSessions', sessionId), {
          status: 'connected'
        });
        setStatus('ready');
      } catch (err: any) {
        console.error(err);
        setStatus('error');
        setErrorMsg('Error de conexión con la sesión.');
      }
    };
    init();
  }, [sessionId]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max width/height to keep base64 under 1MB
          const MAX_SIZE = 1200;
          if (width > height && width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Compress with JPEG quality 0.7
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setStatus('uploading');
    try {
      const base64Image = await compressImage(file);
      
      // Check size (Firestore limit is 1MB, base64 is ~33% larger)
      if (base64Image.length > 900000) {
        throw new Error('La imagen es demasiado grande incluso después de comprimir.');
      }

      await updateDoc(doc(db, 'photoSessions', sessionId), {
        status: 'photo_taken',
        photoData: base64Image
      });
      
      setStatus('success');
    } catch (err: any) {
      console.error(err);
      setStatus('error');
      setErrorMsg(err.message || 'Error al subir la foto.');
    }
  };

  if (status === 'connecting') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 animate-spin text-emerald-500 mb-4" />
        <p className="text-lg font-medium">Conectando con el PC...</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-emerald-600 flex flex-col items-center justify-center text-white p-6 text-center">
        <CheckCircle className="w-20 h-20 mb-6" />
        <h1 className="text-3xl font-bold mb-2">¡Foto enviada!</h1>
        <p className="text-emerald-100 text-lg mb-8">Mira la pantalla de tu ordenador.</p>
        <button 
          onClick={() => setStatus('ready')}
          className="bg-white text-emerald-700 px-8 py-4 rounded-full font-bold text-lg shadow-lg active:scale-95 transition-transform"
        >
          Hacer otra foto
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 text-center">
      <div className="bg-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl border border-slate-700">
        <div className="bg-emerald-500/20 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Camera className="w-10 h-10 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Cámara Conectada</h1>
        <p className="text-slate-400 mb-8">Haz una foto a la etiqueta y aparecerá mágicamente en tu PC.</p>
        
        {status === 'error' && (
          <div className="bg-red-500/20 text-red-300 p-4 rounded-xl mb-6 text-sm border border-red-500/30">
            {errorMsg}
          </div>
        )}

        <button 
          onClick={() => fileInputRef.current?.click()}
          disabled={status === 'uploading'}
          className="w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white py-5 rounded-2xl font-bold text-xl shadow-lg shadow-emerald-500/30 transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {status === 'uploading' ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              <Camera className="w-6 h-6" />
              Hacer Foto
            </>
          )}
        </button>
        
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleCapture}
          accept="image/*"
          capture="environment"
          className="hidden"
        />
      </div>
    </div>
  );
};
