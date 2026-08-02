import { useState } from "react";
import { FaArrowLeft, FaEnvelope, FaPaperPlane, FaShieldAlt } from "react-icons/fa";
import { Link } from "react-router-dom";

import { requestPasswordReset } from "../../services/authService";

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim()) {
      setError("Enter the email address linked to your account.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const data = await requestPasswordReset(email.trim());
      setSuccess(data.detail);
    } catch (requestError) {
      setError(
        requestError.response?.data?.detail
        || "Unable to request a password reset. Please try again later."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-shell" aria-label="Password recovery">
        <div className="admin-login-brand">
          <div className="admin-login-mark" aria-label="NDC">NDC</div>
          <div className="admin-login-name">NELLORE</div>
          <div className="admin-login-service">DIE CUTTING</div>
          <p><span /> Jewellery Die Cutting <span /></p>
        </div>

        <div className="admin-login-heading">
          <h1>RESET PASSWORD</h1>
          <p>We will send a secure reset link to your email address.</p>
        </div>

        <section className="admin-login-card">
          <div className="admin-login-welcome">
            <div className="admin-login-welcome-icon"><FaEnvelope /></div>
            <div>
              <h2>Forgot your password?</h2>
              <p>Enter the email linked to your account.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <div className="admin-login-field">
              <label htmlFor="reset-email">Email address</label>
              <div className="admin-login-input">
                <FaEnvelope />
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
            </div>

            {error && <p className="admin-login-error" role="alert">{error}</p>}
            {success && <p className="auth-flow-success" role="status">{success}</p>}

            <button className="admin-login-submit" type="submit" disabled={submitting}>
              <FaPaperPlane />
              <span>{submitting ? "Sending..." : "Send Reset Link"}</span>
            </button>
          </form>

          <p className="auth-flow-back">
            <Link to="/admin-login"><FaArrowLeft /> Back to Admin Login</Link>
          </p>
        </section>

        <footer className="admin-login-footer">
          <p><FaShieldAlt /> Password reset links expire automatically for your security.</p>
        </footer>
      </section>
    </main>
  );
}

export default ForgotPasswordPage;