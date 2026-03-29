import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import TerminalLayout from "@/components/TerminalLayout";

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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <TerminalLayout>
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/heatmap" element={<Heatmap />} />
              <Route path="/scanner" element={<Scanner />} />
              <Route path="/scanner/:key" element={<Scanner />} />
              <Route path="/screener" element={<Navigate to="/scanner" replace />} />
              <Route path="/options" element={<OptionsChain />} />
              <Route path="/options/:symbol" element={<OptionsChain />} />
              <Route path="/sectors" element={<Sectors />} />
              <Route path="/sectors/:sector" element={<Sectors />} />
              <Route path="/fii-dii" element={<FiiDii />} />
              <Route path="/oi-analysis" element={<OIAnalysis />} />
              <Route path="/news" element={<News />} />
              <Route path="/stock/:symbol" element={<StockDetail />} />
              {/* Redirect old chart routes to stock detail */}
              <Route path="/charts" element={<Navigate to="/" replace />} />
              <Route path="/charts/:symbol" element={<StockDetail />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </TerminalLayout>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
