import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { LoginPage } from '@/features/auth/LoginPage';
import { RequireAuth } from '@/features/auth/RequireAuth';
import { useSyncSession } from '@/features/auth/session';
import { AppLayout } from '@/layouts/AppLayout';
import { DashboardPage } from '@/pages/DashboardPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { MovementPage } from '@/pages/MovementPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { StockPage } from '@/pages/StockPage';

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
            <Route path="inbound" element={<MovementPage key="inbound" type="inbound" />} />
            <Route path="outbound" element={<MovementPage key="outbound" type="outbound" />} />
            <Route path="transfer" element={<MovementPage key="transfer" type="transfer" />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
