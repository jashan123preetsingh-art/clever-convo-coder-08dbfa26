import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import TerminalLayout from "@/components/TerminalLayout";
import { useAuth } from "@/hooks/useAuth";

const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Heatmap = lazy(() => import("./pages/Heatmap"));
const Scanner = lazy(() => import("./pages/Scanner"));
const Screener = lazy(() => import("./pages/Screener"));
const OptionsChain = lazy(() => import("./pages/OptionsChain"));
const Sectors = lazy(() => import("./pages/Sectors"));
const FiiDii = lazy(() => import("./pages/FiiDii"));
const OIAnalysis = lazy(() => import("./pages/OIAnalysis"));
const News = lazy(() => import("./pages/News"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Admin = lazy(() => import("./pages/Admin"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const Loading = () => (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      <p className="text-muted-foreground text-[10px]">LOADING...</p>
    </div>
  </div>
);

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

const AppRoutes = () => (
  <Routes>
    <Route path="/auth" element={<Auth />} />
    <Route path="/" element={<ProtectedRoute><TerminalLayout><Dashboard /></TerminalLayout></ProtectedRoute>} />
    <Route path="/heatmap" element={<ProtectedRoute><TerminalLayout><Heatmap /></TerminalLayout></ProtectedRoute>} />
    <Route path="/scanner" element={<ProtectedRoute><TerminalLayout><Scanner /></TerminalLayout></ProtectedRoute>} />
    <Route path="/scanner/:key" element={<ProtectedRoute><TerminalLayout><Scanner /></TerminalLayout></ProtectedRoute>} />
    <Route path="/screener" element={<Navigate to="/scanner" replace />} />
    <Route path="/options" element={<ProtectedRoute><TerminalLayout><OptionsChain /></TerminalLayout></ProtectedRoute>} />
    <Route path="/options/:symbol" element={<ProtectedRoute><TerminalLayout><OptionsChain /></TerminalLayout></ProtectedRoute>} />
    <Route path="/sectors" element={<ProtectedRoute><TerminalLayout><Sectors /></TerminalLayout></ProtectedRoute>} />
    <Route path="/sectors/:sector" element={<ProtectedRoute><TerminalLayout><Sectors /></TerminalLayout></ProtectedRoute>} />
    <Route path="/fii-dii" element={<ProtectedRoute><TerminalLayout><FiiDii /></TerminalLayout></ProtectedRoute>} />
    <Route path="/oi-analysis" element={<ProtectedRoute><TerminalLayout><OIAnalysis /></TerminalLayout></ProtectedRoute>} />
    <Route path="/news" element={<ProtectedRoute><TerminalLayout><News /></TerminalLayout></ProtectedRoute>} />
    <Route path="/stock/:symbol" element={<ProtectedRoute><TerminalLayout><StockDetail /></TerminalLayout></ProtectedRoute>} />
    <Route path="/admin" element={<ProtectedRoute><TerminalLayout><Admin /></TerminalLayout></ProtectedRoute>} />
    <Route path="/charts" element={<Navigate to="/" replace />} />
    <Route path="/charts/:symbol" element={<ProtectedRoute><TerminalLayout><StockDetail /></TerminalLayout></ProtectedRoute>} />
    <Route path="*" element={<NotFound />} />
  </Routes>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <AppRoutes />
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
