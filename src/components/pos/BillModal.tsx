import React, { useState, useEffect } from 'react';
import { Order, PaymentMode, RestaurantSettings } from '../../db/types';
import { completeOrderPayment, getRestaurantSettings } from '../../services/dataService';
import { formatDateTime } from '../../db/sqlite';
import confetti from 'canvas-confetti';
import {
  X,
  Printer,
  CheckCircle,
  Banknote,
  Smartphone,
  CreditCard,
  QrCode,
  UtensilsCrossed,
  Receipt,
  Download,
  Share2,
} from 'lucide-react';

interface BillModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess?: (paidOrder: Order) => void;
}

export const BillModal: React.FC<BillModalProps> = ({
  order: initialOrder,
  isOpen,
  onClose,
  onPaymentSuccess,
}) => {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [settings, setSettings] = useState<RestaurantSettings | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('CASH');
  const [discountInput, setDiscountInput] = useState(String(initialOrder.discount || 0));
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(initialOrder.payment_status === 'paid');
  const [showUPIQR, setShowUPIQR] = useState(false);

  useEffect(() => {
    setOrder(initialOrder);
    setIsPaid(initialOrder.payment_status === 'paid');
    setDiscountInput(String(initialOrder.discount || 0));
    getRestaurantSettings().then(setSettings).catch(console.error);
  }, [initialOrder]);

  if (!isOpen) return null;

  const currentDiscount = Math.max(0, parseFloat(discountInput) || 0);
  const calculatedGrandTotal = Math.max(0, order.subtotal - currentDiscount);

  const handleCompletePayment = async () => {
    try {
      setIsProcessing(true);
      const settledOrder = await completeOrderPayment({
        order_id: order.id,
        payment_mode: paymentMode,
        discount: currentDiscount,
      });

      setOrder(settledOrder);
      setIsPaid(true);

      // Trigger celebration confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#10B981', '#EF4444', '#FFFFFF'],
      });

      if (onPaymentSuccess) {
        onPaymentSuccess(settledOrder);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-fadeIn">
      <div className="w-full max-w-md bg-gray-900 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[95vh]">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-gray-950 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-400" />
            <h3 className="font-black text-sm text-white uppercase tracking-wider">
              {isPaid ? 'PAID RECEIPT' : 'BILL & SETTLEMENT'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable POS Thermal Receipt Paper Card */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          <div
            id="printable-receipt"
            className="bg-white text-gray-950 p-5 rounded-2xl shadow-inner font-mono text-xs border border-gray-300 relative"
          >
            {/* Header / Brand */}
            <div className="text-center pb-3 border-b-2 border-dashed border-gray-400">
              <h2 className="text-xl font-black tracking-tight text-gray-950 font-sans">
                {settings?.restaurant_name || 'VEER FAST FOOD'}
              </h2>
              <p className="text-[10px] text-gray-700 font-sans font-medium">
                {settings?.tagline || 'Taste The Real Fast Food Crunch!'}
              </p>
              <p className="text-[10px] text-gray-600 mt-1">{settings?.address}</p>
              <p className="text-[10px] text-gray-600">Ph: {settings?.phone}</p>
              {settings?.gst_number && (
                <p className="text-[9px] text-gray-500 font-bold mt-0.5">GSTIN: {settings.gst_number}</p>
              )}
            </div>

            {/* Bill Meta */}
            <div className="py-2.5 border-b border-dashed border-gray-300 space-y-1 text-[11px]">
              <div className="flex justify-between font-bold">
                <span>INVOICE: #{order.order_number}</span>
                <span className="uppercase text-amber-700 font-black">
                  {order.order_type === 'parcel' ? 'PARCEL' : `TABLE ${order.table_number}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600 text-[10px]">
                <span>Date: {formatDateTime(order.created_at)}</span>
              </div>
              <div className="flex justify-between text-gray-600 text-[10px]">
                <span>Staff: {order.employee_name}</span>
                <span className={`font-bold ${isPaid ? 'text-emerald-700 font-sans' : 'text-red-600 font-sans'}`}>
                  {isPaid ? `PAID (${order.payment_mode || paymentMode})` : 'UNPAID'}
                </span>
              </div>
            </div>

            {/* Items Header */}
            <div className="py-2 border-b border-gray-400 flex font-bold text-[10px] uppercase">
              <span className="flex-1">Item</span>
              <span className="w-10 text-center">Qty</span>
              <span className="w-14 text-right">Price</span>
              <span className="w-14 text-right">Amt</span>
            </div>

            {/* Items Rows */}
            <div className="py-2 border-b border-dashed border-gray-300 space-y-1.5 text-[11px]">
              {order.items?.map((it) => (
                <div key={it.id} className="flex items-center">
                  <span className="flex-1 truncate pr-1 font-medium">{it.item_name}</span>
                  <span className="w-10 text-center text-gray-600">{it.quantity}</span>
                  <span className="w-14 text-right text-gray-600">₹{it.price.toFixed(0)}</span>
                  <span className="w-14 text-right font-bold">₹{it.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* Calculations */}
            <div className="pt-2.5 space-y-1 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Subtotal:</span>
                <span>₹{order.subtotal.toFixed(2)}</span>
              </div>

              {currentDiscount > 0 && (
                <div className="flex justify-between text-red-600">
                  <span>Discount:</span>
                  <span>-₹{currentDiscount.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-base font-black text-gray-950 pt-2 border-t-2 border-dashed border-gray-950">
                <span>GRAND TOTAL:</span>
                <span>₹{calculatedGrandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Thermal Footer */}
            <div className="mt-4 pt-3 border-t border-dashed border-gray-400 text-center text-[10px] text-gray-600 font-sans">
              <p className="font-bold">Thank You! Please Visit Again</p>
              <p className="text-[9px] text-gray-400 mt-0.5">Powered by VEER FAST FOOD Offline POS</p>
            </div>
          </div>

          {/* Payment Mode Selector (when not paid yet) */}
          {!isPaid ? (
            <div className="mt-4 space-y-3">
              {/* Discount Input if enabled */}
              {settings?.enable_discount && (
                <div className="flex items-center justify-between bg-gray-950 p-2.5 rounded-2xl border border-gray-800 text-xs">
                  <span className="text-gray-400 font-bold">Special Discount (₹):</span>
                  <input
                    type="number"
                    min="0"
                    max={order.subtotal}
                    value={discountInput}
                    onChange={(e) => setDiscountInput(e.target.value)}
                    className="w-24 bg-gray-900 border border-gray-700 rounded-xl px-2 py-1 text-right font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}

              {/* Payment Mode Buttons */}
              <div>
                <label className="text-[10px] font-bold text-gray-400 block uppercase tracking-wider mb-1.5">
                  Select Payment Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('CASH');
                      setShowUPIQR(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      paymentMode === 'CASH'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/10'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Banknote className="w-5 h-5" />
                    <span className="text-xs font-black">CASH</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('UPI');
                      setShowUPIQR(true);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      paymentMode === 'UPI'
                        ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-md shadow-blue-500/10'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <Smartphone className="w-5 h-5" />
                    <span className="text-xs font-black">UPI</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentMode('CARD');
                      setShowUPIQR(false);
                    }}
                    className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 transition ${
                      paymentMode === 'CARD'
                        ? 'bg-purple-500/20 border-purple-500 text-purple-400 shadow-md shadow-purple-500/10'
                        : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    <CreditCard className="w-5 h-5" />
                    <span className="text-xs font-black">CARD</span>
                  </button>
                </div>
              </div>

              {/* UPI Offline QR Display mockup */}
              {showUPIQR && (
                <div className="bg-gray-950 border border-blue-500/40 rounded-2xl p-3 text-center animate-fadeIn">
                  <div className="inline-block p-2 bg-white rounded-xl mb-1 shadow">
                    <QrCode className="w-20 h-20 text-gray-950" />
                  </div>
                  <p className="text-xs font-bold text-blue-400">Scan &amp; Pay: ₹{calculatedGrandTotal.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">GPay &bull; PhonePe &bull; Paytm &bull; BHIM</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 p-3 bg-emerald-500/15 border border-emerald-500/40 rounded-2xl text-center">
              <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-black text-sm">
                <CheckCircle className="w-4 h-4" />
                <span>PAYMENT COMPLETED &amp; SAVED</span>
              </div>
              <p className="text-[11px] text-emerald-300/80 mt-0.5">
                Paid via {order.payment_mode || paymentMode} &bull; SQLite Updated
              </p>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 bg-gray-950 border-t border-gray-800 flex gap-2">
          {!isPaid ? (
            <button
              onClick={handleCompletePayment}
              disabled={isProcessing}
              className="w-full py-4 px-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 active:scale-[0.99] text-gray-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-500/25 transition flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="truncate">
                {isProcessing ? 'Saving to SQLite...' : `COMPLETE PAYMENT • ₹${calculatedGrandTotal.toFixed(0)}`}
              </span>
            </button>
          ) : (
            <div className="w-full flex gap-2">
              <button
                onClick={handlePrint}
                className="flex-1 py-3.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>Print Bill</span>
              </button>
              <button
                onClick={onClose}
                className="px-6 py-3.5 rounded-2xl bg-gray-800 hover:bg-gray-700 text-white font-bold text-xs uppercase tracking-wider transition"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
