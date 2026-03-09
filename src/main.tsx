import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// @ts-ignore
import { registerSW } from 'virtual:pwa-register';

// Forzar el registro del Service Worker para que el navegador reconozca la PWA
registerSW({ immediate: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
