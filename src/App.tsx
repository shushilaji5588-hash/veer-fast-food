import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/common/Header';
import { DeviceFrame } from './components/common/DeviceFrame';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { LoginScreen } from './components/auth/LoginScreen';

// Admin Components (Simplified to 4 core modules)
import { AdminHome, AdminView } from './components/admin/AdminHome';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { TableManagement } from './components/admin/TableManagement';
import { EmployeeManagement } from './components/admin/EmployeeManagement';
import { ItemManagement } from './components/admin/ItemManagement';

// Employee & POS Components
import { EmployeeHome } from './components/employee/EmployeeHome';
import { ParcelOrderView } from './components/pos/ParcelOrderView';
import { TableOrderView } from './components/pos/TableOrderView';
import { BillModal } from './components/pos/BillModal';

import { Order, RestaurantTable } from './db/types';

function AppContent() {
  const { currentUser, isAdmin, isLoading } = useAuth();

  // Navigation states
  const [adminView, setAdminView] = useState<AdminView>('home');
  const [employeeView, setEmployeeView] = useState<'home' | 'parcel' | 'table_order'>('home');

  // Staged table for table order
  const [targetTable, setTargetTable] = useState<RestaurantTable | null>(null);

  // Active Bill Modal
  const [activeBillOrder, setActiveBillOrder] = useState<Order | null>(null);

  // Device Simulator Mode: 'mobile' (phone container) or 'responsive'
  const [deviceMode, setDeviceMode] = useState<'mobile' | 'responsive'>('mobile');

  const toggleDeviceMode = () => {
    setDeviceMode((prev) => (prev === 'mobile' ? 'responsive' : 'mobile'));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-amber-400 p-6 space-y-3">
        <div className="w-12 h-12 border-4 border-amber-500/30 border-t-amber-400 rounded-full animate-spin" />
        <p className="text-sm font-black uppercase tracking-wider text-white">
          VEER FAST FOOD
        </p>
        <span className="text-xs text-gray-500">Loading SQLite database...</span>
      </div>
    );
  }

  // Not logged in -> Show Clean Login Screen
  if (!currentUser) {
    return (
      <DeviceFrame isMobileMode={deviceMode === 'mobile'} onToggleMode={toggleDeviceMode}>
        <Header
          subtitle="Staff &amp; Admin Login"
          deviceMode={deviceMode}
          onToggleDeviceMode={toggleDeviceMode}
        />
        <LoginScreen />
        <OfflineIndicator />
      </DeviceFrame>
    );
  }

  // ==========================================
  // 1. ADMIN USER EXPERIENCE
  // (Only 4 options: Dashboard, Table Management, Employee Management, Add & Remove Item)
  // ==========================================
  if (isAdmin) {
    const getAdminTitle = () => {
      switch (adminView) {
        case 'dashboard':
          return 'Dashboard';
        case 'tables':
          return 'Table Management';
        case 'employees':
          return 'Employee Management';
        case 'items':
          return 'Add & Remove Item';
        default:
          return undefined;
      }
    };

    return (
      <DeviceFrame isMobileMode={deviceMode === 'mobile'} onToggleMode={toggleDeviceMode}>
        <Header
          title={getAdminTitle()}
          showBack={adminView !== 'home'}
          onBack={() => setAdminView('home')}
          deviceMode={deviceMode}
          onToggleDeviceMode={toggleDeviceMode}
        />

        <main className="flex-1 flex flex-col bg-gray-950">
          {adminView === 'home' && <AdminHome onNavigate={setAdminView} />}
          {adminView === 'dashboard' && <AdminDashboard />}
          {adminView === 'tables' && (
            <TableManagement
              onOpenOrderForTable={(table) => {
                setTargetTable(table);
                setEmployeeView('table_order');
              }}
            />
          )}
          {adminView === 'employees' && <EmployeeManagement />}
          {adminView === 'items' && <ItemManagement />}

          {/* If table order opened from Table Management */}
          {employeeView === 'table_order' && (
            <TableOrderView
              initialTable={targetTable}
              onOpenBill={(ord) => setActiveBillOrder(ord)}
              onBackToTables={() => {
                setTargetTable(null);
                setEmployeeView('home');
              }}
            />
          )}
        </main>

        {activeBillOrder && (
          <BillModal
            order={activeBillOrder}
            isOpen={true}
            onClose={() => setActiveBillOrder(null)}
          />
        )}

        <OfflineIndicator />
      </DeviceFrame>
    );
  }

  // ==========================================
  // 2. EMPLOYEE USER EXPERIENCE
  // (Only 2 options: Parcel Order, Table Order)
  // ==========================================
  const getEmployeeTitle = () => {
    switch (employeeView) {
      case 'parcel':
        return 'Parcel Order';
      case 'table_order':
        return 'Table Order';
      default:
        return undefined;
    }
  };

  return (
    <DeviceFrame isMobileMode={deviceMode === 'mobile'} onToggleMode={toggleDeviceMode}>
      <Header
        title={getEmployeeTitle()}
        showBack={employeeView !== 'home'}
        onBack={() => {
          setEmployeeView('home');
          setTargetTable(null);
        }}
        deviceMode={deviceMode}
        onToggleDeviceMode={toggleDeviceMode}
      />

      <main className="flex-1 flex flex-col bg-gray-950">
        {employeeView === 'home' && (
          <EmployeeHome
            onStartParcelOrder={() => setEmployeeView('parcel')}
            onStartTableOrder={() => {
              setTargetTable(null);
              setEmployeeView('table_order');
            }}
          />
        )}

        {employeeView === 'parcel' && (
          <ParcelOrderView
            onOrderSaved={() => setEmployeeView('home')}
            onOpenBill={(ord) => setActiveBillOrder(ord)}
            onBack={() => setEmployeeView('home')}
          />
        )}

        {employeeView === 'table_order' && (
          <TableOrderView
            initialTable={targetTable}
            onOpenBill={(ord) => setActiveBillOrder(ord)}
            onBackToTables={() => {
              setTargetTable(null);
              setEmployeeView('home');
            }}
          />
        )}
      </main>

      {activeBillOrder && (
        <BillModal
          order={activeBillOrder}
          isOpen={true}
          onClose={() => setActiveBillOrder(null)}
        />
      )}

      <OfflineIndicator />
    </DeviceFrame>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
