import { useState } from "react";
import { FaCheckCircle, FaEye, FaEyeSlash, FaLock, FaShieldAlt, FaUser } from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import { setAuthToken } from "../../services/api";
import { loginUser } from "../../services/authService";

function AdminLogin() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!userId.trim() || !password) {
      setError("Enter your username and password to continue.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await loginUser(userId.trim(), password);

      if (!data?.user?.is_superuser) {
        setError("This account does not have administrator access.");
        return;
      }

      setAuthToken(data.access);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/admin-dashboard");
    } catch (loginError) {
      console.error("Login error:", loginError);
      setError(
        loginError.response?.status === 400
          ? "Invalid username or password."
          : "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-shell" aria-label="Nellore Die Cutting admin login">
        <div className="admin-login-brand">
          <div className="admin-login-mark" aria-label="NDC">NDC</div>
          <div className="admin-login-name">NELLORE</div>
          <div className="admin-login-service">DIE CUTTING</div>
          <p><span /> Jewellery Die Cutting <span /></p>
        </div>

        <div className="admin-login-heading">
          <h1>ADMIN LOGIN</h1>
          <p>Sign in to access the admin panel</p>
        </div>

        <section className="admin-login-card">
          <div className="admin-login-welcome">
            <div className="admin-login-welcome-icon"><FaShieldAlt /></div>
            <div>
              <h2>Welcome Back!</h2>
              <p>Please login to continue</p>
            </div>
          </div>

          <form onSubmit={handleLogin} noValidate>
            <div className="admin-login-field">
              <label htmlFor="admin-username">Username</label>
              <div className="admin-login-input">
                <FaUser />
                <input id="admin-username" type="text" autoComplete="username" placeholder="Enter username" value={userId} onChange={(event) => setUserId(event.target.value)} />
              </div>
            </div>

            <div className="admin-login-field">
              <label htmlFor="admin-password">Password</label>
              <div className="admin-login-input">
                <FaLock />
                <input id="admin-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter password" value={password} onChange={(event) => setPassword(event.target.value)} />
                <button type="button" className="admin-login-visibility" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>

            <div className="admin-login-options">
              <label className="admin-login-remember">
                <input type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} />
                <span>Remember Me</span>
              </label>
              <Link className="admin-login-help" to="/forgot-password">Forgot Password?</Link>
            </div>

            {error && <p className="admin-login-error" role="alert">{error}</p>}
            <button className="admin-login-submit" type="submit" disabled={submitting}><FaLock /><span>{submitting ? "Logging in..." : "Login"}</span></button>
          </form>

          <div className="admin-login-secure"><span /><FaCheckCircle /> Secure Admin Access<span /></div>
          <p className="admin-login-staff-link">Staff member? <Link to="/staff-login">Go to Staff Login</Link></p>
        </section>

        <footer className="admin-login-footer">
          <p><FaShieldAlt /> This is a secure area. Unauthorized access is prohibited.</p>
          <p>&copy; 2026 Nellore Die Cutting. All rights reserved.</p>
        </footer>
      </section>
    </main>
  );
}

export default AdminLogin;
