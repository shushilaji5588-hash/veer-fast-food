import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Calendar as CalendarIcon, Check } from 'lucide-react';

interface MobileDatePickerModalProps {
  isOpen: boolean;
  title: string;
  initialDate: string; // YYYY-MM-DD
  onSelectDate: (dateStr: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const MobileDatePickerModal: React.FC<MobileDatePickerModalProps> = ({
  isOpen,
  title,
  initialDate,
  onSelectDate,
  onClose,
}) => {
  // Parse initialDate YYYY-MM-DD
  const parseDate = (dStr: string) => {
    if (dStr) {
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1; // 0-indexed
        const d = parseInt(parts[2], 10);
        if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
          return { year: y, month: m, day: d };
        }
      }
    }
    const today = new Date();
    return { year: today.getFullYear(), month: today.getMonth(), day: today.getDate() };
  };

  const initialParsed = parseDate(initialDate);
  const [viewYear, setViewYear] = useState<number>(initialParsed.year);
  const [viewMonth, setViewMonth] = useState<number>(initialParsed.month);
  const [selectedDay, setSelectedDay] = useState<number>(initialParsed.day);

  // Synchronize when modal opens or initialDate changes
  useEffect(() => {
    if (isOpen) {
      const p = parseDate(initialDate);
      setViewYear(p.year);
      setViewMonth(p.month);
      setSelectedDay(p.day);
    }
  }, [isOpen, initialDate]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Today helper
  const todayObj = new Date();
  const todayYear = todayObj.getFullYear();
  const todayMonth = todayObj.getMonth();
  const todayDay = todayObj.getDate();

  // Month navigation
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days in current view month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  // Generate array for calendar grid
  const daysArray: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    daysArray.push(d);
  }

  // Generate Year options (covering 2022 to 2035)
  const yearOptions: number[] = [];
  for (let y = 2022; y <= 2035; y++) {
    yearOptions.push(y);
  }

  const handleSelectDayAndConfirm = (day: number) => {
    setSelectedDay(day);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const finalDateStr = `${viewYear}-${mStr}-${dStr}`;
    onSelectDate(finalDateStr);
    onClose();
  };

  const handleConfirmCurrent = () => {
    const validDay = Math.min(selectedDay, daysInMonth);
    const mStr = String(viewMonth + 1).padStart(2, '0');
    const dStr = String(validDay).padStart(2, '0');
    const finalDateStr = `${viewYear}-${mStr}-${dStr}`;
    onSelectDate(finalDateStr);
    onClose();
  };

  const handleQuickToday = () => {
    const mStr = String(todayMonth + 1).padStart(2, '0');
    const dStr = String(todayDay).padStart(2, '0');
    const finalDateStr = `${todayYear}-${mStr}-${dStr}`;
    onSelectDate(finalDateStr);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-3xl bg-gray-900 border-2 border-gray-800 p-5 shadow-2xl text-gray-100 flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white uppercase tracking-wider">{title}</h3>
              <p className="text-[10px] text-gray-400 font-bold">Select Year, Month &amp; Day</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition active:scale-95"
            aria-label="Close date picker"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Month & Year Selectors with Prev/Next Steppers */}
        <div className="flex items-center justify-between gap-1.5 bg-gray-950 p-2 rounded-2xl border border-gray-800">
          <button
            type="button"
            onClick={prevMonth}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition active:scale-90"
            title="Previous Month"
            aria-label="Previous Month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 flex-1 justify-center">
            {/* Month Dropdown */}
            <select
              value={viewMonth}
              onChange={(e) => setViewMonth(parseInt(e.target.value, 10))}
              className="bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-black text-amber-400 focus:outline-none focus:border-amber-500 text-center cursor-pointer"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>

            {/* Year Dropdown */}
            <select
              value={viewYear}
              onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
              className="bg-gray-900 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs font-mono font-black text-white focus:outline-none focus:border-amber-500 text-center cursor-pointer"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={nextMonth}
            className="p-2 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-white transition active:scale-90"
            title="Next Month"
            aria-label="Next Month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {DAYS_OF_WEEK.map((d) => (
            <span key={d} className="text-[10px] font-black uppercase text-gray-400 py-1">
              {d}
            </span>
          ))}
        </div>

        {/* Days Grid (Touch-friendly 1..31) */}
        <div className="grid grid-cols-7 gap-1.5">
          {daysArray.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-9 w-full" />;
            }

            const currentFormatted = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isSelected = currentFormatted === initialDate;
            const isToday =
              day === todayDay &&
              viewMonth === todayMonth &&
              viewYear === todayYear;

            return (
              <button
                key={`day-${day}`}
                type="button"
                onClick={() => handleSelectDayAndConfirm(day)}
                className={`h-9 w-full rounded-xl font-mono text-xs font-bold transition flex items-center justify-center active:scale-90 ${
                  isSelected
                    ? 'bg-amber-500 text-gray-950 font-black shadow-lg shadow-amber-500/30 ring-2 ring-amber-400'
                    : isToday
                    ? 'bg-gray-800 text-amber-400 border border-amber-500/50'
                    : 'bg-gray-950/60 hover:bg-gray-800 text-gray-200'
                }`}
              >
                {day}
              </button>
            );
          })}
        </div>

        {/* Modal Bottom Actions */}
        <div className="pt-2 border-t border-gray-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleQuickToday}
            className="px-3 py-2 rounded-xl bg-gray-950 border border-gray-800 hover:border-amber-500/50 text-amber-400 text-xs font-bold uppercase tracking-wider transition active:scale-95"
          >
            Today
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-bold uppercase transition active:scale-95"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmCurrent}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 text-xs font-black uppercase tracking-wider transition flex items-center gap-1 active:scale-95 shadow-md shadow-amber-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Done</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
