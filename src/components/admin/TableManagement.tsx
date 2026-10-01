import React, { useState, useEffect } from 'react';
import { getAllTables, addTable, removeLastTable } from '../../services/dataService';
import { RestaurantTable } from '../../db/types';
import { Plus, Minus, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface TableManagementProps {
  onOpenOrderForTable?: (table: RestaurantTable) => void;
}

export const TableManagement: React.FC<TableManagementProps> = ({ onOpenOrderForTable }) => {
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadTables = async () => {
    try {
      setLoading(true);
      const data = await getAllTables();
      setTables(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTables();
  }, []);

  const handleAdd = async () => {
    setFeedback(null);
    try {
      const num = await addTable();
      setFeedback({ type: 'success', message: `Table ${num} added.` });
      await loadTables();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleRemove = async () => {
    setFeedback(null);
    try {
      const num = await removeLastTable();
      setFeedback({ type: 'success', message: `Table ${num} removed.` });
      await loadTables();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Title */}
      <div className="text-center">
        <h2 className="text-xl font-black text-white uppercase tracking-tight">TABLE MANAGEMENT</h2>
        <p className="text-xs text-gray-400 mt-0.5">Add or remove restaurant tables</p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <span>{feedback.message}</span>
          <button onClick={() => setFeedback(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEPPER: TABLE [ Count ] [ + ] [ - ] as specified in prompt */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
        <div>
          <span className="text-xs font-black uppercase tracking-wider text-amber-400 block">TABLE</span>
          <span className="text-[11px] text-gray-400">Total tables count</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Table Count Display [ Count ] */}
          <div className="w-14 h-12 rounded-xl bg-gray-950 border border-gray-800 flex items-center justify-center text-xl font-black text-white font-mono shadow-inner">
            {tables.length}
          </div>

          {/* [ + ] */}
          <button
            onClick={handleAdd}
            className="w-12 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center font-black transition shadow-md"
            title="Add table"
          >
            <Plus className="w-6 h-6 stroke-[3]" />
          </button>

          {/* [ - ] */}
          <button
            onClick={handleRemove}
            disabled={tables.length <= 1}
            className="w-12 h-12 rounded-xl bg-red-600 hover:bg-red-500 active:scale-95 text-white flex items-center justify-center font-black transition shadow-md disabled:opacity-40"
            title="Remove table"
          >
            <Minus className="w-6 h-6 stroke-[3]" />
          </button>
        </div>
      </div>

      {/* TABLE LIST (Large mobile buttons) */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase text-gray-400 block px-1">Current Tables</span>

        <div className="grid grid-cols-2 gap-2.5">
          {tables.map((t) => {
            const isOccupied = t.status === 'occupied';

            return (
              <button
                key={t.id}
                onClick={() => onOpenOrderForTable && onOpenOrderForTable(t)}
                className={`min-h-[72px] p-3.5 rounded-2xl border text-center flex flex-col items-center justify-center transition active:scale-[0.98] ${
                  isOccupied
                    ? 'bg-red-950/40 border-red-500/60 text-red-200'
                    : 'bg-gray-900 border-gray-800 hover:border-emerald-500/60 text-white'
                }`}
              >
                <span className="text-base font-black tracking-wide">TABLE {t.table_number}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-0.5 ${
                    isOccupied ? 'text-red-400' : 'text-emerald-400'
                  }`}
                >
                  {isOccupied ? 'Occupied' : 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
