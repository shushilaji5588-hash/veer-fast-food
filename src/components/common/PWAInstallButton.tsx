import React, { useState } from 'react';
import { Download, Smartphone, X, CheckCircle, Apple } from 'lucide-react';
import { usePWAInstall } from './usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running in standalone mode on Android/iOS, suppress
  if (isInstalled) {
    return null;
  }

  return (
    <>
      {isInstallable ? (
        <button
          onClick={install}
          className={`flex items-center gap-1.5 font-bold transition rounded-lg shadow-sm ${
            compact
              ? 'bg-amber-500 hover:bg-amber-400 text-gray-950 px-2.5 py-1 text-xs'
              : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-gray-950 px-3.5 py-1.5 text-xs font-black uppercase tracking-wider'
          }`}
          title="Install app on Android or Desktop for offline use"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install App</span>
        </button>
      ) : isIOS ? (
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 font-bold transition rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 ${
            compact ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-xs'
          }`}
          title="Install on iPhone / iPad"
        >
          <Apple className="w-3.5 h-3.5 text-amber-400" />
          <span>Install on iOS</span>
        </button>
      ) : null}

      {/* iOS Safari Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Install on iPhone / iPad</h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="flex items-start gap-3 bg-gray-800/60 p-3 rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-gray-950 font-bold flex items-center justify-center text-xs">
                  1
                </span>
                <p>
                  Tap the <strong className="text-white">Share</strong> button in your Safari toolbar (the box with an arrow pointing up).
                </p>
              </div>

              <div className="flex items-start gap-3 bg-gray-800/60 p-3 rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500 text-gray-950 font-bold flex items-center justify-center text-xs">
                  2
                </span>
                <p>
                  Scroll down the options list and tap <strong className="text-amber-400">Add to Home Screen</strong>.
                </p>
              </div>

              <div className="flex items-start gap-3 bg-gray-800/60 p-3 rounded-xl">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs">
                  <CheckCircle className="w-4 h-4" />
                </span>
                <p>
                  Tap <strong className="text-white">Add</strong> in the top-right corner. VEER FAST FOOD will launch full-screen and work 100% offline!
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full rounded-xl bg-amber-500 py-2.5 text-sm font-bold text-gray-950 hover:bg-amber-400 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
