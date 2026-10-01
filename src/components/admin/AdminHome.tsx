import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Table as TableIcon,
  Users,
  UtensilsCrossed,
  LogOut,
} from 'lucide-react';

export type AdminView =
  | 'home'
  | 'dashboard'
  | 'tables'
  | 'employees'
  | 'items';

interface AdminHomeProps {
  onNavigate: (view: AdminView) => void;
}

export const AdminHome: React.FC<AdminHomeProps> = ({ onNavigate }) => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-6 flex flex-col justify-between">
      {/* Brand Header & Welcome */}
      <div className="text-center pt-2 pb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 via-amber-400 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 mb-3">
          <div className="w-full h-full bg-gray-950 rounded-[14px] flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-amber-400" />
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1.5">
          <span className="text-amber-400">VEER</span>
          <span className="text-red-500">FAST FOOD</span>
        </h1>

        <p className="text-sm font-bold text-gray-300 mt-2">
          Welcome <span className="text-amber-400">{currentUser?.full_name || 'Admin'}</span>
        </p>
      </div>

      {/* ONLY 4 MAIN ADMIN BUTTONS (Large, touch-friendly, centered, no text overflow) */}
      <div className="space-y-3.5 my-auto">
        {/* 1. DASHBOARD */}
        <button
          onClick={() => onNavigate('dashboard')}
          className="w-full min-h-[68px] py-4 px-5 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-3 text-gray-950"
        >
          <LayoutDashboard className="w-6 h-6 flex-shrink-0" />
          <span className="text-base sm:text-lg font-black tracking-wide uppercase text-center leading-tight">
            DASHBOARD
          </span>
        </button>

        {/* 2. TABLE MANAGEMENT */}
        <button
          onClick={() => onNavigate('tables')}
          className="w-full min-h-[68px] py-4 px-5 rounded-2xl bg-gray-900 border-2 border-emerald-500/60 hover:border-emerald-400 hover:bg-gray-800 active:scale-[0.98] transition shadow-lg shadow-black/40 flex items-center justify-center gap-3 text-white"
        >
          <TableIcon className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          <span className="text-base sm:text-lg font-black tracking-wide uppercase text-center leading-tight text-emerald-400">
            TABLE MANAGEMENT
          </span>
        </button>

        {/* 3. EMPLOYEE MANAGEMENT */}
        <button
          onClick={() => onNavigate('employees')}
          className="w-full min-h-[68px] py-4 px-5 rounded-2xl bg-gray-900 border-2 border-blue-500/60 hover:border-blue-400 hover:bg-gray-800 active:scale-[0.98] transition shadow-lg shadow-black/40 flex items-center justify-center gap-3 text-white"
        >
          <Users className="w-6 h-6 text-blue-400 flex-shrink-0" />
          <span className="text-base sm:text-lg font-black tracking-wide uppercase text-center leading-tight text-blue-400">
            EMPLOYEE MANAGEMENT
          </span>
        </button>

        {/* 4. ADD & REMOVE ITEM */}
        <button
          onClick={() => onNavigate('items')}
          className="w-full min-h-[68px] py-4 px-5 rounded-2xl bg-gray-900 border-2 border-red-500/60 hover:border-red-400 hover:bg-gray-800 active:scale-[0.98] transition shadow-lg shadow-black/40 flex items-center justify-center gap-3 text-white"
        >
          <UtensilsCrossed className="w-6 h-6 text-red-400 flex-shrink-0" />
          <span className="text-base sm:text-lg font-black tracking-wide uppercase text-center leading-tight text-red-400">
            ADD &amp; REMOVE ITEM
          </span>
        </button>
      </div>

      {/* Logout at bottom */}
      <div className="pt-6">
        <button
          onClick={logout}
          className="w-full py-3.5 px-4 rounded-2xl bg-gray-900/80 hover:bg-red-950/50 border border-gray-800 hover:border-red-800 text-gray-400 hover:text-red-300 font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 active:scale-95"
        >
          <LogOut className="w-4 h-4 text-red-400" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
