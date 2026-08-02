import { useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
  FaUser,
} from "react-icons/fa";
import { Link, useNavigate } from "react-router-dom";

import { setAuthToken } from "../../services/api";
import { createInitialAdmin, getAdminSetupStatus } from "../../services/authService";

function AdminSetupPage() {
  const navigate = useNavigate();
  const [setupAllowed, setSetupAllowed] = useState(null);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSetupStatus = async () => {
      try {
        const data = await getAdminSetupStatus();
        if (active) {
          setSetupAllowed(data.setup_allowed);
        }
      } catch {
        if (active) {
          setError("Unable to check administrator setup status.");
        }
      }
    };

    loadSetupStatus();

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!username.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Complete every field to create the administrator account.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await createInitialAdmin({
        username: username.trim(),
        email: email.trim(),
        password,
        confirm_password: confirmPassword,
      });
      setAuthToken(data.access);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/admin-dashboard");
    } catch (setupError) {
      const responseData = setupError.response?.data;
      setError(
        responseData?.username?.[0]
        || responseData?.email?.[0]
        || responseData?.password?.[0]
        || responseData?.confirm_password?.[0]
        || responseData?.detail
        || "Unable to create the administrator account."
      );
      if (setupError.response?.status === 403) {
        setSetupAllowed(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-shell" aria-label="Initial administrator setup">
        <div className="admin-login-brand">
          <div className="admin-login-mark" aria-label="NDC">NDC</div>
          <div className="admin-login-name">NELLORE</div>
          <div className="admin-login-service">DIE CUTTING</div>
          <p><span /> Jewellery Die Cutting <span /></p>
        </div>

        <div className="admin-login-heading">
          <h1>ADMIN SETUP</h1>
          <p>Create the first administrator account for this installation.</p>
        </div>

        <section className="admin-login-card">
          <div className="admin-login-welcome">
            <div className="admin-login-welcome-icon"><FaShieldAlt /></div>
            <div>
              <h2>Initial setup</h2>
              <p>This option closes after the first admin is created.</p>
            </div>
          </div>

          {setupAllowed === null && !error && (
            <p className="auth-flow-status" role="status">Checking setup status...</p>
          )}

          {setupAllowed === false ? (
            <div className="auth-flow-complete">
              <FaShieldAlt />
              <p>An administrator account already exists for this installation.</p>
              <Link className="admin-login-submit" to="/admin-login">Go to Admin Login</Link>
            </div>
          ) : setupAllowed ? (
            <form onSubmit={handleSubmit} noValidate>
              <div className="admin-login-field">
                <label htmlFor="setup-username">Username</label>
                <div className="admin-login-input">
                  <FaUser />
                  <input
                    id="setup-username"
                    type="text"
                    autoComplete="username"
                    placeholder="Create an admin username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-login-field">
                <label htmlFor="setup-email">Email address</label>
                <div className="admin-login-input">
                  <FaUser />
                  <input
                    id="setup-email"
                    type="email"
                    autoComplete="email"
                    placeholder="Enter an email for password recovery"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div className="admin-login-field">
                <label htmlFor="setup-password">Password</label>
                <div className="admin-login-input">
                  <FaLock />
                  <input
                    id="setup-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Create a password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="admin-login-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div className="admin-login-field">
                <label htmlFor="setup-confirm-password">Confirm password</label>
                <div className="admin-login-input">
                  <FaLock />
                  <input
                    id="setup-confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>

              {error && <p className="admin-login-error" role="alert">{error}</p>}

              <button className="admin-login-submit" type="submit" disabled={submitting}>
                <FaShieldAlt />
                <span>{submitting ? "Creating..." : "Create Admin Account"}</span>
              </button>
            </form>
          ) : error ? (
            <p className="admin-login-error" role="alert">{error}</p>
          ) : null}

          <p className="auth-flow-back">
            <Link to="/admin-login"><FaArrowLeft /> Back to Admin Login</Link>
          </p>
        </section>
      </section>
    </main>
  );
}

export default AdminSetupPage;