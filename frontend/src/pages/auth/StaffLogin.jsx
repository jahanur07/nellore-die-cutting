import { useState } from "react";
import {
  FaHeadphones,
  FaLock,
  FaSignInAlt,
  FaSyncAlt,
  FaUser,
  FaUsers,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import { setAuthToken } from "../../services/api";
import { loginStaffWithMpin } from "../../services/authService";

function StaffLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [mpin, setMpin] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !mpin) {
      setError("Enter your staff User ID and MPIN.");
      return;
    }

    if (!/^\d{4,6}$/.test(mpin)) {
      setError("MPIN must contain 4 to 6 digits.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await loginStaffWithMpin(username.trim(), mpin);

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
          ? "Invalid staff User ID or MPIN."
          : "Unable to connect to the server."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleClear = () => {
    setUsername("");
    setMpin("");
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

            <label htmlFor="staff-mpin">MPIN</label>
            <div className="staff-login-input">
              <FaLock />
              <input id="staff-mpin" type="password" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="Enter MPIN" value={mpin} onChange={(event) => setMpin(event.target.value.replace(/\D/g, "").slice(0, 6))} />
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
