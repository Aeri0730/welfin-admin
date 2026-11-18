import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Provider as JotaiProvider } from 'jotai';
import '@/styles/global.css';
import { isSupabaseConfigured } from '@/lib/supabase';
import { App } from './App';
import { SetupNotice } from './SetupNotice';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <JotaiProvider>
      <QueryClientProvider client={queryClient}>
        {isSupabaseConfigured ? <App /> : <SetupNotice />}
      </QueryClientProvider>
    </JotaiProvider>
  </StrictMode>,
);
