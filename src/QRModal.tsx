import React, { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Smartphone, Loader2, CheckCircle } from 'lucide-react';
import { db } from './firebase';
import { doc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';

export const QRModal = ({ onClose, onPhotoReceived }: { onClose: () => void, onPhotoReceived: (base64: string) => void }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [status, setStatus] = useState<'waiting' | 'connected' | 'photo_taken'>('waiting');
  const [error, setError] = useState('');

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
              onPhotoReceived(data.photoData);
              // Instead of closing the modal, we keep it open and reset the status
              // so the mobile device can send another photo.
              // We don't reset the status here, the mobile device will reset it to 'ready'
              // when the user clicks "Hacer otra foto".
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
  }, [onPhotoReceived]); // Removed onClose from dependencies as it's no longer called here

  const url = `${window.location.origin}/?session=${sessionId}`;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

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
                  <p className="text-sm text-emerald-600/80">Esperando foto...</p>
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
        </div>
      </div>
    </div>
  );
};
