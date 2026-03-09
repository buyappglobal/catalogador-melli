import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Loader2, CheckCircle, Minus } from 'lucide-react';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const QRModal = ({ onClose, onPhotoReceived }: { onClose: () => void, onPhotoReceived: (base64: string) => void }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connected' | 'photo_taken' | 'ready'>('waiting');
  const [error, setError] = useState('');
  const [isMinimized, setIsMinimized] = useState(false);

  // Use a ref to always access the latest onPhotoReceived without triggering re-renders
  const onPhotoReceivedRef = useRef(onPhotoReceived);
  useEffect(() => {
    onPhotoReceivedRef.current = onPhotoReceived;
  }, [onPhotoReceived]);

  useEffect(() => {
    let unsubscribe: () => void;
    
    const init = async () => {
      try {
        const id = uuidv4();
        setSessionId(id);
        
        await setDoc(doc(db, 'photoSessions', id), {
          status: 'waiting',
          createdAt: serverTimestamp()
        });

        unsubscribe = onSnapshot(doc(db, 'photoSessions', id), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setStatus(data.status);
            if (data.status === 'photo_taken' && data.photoData) {
              onPhotoReceivedRef.current(data.photoData);
            }
          }
        });
      } catch (err: any) {
        console.error(err);
        setError('Error al conectar con la base de datos.');
      }
    };

    init();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []); // Empty dependency array so it only runs once per modal open

  // Auto-minimize when connected
  useEffect(() => {
    if (status === 'connected') {
      const timer = setTimeout(() => {
        setIsMinimized(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const url = `${window.location.origin}/?session=${sessionId}`;

  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
        <div className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-3 pr-4 flex items-center gap-4 border border-slate-200">
          <div 
            className="relative bg-emerald-100 p-2.5 rounded-full cursor-pointer hover:bg-emerald-200 transition-colors" 
            onClick={() => setIsMinimized(false)} 
            title="Maximizar"
          >
            <Smartphone className="w-5 h-5 text-emerald-600" />
            <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
          </div>
          <div className="flex flex-col cursor-pointer" onClick={() => setIsMinimized(false)}>
            <span className="text-sm font-bold text-slate-800">Móvil Vinculado</span>
            <span className="text-xs font-medium text-emerald-600">
              {status === 'photo_taken' ? 'Recibiendo foto...' : 'Cámara lista'}
            </span>
          </div>
          <div className="w-px h-8 bg-slate-100 mx-1"></div>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }} 
            className="p-2 hover:bg-red-50 hover:text-red-600 rounded-full text-slate-400 transition-colors"
            title="Desconectar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  const handleBackdropClick = () => {
    if (status !== 'waiting') {
      setIsMinimized(true);
    } else {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <Smartphone className="w-8 h-8 text-emerald-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Conectar Móvil</h2>
          <p className="text-slate-500 mb-8">Escanea este código con la cámara de tu móvil para usarlo como escáner.</p>

          {error ? (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-200 mb-6">
              {error}
            </div>
          ) : !sessionId ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-4" />
              <p className="text-slate-500 font-medium">Generando código seguro...</p>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-2xl border-2 border-slate-100 inline-block shadow-sm relative">
              <QRCodeSVG value={url} size={200} level="H" includeMargin={true} />
              
              {status === 'connected' && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                  <CheckCircle className="w-12 h-12 text-emerald-500 mb-2" />
                  <p className="font-bold text-emerald-700">¡Móvil Conectado!</p>
                  <p className="text-sm text-emerald-600/80">Minimizando...</p>
                </div>
              )}
            </div>
          )}

          <div className="mt-8 bg-slate-50 rounded-xl p-4 text-sm text-slate-600 flex items-start gap-3 text-left">
            <div className="bg-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-slate-400 shrink-0 shadow-sm border border-slate-200 mt-0.5">1</div>
            <p>Abre la cámara de tu móvil y apunta al código QR.</p>
          </div>
          <div className="mt-3 bg-slate-50 rounded-xl p-4 text-sm text-slate-600 flex items-start gap-3 text-left">
            <div className="bg-white w-6 h-6 rounded-full flex items-center justify-center font-bold text-slate-400 shrink-0 shadow-sm border border-slate-200 mt-0.5">2</div>
            <p>Toca el enlace que aparecerá en tu pantalla. No necesitas instalar nada.</p>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-3">
            {status !== 'waiting' ? (
              <>
                <button 
                  onClick={() => setIsMinimized(true)}
                  className="w-full bg-emerald-100 hover:bg-emerald-200 text-emerald-700 font-semibold py-3 rounded-xl transition-colors"
                >
                  Minimizar ventana
                </button>
                <div className="text-center mt-2">
                  <button 
                    onClick={onClose}
                    className="text-red-500 hover:text-red-700 text-sm font-bold underline-offset-4 hover:underline transition-all"
                  >
                    Desconectar móvil
                  </button>
                  <p className="text-xs text-slate-400 mt-1">Atención: Si desconectas, tendrás que volver a escanear el QR.</p>
                </div>
              </>
            ) : (
              <button 
                onClick={onClose}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
