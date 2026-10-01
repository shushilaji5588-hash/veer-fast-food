import React, { useState, useEffect } from 'react';
import {
  getAllTables,
  getActiveItems,
  getActiveOrderForTable,
  saveTableOrder,
} from '../../services/dataService';
import { RestaurantTable, MenuItem, Order } from '../../db/types';
import { useAuth } from '../../context/AuthContext';
import {
  Table as TableIcon,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Save,
  ArrowLeft,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface StagedItem {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
}

interface TableOrderViewProps {
  initialTable?: RestaurantTable | null;
  onOpenBill?: (order: Order) => void;
  onBackToTables?: () => void;
}

export const TableOrderView: React.FC<TableOrderViewProps> = ({
  initialTable,
  onOpenBill,
  onBackToTables,
}) => {
  const { currentUser } = useAuth();
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(initialTable || null);
  const [allItems, setAllItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Active running order on selected table
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [orderItemsList, setOrderItemsList] = useState<StagedItem[]>([]);

  // ONE SIMPLE FOOD DROPDOWN STATE (NO CATEGORIES)
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tList, iList] = await Promise.all([getAllTables(), getActiveItems()]);
      setTables(tList);
      setAllItems(iList);

      if (iList.length > 0) {
        setSelectedItemId(iList[0].id);
      }

      if (initialTable) {
        await pickTable(initialTable);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pickTable = async (table: RestaurantTable) => {
    setSelectedTable(table);
    setFeedback(null);
    setQuantity(1);

    try {
      // Check for running order
      const existing = await getActiveOrderForTable(table.id);
      if (existing && existing.items) {
        setActiveOrder(existing);
        setOrderItemsList(
          existing.items.map((it) => ({
            item_id: it.item_id,
            item_name: it.item_name,
            price: it.price,
            quantity: it.quantity,
          }))
        );
      } else {
        setActiveOrder(null);
        setOrderItemsList([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Selected food item object from simple common list
  const currentItem = allItems.find((it) => it.id === selectedItemId);
  const itemUnitPrice = currentItem ? currentItem.price : 0;
  const itemSubtotal = itemUnitPrice * quantity;

  // Add Item to table order
  const handleAddItem = () => {
    if (!currentItem) return;
    if (quantity <= 0) return;

    setOrderItemsList((prev) => {
      const idx = prev.findIndex((i) => i.item_id === currentItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      } else {
        return [
          ...prev,
          {
            item_id: currentItem.id,
            item_name: currentItem.name,
            price: currentItem.price,
            quantity: quantity,
          },
        ];
      }
    });

    setQuantity(1);
    setFeedback({ type: 'success', message: `Added ${currentItem.name} (${quantity})` });
    setTimeout(() => setFeedback(null), 2000);
  };

  const updateItemQuantity = (itemId: string, delta: number) => {
    setOrderItemsList((prev) =>
      prev
        .map((it) => {
          if (it.item_id === itemId) {
            const newQty = it.quantity + delta;
            return newQty > 0 ? { ...it, quantity: newQty } : null;
          }
          return it;
        })
        .filter(Boolean) as StagedItem[]
    );
  };

  const removeItem = (itemId: string) => {
    setOrderItemsList((prev) => prev.filter((it) => it.item_id !== itemId));
  };

  const total = orderItemsList.reduce((sum, it) => sum + it.quantity * it.price, 0);

  const handleSave = async (openBill: boolean = false) => {
    if (!selectedTable) return;
    if (orderItemsList.length === 0) {
      setFeedback({ type: 'error', message: 'Add at least one food item.' });
      return;
    }

    try {
      setIsSaving(true);
      const saved = await saveTableOrder({
        table_id: selectedTable.id,
        table_number: selectedTable.table_number,
        employee_id: currentUser?.id || 'STAFF',
        employee_name: currentUser?.full_name || 'Staff',
        items: orderItemsList,
      });

      setActiveOrder(saved);
      const updatedTables = await getAllTables();
      setTables(updatedTables);

      setFeedback({ type: 'success', message: `Table ${selectedTable.table_number} order saved.` });

      if (openBill && onOpenBill) {
        onOpenBill(saved);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // VIEW 1: SELECT TABLE (Simple Touch Grid)
  // ==========================================
  if (!selectedTable) {
    return (
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-4">
        <div className="text-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">SELECT TABLE</h2>
          <p className="text-xs text-gray-400 mt-0.5">Tap a table to take or update order</p>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          {tables.map((t) => {
            const isOccupied = t.status === 'occupied';

            return (
              <button
                key={t.id}
                onClick={() => pickTable(t)}
                className={`min-h-[88px] p-4 rounded-2xl border text-center flex flex-col items-center justify-center transition active:scale-[0.98] shadow-lg ${
                  isOccupied
                    ? 'bg-red-950/40 border-red-500/70 text-red-100 shadow-red-950/20'
                    : 'bg-gray-900 border-gray-800 hover:border-emerald-500/60 text-white'
                }`}
              >
                <span className="text-lg font-black tracking-wide">TABLE {t.table_number}</span>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider mt-1 px-2 py-0.5 rounded-full ${
                    isOccupied
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {isOccupied ? 'Occupied' : 'Available'}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: TABLE ORDER & RUNNING ORDER SCREEN
  // ==========================================
  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-3.5 flex flex-col justify-between">
      <div className="space-y-3.5">
        {/* Table Header Bar */}
        <div className="flex items-center justify-between bg-gray-900 p-3 rounded-2xl border border-gray-800">
          <button
            onClick={() => {
              setSelectedTable(null);
              if (onBackToTables) onBackToTables();
            }}
            className="p-1.5 rounded-xl bg-gray-950 text-amber-400 hover:text-white"
            title="Change Table"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center">
            <h2 className="text-lg font-black text-white">TABLE {selectedTable.table_number}</h2>
            <span className="text-[10px] font-bold uppercase text-amber-400">
              {activeOrder ? 'Running Order' : 'New Order'}
            </span>
          </div>

          <button
            onClick={() => setSelectedTable(null)}
            className="text-[11px] font-bold text-gray-400 hover:text-white px-2 py-1 rounded-lg bg-gray-950"
          >
            Tables
          </button>
        </div>

        {feedback && (
          <div
            className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-800 text-emerald-200'
                : 'bg-red-950/80 border-red-800 text-red-200'
            }`}
          >
            <span>{feedback.message}</span>
            <button onClick={() => setFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 10. FOOD DROPDOWN SECTION (NO CATEGORIES) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 shadow-md">
          {/* FOOD DROPDOWN */}
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
              FOOD
            </label>
            <div className="relative">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-3.5 py-3 text-sm font-bold text-white appearance-none focus:outline-none focus:border-amber-500 pr-9"
              >
                {allItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} &bull; ₹{item.price.toFixed(0)}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* QUANTITY & PRICE */}
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* QUANTITY [ - ] 1 [ + ] */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                QUANTITY
              </label>
              <div className="flex items-center bg-gray-950 border border-gray-800 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold active:scale-95"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="flex-1 text-center font-bold font-mono text-sm text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* PRICE AUTO CALCULATED */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                PRICE
              </label>
              <div className="bg-gray-950 border border-gray-800 rounded-xl px-3 py-2.5 text-right">
                <span className="text-base font-black font-mono text-amber-400">
                  ₹{itemSubtotal.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* [ ADD ] BUTTON */}
          <button
            type="button"
            onClick={handleAddItem}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ADD</span>
          </button>
        </div>

        {/* 11. MULTIPLE FOOD ITEMS LIST */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 space-y-2 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block pb-1 border-b border-gray-800">
            Current Order ({orderItemsList.length} items)
          </span>

          <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
            {orderItemsList.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 italic">
                No items added yet. Select food above and click ADD.
              </div>
            ) : (
              orderItemsList.map((it) => (
                <div
                  key={it.item_id}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-950 border border-gray-850"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">{it.item_name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ₹{it.price.toFixed(0)} &times; {it.quantity} = ₹{(it.price * it.quantity).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateItemQuantity(it.item_id, -1)}
                      className="w-6 h-6 rounded bg-gray-900 text-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-white font-mono">
                      {it.quantity}
                    </span>
                    <button
                      onClick={() => updateItemQuantity(it.item_id, 1)}
                      className="w-6 h-6 rounded bg-gray-900 text-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeItem(it.item_id)}
                      className="p-1 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* TOTAL */}
          <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-base font-black">
            <span className="text-gray-300 uppercase text-xs">TOTAL:</span>
            <span className="text-amber-400 font-mono text-xl">₹{total.toFixed(0)}</span>
          </div>
        </div>
      </div>

      {/* BOTTOM ACTION BUTTONS: [ SAVE ORDER ] [ GENERATE BILL ] */}
      <div className="grid grid-cols-2 gap-2.5 pt-2">
        <button
          type="button"
          onClick={() => handleSave(false)}
          disabled={orderItemsList.length === 0 || isSaving}
          className="py-4 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span>SAVE ORDER</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={orderItemsList.length === 0 || isSaving}
          className="py-4 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-gray-950 font-black text-xs sm:text-sm uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
        >
          <Receipt className="w-4 h-4" />
          <span>GENERATE BILL</span>
        </button>
      </div>
    </div>
  );
};
