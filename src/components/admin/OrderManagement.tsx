import React, { useState, useEffect } from 'react';
import { getOrders, getAllEmployees, getOrderById } from '../../services/dataService';
import { Order, User } from '../../db/types';
import { getTodayDateString, formatDateTime } from '../../db/sqlite';
import {
  ClipboardList,
  Search,
  Calendar,
  Filter,
  Package,
  Table as TableIcon,
  CheckCircle2,
  Clock,
  XCircle,
  Eye,
  Receipt,
  X,
  CreditCard,
  Banknote,
  Smartphone,
} from 'lucide-react';

interface OrderManagementProps {
  onOpenBillModal?: (order: Order) => void;
}

export const OrderManagement: React.FC<OrderManagementProps> = ({ onOpenBillModal }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const today = getTodayDateString();
  const [dateFilter, setDateFilter] = useState<'today' | 'yesterday' | 'all'>('today');
  const [selectedEmployee, setSelectedEmployee] = useState('All');
  const [selectedType, setSelectedType] = useState<'all' | 'parcel' | 'table'>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'paid' | 'pending' | 'cancelled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for detail modal
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList] = await Promise.all([getAllEmployees()]);
      setEmployees(empList);

      let startDate: string | undefined = undefined;
      let endDate: string | undefined = undefined;

      if (dateFilter === 'today') {
        startDate = today;
        endDate = today;
      } else if (dateFilter === 'yesterday') {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yest = d.toISOString().slice(0, 10);
        startDate = yest;
        endDate = yest;
      }

      const data = await getOrders({
        startDate,
        endDate,
        employeeId: selectedEmployee !== 'All' ? selectedEmployee : undefined,
        orderType: selectedType !== 'all' ? selectedType : undefined,
        paymentStatus: selectedStatus !== 'all' ? selectedStatus : undefined,
        search: searchQuery,
      });

      setOrders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateFilter, selectedEmployee, selectedType, selectedStatus, searchQuery]);

  const handleOpenDetail = async (o: Order) => {
    const fullOrder = await getOrderById(o.id);
    setDetailOrder(fullOrder || o);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return (
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] font-black uppercase flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            PAID
          </span>
        );
      case 'pending':
        return (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3" />
            PENDING
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/40 text-[10px] font-black uppercase flex items-center gap-1">
            <XCircle className="w-3 h-3" />
            CANCELLED
          </span>
        );
      default:
        return null;
    }
  };

  const getModeIcon = (mode?: string | null) => {
    switch (mode) {
      case 'CASH':
        return <Banknote className="w-3 h-3 text-emerald-400" />;
      case 'UPI':
        return <Smartphone className="w-3 h-3 text-blue-400" />;
      case 'CARD':
        return <CreditCard className="w-3 h-3 text-purple-400" />;
      default:
        return null;
    }
  };

  const totalFilteredSales = orders
    .filter((o) => o.payment_status === 'paid')
    .reduce((sum, o) => sum + o.grand_total, 0);

  return (
    <div className="flex-1 p-3.5 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-900/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-purple-400" />
            <span>ORDER MANAGEMENT</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Complete archive of takeaway and dining orders stored in local SQLite
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="px-4 py-2 bg-gray-950 border border-gray-800 rounded-2xl text-right">
            <span className="text-[10px] font-bold text-gray-400 uppercase block">Total Settled Sales</span>
            <span className="text-base font-black text-amber-400 font-mono">
              ₹{totalFilteredSales.toLocaleString('en-IN')}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-4 shadow-md space-y-3">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order ID (e.g. VFF-1001) or staff name..."
            className="w-full bg-gray-950 border border-gray-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Filter Pills row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {/* Date Selector */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Date Filter</label>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'today' | 'yesterday' | 'all')}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="all">All Dates</option>
            </select>
          </div>

          {/* Employee Filter */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Employee</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="All">All Staff</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name}
                </option>
              ))}
            </select>
          </div>

          {/* Order Type */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Order Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'parcel' | 'table')}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Types</option>
              <option value="parcel">Parcel (Takeaway)</option>
              <option value="table">Table (Dine-In)</option>
            </select>
          </div>

          {/* Payment Status */}
          <div>
            <label className="text-[10px] font-bold text-gray-400 block mb-1 uppercase">Payment Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'all' | 'paid' | 'pending' | 'cancelled')}
              className="w-full bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-amber-500"
            >
              <option value="all">All Statuses</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                <th className="py-3.5 px-4">Order ID</th>
                <th className="py-3.5 px-3">Date / Time</th>
                <th className="py-3.5 px-3">Type</th>
                <th className="py-3.5 px-3">Staff</th>
                <th className="py-3.5 px-3">Table</th>
                <th className="py-3.5 px-3 text-right">Total (₹)</th>
                <th className="py-3.5 px-3 text-center">Status</th>
                <th className="py-3.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                    Loading orders from SQLite...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-gray-500 italic">
                    No orders match the selected filters.
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {o.order_number}
                    </td>
                    <td className="py-3.5 px-3 text-gray-300 text-[11px] whitespace-nowrap">
                      {formatDateTime(o.created_at)}
                    </td>
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {o.order_type === 'parcel' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                          <Package className="w-3 h-3" />
                          Parcel
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <TableIcon className="w-3 h-3" />
                          Table
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 font-semibold text-gray-200 whitespace-nowrap">
                      {o.employee_name}
                    </td>
                    <td className="py-3.5 px-3 text-gray-400 font-bold whitespace-nowrap">
                      {o.table_number ? `Table ${o.table_number}` : '-'}
                    </td>
                    <td className="py-3.5 px-3 text-right font-black text-white font-mono text-sm whitespace-nowrap">
                      ₹{o.grand_total.toFixed(2)}
                      {o.payment_mode && (
                        <span className="block text-[9px] text-gray-400 uppercase font-sans flex items-center justify-end gap-1 mt-0.5">
                          {getModeIcon(o.payment_mode)}
                          {o.payment_mode}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getStatusBadge(o.payment_status)}
                    </td>
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDetail(o)}
                        className="px-2.5 py-1 rounded-xl bg-gray-800 hover:bg-amber-500 hover:text-gray-950 text-gray-300 text-xs font-bold transition flex items-center gap-1 mx-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {detailOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl bg-gray-900 border border-gray-800 p-6 shadow-2xl text-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-800">
              <div>
                <span className="font-mono text-amber-400 font-black text-base">{detailOrder.order_number}</span>
                <p className="text-[11px] text-gray-400">
                  {detailOrder.order_type === 'parcel' ? 'Takeaway Parcel Order' : `Dine-In Table ${detailOrder.table_number}`}
                </p>
              </div>
              <button
                onClick={() => setDetailOrder(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-3 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-gray-950 p-3 rounded-2xl border border-gray-800 text-[11px]">
                <div>
                  <span className="text-gray-500 block">Staff / Server:</span>
                  <strong className="text-gray-200">{detailOrder.employee_name}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block">Created At:</span>
                  <span className="text-gray-300 font-mono">{formatDateTime(detailOrder.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-500 block">Payment Status:</span>
                  <div className="mt-0.5">{getStatusBadge(detailOrder.payment_status)}</div>
                </div>
                <div>
                  <span className="text-gray-500 block">Mode:</span>
                  <strong className="text-amber-400">{detailOrder.payment_mode || 'Unsettled'}</strong>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                  Ordered Items:
                </span>
                <div className="bg-gray-950 rounded-2xl p-3 border border-gray-800 space-y-2 max-h-44 overflow-y-auto">
                  {detailOrder.items?.map((it) => (
                    <div key={it.id} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-200">{it.item_name}</span>
                        <span className="text-gray-500 block text-[10px]">
                          ₹{it.price.toFixed(2)} &times; {it.quantity}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-gray-100">₹{it.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-950/80 p-3 rounded-2xl border border-gray-800/80 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-gray-400">
                  <span>Subtotal:</span>
                  <span>₹{detailOrder.subtotal.toFixed(2)}</span>
                </div>
                {detailOrder.discount > 0 && (
                  <div className="flex justify-between text-red-400">
                    <span>Discount:</span>
                    <span>-₹{detailOrder.discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-amber-400 pt-1 border-t border-gray-800">
                  <span>Grand Total:</span>
                  <span>₹{detailOrder.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDetailOrder(null)}
                className="flex-1 py-3 rounded-2xl bg-gray-800 text-gray-300 font-bold text-xs"
              >
                Close
              </button>
              {onOpenBillModal && (
                <button
                  type="button"
                  onClick={() => {
                    const ord = detailOrder;
                    setDetailOrder(null);
                    onOpenBillModal(ord);
                  }}
                  className="flex-1 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-1.5"
                >
                  <Receipt className="w-4 h-4" />
                  <span>Open Full Bill</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
