import { useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEye,
  FaEyeSlash,
  FaLock,
  FaShieldAlt,
} from "react-icons/fa";
import { Link, useParams } from "react-router-dom";

import { confirmPasswordReset } from "../../services/authService";

function ResetPasswordPage() {
  const { uid, token } = useParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!password || !confirmPassword) {
      setError("Enter and confirm your new password.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const data = await confirmPasswordReset({
        uid,
        token,
        password,
        confirm_password: confirmPassword,
      });
      setSuccess(data.detail);
      setPassword("");
      setConfirmPassword("");
    } catch (resetError) {
      const responseData = resetError.response?.data;
      const passwordError = responseData?.password?.[0];
      const tokenError = responseData?.token?.[0];
      setError(
        passwordError
        || tokenError
        || responseData?.detail
        || "Unable to reset your password. Request a new reset link and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-shell" aria-label="Choose a new password">
        <div className="admin-login-brand">
          <div className="admin-login-mark" aria-label="NDC">NDC</div>
          <div className="admin-login-name">NELLORE</div>
          <div className="admin-login-service">DIE CUTTING</div>
          <p><span /> Jewellery Die Cutting <span /></p>
        </div>

        <div className="admin-login-heading">
          <h1>CHOOSE A PASSWORD</h1>
          <p>Create a new password for your account.</p>
        </div>

        <section className="admin-login-card">
          <div className="admin-login-welcome">
            <div className="admin-login-welcome-icon"><FaLock /></div>
            <div>
              <h2>New password</h2>
              <p>Use a password that is difficult to guess.</p>
            </div>
          </div>

          {success ? (
            <div className="auth-flow-complete">
              <FaCheckCircle />
              <p>{success}</p>
              <Link className="admin-login-submit" to="/admin-login">Go to Admin Login</Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate>
              <div className="admin-login-field">
                <label htmlFor="new-password">New password</label>
                <div className="admin-login-input">
                  <FaLock />
                  <input
                    id="new-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Enter a new password"
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
                <label htmlFor="confirm-password">Confirm password</label>
                <div className="admin-login-input">
                  <FaLock />
                  <input
                    id="confirm-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                </div>
              </div>

              {error && <p className="admin-login-error" role="alert">{error}</p>}

              <button className="admin-login-submit" type="submit" disabled={submitting}>
                <FaLock />
                <span>{submitting ? "Updating..." : "Update Password"}</span>
              </button>
            </form>
          )}

          {!success && (
            <p className="auth-flow-back">
              <Link to="/forgot-password"><FaArrowLeft /> Request a new reset link</Link>
            </p>
          )}
        </section>

        <footer className="admin-login-footer">
          <p><FaShieldAlt /> This reset link can only be used once.</p>
        </footer>
      </section>
    </main>
  );
}

export default ResetPasswordPage;