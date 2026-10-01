import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { LogOut, ArrowLeft, Smartphone, Monitor } from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  showBack?: boolean;
  deviceMode?: 'mobile' | 'responsive';
  onToggleDeviceMode?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onBack,
  showBack,
  deviceMode = 'responsive',
  onToggleDeviceMode,
}) => {
  const { currentUser, logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 bg-gray-950 border-b border-gray-800 shadow-md">
      <div className="max-w-md mx-auto px-3.5 py-2.5 flex items-center justify-between gap-2">
        {/* Left: Back or Brand Logo */}
        <div className="flex items-center gap-2 min-w-0">
          {showBack && onBack ? (
            <button
              onClick={onBack}
              className="p-1.5 -ml-1 text-amber-400 hover:text-white rounded-lg active:scale-95 transition flex-shrink-0"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          ) : null}

          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-0.5 flex-shrink-0 flex items-center justify-center shadow">
              <div className="w-full h-full bg-gray-950 rounded-[9px] flex items-center justify-center">
                <span className="text-amber-400 font-black text-xs">VFF</span>
              </div>
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-black tracking-tight text-white flex items-center gap-1 leading-none truncate">
                <span className="text-amber-400">VEER</span>
                <span className="text-red-500">FAST FOOD</span>
              </h1>
              {title && (
                <p className="text-[10px] font-bold text-gray-300 uppercase tracking-wide truncate mt-0.5">
                  {title}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Install, Simulator & Logout */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onToggleDeviceMode && (
            <button
              onClick={onToggleDeviceMode}
              className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-gray-400 hover:text-amber-400 bg-gray-900 border border-gray-800 rounded-lg transition"
              title="Toggle mobile view"
            >
              {deviceMode === 'mobile' ? <Monitor className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
            </button>
          )}

          <PWAInstallButton compact />

          {currentUser && (
            <button
              onClick={logout}
              className="p-1.5 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-900 transition"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
