import { Navigate } from "react-router-dom";
import { isAuthenticated } from "../services/authService";

// ProtectedRoute wraps pages that require login.
// If the staff member is NOT logged in, they are redirected to /login.
// If they ARE logged in, the requested page is shown normally.
function ProtectedRoute({ children, requireAdmin = false }) {
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