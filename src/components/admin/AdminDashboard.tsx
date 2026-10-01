import React, { useState, useEffect } from 'react';
import {
  getDashboardMetrics,
  getEmployeeWiseReport,
  getAllExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from '../../services/dataService';
import { DashboardSummary, EmployeeReportRow, Expense } from '../../db/types';
import { getTodayDateString } from '../../db/sqlite';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  DollarSign,
  Calendar,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  AlertCircle,
  X,
  Users,
  Receipt,
  ArrowRight,
} from 'lucide-react';
import { MobileDatePickerModal } from '../common/MobileDatePickerModal';

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const mName = months[parseInt(month, 10) - 1] || month;
  return `${day} ${mName} ${year}`;
}

export const AdminDashboard: React.FC = () => {
  const today = getTodayDateString();

  // Active filter state
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);

  // Staged input values for the date pickers
  const [fromInput, setFromInput] = useState(today);
  const [toInput, setToInput] = useState(today);
  const [dateError, setDateError] = useState<string | null>(null);
  const [activePicker, setActivePicker] = useState<'from' | 'to' | 'expense' | null>(null);

  // Dashboard calculations from SQLite
  const [metrics, setMetrics] = useState<DashboardSummary | null>(null);
  const [employeeReports, setEmployeeReports] = useState<EmployeeReportRow[]>([]);
  const [expensesList, setExpensesList] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Feedback banner
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Expense form state
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(today);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [isSavingExpense, setIsSavingExpense] = useState(false);

  // Check if current filter represents TODAY
  const isTodaySelected = startDate === today && endDate === today;

  // Load Dashboard data dynamically from SQLite
  const loadData = async (start: string, end: string) => {
    try {
      setLoading(true);
      const [m, emps, exps] = await Promise.all([
        getDashboardMetrics({ startDate: start, endDate: end }),
        getEmployeeWiseReport(start, end),
        getAllExpenses({ startDate: start, endDate: end }),
      ]);
      setMetrics(m);
      setEmployeeReports(emps);
      setExpensesList(exps);
    } catch (err) {
      console.error('Error loading dashboard from SQLite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(startDate, endDate);
  }, [startDate, endDate]);

  // Handle [ TODAY ] quick button
  const handleSelectToday = () => {
    setDateError(null);
    setFromInput(today);
    setToInput(today);
    setStartDate(today);
    setEndDate(today);
  };

  // Handle selection from mobile date picker modal
  const handleSelectFromDate = (newDate: string) => {
    setFromInput(newDate);
    if (newDate > toInput) {
      setDateError('From Date cannot be later than To Date.');
    } else {
      setDateError(null);
    }
  };

  const handleSelectToDate = (newDate: string) => {
    setToInput(newDate);
    if (fromInput > newDate) {
      setDateError('From Date cannot be later than To Date.');
    } else {
      setDateError(null);
    }
  };

  // Handle [ APPLY FILTER ]
  const handleApplyFilter = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setDateError(null);

    if (!fromInput || !toInput) {
      setDateError('Please enter both From Date and To Date.');
      return;
    }

    if (fromInput > toInput) {
      setDateError('From Date cannot be after To Date.');
      return;
    }

    setStartDate(fromInput);
    setEndDate(toInput);
  };

  // Save or update an expense
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amt = parseFloat(expenseAmount);
    if (!expenseName.trim()) {
      setFeedback({ type: 'error', message: 'Expense Name is required.' });
      return;
    }
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be greater than zero.' });
      return;
    }
    if (!expenseDate) {
      setFeedback({ type: 'error', message: 'Expense Date is required.' });
      return;
    }

    try {
      setIsSavingExpense(true);

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, {
          category: expenseName.trim(),
          amount: amt,
          description: expenseDesc.trim(),
          date: expenseDate,
        });
        setFeedback({ type: 'success', message: `Expense "${expenseName}" updated!` });
        setEditingExpenseId(null);
      } else {
        await createExpense({
          category: expenseName.trim(),
          amount: amt,
          description: expenseDesc.trim(),
          date: expenseDate,
          created_by: 'Admin',
        });
        setFeedback({ type: 'success', message: `Expense of ₹${amt} saved!` });
      }

      // Reset form
      setExpenseName('');
      setExpenseAmount('');
      setExpenseDate(today);
      setExpenseDesc('');

      // Real-time Dashboard update
      await loadData(startDate, endDate);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    } finally {
      setIsSavingExpense(false);
    }
  };

  // Start editing an expense
  const handleStartEdit = (exp: Expense) => {
    setEditingExpenseId(exp.id);
    setExpenseName(exp.category);
    setExpenseAmount(String(exp.amount));
    setExpenseDate(exp.date);
    setExpenseDesc(exp.description);
    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingExpenseId(null);
    setExpenseName('');
    setExpenseAmount('');
    setExpenseDate(today);
    setExpenseDesc('');
  };

  // Delete an expense
  const handleDeleteExpense = async (exp: Expense) => {
    if (!window.confirm(`Delete expense "${exp.category}" of ₹${exp.amount}?`)) {
      return;
    }

    try {
      await deleteExpense(exp.id);
      setFeedback({ type: 'success', message: 'Expense deleted.' });
      if (editingExpenseId === exp.id) {
        handleCancelEdit();
      }
      await loadData(startDate, endDate);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const formatCurrency = (val: number) => {
    return '₹' + Math.round(val).toLocaleString('en-IN');
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* 1. TOP HEADER & DATE-WISE FILTER */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black text-white uppercase tracking-tight">DASHBOARD</h2>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 block mt-0.5">
              DATE FILTER
            </span>
          </div>

          <button
            type="button"
            onClick={handleSelectToday}
            className={`px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
              isTodaySelected
                ? 'bg-amber-500 text-gray-950 shadow-md shadow-amber-500/20'
                : 'bg-gray-950 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700'
            }`}
          >
            TODAY
          </button>
        </div>

        {/* Date Inputs: [ From Date ]  →  [ To Date ] */}
        <form onSubmit={handleApplyFilter} className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {/* FROM DATE PICKER BOX */}
            <button
              type="button"
              onClick={() => {
                setDateError(null);
                setActivePicker('from');
              }}
              className="relative flex-1 w-full bg-gray-950 border-2 border-gray-800 hover:border-amber-500/80 focus:border-amber-500 rounded-2xl p-3.5 shadow-inner transition group cursor-pointer text-left active:scale-[0.98] outline-none"
              aria-label="Select From Date"
            >
              <div className="flex items-center gap-1.5 mb-1 pointer-events-none">
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover:text-amber-400 transition">
                  From Date
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-white font-mono pl-5 leading-tight truncate pointer-events-none">
                {formatDisplayDate(fromInput)}
              </p>
            </button>

            {/* ARROW SEPARATOR */}
            <div className="flex items-center justify-center text-gray-500 select-none py-0.5 sm:py-0">
              <span className="text-base font-black text-amber-400 hidden sm:inline">&rarr;</span>
              <span className="text-xs font-bold text-gray-500 sm:hidden">&darr;</span>
            </div>

            {/* TO DATE PICKER BOX */}
            <button
              type="button"
              onClick={() => {
                setDateError(null);
                setActivePicker('to');
              }}
              className="relative flex-1 w-full bg-gray-950 border-2 border-gray-800 hover:border-amber-500/80 focus:border-amber-500 rounded-2xl p-3.5 shadow-inner transition group cursor-pointer text-left active:scale-[0.98] outline-none"
              aria-label="Select To Date"
            >
              <div className="flex items-center gap-1.5 mb-1 pointer-events-none">
                <Calendar className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 group-hover:text-amber-400 transition">
                  To Date
                </span>
              </div>
              <p className="text-sm sm:text-base font-black text-white font-mono pl-5 leading-tight truncate pointer-events-none">
                {formatDisplayDate(toInput)}
              </p>
            </button>
          </div>

          {dateError && (
            <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs font-bold flex items-center gap-1.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{dateError}</span>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-gray-950 font-black text-xs sm:text-sm uppercase tracking-wider transition shadow-md shadow-amber-500/20 flex items-center justify-center gap-1.5"
          >
            <Calendar className="w-4 h-4" />
            <span>APPLY FILTER</span>
          </button>
        </form>

        {/* 15. FILTER LABEL */}
        <div className="pt-2 border-t border-gray-800/80 text-center">
          <span className="text-[11px] text-gray-400 font-medium">
            Showing data for:{' '}
            <strong className="text-amber-400 font-mono">
              {startDate === endDate
                ? formatDisplayDate(startDate)
                : `${formatDisplayDate(startDate)} → ${formatDisplayDate(endDate)}`}
            </strong>
          </span>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {feedback.type === 'success' ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 2 & 3. THE 4 DYNAMIC DASHBOARD CARDS */}
      <div className="space-y-3">
        {/* CARD 1: TOTAL EARNING */}
        <div className="bg-gradient-to-r from-amber-500/15 via-gray-900 to-gray-900 border border-amber-500/40 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider block">
              {isTodaySelected ? "TODAY'S TOTAL EARNING" : 'TOTAL EARNING'}
            </span>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {formatCurrency(metrics?.today_earning || 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 2: TOTAL ORDERS */}
        <div className="bg-gradient-to-r from-blue-500/15 via-gray-900 to-gray-900 border border-blue-500/40 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider block">
              {isTodaySelected ? "TODAY'S TOTAL ORDERS" : 'TOTAL ORDERS'}
            </span>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {metrics?.today_orders || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 3: TOTAL EXPENSES */}
        <div className="bg-gradient-to-r from-red-500/15 via-gray-900 to-gray-900 border border-red-500/40 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-black text-red-400 uppercase tracking-wider block">
              {isTodaySelected ? "TODAY'S TOTAL EXPENSES" : 'TOTAL EXPENSES'}
            </span>
            <p className="text-2xl font-black text-white font-mono mt-0.5">
              {formatCurrency(metrics?.today_expenses || 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>

        {/* CARD 4: TOTAL PROFIT (Formula: TOTAL EARNING - TOTAL EXPENSES) */}
        <div className="bg-gradient-to-r from-emerald-500/15 via-gray-900 to-gray-900 border border-emerald-500/40 rounded-2xl p-4 flex items-center justify-between shadow-md">
          <div>
            <span className="text-[11px] font-black text-emerald-400 uppercase tracking-wider block">
              {isTodaySelected ? "TODAY'S TOTAL PROFIT" : 'TOTAL PROFIT'}
            </span>
            <p
              className={`text-2xl font-black font-mono mt-0.5 ${
                (metrics?.today_profit || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'
              }`}
            >
              {formatCurrency(metrics?.today_profit || 0)}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* 6. EMPLOYEE WISE EARNING SECTION (Compact Mobile Cards) */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              EMPLOYEE WISE EARNING
            </h3>
          </div>
          <span className="text-[10px] text-gray-400 font-mono">Paid Orders Only</span>
        </div>

        <div className="space-y-2">
          {employeeReports.length === 0 ? (
            <div className="py-6 text-center text-xs text-gray-500 italic">
              No employee orders found for the selected period.
            </div>
          ) : (
            employeeReports.map((emp) => (
              <div
                key={emp.employee_id}
                className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-sm font-black text-white">{emp.employee_name}</h4>
                  <span className="text-xs text-gray-400 font-medium">
                    Orders: <strong className="text-blue-400">{emp.total_orders}</strong>
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-gray-500 block">Earning</span>
                  <span className="text-base font-black text-amber-400 font-mono">
                    {formatCurrency(emp.total_earning)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 8 & 9. EXPENSE MANAGEMENT (Entry Form + History) */}
      <div className="bg-gray-900 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-red-400" />
            <h3 className="text-xs font-black text-white uppercase tracking-wider">
              {editingExpenseId ? 'EDIT EXPENSE' : 'EXPENSE ENTRY'}
            </h3>
          </div>
          {editingExpenseId && (
            <button
              onClick={handleCancelEdit}
              className="text-[10px] font-bold text-gray-400 hover:text-white px-2 py-0.5 rounded bg-gray-950"
            >
              Cancel Edit
            </button>
          )}
        </div>

        {/* EXPENSE ENTRY FORM */}
        <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
              Expense Name / Category *
            </label>
            <input
              type="text"
              value={expenseName}
              onChange={(e) => setExpenseName(e.target.value)}
              placeholder="e.g. Vegetables, Gas, Milk, Packaging"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                Amount (₹) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={expenseAmount}
                onChange={(e) => setExpenseAmount(e.target.value)}
                placeholder="800"
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 font-mono font-bold text-red-400 focus:outline-none focus:border-red-500"
                required
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
                Date *
              </label>
              <button
                type="button"
                onClick={() => setActivePicker('expense')}
                className="w-full bg-gray-950 border border-gray-800 hover:border-red-500/70 rounded-xl px-2.5 py-2.5 font-mono text-white text-left focus:outline-none focus:border-red-500 flex items-center justify-between cursor-pointer active:scale-[0.98] transition"
              >
                <span>{formatDisplayDate(expenseDate)}</span>
                <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={expenseDesc}
              onChange={(e) => setExpenseDesc(e.target.value)}
              placeholder="e.g. Vegetable purchase from mandi"
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingExpense}
            className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 active:scale-[0.98] text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-red-600/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <CreditCard className="w-4 h-4" />
            <span>{isSavingExpense ? 'Saving...' : editingExpenseId ? 'UPDATE EXPENSE' : 'SAVE EXPENSE'}</span>
          </button>
        </form>

        {/* EXPENSE HISTORY LIST */}
        <div className="pt-2 border-t border-gray-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
              EXPENSE HISTORY ({expensesList.length})
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              Total: {formatCurrency(metrics?.today_expenses || 0)}
            </span>
          </div>

          <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
            {expensesList.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 italic">
                No expenses recorded for this date range.
              </div>
            ) : (
              expensesList.map((exp) => (
                <div
                  key={exp.id}
                  className="p-3 rounded-2xl bg-gray-950 border border-gray-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-400 font-mono block">
                      {formatDisplayDate(exp.date)}
                    </span>
                    <h4 className="text-xs font-black text-white truncate">{exp.category}</h4>
                    {exp.description && (
                      <p className="text-[10px] text-gray-400 truncate">{exp.description}</p>
                    )}
                  </div>

                  <div className="text-right flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-black text-red-400 font-mono">
                      ₹{Math.round(exp.amount).toLocaleString('en-IN')}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(exp)}
                      className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-amber-400 hover:bg-gray-800 transition"
                      title="Edit expense"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteExpense(exp)}
                      className="p-1.5 rounded-lg bg-gray-900 text-gray-400 hover:text-red-400 hover:bg-gray-800 transition"
                      title="Delete expense"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Native-style Mobile Date Picker Modal */}
      <MobileDatePickerModal
        isOpen={activePicker !== null}
        title={
          activePicker === 'from'
            ? 'Select From Date'
            : activePicker === 'to'
            ? 'Select To Date'
            : 'Select Date'
        }
        initialDate={
          activePicker === 'from'
            ? fromInput
            : activePicker === 'to'
            ? toInput
            : expenseDate
        }
        onSelectDate={(newDate) => {
          if (activePicker === 'from') {
            handleSelectFromDate(newDate);
          } else if (activePicker === 'to') {
            handleSelectToDate(newDate);
          } else if (activePicker === 'expense') {
            setExpenseDate(newDate);
          }
        }}
        onClose={() => setActivePicker(null)}
      />
    </div>
  );
};
