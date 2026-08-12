import { useEffect } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { isAuthenticated, logoutUser } from "../services/authService";

// ProtectedRoute wraps pages that require login.
// If the staff member is NOT logged in, they are redirected to /login.
// If they ARE logged in, the requested page is shown normally.
function ProtectedRoute({ children, requireAdmin = false }) {
  const navigate = useNavigate();

  useEffect(() => {
    const expiresAt = Number(localStorage.getItem("sessionExpiresAt") || 0);
    if (!expiresAt) return undefined;

    const remaining = expiresAt - Date.now();
    if (remaining <= 0) {
      logoutUser();
      navigate("/login?session=expired", { replace: true });
      return undefined;
    }

    const timer = window.setTimeout(() => {
      logoutUser();
      navigate("/login?session=expired", { replace: true });
    }, remaining);

    return () => window.clearTimeout(timer);
  }, [navigate]);

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin) {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "null");
      if (!user?.is_superuser) {
        return <Navigate to="/dashboard" replace />;
      }
    } catch {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;
