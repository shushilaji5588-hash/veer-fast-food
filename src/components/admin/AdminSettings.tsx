import React, { useState, useEffect } from 'react';
import {
  getRestaurantSettings,
  updateRestaurantSettings,
} from '../../services/dataService';
import {
  exportSqliteDatabaseFile,
  importSqliteDatabaseFile,
} from '../../services/exportService';
import { resetDatabase, clearAllOrdersAndExpenses, executeQuery } from '../../db/sqlite';
import { RestaurantSettings } from '../../db/types';
import {
  Settings,
  Download,
  Upload,
  RotateCcw,
  Trash2,
  Save,
  CheckCircle,
  AlertCircle,
  Database,
  Store,
  Terminal,
  Play,
  X,
} from 'lucide-react';

export const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<RestaurantSettings>({
    restaurant_name: 'VEER FAST FOOD',
    tagline: 'Taste The Real Fast Food Crunch!',
    address: 'Shop #12, Market Complex, City Road',
    phone: '+91 98765 43210',
    gst_number: 'GSTIN24AAACB1234Z',
    currency_symbol: '₹',
    enable_discount: true,
    default_discount_pct: 0,
    printer_width: '80mm',
  });

  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // SQL Runner state for testing / live SQLite verification
  const [sqlQuery, setSqlQuery] = useState('SELECT * FROM orders LIMIT 5;');
  const [sqlResults, setSqlResults] = useState<any[] | null>(null);
  const [sqlError, setSqlError] = useState<string | null>(null);

  useEffect(() => {
    getRestaurantSettings()
      .then((s) => {
        setSettings(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await updateRestaurantSettings(settings);
      setFeedback({ type: 'success', message: 'Restaurant settings saved to SQLite!' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleExportBackup = async () => {
    try {
      await exportSqliteDatabaseFile();
      setFeedback({ type: 'success', message: 'SQLite database backup (.sqlite) downloaded successfully!' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('WARNING: Importing a backup file will replace the current SQLite database. Do you wish to continue?')) {
      e.target.value = '';
      return;
    }

    try {
      await importSqliteDatabaseFile(file);
      setFeedback({ type: 'success', message: 'SQLite database restored successfully! Reloading data...' });
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: `Import failed: ${err.message}` });
      }
    }
  };

  const handleResetToDemo = async () => {
    if (
      !window.confirm(
        'Are you sure you want to reset all data back to initial DEMO state? All newly created orders will be replaced with demo records.'
      )
    ) {
      return;
    }

    try {
      await resetDatabase();
      setFeedback({ type: 'success', message: 'Database reset to default demo records!' });
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleClearOrdersOnly = async () => {
    if (
      !window.confirm(
        'Clear all transactions? This deletes all orders and expenses for a fresh production opening, while keeping your menu items, tables, and staff intact.'
      )
    ) {
      return;
    }

    try {
      await clearAllOrdersAndExpenses();
      setFeedback({ type: 'success', message: 'All orders, expenses, and table occupancies cleared.' });
    } catch (err: unknown) {
      if (err instanceof Error) {
        setFeedback({ type: 'error', message: err.message });
      }
    }
  };

  const handleExecuteSql = async () => {
    setSqlError(null);
    setSqlResults(null);
    try {
      const res = await executeQuery(sqlQuery);
      setSqlResults(res);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setSqlError(err.message);
      }
    }
  };

  return (
    <div className="flex-1 p-3.5 sm:p-6 max-w-4xl mx-auto w-full space-y-5">
      {/* Header Banner */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-4 sm:p-5 shadow-lg">
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
          <Settings className="w-6 h-6 text-gray-300" />
          <span>SETTINGS &amp; OFFLINE DATABASE</span>
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">
          Restaurant profile, bill customizer, SQLite backups, and data management
        </p>
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

      {/* SECTION 1: RESTAURANT PROFILE & BILL CUSTOMIZER */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
          <Store className="w-5 h-5 text-amber-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Restaurant Profile &amp; Receipt Header
          </h3>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Restaurant Name
              </label>
              <input
                type="text"
                value={settings.restaurant_name}
                onChange={(e) => setSettings({ ...settings, restaurant_name: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3.5 py-2.5 text-white font-bold focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Tagline / Slogan
              </label>
              <input
                type="text"
                value={settings.tagline}
                onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                Phone Number
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
                GST Number (Optional)
              </label>
              <input
                type="text"
                value={settings.gst_number}
                onChange={(e) => setSettings({ ...settings, gst_number: e.target.value })}
                className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3.5 py-2.5 text-white font-mono uppercase focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-gray-400 mb-1">
              Store Address
            </label>
            <input
              type="text"
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              className="w-full bg-gray-950 border border-gray-800 rounded-2xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center justify-between p-3 bg-gray-950 rounded-2xl border border-gray-800">
              <div>
                <span className="font-bold text-gray-200 block text-xs">Enable Bill Discounts</span>
                <span className="text-[10px] text-gray-500">Allow staff to apply discounts during payment</span>
              </div>
              <input
                type="checkbox"
                checked={settings.enable_discount}
                onChange={(e) => setSettings({ ...settings, enable_discount: e.target.checked })}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-950 rounded-2xl border border-gray-800">
              <div>
                <span className="font-bold text-gray-200 block text-xs">Receipt Printer Width</span>
                <span className="text-[10px] text-gray-500">Thermal POS roll format</span>
              </div>
              <select
                value={settings.printer_width}
                onChange={(e) => setSettings({ ...settings, printer_width: e.target.value })}
                className="bg-gray-900 border border-gray-700 text-white rounded-xl px-2 py-1 text-xs"
              >
                <option value="80mm">80mm Standard</option>
                <option value="58mm">58mm Compact</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black uppercase tracking-wider text-xs shadow-lg shadow-amber-500/20 transition flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>SAVE RESTAURANT PROFILE</span>
          </button>
        </form>
      </div>

      {/* SECTION 2: SQLITE BACKUP & RESTORE */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-gray-800">
          <Database className="w-5 h-5 text-emerald-400" />
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Offline SQLite Backup &amp; Restore
            </h3>
            <p className="text-[11px] text-gray-400">
              All tables, records, dishes, and staff data are stored in pure local SQLite
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* BACKUP DATA */}
          <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>BACKUP DATA (.sqlite)</span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Export the entire SQLite database binary file to your phone/computer storage.
            </p>
            <button
              onClick={handleExportBackup}
              className="mt-2 w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider transition shadow"
            >
              DOWNLOAD SQLITE BACKUP
            </button>
          </div>

          {/* RESTORE DATA */}
          <div className="p-4 rounded-2xl bg-gray-950 border border-gray-800 space-y-2">
            <h4 className="text-xs font-bold text-white uppercase flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-blue-400" />
              <span>RESTORE DATA (.sqlite)</span>
            </h4>
            <p className="text-[11px] text-gray-400">
              Load an existing SQLite database file to restore all past data.
            </p>
            <label className="mt-2 block w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase tracking-wider text-center cursor-pointer transition shadow">
              <span>SELECT BACKUP FILE</span>
              <input
                type="file"
                accept=".sqlite,.db"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* SECTION 3: DEMO DATA RESET & CLEAR TRANSACTIONS */}
        <div className="pt-3 border-t border-gray-800/80 space-y-3">
          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Data Maintenance &amp; Factory Reset
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={handleResetToDemo}
              className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 hover:border-amber-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 mb-1">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-black text-white group-hover:text-amber-300">
                  RESET TO DEMO DATA
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                Restores original sample dishes, employees (Rajesh, Suresh, Pooja, Amit), and test orders.
              </p>
            </button>

            <button
              onClick={handleClearOrdersOnly}
              className="p-3.5 rounded-2xl bg-gray-950 border border-gray-800 hover:border-red-500/50 text-left transition group"
            >
              <div className="flex items-center gap-2 mb-1">
                <Trash2 className="w-4 h-4 text-red-400" />
                <span className="text-xs font-black text-white group-hover:text-red-300">
                  CLEAR ALL ORDERS &amp; EXPENSES
                </span>
              </div>
              <p className="text-[10px] text-gray-500">
                Wipes all historical orders &amp; expenses for live grand opening. Menu items and staff stay intact.
              </p>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: LIVE SQLITE QUERY RUNNER & TABLE VIEWER */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-5 shadow-lg space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-gray-800">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-purple-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              SQLite Query Inspector
            </h3>
          </div>
          <span className="text-[10px] font-mono text-purple-400">Wasm SQLite Engine</span>
        </div>

        <p className="text-[11px] text-gray-400">
          Run read queries directly against SQLite tables: <code className="text-amber-400">orders</code>,{' '}
          <code className="text-amber-400">order_items</code>, <code className="text-amber-400">items</code>,{' '}
          <code className="text-amber-400">users</code>, <code className="text-amber-400">restaurant_tables</code>,{' '}
          <code className="text-amber-400">expenses</code>.
        </p>

        <div className="space-y-2">
          <div className="flex gap-2">
            <input
              type="text"
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="flex-1 bg-gray-950 border border-gray-800 rounded-xl px-3 py-2 text-xs font-mono text-gray-200 focus:outline-none focus:border-purple-500"
            />
            <button
              onClick={handleExecuteSql}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-xs text-white flex items-center gap-1"
            >
              <Play className="w-3.5 h-3.5" />
              <span>RUN</span>
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5 text-[10px] text-gray-400">
            <span>Presets:</span>
            <button
              onClick={() => setSqlQuery('SELECT id, order_number, employee_name, grand_total, payment_status FROM orders LIMIT 5;')}
              className="text-amber-400 hover:underline"
            >
              Orders
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setSqlQuery('SELECT id, name, category, price FROM items LIMIT 6;')}
              className="text-amber-400 hover:underline"
            >
              Items
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setSqlQuery('SELECT id, username, full_name, role, status FROM users;')}
              className="text-amber-400 hover:underline"
            >
              Users
            </button>
            <span>&bull;</span>
            <button
              onClick={() => setSqlQuery('SELECT table_number, status, active_order_id FROM restaurant_tables;')}
              className="text-amber-400 hover:underline"
            >
              Tables
            </button>
          </div>
        </div>

        {sqlError && (
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-800 text-red-300 text-xs font-mono">
            {sqlError}
          </div>
        )}

        {sqlResults && (
          <div className="overflow-x-auto bg-gray-950 rounded-2xl border border-gray-800 p-3 max-h-56">
            {sqlResults.length === 0 ? (
              <span className="text-gray-500 text-xs italic">No rows returned.</span>
            ) : (
              <table className="w-full text-left text-[11px] font-mono">
                <thead>
                  <tr className="border-b border-gray-800 text-gray-400">
                    {Object.keys(sqlResults[0]).map((col) => (
                      <th key={col} className="p-1.5 font-bold">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-900">
                  {sqlResults.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-900/50">
                      {Object.values(row).map((val: any, cIdx) => (
                        <td key={cIdx} className="p-1.5 text-gray-300 whitespace-nowrap">
                          {val !== null && val !== undefined ? String(val) : 'NULL'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
