import React, { useState, useEffect } from 'react';
import {
  getAllItems,
  createItem,
  updateItem,
  deleteItem,
} from '../../services/dataService';
import { MenuItem } from '../../db/types';
import { Plus, Edit2, Trash2, X, Check, Search } from 'lucide-react';

export const ItemManagement: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);

  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState('');

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getAllItems();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    const priceNum = parseFloat(formPrice);
    if (!formName.trim() || isNaN(priceNum) || priceNum < 0) return;

    try {
      await createItem({
        name: formName.trim(),
        category: 'Food',
        price: priceNum,
      });
      setFeedback({ type: 'success', message: `Added "${formName}".` });
      setIsAddOpen(false);
      setFormName('');
      setFormPrice('');
      await loadItems();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    setFeedback(null);
    const priceNum = parseFloat(formPrice);
    if (!formName.trim() || isNaN(priceNum) || priceNum < 0) return;

    try {
      await updateItem(editingItem.id, {
        name: formName.trim(),
        category: editingItem.category || 'Food',
        price: priceNum,
        status: editingItem.status,
      });
      setFeedback({ type: 'success', message: 'Item updated.' });
      setEditingItem(null);
      await loadItems();
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    }
  };

  const handleDelete = async (item: MenuItem) => {
    if (!window.confirm(`Remove "${item.name}" from menu?`)) return;
    try {
      await deleteItem(item.id);
      setFeedback({ type: 'success', message: `Item removed.` });
      await loadItems();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
        await loadItems();
      }
    }
  };

  const filteredItems = items.filter((it) =>
    it.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
      {/* Title & Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight">ADD &amp; REMOVE ITEM</h2>
          <p className="text-xs text-gray-400 mt-0.5">Food menu items &amp; prices</p>
        </div>

        <button
          onClick={() => {
            setFormName('');
            setFormPrice('');
            setIsAddOpen(true);
          }}
          className="py-2.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 transition active:scale-95 shadow"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>ADD</span>
        </button>
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

      {/* Quick Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search food item..."
          className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* ONE COMMON SIMPLE LIST (NO CATEGORIES) */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-8 text-center text-xs text-gray-500">Loading menu...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-500">No food items found.</div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-between gap-3 shadow-md"
            >
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-black text-white truncate">{item.name}</h3>
                <span className="text-base font-black text-amber-400 font-mono">
                  ₹{item.price.toFixed(0)}
                </span>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingItem(item);
                    setFormName(item.name);
                    setFormPrice(String(item.price));
                  }}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-amber-500 hover:text-gray-950 text-gray-300"
                  title="Edit item & price"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item)}
                  className="p-2 rounded-xl bg-gray-800 hover:bg-red-600 hover:text-white text-gray-400"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Item Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 text-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-sm text-white">Add Food Item</h3>
              <button onClick={() => setIsAddOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleAdd} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Burger"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  placeholder="120"
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  required
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black uppercase"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 border border-gray-800 p-5 text-gray-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <h3 className="font-bold text-sm text-white">Edit Food Item</h3>
              <button onClick={() => setEditingItem(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleUpdate} className="mt-3 space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Item Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-amber-400 font-mono font-bold"
                  required
                />
              </div>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black uppercase"
                >
                  Update Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
