import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useSyncSession } from '@/features/auth/session';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { MovementPage } from '@/pages/MovementPage';
import { MovementStatusPage } from '@/pages/MovementStatusPage';
import { ReturnsPage } from '@/pages/ReturnsPage';
import { SalesPage } from '@/pages/SalesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StockPage } from '@/pages/StockPage';
import { StockComparePage } from '@/pages/StockComparePage';
import { StoragePage } from '@/pages/StoragePage';
import { StorageDayPage } from '@/pages/StorageDayPage';
import { SettlementPage } from '@/pages/SettlementPage';
import { DispatchPage } from '@/pages/DispatchPage';
import { TransferStatusPage } from '@/pages/TransferStatusPage';
import { OrderRequestsPage } from '@/pages/OrderRequestsPage';

export function App() {
  useSyncSession();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="stock/storage" element={<StoragePage />} />
            <Route path="stock/compare" element={<StockComparePage />} />
            <Route path="stock/storage/:date" element={<StorageDayPage />} />
            <Route path="inbound" element={<MovementPage key="inbound" type="inbound" />} />
            <Route path="outbound" element={<MovementPage key="outbound" type="outbound" />} />
            <Route path="inbound/status" element={<MovementStatusPage key="inbound" type="inbound" />} />
            <Route path="outbound/status" element={<MovementStatusPage key="outbound" type="outbound" />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="settlement" element={<SettlementPage key="receivable" kind="receivable" />} />
            <Route path="settlement/consign" element={<SettlementPage key="consign" kind="consign" />} />
            <Route path="settlement/dispatch" element={<DispatchPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="transfer" element={<MovementPage key="transfer" type="transfer" />} />
            <Route path="transfer/status" element={<TransferStatusPage />} />
            <Route path="orders" element={<OrderRequestsPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
