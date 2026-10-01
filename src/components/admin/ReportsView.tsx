import React, { useState, useEffect } from 'react';
import {
  getDateWiseReport,
  getEmployeeWiseReport,
  getItemWiseReport,
  getAllExpenses,
  getOrders,
  getAllEmployees,
} from '../../services/dataService';
import { exportToCSV, exportToPDF } from '../../services/exportService';
import { getTodayDateString } from '../../db/sqlite';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Filter,
  DollarSign,
  TrendingUp,
  Package,
  Table as TableIcon,
  Users,
  Utensils,
  RefreshCw,
} from 'lucide-react';

type ReportTab =
  | 'daily_sales'
  | 'item_wise'
  | 'employee_wise'
  | 'expenses'
  | 'orders_archive';

export const ReportsView: React.FC = () => {
  const today = getTodayDateString();
  const [activeTab, setActiveTab] = useState<ReportTab>('daily_sales');

  // Filters
  const [startDate, setStartDate] = useState(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      return d.toISOString().slice(0, 10);
    })()
  );
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);

  // Data states
  const [dateWiseData, setDateWiseData] = useState<any[]>([]);
  const [itemWiseData, setItemWiseData] = useState<any[]>([]);
  const [employeeWiseData, setEmployeeWiseData] = useState<any[]>([]);
  const [expensesData, setExpensesData] = useState<any[]>([]);
  const [ordersData, setOrdersData] = useState<any[]>([]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const [dates, items, emps, exps, ords] = await Promise.all([
        getDateWiseReport(startDate, endDate),
        getItemWiseReport(startDate, endDate),
        getEmployeeWiseReport(startDate, endDate),
        getAllExpenses({ startDate, endDate }),
        getOrders({ startDate, endDate }),
      ]);
      setDateWiseData(dates);
      setItemWiseData(items);
      setEmployeeWiseData(emps);
      setExpensesData(exps);
      setOrdersData(ords);
    } catch (err) {
      console.error('Error fetching reports from SQLite:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate]);

  // Export to CSV handler
  const handleExportCSV = () => {
    const filename = `veer_fast_food_${activeTab}_${startDate}_to_${endDate}`;

    if (activeTab === 'daily_sales') {
      const headers = ['Date', 'Total Orders', 'Total Earning (INR)', 'Total Expenses (INR)', 'Net Profit (INR)'];
      const rows = dateWiseData.map((d) => [d.date, d.total_orders, d.total_earning, d.total_expenses, d.profit]);
      exportToCSV(filename, headers, rows);
    } else if (activeTab === 'item_wise') {
      const headers = ['Item Name', 'Category', 'Quantity Sold', 'Unit Price (INR)', 'Total Sales (INR)'];
      const rows = itemWiseData.map((it) => [it.item_name, it.category, it.quantity_sold, it.unit_price, it.total_sales]);
      exportToCSV(filename, headers, rows);
    } else if (activeTab === 'employee_wise') {
      const headers = ['Sr. No.', 'Employee ID', 'Employee Name', 'Total Orders', 'Total Earning (INR)', 'Cash Sales (INR)', 'Online Sales (INR)'];
      const rows = employeeWiseData.map((e) => [e.sr_no, e.employee_id, e.employee_name, e.total_orders, e.total_earning, e.cash_sales, e.online_sales]);
      exportToCSV(filename, headers, rows);
    } else if (activeTab === 'expenses') {
      const headers = ['Date', 'Category', 'Description', 'Amount (INR)', 'Recorded By'];
      const rows = expensesData.map((e) => [e.date, e.category, e.description, e.amount, e.created_by]);
      exportToCSV(filename, headers, rows);
    } else if (activeTab === 'orders_archive') {
      const headers = ['Order Number', 'Date', 'Type', 'Table', 'Employee', 'Subtotal', 'Discount', 'Grand Total', 'Status', 'Payment Mode'];
      const rows = ordersData.map((o) => [
        o.order_number,
        o.created_at,
        o.order_type,
        o.table_number || '-',
        o.employee_name,
        o.subtotal,
        o.discount,
        o.grand_total,
        o.payment_status,
        o.payment_mode || '-',
      ]);
      exportToCSV(filename, headers, rows);
    }
  };

  // Export to PDF handler
  const handleExportPDF = () => {
    const filename = `veer_report_${activeTab}_${startDate}`;

    if (activeTab === 'daily_sales') {
      const headers = ['Date', 'Orders', 'Earning (Rs)', 'Expenses (Rs)', 'Profit (Rs)'];
      const rows = dateWiseData.map((d) => [
        d.date,
        d.total_orders,
        d.total_earning.toFixed(2),
        d.total_expenses.toFixed(2),
        d.profit.toFixed(2),
      ]);
      const totalEarn = dateWiseData.reduce((s, d) => s + d.total_earning, 0);
      const totalExp = dateWiseData.reduce((s, d) => s + d.total_expenses, 0);
      const totalProfit = totalEarn - totalExp;

      exportToPDF({
        title: 'Daily Sales & Profit Analysis',
        subtitle: `Date Range: ${startDate} to ${endDate}`,
        headers,
        rows,
        summaryNotes: [
          `Cumulative Revenue: Rs ${totalEarn.toFixed(2)}`,
          `Cumulative Expenses: Rs ${totalExp.toFixed(2)}`,
          `Net Business Profit: Rs ${totalProfit.toFixed(2)}`,
        ],
        filename,
      });
    } else if (activeTab === 'item_wise') {
      const headers = ['Dish Name', 'Category', 'Qty Sold', 'Unit Price', 'Total Sales'];
      const rows = itemWiseData.map((it) => [
        it.item_name,
        it.category,
        it.quantity_sold,
        it.unit_price.toFixed(2),
        it.total_sales.toFixed(2),
      ]);
      const totalItemSales = itemWiseData.reduce((s, it) => s + it.total_sales, 0);
      const totalQty = itemWiseData.reduce((s, it) => s + it.quantity_sold, 0);

      exportToPDF({
        title: 'Item-Wise Dish Sales Performance',
        subtitle: `Date Range: ${startDate} to ${endDate}`,
        headers,
        rows,
        summaryNotes: [
          `Total Portions Sold: ${totalQty} items`,
          `Total Dish Sales: Rs ${totalItemSales.toFixed(2)}`,
        ],
        filename,
      });
    } else if (activeTab === 'employee_wise') {
      const headers = ['Staff Name', 'Orders', 'Cash Sales', 'UPI/Card', 'Total Earning'];
      const rows = employeeWiseData.map((e) => [
        e.employee_name,
        e.total_orders,
        e.cash_sales.toFixed(2),
        e.online_sales.toFixed(2),
        e.total_earning.toFixed(2),
      ]);
      const totalStaffSales = employeeWiseData.reduce((s, e) => s + e.total_earning, 0);

      exportToPDF({
        title: 'Employee-Wise Performance Report',
        subtitle: `Date Range: ${startDate} to ${endDate}`,
        headers,
        rows,
        summaryNotes: [`Total Staff Generated Sales: Rs ${totalStaffSales.toFixed(2)}`],
        filename,
      });
    } else {
      const headers = ['Date', 'Category', 'Description', 'Amount'];
      const rows = expensesData.map((e) => [e.date, e.category, e.description, e.amount.toFixed(2)]);
      const totalExp = expensesData.reduce((s, e) => s + e.amount, 0);

      exportToPDF({
        title: 'Business Expense Ledger',
        subtitle: `Date Range: ${startDate} to ${endDate}`,
        headers,
        rows,
        summaryNotes: [`Total Recorded Expenses: Rs ${totalExp.toFixed(2)}`],
        filename,
      });
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 max-w-5xl mx-auto w-full space-y-4">
      {/* Top Banner with Date Selector & Export Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gray-900/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            <span>BUSINESS REPORTS &amp; EXPORT</span>
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            100% offline PDF and CSV exports calculated directly from local SQLite
          </p>
        </div>

        {/* Export Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition shadow flex items-center gap-1.5 active:scale-95"
            title="Download CSV for Excel / Google Sheets"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel / CSV</span>
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
            title="Download formatted PDF Report"
          >
            <FileText className="w-4 h-4" />
            <span>Export PDF</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-900/90 border border-gray-800 rounded-3xl p-3.5 sm:p-4 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-gray-300">Period Filter:</span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <span className="text-gray-500">&rarr;</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-gray-950 border border-gray-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={loadReportData}
            className="p-1.5 rounded-xl bg-gray-800 text-gray-300 hover:text-white"
            title="Reload report"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Report Module Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setActiveTab('daily_sales')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'daily_sales'
              ? 'bg-amber-500 text-gray-950 shadow-md font-black'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Daily Sales &amp; Profit</span>
        </button>

        <button
          onClick={() => setActiveTab('item_wise')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'item_wise'
              ? 'bg-amber-500 text-gray-950 shadow-md font-black'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Utensils className="w-3.5 h-3.5" />
          <span>Item-Wise Sales</span>
        </button>

        <button
          onClick={() => setActiveTab('employee_wise')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'employee_wise'
              ? 'bg-amber-500 text-gray-950 shadow-md font-black'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employee-Wise</span>
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'expenses'
              ? 'bg-amber-500 text-gray-950 shadow-md font-black'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Expense Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('orders_archive')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
            activeTab === 'orders_archive'
              ? 'bg-amber-500 text-gray-950 shadow-md font-black'
              : 'bg-gray-900 border border-gray-800 text-gray-400 hover:text-white'
          }`}
        >
          <Package className="w-3.5 h-3.5" />
          <span>Orders Archive</span>
        </button>
      </div>

      {/* Report Data Table View */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          {activeTab === 'daily_sales' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Total Earning</th>
                  <th className="py-3.5 px-4 text-right">Total Expenses</th>
                  <th className="py-3.5 px-4 text-right">Net Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {dateWiseData.map((d) => (
                  <tr key={d.date} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{d.date}</td>
                    <td className="py-3 px-4 text-center text-blue-400 font-bold">{d.total_orders}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-400">₹{d.total_earning.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right text-red-400 font-bold">₹{d.total_expenses.toFixed(2)}</td>
                    <td
                      className={`py-3 px-4 text-right font-black ${
                        d.profit >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      ₹{d.profit.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'item_wise' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Item Name</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4 text-center">Quantity Sold</th>
                  <th className="py-3.5 px-4 text-right">Unit Price</th>
                  <th className="py-3.5 px-4 text-right">Total Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {itemWiseData.map((it) => (
                  <tr key={it.item_id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-bold text-white">{it.item_name}</td>
                    <td className="py-3 px-4 text-gray-400">{it.category}</td>
                    <td className="py-3 px-4 text-center font-bold text-emerald-400 font-mono">
                      {it.quantity_sold} sold
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-gray-300">₹{it.unit_price.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-400 font-mono text-sm">
                      ₹{it.total_sales.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'employee_wise' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Sr.</th>
                  <th className="py-3.5 px-4">Employee</th>
                  <th className="py-3.5 px-4 text-center">Orders</th>
                  <th className="py-3.5 px-4 text-right">Cash Sales</th>
                  <th className="py-3.5 px-4 text-right">UPI/Card Sales</th>
                  <th className="py-3.5 px-4 text-right">Total Earning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {employeeWiseData.map((e) => (
                  <tr key={e.employee_id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 text-gray-500 font-mono">{e.sr_no}</td>
                    <td className="py-3 px-4 font-bold text-white">
                      {e.employee_name}
                      <span className="block text-[10px] text-gray-500 font-mono">{e.employee_id}</span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-blue-400 font-mono">{e.total_orders}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-300">₹{e.cash_sales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-mono text-gray-300">₹{e.online_sales.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-black text-amber-400 font-mono text-sm">
                      ₹{e.total_earning.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'expenses' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Description</th>
                  <th className="py-3.5 px-4">Recorded By</th>
                  <th className="py-3.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {expensesData.map((e) => (
                  <tr key={e.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 text-gray-400">{e.date}</td>
                    <td className="py-3 px-4 text-amber-400 font-bold font-sans">{e.category}</td>
                    <td className="py-3 px-4 text-gray-200 font-sans">{e.description}</td>
                    <td className="py-3 px-4 text-gray-400 font-sans">{e.created_by}</td>
                    <td className="py-3 px-4 text-right font-black text-red-400">₹{e.amount.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'orders_archive' && (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-950/70 border-b border-gray-800 text-gray-400 font-bold uppercase text-[10px]">
                  <th className="py-3.5 px-4">Order #</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Staff</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 font-mono">
                {ordersData.map((o) => (
                  <tr key={o.id} className="hover:bg-gray-800/40 transition">
                    <td className="py-3 px-4 font-bold text-amber-400">{o.order_number}</td>
                    <td className="py-3 px-4 font-sans uppercase text-[11px] text-gray-300">
                      {o.order_type === 'parcel' ? 'Parcel' : `Table ${o.table_number}`}
                    </td>
                    <td className="py-3 px-4 font-sans text-gray-200">{o.employee_name}</td>
                    <td className="py-3 px-4 text-center font-sans uppercase text-[10px] font-bold text-emerald-400">
                      {o.payment_status}
                    </td>
                    <td className="py-3 px-4 text-right font-black text-white">₹{o.grand_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
