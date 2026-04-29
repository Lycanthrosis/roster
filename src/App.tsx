import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { initDatabase } from "@/lib/db";
import { AppShell } from "@/components/layout/AppShell";
import CandidateList from "@/routes/CandidateList";
import CandidateDetail from "@/routes/CandidateDetail";
import Settings from "@/routes/Settings";
import Reports from "@/routes/Reports";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setReady(true))
      .catch((e) => setError(String(e)));
  }, []);

  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-background p-8">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-lg font-semibold text-destructive">
            Database failed to initialize
          </h1>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 text-left text-xs">
            {error}
          </pre>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Navigate to="/candidates" replace />} />
            <Route path="/candidates" element={<CandidateList />} />
            <Route path="/candidates/:id" element={<CandidateDetail />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings/*" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
