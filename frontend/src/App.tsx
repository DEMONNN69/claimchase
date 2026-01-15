import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AppLayout } from "./components/AppLayout";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import StartGreivance from "./pages/StartGreivance";
import Drafter from "./pages/Drafter";
import Guide from "./pages/Guide";
import Handoff from "./pages/Handoff";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import GmailCallback from "./pages/GmailCallback";
import ConsumerDispute from "./pages/ConsumerDispute";
import DisputesList from "./pages/DisputesList";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public Gmail OAuth callback endpoint used by popup redirect */}
            <Route path="/gmail/callback" element={<GmailCallback />} />
            <Route element={<AppLayout />}>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requireOnboarding>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/start-grievance" element={
                <ProtectedRoute requireOnboarding>
                  <StartGreivance />
                </ProtectedRoute>
              } />
              <Route path="/drafter" element={
                <ProtectedRoute requireOnboarding>
                  <Drafter />
                </ProtectedRoute>
              } />
              <Route path="/guide" element={
                <ProtectedRoute requireOnboarding>
                  <Guide />
                </ProtectedRoute>
              } />
              <Route path="/handoff" element={
                <ProtectedRoute requireOnboarding>
                  <Handoff />
                </ProtectedRoute>
              } />
              <Route path="/settings" element={
                <ProtectedRoute requireOnboarding>
                  <Settings />
                </ProtectedRoute>
              } />
              <Route path="/disputes" element={
                <ProtectedRoute requireOnboarding>
                  <DisputesList />
                </ProtectedRoute>
              } />
              <Route path="/disputes/new" element={
                <ProtectedRoute requireOnboarding>
                  <ConsumerDispute />
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
