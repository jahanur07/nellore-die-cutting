import { useState } from "react";
import {
  FaEye,
  FaEyeSlash,
  FaHeadphones,
  FaLock,
  FaSignInAlt,
  FaSyncAlt,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import { setAuthToken } from "../../services/api";
import { loginUser } from "../../services/authService";

function StaffLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !password) {
      setError("Enter your staff username and password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await loginUser(username.trim(), password);

      if (data?.user?.is_superuser) {
        setError("Administrators must sign in from the Admin Login page.");
        return;
      }

      setAuthToken(data.access);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (loginError) {
      console.error("Staff login error:", loginError);
      setError(
        loginError.response?.status === 400
          ? "Invalid staff username or password."
          : "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setUsername("");
    setPassword("");
    setError("");
  };

  return (
    <main className="staff-login-page">
      <section className="staff-login-shell" aria-label="Nellore Die Cutting staff login">
        <header className="staff-login-brand">
          <div className="staff-login-badge"><span>NDC</span></div>
          <p>NELLORE</p>
          <h1>DIE CUTTING</h1>
          <div className="staff-login-tagline"><span />Jewellery Die Cutting<span /></div>
        </header>

        <section className="staff-login-card">
          <div className="staff-login-intro">
            <FaUsers />
            <h2>STAFF LOGIN</h2>
          </div>
          <div className="staff-login-intro-divider"><span /></div>

          <form onSubmit={handleLogin} noValidate>
            <label htmlFor="staff-username">User ID</label>
            <div className="staff-login-input">
              <FaUser />
              <input id="staff-username" type="text" autoComplete="username" placeholder="Enter User ID" value={username} onChange={(event) => setUsername(event.target.value)} />
            </div>

            <label htmlFor="staff-password">Password</label>
            <div className="staff-login-input">
              <FaLock />
              <input id="staff-password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Enter Password" value={password} onChange={(event) => setPassword(event.target.value)} />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>

            {error && <p className="staff-login-error" role="alert">{error}</p>}
            <button className="staff-login-submit" type="submit" disabled={submitting}>
              <FaSignInAlt />
              <span>{submitting ? "Signing in..." : "LOGIN"}</span>
            </button>
            <button className="staff-login-clear" type="button" onClick={handleClear} disabled={submitting}>
              <FaSyncAlt />
              <span>CLEAR</span>
            </button>
          </form>
        </section>

        <footer className="staff-login-footer">
          <span className="staff-login-footer-line" />
          <div className="staff-login-help-content">
            <FaHeadphones />
            <span>Need Help? Contact Admin</span>
            <Link to="/admin-login">Admin Login</Link>
          </div>
          <span className="staff-login-footer-line" />
        </footer>
      </section>
    </main>
  );
}

export default StaffLogin;
