import React, { useState, useEffect } from 'react';
import { getActiveItems, createParcelOrder } from '../../services/dataService';
import { MenuItem, Order } from '../../db/types';
import { useAuth } from '../../context/AuthContext';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Save,
  X,
  CheckCircle,
  AlertCircle,
  ChevronDown,
} from 'lucide-react';

interface CartItem {
  item: MenuItem;
  quantity: number;
}

interface ParcelOrderViewProps {
  onOrderSaved?: (order: Order) => void;
  onOpenBill?: (order: Order) => void;
  onBack?: () => void;
}

export const ParcelOrderView: React.FC<ParcelOrderViewProps> = ({
  onOrderSaved,
  onOpenBill,
  onBack,
}) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  // EXACT FLOW AS SPECIFIED:
  // FOOD [ Select Food ▼ ]
  // QUANTITY [ - ] 1 [ + ]
  // PRICE ₹120 (auto calculated)
  // [ ADD ]
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);

  // Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getActiveItems();
        setItems(data);
        if (data.length > 0) {
          setSelectedItemId(data[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const currentItem = items.find((i) => i.id === selectedItemId);
  const itemUnitPrice = currentItem ? currentItem.price : 0;
  const itemPriceTotal = itemUnitPrice * quantity;

  const handleAdd = () => {
    if (!currentItem) return;
    if (quantity <= 0) return;

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.item.id === currentItem.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx].quantity += quantity;
        return copy;
      } else {
        return [...prev, { item: currentItem, quantity }];
      }
    });

    setQuantity(1);
    setFeedback({ type: 'success', message: `Added ${currentItem.name} (${quantity})` });
    setTimeout(() => setFeedback(null), 2000);
  };

  const updateCartQty = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.item.id === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeCartItem = (itemId: string) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const total = cart.reduce((sum, c) => sum + c.quantity * c.item.price, 0);

  const handleSave = async (openBill: boolean = false) => {
    if (cart.length === 0) {
      setFeedback({ type: 'error', message: 'Please add at least one food item.' });
      return;
    }

    try {
      setIsSaving(true);
      const created = await createParcelOrder({
        employee_id: currentUser?.id || 'STAFF',
        employee_name: currentUser?.full_name || 'Staff',
        items: cart.map((c) => ({
          item_id: c.item.id,
          item_name: c.item.name,
          price: c.item.price,
          quantity: c.quantity,
        })),
      });

      setCart([]);
      setFeedback({ type: 'success', message: `Parcel Order #${created.order_number} saved!` });

      if (openBill && onOpenBill) {
        onOpenBill(created);
      } else if (onOrderSaved) {
        onOrderSaved(created);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setFeedback({ type: 'error', message: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 w-full max-w-md mx-auto px-4 py-4 space-y-3.5 flex flex-col justify-between">
      <div className="space-y-3.5">
        {/* Header */}
        <div className="text-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center justify-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span>PARCEL ORDER</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Quick takeaway food billing</p>
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

        {/* FOOD SELECTION PANEL (NO CATEGORIES) */}
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
                {items.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.name} &bull; ₹{it.price.toFixed(0)}
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
                  ₹{itemPriceTotal.toFixed(0)}
                </span>
              </div>
            </div>
          </div>

          {/* [ ADD ] BUTTON */}
          <button
            type="button"
            onClick={handleAdd}
            className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition active:scale-95 shadow flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>ADD</span>
          </button>
        </div>

        {/* MULTIPLE FOOD ITEMS LIST */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-3.5 space-y-2 shadow-md">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block pb-1 border-b border-gray-800">
            Parcel Items ({cart.length})
          </span>

          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
            {cart.length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 italic">
                Cart is empty. Select food above and click ADD.
              </div>
            ) : (
              cart.map((c) => (
                <div
                  key={c.item.id}
                  className="flex items-center justify-between p-2 rounded-xl bg-gray-950 border border-gray-850"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-bold text-white block truncate">{c.item.name}</span>
                    <span className="text-[10px] text-gray-400 font-mono">
                      ₹{c.item.price.toFixed(0)} &times; {c.quantity} = ₹{(c.item.price * c.quantity).toFixed(0)}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateCartQty(c.item.id, -1)}
                      className="w-6 h-6 rounded bg-gray-900 text-gray-300 flex items-center justify-center"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-bold text-xs text-white font-mono">
                      {c.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(c.item.id, 1)}
                      className="w-6 h-6 rounded bg-gray-900 text-gray-300 flex items-center justify-center"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => removeCartItem(c.item.id)}
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
          disabled={cart.length === 0 || isSaving}
          className="py-4 px-3 rounded-2xl bg-gray-800 hover:bg-gray-700 active:scale-95 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow"
        >
          <Save className="w-4 h-4 text-emerald-400" />
          <span>SAVE ORDER</span>
        </button>

        <button
          type="button"
          onClick={() => handleSave(true)}
          disabled={cart.length === 0 || isSaving}
          className="py-4 px-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-gray-950 font-black text-xs sm:text-sm uppercase tracking-wider transition disabled:opacity-40 flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
        >
          <Receipt className="w-4 h-4" />
          <span>GENERATE BILL</span>
        </button>
      </div>
    </div>
  );
};
