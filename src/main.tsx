import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register service worker immediately for 100% offline iPhone PWA startup
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('VEER FAST FOOD updated with fresh assets');
  },
  onOfflineReady() {
    console.log('VEER FAST FOOD is cached and ready to work 100% offline');
  },
  onRegisterError(error) {
    console.warn('Service worker registration failed:', error);
  },
});

createRoot(document.getElementById('root')!).render(<App />);
