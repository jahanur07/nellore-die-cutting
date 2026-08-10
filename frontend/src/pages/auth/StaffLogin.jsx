import { useRef, useState } from "react";
import {
  FaHeadphones,
  FaShieldAlt,
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
  const mpinInputRefs = useRef([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!username.trim() || !mpin) {
      setError("Enter your staff User ID and MPIN.");
      return;
    }

    if (!/^\d{4}$/.test(mpin)) {
      setError("MPIN must contain exactly 4 digits.");
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

  const handleMpinChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = mpin.padEnd(4, "").split("");
    next[index] = digit;
    const nextMpin = next.join("").replace(/\s/g, "");
    setMpin(nextMpin);
    if (digit && index < 3) {
      mpinInputRefs.current[index + 1]?.focus();
    }
  };

  const handleMpinKeyDown = (index, event) => {
    if (event.key === "Backspace" && !mpin[index] && index > 0) {
      mpinInputRefs.current[index - 1]?.focus();
    }
  };

  const handleMpinPaste = (event) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    setMpin(pasted);
    mpinInputRefs.current[Math.min(pasted.length, 3)]?.focus();
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

            <label className="staff-mpin-label" htmlFor="staff-mpin-0">mPIN</label>
            <div className="staff-mpin-entry" role="group" aria-label="Enter your staff MPIN">
              {Array.from({ length: 4 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => { mpinInputRefs.current[index] = element; }}
                  id={`staff-mpin-${index}`}
                  className="staff-mpin-digit"
                  type="password"
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength="1"
                  value={mpin[index] || ""}
                  onChange={(event) => handleMpinChange(index, event.target.value)}
                  onKeyDown={(event) => handleMpinKeyDown(index, event)}
                  onPaste={index === 0 ? handleMpinPaste : undefined}
                  aria-label={`MPIN digit ${index + 1}`}
                />
              ))}
            </div>
            <div className="staff-mpin-hint">
              <FaShieldAlt />
              <span>Enter your 4-digit MPIN to continue</span>
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
