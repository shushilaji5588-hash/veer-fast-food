import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Package, Table as TableIcon, LogOut, UtensilsCrossed } from 'lucide-react';

interface EmployeeHomeProps {
  onStartParcelOrder: () => void;
  onStartTableOrder: () => void;
}

export const EmployeeHome: React.FC<EmployeeHomeProps> = ({
  onStartParcelOrder,
  onStartTableOrder,
}) => {
  const { currentUser, logout } = useAuth();

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-8 flex flex-col justify-between">
      {/* Brand & Welcome */}
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

        <p className="text-base font-bold text-gray-200 mt-2">
          Welcome <span className="text-amber-400">{currentUser?.full_name}</span>
        </p>
      </div>

      {/* ONLY TWO MAIN TOUCH BUTTONS: PARCEL ORDER & TABLE ORDER */}
      <div className="space-y-4 my-auto">
        {/* PARCEL ORDER */}
        <button
          onClick={onStartParcelOrder}
          className="w-full min-h-[76px] py-5 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-500 active:scale-[0.98] transition shadow-xl shadow-amber-500/20 flex items-center justify-center gap-3.5 text-gray-950"
        >
          <Package className="w-7 h-7 flex-shrink-0" />
          <span className="text-lg sm:text-xl font-black tracking-wide uppercase text-center leading-tight">
            PARCEL ORDER
          </span>
        </button>

        {/* TABLE ORDER */}
        <button
          onClick={onStartTableOrder}
          className="w-full min-h-[76px] py-5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.98] transition shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3.5 text-gray-950"
        >
          <TableIcon className="w-7 h-7 flex-shrink-0" />
          <span className="text-lg sm:text-xl font-black tracking-wide uppercase text-center leading-tight">
            TABLE ORDER
          </span>
        </button>
      </div>

      {/* Logout button */}
      <div className="pt-8">
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
