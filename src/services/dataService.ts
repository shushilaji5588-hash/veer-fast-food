import { executeQuery, executeRun, executeTransaction, getTodayDateString, formatDateTime, persistDatabase } from '../db/sqlite';
import {
  User,
  MenuItem,
  RestaurantTable,
  Order,
  OrderItem,
  Expense,
  RestaurantSettings,
  DashboardSummary,
  EmployeeReportRow,
  DateWiseReportRow,
  ItemWiseReportRow,
  PaymentMode,
} from '../db/types';

// ==========================================
// 1. AUTHENTICATION & USERS
// ==========================================

export async function loginUser(username: string, password: string): Promise<User | null> {
  const users = await executeQuery<User>(
    'SELECT id, username, full_name, mobile, role, status, created_at FROM users WHERE (LOWER(username) = LOWER(?) OR LOWER(id) = LOWER(?)) AND password = ?',
    [username.trim(), username.trim(), password.trim()]
  );
  if (users.length > 0) {
    const user = users[0];
    if (user.status === 'inactive') {
      throw new Error('This account is inactive. Please contact the administrator.');
    }
    return user;
  }
  return null;
}

export async function getAllUsers(): Promise<User[]> {
  return executeQuery<User>('SELECT id, username, full_name, mobile, role, status, created_at FROM users ORDER BY role ASC, full_name ASC');
}

export async function getAllEmployees(): Promise<User[]> {
  return executeQuery<User>('SELECT id, username, full_name, mobile, role, status, created_at FROM users WHERE role = "employee" ORDER BY full_name ASC');
}

export async function createEmployee(data: {
  employee_id: string;
  full_name: string;
  mobile: string;
  password?: string;
}): Promise<void> {
  const existing = await executeQuery('SELECT id FROM users WHERE LOWER(id) = LOWER(?) OR LOWER(username) = LOWER(?)', [
    data.employee_id.trim(),
    data.employee_id.trim(),
  ]);
  if (existing.length > 0) {
    throw new Error(`Employee ID "${data.employee_id}" already exists.`);
  }

  const nowIso = new Date().toISOString();
  await executeRun(
    'INSERT INTO users (id, username, password, full_name, mobile, role, status, created_at) VALUES (?, ?, ?, ?, ?, "employee", "active", ?)',
    [data.employee_id.trim(), data.employee_id.trim(), data.password?.trim() || '1234', data.full_name.trim(), data.mobile.trim(), nowIso]
  );
}

export async function updateEmployee(id: string, data: {
  full_name: string;
  mobile: string;
  status: 'active' | 'inactive';
}): Promise<void> {
  await executeRun(
    'UPDATE users SET full_name = ?, mobile = ?, status = ? WHERE id = ?',
    [data.full_name.trim(), data.mobile.trim(), data.status, id]
  );
}

export async function resetUserPassword(id: string, newPassword: string): Promise<void> {
  await executeRun('UPDATE users SET password = ? WHERE id = ?', [newPassword.trim(), id]);
}

export async function deleteEmployee(id: string): Promise<void> {
  // Check if employee has orders
  const orders = await executeQuery('SELECT COUNT(*) as count FROM orders WHERE employee_id = ?', [id]);
  const count = (orders[0]?.count as number) || 0;
  if (count > 0) {
    // If they have historical orders, deactivate them instead of hard delete to preserve foreign key reports
    await executeRun('UPDATE users SET status = "inactive" WHERE id = ?', [id]);
    throw new Error(`Employee has ${count} recorded orders. The account has been DEACTIVATED to preserve historical sales records.`);
  } else {
    await executeRun('DELETE FROM users WHERE id = ? AND role = "employee"', [id]);
  }
}

// ==========================================
// 2. ITEMS (ADD & REMOVE ITEM)
// ==========================================

export async function getAllItems(): Promise<MenuItem[]> {
  return executeQuery<MenuItem>('SELECT * FROM items ORDER BY category ASC, name ASC');
}

export async function getActiveItems(): Promise<MenuItem[]> {
  return executeQuery<MenuItem>('SELECT * FROM items WHERE status = "active" ORDER BY category ASC, name ASC');
}

export async function createItem(data: {
  name: string;
  category: string;
  price: number;
  description?: string;
}): Promise<void> {
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Item name cannot be empty.');
  }
  if (isNaN(data.price) || data.price < 0) {
    throw new Error('Item price must be a valid positive number.');
  }

  const id = `ITM_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const nowIso = new Date().toISOString();
  await executeRun(
    'INSERT INTO items (id, name, category, price, status, description, created_at) VALUES (?, ?, ?, ?, "active", ?, ?)',
    [id, data.name.trim(), data.category.trim() || 'Fast Food', data.price, data.description?.trim() || '', nowIso]
  );
}

export async function updateItem(id: string, data: {
  name: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
  description?: string;
}): Promise<void> {
  if (!data.name || data.name.trim().length === 0) {
    throw new Error('Item name cannot be empty.');
  }
  if (isNaN(data.price) || data.price < 0) {
    throw new Error('Item price must be a valid positive number.');
  }

  await executeRun(
    'UPDATE items SET name = ?, category = ?, price = ?, status = ?, description = ? WHERE id = ?',
    [data.name.trim(), data.category.trim(), data.price, data.status, data.description?.trim() || '', id]
  );
}

export async function toggleItemStatus(id: string, currentStatus: 'active' | 'inactive'): Promise<void> {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  await executeRun('UPDATE items SET status = ? WHERE id = ?', [newStatus, id]);
}

export async function deleteItem(id: string): Promise<void> {
  // Check if item is used in existing orders
  const orders = await executeQuery('SELECT COUNT(*) as count FROM order_items WHERE item_id = ?', [id]);
  const count = (orders[0]?.count as number) || 0;
  if (count > 0) {
    // Soft delete by deactivating to preserve order history
    await executeRun('UPDATE items SET status = "inactive" WHERE id = ?', [id]);
    throw new Error(`This item is in ${count} past orders. It has been DEACTIVATED so past bills stay accurate, but it won't appear in new orders.`);
  } else {
    await executeRun('DELETE FROM items WHERE id = ?', [id]);
  }
}

// ==========================================
// 3. TABLE MANAGEMENT
// ==========================================

export async function getAllTables(): Promise<RestaurantTable[]> {
  return executeQuery<RestaurantTable>('SELECT * FROM restaurant_tables ORDER BY table_number ASC');
}

export async function addTable(): Promise<number> {
  const tables = await getAllTables();
  let nextNumber = 1;
  if (tables.length > 0) {
    const maxNum = Math.max(...tables.map((t) => t.table_number));
    nextNumber = maxNum + 1;
  }
  const id = `TBL_${Date.now()}`;
  const nowIso = new Date().toISOString();
  await executeRun(
    'INSERT INTO restaurant_tables (id, table_number, capacity, status, active_order_id, created_at) VALUES (?, ?, 4, "available", NULL, ?)',
    [id, nextNumber, nowIso]
  );
  return nextNumber;
}

export async function removeLastTable(): Promise<number> {
  const tables = await getAllTables();
  if (tables.length === 0) {
    throw new Error('No tables to remove.');
  }
  const lastTable = tables[tables.length - 1];

  // Check if table is occupied or has active order
  if (lastTable.status !== 'available' || lastTable.active_order_id) {
    throw new Error(`Cannot remove Table ${lastTable.table_number} because it is currently OCCUPIED or has an active order.`);
  }

  await executeRun('DELETE FROM restaurant_tables WHERE id = ?', [lastTable.id]);
  return lastTable.table_number;
}

// ==========================================
// 4. ORDERS & RUNNING TABLE ORDERS
// ==========================================

export interface OrderItemInput {
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  notes?: string;
}

/**
 * Generate a friendly daily order number e.g. VFF-1007
 */
export async function generateNextOrderNumber(): Promise<string> {
  const rows = await executeQuery<{ count: number }>('SELECT COUNT(*) as count FROM orders');
  const count = (rows[0]?.count || 0) + 1001;
  return `VFF-${count}`;
}

/**
 * Create a new Parcel Order
 */
export async function createParcelOrder(params: {
  employee_id: string;
  employee_name: string;
  items: OrderItemInput[];
  discount?: number;
  notes?: string;
}): Promise<Order> {
  if (!params.items || params.items.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const orderNumber = await generateNextOrderNumber();
  const nowIso = new Date().toISOString();
  const discount = params.discount || 0;

  const subtotal = params.items.reduce((s, it) => s + it.quantity * it.price, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const ops: { sql: string; params: (string | number | null)[] }[] = [];

  ops.push({
    sql: `INSERT INTO orders (id, order_number, order_type, table_id, table_number, employee_id, employee_name, subtotal, discount, grand_total, payment_status, payment_mode, notes, created_at, updated_at, completed_at)
          VALUES (?, ?, 'parcel', NULL, NULL, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, NULL)`,
    params: [orderId, orderNumber, params.employee_id, params.employee_name, subtotal, discount, grandTotal, params.notes || '', nowIso, nowIso],
  });

  let idx = 1;
  for (const it of params.items) {
    ops.push({
      sql: `INSERT INTO order_items (id, order_id, item_id, item_name, price, quantity, amount, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [`${orderId}_ITM_${idx++}`, orderId, it.item_id, it.item_name, it.price, it.quantity, it.quantity * it.price, it.notes || '', nowIso],
    });
  }

  await executeTransaction(ops);
  const created = await getOrderById(orderId);
  if (!created) throw new Error('Failed to retrieve newly created order');
  return created;
}

/**
 * Get active running order for a specific table if one exists
 */
export async function getActiveOrderForTable(tableId: string): Promise<Order | null> {
  const orders = await executeQuery<Order>(
    'SELECT * FROM orders WHERE table_id = ? AND payment_status = "pending" ORDER BY created_at DESC LIMIT 1',
    [tableId]
  );
  if (orders.length === 0) return null;
  const order = orders[0];
  order.items = await executeQuery<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC', [order.id]);
  return order;
}

/**
 * Create or Update Table Order (RUNNING TABLE ORDER)
 * Very Important: If Table already has an active order, merges/appends items to the same order!
 */
export async function saveTableOrder(params: {
  table_id: string;
  table_number: number;
  employee_id: string;
  employee_name: string;
  items: OrderItemInput[];
  discount?: number;
  notes?: string;
}): Promise<Order> {
  if (!params.items || params.items.length === 0) {
    throw new Error('Order must contain at least one item.');
  }

  const existingActive = await getActiveOrderForTable(params.table_id);
  const nowIso = new Date().toISOString();
  const discount = params.discount ?? (existingActive?.discount || 0);

  const subtotal = params.items.reduce((s, it) => s + it.quantity * it.price, 0);
  const grandTotal = Math.max(0, subtotal - discount);

  const ops: { sql: string; params: (string | number | null)[] }[] = [];

  if (existingActive) {
    // UPDATE EXISTING RUNNING TABLE ORDER
    const orderId = existingActive.id;

    // 1. Update order header
    ops.push({
      sql: `UPDATE orders SET subtotal = ?, discount = ?, grand_total = ?, updated_at = ?, notes = ? WHERE id = ?`,
      params: [subtotal, discount, grandTotal, nowIso, params.notes || existingActive.notes || '', orderId],
    });

    // 2. Replace order_items for clean consolidation
    ops.push({
      sql: 'DELETE FROM order_items WHERE order_id = ?',
      params: [orderId],
    });

    let idx = 1;
    for (const it of params.items) {
      ops.push({
        sql: `INSERT INTO order_items (id, order_id, item_id, item_name, price, quantity, amount, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [`${orderId}_ITM_${idx++}`, orderId, it.item_id, it.item_name, it.price, it.quantity, it.quantity * it.price, it.notes || '', nowIso],
      });
    }

    // 3. Ensure table is marked as occupied with active_order_id
    ops.push({
      sql: 'UPDATE restaurant_tables SET status = "occupied", active_order_id = ? WHERE id = ?',
      params: [orderId, params.table_id],
    });

    await executeTransaction(ops);
    const updated = await getOrderById(orderId);
    if (!updated) throw new Error('Failed to retrieve updated table order');
    return updated;
  } else {
    // CREATE BRAND NEW TABLE ORDER
    const orderId = `ORD_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const orderNumber = await generateNextOrderNumber();

    ops.push({
      sql: `INSERT INTO orders (id, order_number, order_type, table_id, table_number, employee_id, employee_name, subtotal, discount, grand_total, payment_status, payment_mode, notes, created_at, updated_at, completed_at)
            VALUES (?, ?, 'table', ?, ?, ?, ?, ?, ?, ?, 'pending', NULL, ?, ?, ?, NULL)`,
      params: [orderId, orderNumber, params.table_id, params.table_number, params.employee_id, params.employee_name, subtotal, discount, grandTotal, params.notes || '', nowIso, nowIso],
    });

    let idx = 1;
    for (const it of params.items) {
      ops.push({
        sql: `INSERT INTO order_items (id, order_id, item_id, item_name, price, quantity, amount, notes, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [`${orderId}_ITM_${idx++}`, orderId, it.item_id, it.item_name, it.price, it.quantity, it.quantity * it.price, it.notes || '', nowIso],
      });
    }

    // Update table status to occupied
    ops.push({
      sql: 'UPDATE restaurant_tables SET status = "occupied", active_order_id = ? WHERE id = ?',
      params: [orderId, params.table_id],
    });

    await executeTransaction(ops);
    const created = await getOrderById(orderId);
    if (!created) throw new Error('Failed to retrieve newly created table order');
    return created;
  }
}

/**
 * Fetch Order by ID with items
 */
export async function getOrderById(orderId: string): Promise<Order | null> {
  const orders = await executeQuery<Order>('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (orders.length === 0) return null;
  const order = orders[0];
  order.items = await executeQuery<OrderItem>('SELECT * FROM order_items WHERE order_id = ? ORDER BY created_at ASC', [orderId]);
  return order;
}

/**
 * Complete Payment and Close Order
 * Marks payment status = paid, records payment, frees table
 */
export async function completeOrderPayment(params: {
  order_id: string;
  payment_mode: PaymentMode;
  discount?: number;
  transaction_ref?: string;
}): Promise<Order> {
  const order = await getOrderById(params.order_id);
  if (!order) {
    throw new Error('Order not found.');
  }
  if (order.payment_status === 'paid') {
    throw new Error('This order has already been paid and settled.');
  }

  const nowIso = new Date().toISOString();
  const finalDiscount = params.discount !== undefined ? params.discount : order.discount;
  const finalGrandTotal = Math.max(0, order.subtotal - finalDiscount);

  const ops: { sql: string; params: (string | number | null)[] }[] = [];

  // 1. Update order
  ops.push({
    sql: `UPDATE orders SET discount = ?, grand_total = ?, payment_status = "paid", payment_mode = ?, completed_at = ?, updated_at = ? WHERE id = ?`,
    params: [finalDiscount, finalGrandTotal, params.payment_mode, nowIso, nowIso, params.order_id],
  });

  // 2. Create payment record
  ops.push({
    sql: `INSERT INTO payment_records (id, order_id, amount, payment_mode, transaction_ref, employee_id, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    params: [
      `PAY_${Date.now()}`,
      params.order_id,
      finalGrandTotal,
      params.payment_mode,
      params.transaction_ref || (params.payment_mode === 'UPI' ? 'UPI_OFFLINE_APP' : 'CASH_REGISTER'),
      order.employee_id,
      nowIso,
    ],
  });

  // 3. If table order, free up the table!
  if (order.order_type === 'table' && order.table_id) {
    ops.push({
      sql: 'UPDATE restaurant_tables SET status = "available", active_order_id = NULL WHERE id = ?',
      params: [order.table_id],
    });
  }

  await executeTransaction(ops);
  const updated = await getOrderById(params.order_id);
  if (!updated) throw new Error('Failed to retrieve finalized paid order');
  return updated;
}

/**
 * Cancel an unpaid order and free table if applicable
 */
export async function cancelOrder(orderId: string, reason?: string): Promise<void> {
  const order = await getOrderById(orderId);
  if (!order) throw new Error('Order not found');
  if (order.payment_status === 'paid') throw new Error('Cannot cancel an already paid order.');

  const nowIso = new Date().toISOString();
  const ops: { sql: string; params: (string | number | null)[] }[] = [
    {
      sql: 'UPDATE orders SET payment_status = "cancelled", notes = ?, updated_at = ? WHERE id = ?',
      params: [reason ? `Cancelled: ${reason}` : 'Cancelled by staff', nowIso, orderId],
    },
  ];

  if (order.order_type === 'table' && order.table_id) {
    ops.push({
      sql: 'UPDATE restaurant_tables SET status = "available", active_order_id = NULL WHERE id = ?',
      params: [order.table_id],
    });
  }

  await executeTransaction(ops);
}

/**
 * Query orders with filtering
 */
export async function getOrders(filters?: {
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  orderType?: 'parcel' | 'table';
  paymentStatus?: 'pending' | 'paid' | 'cancelled';
  search?: string;
}): Promise<Order[]> {
  let sql = 'SELECT * FROM orders WHERE 1=1';
  const params: (string | number | null)[] = [];

  if (filters?.startDate) {
    sql += ' AND date(created_at) >= date(?)';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    sql += ' AND date(created_at) <= date(?)';
    params.push(filters.endDate);
  }
  if (filters?.employeeId) {
    sql += ' AND employee_id = ?';
    params.push(filters.employeeId);
  }
  if (filters?.orderType) {
    sql += ' AND order_type = ?';
    params.push(filters.orderType);
  }
  if (filters?.paymentStatus) {
    sql += ' AND payment_status = ?';
    params.push(filters.paymentStatus);
  }
  if (filters?.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    sql += ' AND (order_number LIKE ? OR employee_name LIKE ? OR id LIKE ?)';
    params.push(s, s, s);
  }

  sql += ' ORDER BY created_at DESC';

  const orders = await executeQuery<Order>(sql, params);
  return orders;
}

// ==========================================
// 5. EXPENSE MANAGEMENT
// ==========================================

export async function getAllExpenses(filters?: {
  startDate?: string;
  endDate?: string;
  category?: string;
  search?: string;
}): Promise<Expense[]> {
  let sql = 'SELECT * FROM expenses WHERE 1=1';
  const params: (string | number | null)[] = [];

  if (filters?.startDate) {
    sql += ' AND date >= ?';
    params.push(filters.startDate);
  }
  if (filters?.endDate) {
    sql += ' AND date <= ?';
    params.push(filters.endDate);
  }
  if (filters?.category && filters.category !== 'All') {
    sql += ' AND category = ?';
    params.push(filters.category);
  }
  if (filters?.search && filters.search.trim()) {
    const s = `%${filters.search.trim()}%`;
    sql += ' AND (description LIKE ? OR category LIKE ?)';
    params.push(s, s);
  }

  sql += ' ORDER BY date DESC, created_at DESC';
  return executeQuery<Expense>(sql, params);
}

export async function createExpense(data: {
  category: string;
  amount: number;
  description: string;
  date: string;
  created_by: string;
}): Promise<void> {
  if (!data.category || data.category.trim().length === 0) {
    throw new Error('Please select an expense category.');
  }
  if (isNaN(data.amount) || data.amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }

  const id = `EXP_${Date.now()}`;
  const nowIso = new Date().toISOString();
  await executeRun(
    'INSERT INTO expenses (id, category, amount, description, date, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, data.category.trim(), data.amount, data.description.trim() || '', data.date, data.created_by.trim(), nowIso]
  );
}

export async function deleteExpense(id: string): Promise<void> {
  await executeRun('DELETE FROM expenses WHERE id = ?', [id]);
}

export async function updateExpense(
  id: string,
  data: {
    category: string;
    amount: number;
    description: string;
    date: string;
  }
): Promise<void> {
  if (!data.category || data.category.trim().length === 0) {
    throw new Error('Expense Name / Category is required.');
  }
  if (isNaN(data.amount) || data.amount <= 0) {
    throw new Error('Expense amount must be greater than zero.');
  }
  if (!data.date) {
    throw new Error('Expense date is required.');
  }

  await executeRun(
    'UPDATE expenses SET category = ?, amount = ?, description = ?, date = ? WHERE id = ?',
    [data.category.trim(), data.amount, data.description.trim() || '', data.date, id]
  );
}

// ==========================================
// 6. DASHBOARD & BUSINESS CALCULATIONS
// ==========================================

export async function getDashboardMetrics(dateRange?: { startDate: string; endDate: string }): Promise<DashboardSummary> {
  const today = getTodayDateString();
  const start = dateRange?.startDate || today;
  const end = dateRange?.endDate || today;

  // 1. Total Earning from Paid Orders
  const earningsRow = await executeQuery<{ total: number; order_count: number }>(
    `SELECT COALESCE(SUM(grand_total), 0) as total, COUNT(*) as order_count 
     FROM orders 
     WHERE payment_status = 'paid' AND date(created_at) >= date(?) AND date(created_at) <= date(?)`,
    [start, end]
  );
  const totalEarning = earningsRow[0]?.total || 0;
  const totalOrders = earningsRow[0]?.order_count || 0;

  // 2. Total Expenses
  const expensesRow = await executeQuery<{ total: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total 
     FROM expenses 
     WHERE date >= ? AND date <= ?`,
    [start, end]
  );
  const totalExpenses = expensesRow[0]?.total || 0;

  // 3. Profit = Total Earning - Total Expenses
  const profit = totalEarning - totalExpenses;

  // 4. Pending orders count
  const pendingRow = await executeQuery<{ count: number }>(
    `SELECT COUNT(*) as count FROM orders WHERE payment_status = 'pending'`
  );
  const pendingOrders = pendingRow[0]?.count || 0;

  // 5. Tables occupancy
  const tableRows = await executeQuery<{ status: string; count: number }>(
    `SELECT status, COUNT(*) as count FROM restaurant_tables GROUP BY status`
  );
  let occupiedTables = 0;
  let totalTables = 0;
  for (const t of tableRows) {
    totalTables += t.count;
    if (t.status === 'occupied' || t.status === 'pending') {
      occupiedTables += t.count;
    }
  }

  return {
    today_earning: totalEarning,
    today_expenses: totalExpenses,
    today_profit: profit,
    today_orders: totalOrders,
    pending_orders: pendingOrders,
    occupied_tables: occupiedTables,
    total_tables: totalTables,
  };
}

export async function getEmployeeWiseReport(startDate?: string, endDate?: string): Promise<EmployeeReportRow[]> {
  const today = getTodayDateString();
  const start = startDate || today;
  const end = endDate || today;

  const rows = await executeQuery<{
    employee_id: string;
    employee_name: string;
    total_orders: number;
    total_earning: number;
    cash_sales: number;
    online_sales: number;
  }>(
    `SELECT 
       u.id as employee_id,
       u.full_name as employee_name,
       COUNT(o.id) as total_orders,
       COALESCE(SUM(o.grand_total), 0) as total_earning,
       COALESCE(SUM(CASE WHEN o.payment_mode = 'CASH' THEN o.grand_total ELSE 0 END), 0) as cash_sales,
       COALESCE(SUM(CASE WHEN o.payment_mode = 'UPI' OR o.payment_mode = 'CARD' THEN o.grand_total ELSE 0 END), 0) as online_sales
     FROM users u
     LEFT JOIN orders o ON u.id = o.employee_id AND o.payment_status = 'paid' AND date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
     WHERE u.role = 'employee'
     GROUP BY u.id, u.full_name
     ORDER BY total_earning DESC, total_orders DESC`,
    [start, end]
  );

  return rows.map((r, i) => ({
    sr_no: i + 1,
    employee_id: r.employee_id,
    employee_name: r.employee_name,
    total_orders: r.total_orders,
    total_earning: r.total_earning,
    cash_sales: r.cash_sales,
    online_sales: r.online_sales,
  }));
}

export async function getDateWiseReport(startDate: string, endDate: string): Promise<DateWiseReportRow[]> {
  // Aggregate daily orders & earnings
  const orderRows = await executeQuery<{
    order_date: string;
    total_orders: number;
    total_earning: number;
  }>(
    `SELECT 
       date(created_at) as order_date,
       COUNT(*) as total_orders,
       COALESCE(SUM(grand_total), 0) as total_earning
     FROM orders
     WHERE payment_status = 'paid' AND date(created_at) >= date(?) AND date(created_at) <= date(?)
     GROUP BY date(created_at)
     ORDER BY order_date DESC`,
    [startDate, endDate]
  );

  // Aggregate daily expenses
  const expenseRows = await executeQuery<{
    exp_date: string;
    total_expenses: number;
  }>(
    `SELECT 
       date as exp_date,
       COALESCE(SUM(amount), 0) as total_expenses
     FROM expenses
     WHERE date >= ? AND date <= ?
     GROUP BY date`,
    [startDate, endDate]
  );

  const expenseMap = new Map<string, number>();
  for (const e of expenseRows) {
    expenseMap.set(e.exp_date, e.total_expenses);
  }

  const results: DateWiseReportRow[] = [];
  const handledDates = new Set<string>();

  for (const o of orderRows) {
    handledDates.add(o.order_date);
    const exp = expenseMap.get(o.order_date) || 0;
    results.push({
      date: o.order_date,
      total_orders: o.total_orders,
      total_earning: o.total_earning,
      total_expenses: exp,
      profit: o.total_earning - exp,
    });
  }

  // Include dates that had expenses but no orders
  for (const [expDate, expAmt] of expenseMap.entries()) {
    if (!handledDates.has(expDate)) {
      results.push({
        date: expDate,
        total_orders: 0,
        total_earning: 0,
        total_expenses: expAmt,
        profit: -expAmt,
      });
    }
  }

  // Sort descending by date
  return results.sort((a, b) => b.date.localeCompare(a.date));
}

export async function getItemWiseReport(startDate?: string, endDate?: string): Promise<ItemWiseReportRow[]> {
  const today = getTodayDateString();
  const start = startDate || today;
  const end = endDate || today;

  const rows = await executeQuery<{
    item_id: string;
    item_name: string;
    category: string;
    unit_price: number;
    quantity_sold: number;
    total_sales: number;
  }>(
    `SELECT 
       oi.item_id,
       oi.item_name,
       COALESCE(it.category, 'Fast Food') as category,
       oi.price as unit_price,
       SUM(oi.quantity) as quantity_sold,
       SUM(oi.amount) as total_sales
     FROM order_items oi
     JOIN orders o ON oi.order_id = o.id
     LEFT JOIN items it ON oi.item_id = it.id
     WHERE o.payment_status = 'paid' AND date(o.created_at) >= date(?) AND date(o.created_at) <= date(?)
     GROUP BY oi.item_id, oi.item_name, it.category, oi.price
     ORDER BY quantity_sold DESC, total_sales DESC`,
    [start, end]
  );

  return rows;
}

// ==========================================
// 7. SETTINGS
// ==========================================

export async function getRestaurantSettings(): Promise<RestaurantSettings> {
  const rows = await executeQuery<{ key: string; value: string }>('SELECT key, value FROM settings');
  const map = new Map<string, string>();
  for (const r of rows) map.set(r.key, r.value);

  return {
    restaurant_name: map.get('restaurant_name') || 'VEER FAST FOOD',
    tagline: map.get('tagline') || 'Taste The Real Fast Food Crunch!',
    address: map.get('address') || 'Main Market Road, Near City Center',
    phone: map.get('phone') || '+91 98765 43210',
    gst_number: map.get('gst_number') || 'GSTIN24AAACB1234Z',
    currency_symbol: map.get('currency_symbol') || '₹',
    enable_discount: map.get('enable_discount') === '1',
    default_discount_pct: Number(map.get('default_discount_pct') || 0),
    printer_width: map.get('printer_width') || '80mm',
  };
}

export async function updateRestaurantSettings(settings: Partial<RestaurantSettings>): Promise<void> {
  const nowIso = new Date().toISOString();
  const ops: { sql: string; params: (string | number | null)[] }[] = [];

  for (const [key, value] of Object.entries(settings)) {
    const stringVal = typeof value === 'boolean' ? (value ? '1' : '0') : String(value);
    ops.push({
      sql: 'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
      params: [key, stringVal, nowIso],
    });
  }

  await executeTransaction(ops);
}

// ==========================================
// 8. EMPLOYEE DASHBOARD STATS
// ==========================================

export async function getEmployeeTodayStats(employeeId: string): Promise<{ my_orders: number; my_sales: number }> {
  const today = getTodayDateString();
  const rows = await executeQuery<{ my_orders: number; my_sales: number }>(
    `SELECT 
       COUNT(*) as my_orders,
       COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN grand_total ELSE 0 END), 0) as my_sales
     FROM orders
     WHERE employee_id = ? AND date(created_at) = date(?)`,
    [employeeId, today]
  );

  return {
    my_orders: rows[0]?.my_orders || 0,
    my_sales: rows[0]?.my_sales || 0,
  };
}
