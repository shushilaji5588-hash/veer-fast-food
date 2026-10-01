import React, { useState, useEffect } from 'react';
import { getAllExpenses, createExpense, deleteExpense } from '../../services/dataService';
import { Expense } from '../../db/types';
import { getTodayDateString } from '../../db/sqlite';
import { useAuth } from '../../context/AuthContext';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  X,
  CheckCircle,
  AlertCircle,
  Search,
  Filter,
  CreditCard,
  Flame,
  Package,
  Zap,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Raw Material',
  'Gas',
  'Electricity',
  'Packaging',
  'Staff Welfare',
  'Maintenance',
  'Other',
];

export const ExpenseManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    category: 'Raw Material',
    amount: '',
    description: '',
    date: getTodayDateString(),
  });

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const data = await getAllExpenses({
        category: selectedCategory,
        search: searchQuery,
      });
      setExpenses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, [selectedCategory, searchQuery]);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFeedback({ type: 'error', message: 'Amount must be greater than zero.' });
      return;
    }

    try {
      await createExpense({
        category: formData.category,
        amount: amt,
        description: formData.description,
        date: formData.date || getTodayDateString(),
        created_by: currentUser?.full_name || 'Admin',
      });
      setFeedback({ type: 'success', message: `Expense of ₹${amt} recorded.` });
      setIsModalOpen(false);
      setFormData({
        category: 'Raw Material',
        amount: '',
        description: '',
        date: getTodayDateString(),
      });
      await loadExpenses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await deleteExpense(id);
      setFeedback({ type: 'success', message: 'Expense record deleted.' });
      await loadExpenses();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const totalExpenseSum = expenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Raw Material':
        return <Package className="w-3.5 h-3.5 text-amber-400" />;
      case 'Gas':
        return <Flame className="w-3.5 h-3.5 text-red-400" />;
      case 'Electricity':
        return <Zap className="w-3.5 h-3.5 text-yellow-400" />;
      case 'Packaging':
        return <Package className="w-3.5 h-3.5 text-blue-400" />;
      default:
        return <CreditCard className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
      {/* Header & Total Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-900/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-red-400" />
            <span>EXPENSE MANAGEMENT</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Record restaurant costs directly affecting net business profit
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <div className="px-4 py-2 bg-gray-950 border border-gray-800 rounded-2xl text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Filtered Total</span>
            <span className="text-base font-black text-red-400 font-mono">
              ₹{totalExpenseSum.toLocaleString('en-IN')}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/25 flex items-center gap-2 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>RECORD EXPENSE</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between animate-fadeIn ${
            feedback.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
              : 'bg-red-950/80 border-red-800 text-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="p-1 hover:opacity-80">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search */}
      <div className="space-y-2.5">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense description or category..."
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                selectedCategory === cat
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-950/60 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4 text-right">Amount (₹)</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                    Loading expenses from SQLite...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                    No expense entries found matching filters.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3.5 px-4 font-mono text-gray-300 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-500" />
                        <span>{exp.date}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-gray-950 border border-gray-800 text-[11px] font-bold text-gray-200">
                        {getCategoryIcon(exp.category)}
                        <span>{exp.category}</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-200 font-medium">
                      {exp.description}
                      <span className="block text-[10px] text-gray-500">By: {exp.created_by}</span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-red-400 font-mono text-sm whitespace-nowrap">
                      ₹{exp.amount.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDelete(exp.id)}
                        className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-gray-800 transition"
                        title="Delete expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800">
              <h3 className="font-black text-lg text-white">Record Business Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                    Amount (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="e.g. 1500"
                    className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3 py-2.5 text-sm font-mono text-red-400 focus:outline-none focus:border-red-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-300 mb-1">
                  Description / Vendor Note
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="e.g. 50kg potatoes, buns and sauces from mandi..."
                  className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-4 py-2 text-xs text-white focus:outline-none focus:border-red-500 resize-none"
                  required
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-800 text-gray-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-red-600/25 transition"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
