import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import LoginPage from "./pages/LoginPage.tsx";
import RegisterPage from "./pages/RegisterPage.tsx";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.tsx";
import AICoach from "./pages/AICoach.tsx";
import Diagnosis from "./pages/Diagnosis.tsx";
import FindHospital from "./pages/FindHospital.tsx";
import ActivityLog from "./pages/ActivityLog.tsx";
import Settings from "./pages/Settings.tsx";
import SahayakAI from "./pages/SahayakAI.tsx";
import ManasMitra from "./pages/ManasMitra.tsx";
import SvasthaQuest from "./pages/SvasthaQuest.tsx";
import MediRush from "./pages/MediRush.tsx";
import MedicalReport from "./pages/MedicalReport.tsx";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem("token");
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const ProtectedAppShell = () => {
  const location = useLocation();
  const isCoachRoute = location.pathname === "/coach" || location.pathname === "/medirush";

  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="h-svh w-full flex overflow-hidden">
        <AppSidebar />
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="lg:hidden flex items-center p-2 border-b border-border">
            <SidebarTrigger />
          </div>
          <div className={`flex-1 min-h-0 ${isCoachRoute ? "overflow-hidden" : "overflow-y-auto overflow-x-hidden"} bg-muted/20`}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/coach" element={<AICoach />} />
              <Route path="/diagnosis" element={<Diagnosis />} />
              <Route path="/meals" element={<Navigate to="/coach" replace />} />
              <Route path="/workouts" element={<Navigate to="/coach" replace />} />
              <Route path="/plans" element={<Navigate to="/coach" replace />} />
              <Route path="/achievements" element={<Navigate to="/svasthaquest" replace />} />
              <Route path="/achievement" element={<Navigate to="/svasthaquest" replace />} />
              <Route path="/achivement" element={<Navigate to="/svasthaquest" replace />} />
              <Route path="/hospitals" element={<FindHospital />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="/sahayak" element={<SahayakAI />} />
              <Route path="/manasmitra" element={<ManasMitra />} />
              <Route path="/svasthaquest" element={<SvasthaQuest />} />
              <Route path="/medirush" element={<MediRush />} />
              <Route path="/medical-report" element={<MedicalReport />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <ProtectedAppShell />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
