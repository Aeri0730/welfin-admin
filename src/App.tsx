import { lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useSyncSession } from '@/features/auth/session';
import { AppLayout } from '@/layouts/AppLayout';

/** 페이지는 처음 들어갈 때 불러온다 (첫 화면 용량 줄이기) */
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const MovementPage = lazy(() => import('@/pages/MovementPage').then((m) => ({ default: m.MovementPage })));
const MovementStatusPage = lazy(() => import('@/pages/MovementStatusPage').then((m) => ({ default: m.MovementStatusPage })));
const ReturnsPage = lazy(() => import('@/pages/ReturnsPage').then((m) => ({ default: m.ReturnsPage })));
const SalesPage = lazy(() => import('@/pages/SalesPage').then((m) => ({ default: m.SalesPage })));
const SettingsPage = lazy(() => import('@/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const StockPage = lazy(() => import('@/pages/StockPage').then((m) => ({ default: m.StockPage })));
const StockComparePage = lazy(() => import('@/pages/StockComparePage').then((m) => ({ default: m.StockComparePage })));
const StoragePage = lazy(() => import('@/pages/StoragePage').then((m) => ({ default: m.StoragePage })));
const StorageDayPage = lazy(() => import('@/pages/StorageDayPage').then((m) => ({ default: m.StorageDayPage })));
const SettlementPage = lazy(() => import('@/pages/SettlementPage').then((m) => ({ default: m.SettlementPage })));
const DispatchPage = lazy(() => import('@/pages/DispatchPage').then((m) => ({ default: m.DispatchPage })));
const TransferStatusPage = lazy(() => import('@/pages/TransferStatusPage').then((m) => ({ default: m.TransferStatusPage })));
const OrderRequestsPage = lazy(() => import('@/pages/OrderRequestsPage').then((m) => ({ default: m.OrderRequestsPage })));

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
