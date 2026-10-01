import React from 'react';
import { Wifi, BatteryMedium, Signal } from 'lucide-react';

interface DeviceFrameProps {
  children: React.ReactNode;
  isMobileMode: boolean;
  onToggleMode: () => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  children,
  isMobileMode,
  onToggleMode,
}) => {
  if (!isMobileMode) {
    return <div className="min-h-screen w-full flex flex-col bg-gray-950 text-gray-100">{children}</div>;
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 py-4 px-2 sm:py-8 sm:px-4 flex flex-col items-center justify-start overflow-y-auto">
      {/* Device Mode Switcher Floating Pill */}
      <div className="mb-3 hidden sm:flex items-center gap-2 bg-gray-900/90 border border-gray-800 rounded-full px-4 py-1.5 shadow-lg text-xs">
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-gray-300 font-medium">Mobile Device Mode Active (Android &amp; iOS)</span>
        <button
          onClick={onToggleMode}
          className="ml-2 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-[11px] font-bold transition"
        >
          Switch to Full View
        </button>
      </div>

      {/* Realistic Mobile Device Container */}
      <div className="w-full max-w-[420px] bg-gray-950 border-[6px] sm:border-[10px] border-neutral-800 rounded-[38px] sm:rounded-[48px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] overflow-hidden flex flex-col min-h-[820px] max-h-[92vh] relative ring-1 ring-white/10">
        {/* Device Top Speaker & Dynamic Island */}
        <div className="w-full bg-gray-950 pt-2 pb-1 px-6 flex items-center justify-between z-30 select-none border-b border-gray-900/40">
          <span className="text-[11px] font-black text-gray-300 tracking-tight">9:41</span>
          
          {/* Dynamic Island Pill */}
          <div className="w-24 h-4 bg-black rounded-full flex items-center justify-center gap-1.5 border border-white/5 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-500/80 animate-ping" />
            <span className="text-[8px] font-bold text-amber-400">VEER POS</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-300">
            <Signal className="w-3 h-3 stroke-[2.5]" />
            <Wifi className="w-3 h-3 stroke-[2.5]" />
            <BatteryMedium className="w-3.5 h-3.5 stroke-[2.5]" />
          </div>
        </div>

        {/* Scrollable Mobile Screen Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain flex flex-col relative bg-gray-950">
          {children}
        </div>

        {/* Device Bottom Home Indicator Bar */}
        <div className="w-full py-1.5 bg-gray-950 flex justify-center items-center z-30 select-none">
          <div className="w-32 h-1 bg-gray-600 rounded-full" />
        </div>
      </div>
    </div>
  );
};
