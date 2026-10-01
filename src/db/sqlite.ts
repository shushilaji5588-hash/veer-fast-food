import initSqlJs, { Database } from 'sql.js';
import sqlWasmAssetUrl from 'sql.js/dist/sql-wasm.wasm?url';
import {
  saveSqliteToDisk,
  loadSqliteFromDisk,
  clearSqliteDisk,
  saveWasmBinaryToDisk,
  loadWasmBinaryFromDisk,
  clearWasmBinaryDisk,
} from './storage';

let dbInstance: Database | null = null;
let initPromise: Promise<Database> | null = null;

// Format Date YYYY-MM-DD helper
export function getTodayDateString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return isoString;
  return d.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Validate that an ArrayBuffer begins with the WebAssembly binary magic number:
 * 0x00, 0x61, 0x73, 0x6d ('\0asm')
 * This strictly rejects HTML fallback responses (e.g. 0x3c, 0x21, 0x64, 0x6f for '<!do')
 */
export function isValidWasmBinary(buffer: ArrayBuffer | null | undefined): buffer is ArrayBuffer {
  if (!buffer || buffer.byteLength < 4) return false;
  const bytes = new Uint8Array(buffer, 0, 4);
  return bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d;
}

/**
 * Robust multi-tier resolver for sql-wasm.wasm
 * 1. Checks local IndexedDB cache (verifying magic bytes)
 * 2. Fetches candidate URLs in priority order (bundled asset url, root /sql-wasm.wasm, base url)
 * 3. Strictly verifies WebAssembly magic header before accepting
 */
async function resolveWasmBinary(): Promise<ArrayBuffer | null> {
  // Tier 1: Check IndexedDB
  try {
    const cached = await loadWasmBinaryFromDisk();
    if (cached) {
      if (isValidWasmBinary(cached)) {
        return cached;
      } else {
        console.warn('[SQLite WASM] Found non-WASM data in IndexedDB (likely previous HTML fallback error), purging...');
        await clearWasmBinaryDisk();
      }
    }
  } catch (err) {
    console.warn('[SQLite WASM] Error checking IndexedDB for WASM:', err);
  }

  // Tier 2: Fetch candidates
  const baseUrl = typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
  const candidateUrls = [
    sqlWasmAssetUrl,
    '/sql-wasm.wasm',
    `${baseUrl.replace(/\/$/, '')}/sql-wasm.wasm`,
    './sql-wasm.wasm',
    'sql-wasm.wasm',
  ].filter(Boolean);

  const uniqueUrls = Array.from(new Set(candidateUrls));

  for (const url of uniqueUrls) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const buffer = await resp.arrayBuffer();
        if (isValidWasmBinary(buffer)) {
          // Asynchronously persist to IndexedDB for 100% offline startup
          saveWasmBinaryToDisk(buffer).catch((e) => {
            console.warn('[SQLite WASM] Failed saving WASM to IndexedDB:', e);
          });
          return buffer;
        } else {
          console.warn(`[SQLite WASM] Fetched ${url} but response was not a WebAssembly binary (likely HTML SPA redirect).`);
        }
      }
    } catch (err) {
      console.warn(`[SQLite WASM] Failed fetching candidate ${url}:`, err);
    }
  }

  return null;
}

/**
 * Initialize SQLite Database with dual-tier offline fallback & IndexedDB storage
 */
export async function getSqliteDb(): Promise<Database> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const wasmBuffer = await resolveWasmBinary();

      const config: Parameters<typeof initSqlJs>[0] = wasmBuffer
        ? { wasmBinary: wasmBuffer }
        : {
            locateFile: (file: string) => {
              if (file === 'sql-wasm.wasm') {
                return sqlWasmAssetUrl || '/sql-wasm.wasm';
              }
              return `/${file}`;
            },
          };

      const SQL = await initSqlJs(config);

      const existingBinary = await loadSqliteFromDisk();
      let db: Database;

      if (existingBinary && existingBinary.length > 0) {
        try {
          db = new SQL.Database(existingBinary);
          console.log('Restored existing SQLite database from local IndexedDB.');
        } catch (e) {
          console.warn('Failed restoring existing database binary, creating new:', e);
          db = new SQL.Database();
        }
      } else {
        db = new SQL.Database();
        console.log('Initialized brand new SQLite in-memory database.');
      }

      dbInstance = db;
      createTables(db);

      // Check if seeded; if not, seed default demo data
      const userCheck = queryRaw(db, 'SELECT COUNT(*) as count FROM users');
      const count = (userCheck[0]?.count as number) || 0;
      if (count === 0) {
        seedInitialDemoData(db);
      }

      await persistDatabase();
      return db;
    } catch (err) {
      console.error('Failed to initialize sql.js:', err);
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Create relational SQL schema
 */
function createTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'employee')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive')),
      description TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS restaurant_tables (
      id TEXT PRIMARY KEY,
      table_number INTEGER UNIQUE NOT NULL,
      capacity INTEGER DEFAULT 4,
      status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'occupied', 'pending')),
      active_order_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      order_type TEXT NOT NULL CHECK(order_type IN ('parcel', 'table')),
      table_id TEXT,
      table_number INTEGER,
      employee_id TEXT NOT NULL,
      employee_name TEXT NOT NULL,
      subtotal REAL NOT NULL DEFAULT 0,
      discount REAL NOT NULL DEFAULT 0,
      grand_total REAL NOT NULL DEFAULT 0,
      payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'cancelled')),
      payment_mode TEXT CHECK(payment_mode IN ('CASH', 'UPI', 'CARD') OR payment_mode IS NULL),
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      FOREIGN KEY (table_id) REFERENCES restaurant_tables(id),
      FOREIGN KEY (employee_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT NOT NULL,
      price REAL NOT NULL,
      quantity INTEGER NOT NULL,
      amount REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES items(id)
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      date TEXT NOT NULL,
      created_by TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_records (
      id TEXT PRIMARY KEY,
      order_id TEXT NOT NULL,
      amount REAL NOT NULL,
      payment_mode TEXT NOT NULL,
      transaction_ref TEXT,
      employee_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id)
    );

    CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    CREATE INDEX IF NOT EXISTS idx_orders_employee_id ON orders(employee_id);
    CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
    CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
  `);
}

/**
 * Persist current SQLite state to IndexedDB
 */
export async function persistDatabase(): Promise<void> {
  if (!dbInstance) return;
  try {
    const binary = dbInstance.export();
    await saveSqliteToDisk(binary);
  } catch (err) {
    console.error('Error exporting SQLite database:', err);
  }
}

/**
 * Seed full demo dataset: Admin, Employees, Menu items, Tables, Historical Orders & Expenses
 */
export function seedInitialDemoData(db: Database) {
  const now = new Date();
  const nowIso = now.toISOString();
  const today = getTodayDateString();

  // Helper date offset
  const getOffsetDate = (daysAgo: number) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${yr}-${mo}-${da}`;
  };

  db.run('BEGIN TRANSACTION;');

  // 1. Settings
  const settingsData = [
    ['restaurant_name', 'VEER FAST FOOD'],
    ['tagline', 'Taste The Real Fast Food Crunch!'],
    ['address', 'Shop #12, Market Complex, City Road'],
    ['phone', '+91 98765 43210'],
    ['gst_number', 'GSTIN24AAACB1234Z'],
    ['currency_symbol', '₹'],
    ['enable_discount', '1'],
    ['default_discount_pct', '0'],
    ['printer_width', '80mm'],
  ];
  for (const [k, v] of settingsData) {
    db.run('INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)', [k, v, nowIso]);
  }

  // 2. Users (Admin + Demo Employees: Rajesh, Suresh, Pooja, Amit)
  const users = [
    { id: 'USR_ADMIN', username: 'admin', password: 'admin123', full_name: 'Admin Master', mobile: '9876543210', role: 'admin', status: 'active' },
    { id: 'EMP001', username: 'EMP001', password: '1234', full_name: 'Rajesh Kumar', mobile: '9876500001', role: 'employee', status: 'active' },
    { id: 'EMP002', username: 'EMP002', password: '1234', full_name: 'Suresh Patel', mobile: '9876500002', role: 'employee', status: 'active' },
    { id: 'EMP003', username: 'EMP003', password: '1234', full_name: 'Pooja Sharma', mobile: '9876500003', role: 'employee', status: 'active' },
    { id: 'EMP004', username: 'EMP004', password: '1234', full_name: 'Amit Verma', mobile: '9876500004', role: 'employee', status: 'active' },
  ];
  for (const u of users) {
    db.run(
      'INSERT INTO users (id, username, password, full_name, mobile, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [u.id, u.username, u.password, u.full_name, u.mobile, u.role, u.status, nowIso]
    );
  }

  // 3. Menu Items (Burger, Pizza, French Fries, Cold Drink, Coffee, Sandwich, etc.)
  const items = [
    { id: 'ITM_01', name: 'Veg Burger', category: 'Burger', price: 120, description: 'Crispy vegetable patty with fresh herbs' },
    { id: 'ITM_02', name: 'Cheese Burst Burger', category: 'Burger', price: 160, description: 'Double loaded cheese slice and dip' },
    { id: 'ITM_03', name: 'Margherita Pizza', category: 'Pizza', price: 220, description: 'Fresh mozzarella & basil herbs' },
    { id: 'ITM_04', name: 'Farmhouse Special Pizza', category: 'Pizza', price: 290, description: 'Capsicum, onion, corn & paneer' },
    { id: 'ITM_05', name: 'French Fries (Salted)', category: 'Sides', price: 100, description: 'Golden crispy potato fingers' },
    { id: 'ITM_06', name: 'Peri Peri French Fries', category: 'Sides', price: 130, description: 'Tossed with fiery peri peri spice' },
    { id: 'ITM_07', name: 'Veg Grilled Sandwich', category: 'Sandwich', price: 90, description: 'Toasted bread with mint chutney & veggies' },
    { id: 'ITM_08', name: 'Cheese Chilly Sandwich', category: 'Sandwich', price: 120, description: 'Melted cheese with mild green chilies' },
    { id: 'ITM_09', name: 'Cold Drink (Can 330ml)', category: 'Beverages', price: 50, description: 'Chilled Thums Up / Coke / Sprite' },
    { id: 'ITM_10', name: 'Hot Masala Tea', category: 'Beverages', price: 30, description: 'Ginger cardamom special tea' },
    { id: 'ITM_11', name: 'Hot Cappuccino Coffee', category: 'Beverages', price: 60, description: 'Freshly brewed aromatic coffee' },
    { id: 'ITM_12', name: 'Cold Coffee with Ice Cream', category: 'Beverages', price: 110, description: 'Creamy thick cold brew' },
    { id: 'ITM_13', name: 'Paneer Wrap / Roll', category: 'Fast Food', price: 140, description: 'Tandoori paneer wrapped in flaky flatbread' },
    { id: 'ITM_14', name: 'Garlic Breadsticks (4 pcs)', category: 'Sides', price: 110, description: 'Herb butter garlic breadsticks' },
  ];
  for (const it of items) {
    db.run(
      'INSERT INTO items (id, name, category, price, status, description, created_at) VALUES (?, ?, ?, ?, "active", ?, ?)',
      [it.id, it.name, it.category, it.price, it.description, nowIso]
    );
  }

  // 4. Restaurant Tables (Table 1 to Table 8)
  for (let i = 1; i <= 8; i++) {
    const tableId = `TBL_${i}`;
    db.run(
      'INSERT INTO restaurant_tables (id, table_number, capacity, status, active_order_id, created_at) VALUES (?, ?, ?, "available", NULL, ?)',
      [tableId, i, i <= 2 ? 2 : i <= 6 ? 4 : 6, nowIso]
    );
  }

  // 5. Seed Historical Expenses
  const demoExpenses = [
    { cat: 'Raw Material', amt: 2850, desc: 'Fresh buns, cheese block & potatoes', dt: today, by: 'Admin Master' },
    { cat: 'Gas', amt: 1150, desc: 'Commercial LPG Cylinder refill', dt: today, by: 'Admin Master' },
    { cat: 'Packaging', amt: 650, desc: 'Kraft paper parcel boxes & cups', dt: today, by: 'Admin Master' },
    { cat: 'Raw Material', amt: 3200, desc: 'Dairy, veggies, sauces supply', dt: getOffsetDate(1), by: 'Admin Master' },
    { cat: 'Electricity', amt: 1200, desc: 'Generator fuel & backup bill', dt: getOffsetDate(1), by: 'Admin Master' },
    { cat: 'Raw Material', amt: 2900, desc: 'Bread loaves & mozzarella cheese', dt: getOffsetDate(2), by: 'Admin Master' },
    { cat: 'Other', amt: 450, desc: 'Cleaning supplies & handwash', dt: getOffsetDate(2), by: 'Admin Master' },
  ];
  let expIndex = 1;
  for (const ex of demoExpenses) {
    db.run(
      'INSERT INTO expenses (id, category, amount, description, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [`EXP_${String(expIndex++).padStart(3, '0')}`, ex.cat, ex.amt, ex.desc, ex.dt, ex.by, `${ex.dt}T10:00:00Z`]
    );
  }

  // 6. Seed Realistic Orders (Today + Past Days)
  // Let's create orders for Rajesh, Suresh, Pooja, Amit
  const demoOrders = [
    // Today Orders
    {
      num: 'VFF-1001', type: 'parcel', empId: 'EMP001', empName: 'Rajesh Kumar', dt: `${today}T11:15:00`,
      status: 'paid', mode: 'CASH', disc: 0,
      items: [
        { id: 'ITM_01', name: 'Veg Burger', qty: 2, price: 120 },
        { id: 'ITM_05', name: 'French Fries (Salted)', qty: 1, price: 100 },
        { id: 'ITM_09', name: 'Cold Drink (Can 330ml)', qty: 2, price: 50 },
      ]
    },
    {
      num: 'VFF-1002', type: 'table', tblNum: 1, tblId: 'TBL_1', empId: 'EMP002', empName: 'Suresh Patel', dt: `${today}T11:45:00`,
      status: 'paid', mode: 'UPI', disc: 20,
      items: [
        { id: 'ITM_03', name: 'Margherita Pizza', qty: 1, price: 220 },
        { id: 'ITM_14', name: 'Garlic Breadsticks (4 pcs)', qty: 1, price: 110 },
        { id: 'ITM_11', name: 'Hot Cappuccino Coffee', qty: 2, price: 60 },
      ]
    },
    {
      num: 'VFF-1003', type: 'parcel', empId: 'EMP003', empName: 'Pooja Sharma', dt: `${today}T12:20:00`,
      status: 'paid', mode: 'CASH', disc: 0,
      items: [
        { id: 'ITM_07', name: 'Veg Grilled Sandwich', qty: 2, price: 90 },
        { id: 'ITM_06', name: 'Peri Peri French Fries', qty: 2, price: 130 },
      ]
    },
    {
      num: 'VFF-1004', type: 'table', tblNum: 2, tblId: 'TBL_2', empId: 'EMP001', empName: 'Rajesh Kumar', dt: `${today}T13:00:00`,
      status: 'paid', mode: 'UPI', disc: 0,
      items: [
        { id: 'ITM_02', name: 'Cheese Burst Burger', qty: 2, price: 160 },
        { id: 'ITM_12', name: 'Cold Coffee with Ice Cream', qty: 2, price: 110 },
      ]
    },
    {
      num: 'VFF-1005', type: 'parcel', empId: 'EMP004', empName: 'Amit Verma', dt: `${today}T13:40:00`,
      status: 'paid', mode: 'CARD', disc: 30,
      items: [
        { id: 'ITM_04', name: 'Farmhouse Special Pizza', qty: 1, price: 290 },
        { id: 'ITM_13', name: 'Paneer Wrap / Roll', qty: 2, price: 140 },
        { id: 'ITM_09', name: 'Cold Drink (Can 330ml)', qty: 2, price: 50 },
      ]
    },
    // Running active order on Table 3 (as required by prompt example!)
    {
      num: 'VFF-1006', type: 'table', tblNum: 3, tblId: 'TBL_3', empId: 'EMP001', empName: 'Rajesh Kumar', dt: `${today}T14:10:00`,
      status: 'pending', mode: null, disc: 0,
      items: [
        { id: 'ITM_01', name: 'Veg Burger', qty: 2, price: 120 },
        { id: 'ITM_09', name: 'Cold Drink (Can 330ml)', qty: 1, price: 50 },
      ]
    },
    // Yesterday Orders
    {
      num: 'VFF-0991', type: 'parcel', empId: 'EMP001', empName: 'Rajesh Kumar', dt: `${getOffsetDate(1)}T12:00:00`,
      status: 'paid', mode: 'CASH', disc: 0,
      items: [
        { id: 'ITM_01', name: 'Veg Burger', qty: 4, price: 120 },
        { id: 'ITM_05', name: 'French Fries (Salted)', qty: 3, price: 100 },
      ]
    },
    {
      num: 'VFF-0992', type: 'table', tblNum: 4, tblId: 'TBL_4', empId: 'EMP002', empName: 'Suresh Patel', dt: `${getOffsetDate(1)}T14:30:00`,
      status: 'paid', mode: 'UPI', disc: 40,
      items: [
        { id: 'ITM_04', name: 'Farmhouse Special Pizza', qty: 2, price: 290 },
        { id: 'ITM_12', name: 'Cold Coffee with Ice Cream', qty: 3, price: 110 },
      ]
    },
    {
      num: 'VFF-0993', type: 'parcel', empId: 'EMP003', empName: 'Pooja Sharma', dt: `${getOffsetDate(1)}T17:10:00`,
      status: 'paid', mode: 'CASH', disc: 0,
      items: [
        { id: 'ITM_07', name: 'Veg Grilled Sandwich', qty: 3, price: 90 },
        { id: 'ITM_06', name: 'Peri Peri French Fries', qty: 2, price: 130 },
      ]
    },
    // 2 Days Ago Orders
    {
      num: 'VFF-0981', type: 'table', tblNum: 5, tblId: 'TBL_5', empId: 'EMP004', empName: 'Amit Verma', dt: `${getOffsetDate(2)}T13:15:00`,
      status: 'paid', mode: 'UPI', disc: 0,
      items: [
        { id: 'ITM_03', name: 'Margherita Pizza', qty: 2, price: 220 },
        { id: 'ITM_01', name: 'Veg Burger', qty: 3, price: 120 },
        { id: 'ITM_09', name: 'Cold Drink (Can 330ml)', qty: 4, price: 50 },
      ]
    },
    {
      num: 'VFF-0982', type: 'parcel', empId: 'EMP001', empName: 'Rajesh Kumar', dt: `${getOffsetDate(2)}T16:45:00`,
      status: 'paid', mode: 'CASH', disc: 10,
      items: [
        { id: 'ITM_13', name: 'Paneer Wrap / Roll', qty: 4, price: 140 },
        { id: 'ITM_05', name: 'French Fries (Salted)', qty: 2, price: 100 },
      ]
    },
  ];

  let orderCount = 0;
  for (const o of demoOrders) {
    orderCount++;
    const orderId = `ORD_${orderCount}_${Date.now()}`;
    const subtotal = o.items.reduce((s, it) => s + it.qty * it.price, 0);
    const grandTotal = Math.max(0, subtotal - o.disc);

    db.run(
      `INSERT INTO orders (id, order_number, order_type, table_id, table_number, employee_id, employee_name, subtotal, discount, grand_total, payment_status, payment_mode, notes, created_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderId,
        o.num,
        o.type,
        o.tblId || null,
        o.tblNum || null,
        o.empId,
        o.empName,
        subtotal,
        o.disc,
        grandTotal,
        o.status,
        o.mode,
        o.status === 'pending' ? 'Active Dine-In Order' : 'Quick billing',
        `${o.dt}Z`,
        `${o.dt}Z`,
        o.status === 'paid' ? `${o.dt}Z` : null,
      ]
    );

    let itemIdx = 1;
    for (const it of o.items) {
      db.run(
        `INSERT INTO order_items (id, order_id, item_id, item_name, price, quantity, amount, notes, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          `${orderId}_ITM_${itemIdx++}`,
          orderId,
          it.id,
          it.name,
          it.price,
          it.qty,
          it.qty * it.price,
          '',
          `${o.dt}Z`,
        ]
      );
    }

    if (o.status === 'paid' && o.mode) {
      db.run(
        `INSERT INTO payment_records (id, order_id, amount, payment_mode, transaction_ref, employee_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          `PAY_${orderCount}`,
          orderId,
          grandTotal,
          o.mode,
          o.mode === 'UPI' ? `UPI${Math.floor(100000 + Math.random() * 900000)}` : 'OFFLINE_CASH',
          o.empId,
          `${o.dt}Z`,
        ]
      );
    }

    // If it's a pending table order, mark the restaurant table as OCCUPIED with this active_order_id!
    if (o.type === 'table' && o.status === 'pending' && o.tblId) {
      db.run('UPDATE restaurant_tables SET status = "occupied", active_order_id = ? WHERE id = ?', [orderId, o.tblId]);
    }
  }

  db.run('COMMIT;');
}

/**
 * Execute a SQL query that returns an array of objects
 */
export function queryRaw(db: Database, sql: string, params: (string | number | null)[] = []): Record<string, unknown>[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    return results;
  } finally {
    stmt.free();
  }
}

/**
 * Async query wrapper that ensures DB is ready
 */
export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  params: (string | number | null)[] = []
): Promise<T[]> {
  const db = await getSqliteDb();
  return queryRaw(db, sql, params) as T[];
}

/**
 * Async run wrapper (INSERT, UPDATE, DELETE) that persists to IndexedDB
 */
export async function executeRun(
  sql: string,
  params: (string | number | null)[] = []
): Promise<void> {
  const db = await getSqliteDb();
  db.run(sql, params);
  await persistDatabase();
}

/**
 * Run multiple statements inside a transaction
 */
export async function executeTransaction(
  operations: { sql: string; params?: (string | number | null)[] }[]
): Promise<void> {
  const db = await getSqliteDb();
  db.run('BEGIN TRANSACTION;');
  try {
    for (const op of operations) {
      db.run(op.sql, op.params || []);
    }
    db.run('COMMIT;');
  } catch (err) {
    db.run('ROLLBACK;');
    throw err;
  }
  await persistDatabase();
}

/**
 * Reset database to default demo data
 */
export async function resetDatabase(): Promise<void> {
  const db = await getSqliteDb();
  db.run('BEGIN TRANSACTION;');
  db.run('DROP TABLE IF EXISTS payment_records;');
  db.run('DROP TABLE IF EXISTS order_items;');
  db.run('DROP TABLE IF EXISTS orders;');
  db.run('DROP TABLE IF EXISTS restaurant_tables;');
  db.run('DROP TABLE IF EXISTS items;');
  db.run('DROP TABLE IF EXISTS expenses;');
  db.run('DROP TABLE IF EXISTS settings;');
  db.run('DROP TABLE IF EXISTS users;');
  db.run('COMMIT;');

  createTables(db);
  seedInitialDemoData(db);
  await persistDatabase();
}

/**
 * Clear only orders, order_items, expenses, payments and reset table statuses
 * Keep users and menu items intact
 */
export async function clearAllOrdersAndExpenses(): Promise<void> {
  const db = await getSqliteDb();
  db.run('BEGIN TRANSACTION;');
  db.run('DELETE FROM payment_records;');
  db.run('DELETE FROM order_items;');
  db.run('DELETE FROM orders;');
  db.run('DELETE FROM expenses;');
  db.run('UPDATE restaurant_tables SET status = "available", active_order_id = NULL;');
  db.run('COMMIT;');
  await persistDatabase();
}

/**
 * Export SQLite database as binary Uint8Array
 */
export async function exportDatabaseBinary(): Promise<Uint8Array> {
  const db = await getSqliteDb();
  return db.export();
}

/**
 * Import a binary SQLite database file
 */
export async function importDatabaseBinary(binary: Uint8Array): Promise<void> {
  const SQL = await initSqlJs({
    locateFile: () => '/sql-wasm.wasm',
  });
  const newDb = new SQL.Database(binary);
  // Verify basic tables exist
  const check = queryRaw(newDb, "SELECT name FROM sqlite_master WHERE type='table' AND name='users'");
  if (check.length === 0) {
    throw new Error('Invalid SQLite database file: missing users table');
  }
  dbInstance = newDb;
  await saveSqliteToDisk(binary);
}
