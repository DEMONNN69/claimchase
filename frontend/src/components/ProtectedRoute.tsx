import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({ children, requireOnboarding = false }: ProtectedRouteProps) {
  const { user, isLoggedIn, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not logged in
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if user needs onboarding (no first_name or last_name)
  const needsOnboarding = !user?.first_name || !user?.last_name;

  // If user has completed profile and tries to access onboarding, redirect to dashboard
  if (!needsOnboarding && location.pathname === "/onboarding") {
    return <Navigate to="/dashboard" replace />;
  }

  // If this is the onboarding route, user must need onboarding
  if (location.pathname === "/onboarding") {
    if (needsOnboarding) {
      return <>{children}</>;
    }
    // If profile is complete, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  // For all other protected routes, redirect incomplete profiles to onboarding
  if (needsOnboarding && requireOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}

