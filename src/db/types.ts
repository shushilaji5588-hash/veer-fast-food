export type UserRole = 'admin' | 'employee';
export type UserStatus = 'active' | 'inactive';
export type TableStatus = 'available' | 'occupied' | 'pending';
export type OrderType = 'parcel' | 'table';
export type PaymentStatus = 'pending' | 'paid' | 'cancelled';
export type PaymentMode = 'CASH' | 'UPI' | 'CARD';

export interface User {
  id: string;
  username: string;
  password?: string;
  full_name: string;
  mobile: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  status: 'active' | 'inactive';
  description?: string;
  created_at: string;
}

export interface RestaurantTable {
  id: string;
  table_number: number;
  capacity?: number;
  status: TableStatus;
  active_order_id?: string | null;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  item_id: string;
  item_name: string;
  price: number;
  quantity: number;
  amount: number;
  notes?: string;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  order_type: OrderType;
  table_id?: string | null;
  table_number?: number | null;
  employee_id: string;
  employee_name: string;
  subtotal: number;
  discount: number;
  grand_total: number;
  payment_status: PaymentStatus;
  payment_mode?: PaymentMode | null;
  notes?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string | null;
  items?: OrderItem[];
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  created_by: string;
  created_at: string;
}

export interface PaymentRecord {
  id: string;
  order_id: string;
  amount: number;
  payment_mode: PaymentMode;
  transaction_ref?: string;
  employee_id: string;
  created_at: string;
}

export interface RestaurantSettings {
  restaurant_name: string;
  tagline: string;
  address: string;
  phone: string;
  gst_number: string;
  currency_symbol: string;
  enable_discount: boolean;
  default_discount_pct: number;
  printer_width: string; // 80mm or 58mm
}

export interface DashboardSummary {
  today_earning: number;
  today_expenses: number;
  today_profit: number;
  today_orders: number;
  pending_orders: number;
  occupied_tables: number;
  total_tables: number;
}

export interface EmployeeReportRow {
  sr_no: number;
  employee_id: string;
  employee_name: string;
  total_orders: number;
  total_earning: number;
  cash_sales: number;
  online_sales: number;
}

export interface DateWiseReportRow {
  date: string;
  total_orders: number;
  total_earning: number;
  total_expenses: number;
  profit: number;
}

export interface ItemWiseReportRow {
  item_id: string;
  item_name: string;
  category: string;
  quantity_sold: number;
  unit_price: number;
  total_sales: number;
}
