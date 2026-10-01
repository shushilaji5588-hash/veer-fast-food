import React, { useState, useEffect } from 'react';
import { WifiOff, Database } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="fixed bottom-3 left-3 z-40 flex items-center gap-2 pointer-events-none">
      {!isOnline ? (
        <div className="flex items-center gap-1.5 rounded-full bg-red-600/95 text-white px-3 py-1 text-[11px] font-bold shadow-lg border border-red-400/40 animate-pulse backdrop-blur-md">
          <WifiOff className="w-3 h-3" />
          <span>OFFLINE MODE (Local SQLite Active)</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 rounded-full bg-gray-900/85 text-emerald-400 px-2.5 py-0.5 text-[10px] font-medium border border-emerald-500/20 shadow backdrop-blur-md">
          <Database className="w-2.5 h-2.5 text-emerald-400" />
          <span>Local SQLite</span>
        </div>
      )}
    </div>
  );
};
