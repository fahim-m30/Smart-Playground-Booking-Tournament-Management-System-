import { useState } from "react";
import { request } from "../services/api";
import "./Auth.css";

function Visual({ mode }) {
  return (
    <aside className="turf-auth-visual">
      <div className="turf-auth-visual__header">
        <div className="turf-auth-brand">
          <img src="/legacy/assets/images/favicon.png" alt="TURF" />
          <span>TURF</span>
        </div>
        <span className="turf-auth-badge">SPORTS ECOSYSTEM</span>
      </div>

      <div className="turf-auth-visual__body">
        <span className="turf-auth-eyebrow">READY WHEN YOU ARE</span>
        <h2>
          {mode === "login" ? (
            <>Welcome back<br />to the pitch.</>
          ) : mode === "forgot" ? (
            <>Account<br />Recovery.</>
          ) : (
            <>Join the game.<br />Play without limits.</>
          )}
        </h2>
        <p>
          {mode === "login"
            ? "Manage your match bookings, digital entry passes, and tournament updates in one unified hub."
            : mode === "forgot"
            ? "Recover your password securely using multi-factor email verification."
            : "Reserve premium turf venues across Dhaka, generate digital QR tickets, and compete with top teams."}
        </p>

        <ul className="turf-auth-perks">
          <li>
            <div className="perk-icon">⚡</div>
            <div>
              <strong>Instant Slot Booking</strong>
              <small>Real-time turf availability with instant confirmation</small>
            </div>
          </li>
          <li>
            <div className="perk-icon">🎟️</div>
            <div>
              <strong>Digital QR Gate Passes</strong>
              <small>Flash your phone at the gate for fast, touchless entry</small>
            </div>
          </li>
          <li>
            <div className="perk-icon">🏆</div>
            <div>
              <strong>Tournaments &amp; Standings</strong>
              <small>Live tournament fixtures, group tables, and match results</small>
            </div>
          </li>
        </ul>
      </div>

      <div className="turf-auth-visual__footer">
        <div className="auth-trust-pill">
          <span className="trust-dot" />
          <span>50+ Verified Venues · 10,000+ Bookings · 24/7 Gate Verification</span>
        </div>
      </div>
    </aside>
  );
}

function OtpVerify({ email, showNotice, onDone }) {
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      await request("/auth/verify-otp", { method: "POST", body: { email, otp } });
      showNotice("Email verified successfully! You can now sign in.");
      if (onDone) onDone();
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="otp-container">
      <div className="form-head">
        <span className="form-kicker">SECURITY CHECK</span>
        <h1>Verify account</h1>
        <p>We sent a 6-digit verification code to <strong>{email}</strong>.</p>
      </div>

      <label className="auth-field">
        <span className="field-label">6-Digit Verification Code</span>
        <input
          required
          inputMode="numeric"
          maxLength="6"
          placeholder="••••••"
          value={otp}
          onChange={(event) => setOtp(event.target.value.replace(/\D/g, ""))}
          className="auth-input otp-input"
        />
      </label>

      <div className="auth-form__actions">
        <button
          type="button"
          className="auth-submit-btn"
          onClick={verify}
          disabled={busy || otp.length < 4}
        >
          {busy ? "Verifying code…" : "Verify & Continue"}
        </button>
      </div>
    </div>
  );
}

export default function Auth({ onLogin, showNotice, goHome }) {
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [accountType, setAccountType] = useState("customer"); // customer | playground-admin
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Forgot Password Multi-Step State
  const [forgotStep, setForgotStep] = useState(1); // 1 = request email, 2 = verify otp & set new password
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    try {
      setBusy(true);
      if (mode === "login") {
        const session = await request("/auth/login", {
          method: "POST",
          body: { email: form.email, password: form.password }
        });
        return onLogin(session);
      }

      if (mode === "register") {
        const endpoint = accountType === "playground-admin" ? "/auth/register-playground" : "/auth/register";
        await request(endpoint, {
          method: "POST",
          body: form
        });
        setPending(true);
        showNotice("Registration successful! We sent a 6-digit OTP code to your email.");
      }
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  // Handle Forgot Password Request (Step 1)
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!form.email) return showNotice("Please enter your registered email address.", "error");
    setBusy(true);
    try {
      await request("/auth/forgot-password", {
        method: "POST",
        body: { email: form.email.trim() }
      });
      setForgotStep(2);
      showNotice(`Verification code sent to ${form.email}. Please check your inbox.`);
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  // Handle Reset Password (Step 2)
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!forgotOtp || forgotOtp.length < 4) return showNotice("Please enter the 6-digit verification code.", "error");
    if (newPassword.length < 6) return showNotice("Password must be at least 6 characters long.", "error");
    if (newPassword !== confirmPassword) return showNotice("Passwords do not match.", "error");

    setBusy(true);
    try {
      await request("/auth/reset-password", {
        method: "POST",
        body: {
          email: form.email.trim(),
          otp: forgotOtp.trim(),
          newPassword
        }
      });
      showNotice("Password reset successfully! Please sign in with your new password.");
      setMode("login");
      setForgotStep(1);
      setForgotOtp("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      showNotice(err.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setPending(false);
    setForgotStep(1);
  };

  return (
    <main className="turf-auth-page">
      <section className="turf-auth-card">
        {/* Left Visual Hero */}
        <Visual mode={mode} />

        {/* Right Form Card */}
        <div className="turf-auth-form-wrap">
          {/* Top Bar with Back Link & Mode Tabs */}
          <div className="auth-topbar">
            <button type="button" className="auth-back-link" onClick={goHome}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              <span>Back to home</span>
            </button>

            {/* Segmented Mode Switcher (Sign In vs Register) */}
            <div className="auth-mode-tabs">
              <button
                type="button"
                className={`mode-tab ${mode === "login" ? "active" : ""}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                type="button"
                className={`mode-tab ${mode === "register" ? "active" : ""}`}
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </div>
          </div>

          {/* FORGOT PASSWORD WORKFLOW */}
          {mode === "forgot" ? (
            <div className="turf-auth-form">
              <div className="form-head">
                <span className="form-kicker">PASSWORD RECOVERY</span>
                <h1>Reset your password</h1>
                <p>
                  {forgotStep === 1
                    ? "Enter your registered email address and we'll send a 6-digit verification code."
                    : `Enter the 6-digit code sent to ${form.email} and set your new password.`}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label className="auth-field">
                    <span className="field-label">Registered Email Address</span>
                    <input
                      required
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={update("email")}
                      className="auth-input"
                    />
                  </label>

                  <div className="auth-form__actions">
                    <button type="submit" className="auth-submit-btn" disabled={busy}>
                      {busy ? "Sending code…" : "Send Reset Code →"}
                    </button>
                  </div>

                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="auth-back-link"
                      style={{ margin: "0 auto" }}
                      onClick={() => switchMode("login")}
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <label className="auth-field">
                    <span className="field-label">6-Digit Verification Code</span>
                    <input
                      required
                      inputMode="numeric"
                      maxLength="6"
                      placeholder="123456"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                      className="auth-input otp-input"
                    />
                  </label>

                  <label className="auth-field">
                    <span className="field-label">New Password</span>
                    <div className="password-input-wrap">
                      <input
                        required
                        minLength="6"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="At least 6 characters"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="auth-input password-input"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? "Hide" : "Show"}
                      </button>
                    </div>
                  </label>

                  <label className="auth-field">
                    <span className="field-label">Confirm New Password</span>
                    <input
                      required
                      minLength="6"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="Re-enter your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="auth-input"
                    />
                  </label>

                  <div className="auth-form__actions">
                    <button type="submit" className="auth-submit-btn" disabled={busy}>
                      {busy ? "Updating password…" : "Reset & Save Password →"}
                    </button>
                  </div>

                  <div style={{ textAlign: "center", marginTop: "10px" }}>
                    <button
                      type="button"
                      className="auth-back-link"
                      style={{ margin: "0 auto" }}
                      onClick={() => switchMode("login")}
                    >
                      ← Back to sign in
                    </button>
                  </div>
                </form>
              )}

              <div className="auth-footer" style={{ marginTop: "24px" }}>
                <p className="auth-security-note">🔒 256-bit SSL encrypted · Multi-factor email verification</p>
              </div>
            </div>
          ) : (
            /* LOGIN & REGISTRATION WORKFLOW */
            <form className="turf-auth-form" onSubmit={submit}>
              {pending ? (
                <OtpVerify email={form.email} showNotice={showNotice} onDone={() => switchMode("login")} />
              ) : (
                <>
                  <div className="form-head">
                    <span className="form-kicker">
                      {mode === "login" ? "ACCOUNT ACCESS" : "GET STARTED"}
                    </span>
                    <h1>{mode === "login" ? "Sign in to TURF" : "Create your account"}</h1>
                    <p>
                      {mode === "login"
                        ? "Enter your registered email and password to access your dashboard."
                        : "Create an account to book venues, get digital passes, and compete in tournaments."}
                    </p>
                  </div>

                  {mode === "register" && (
                    <>
                      {/* Account Type Selector Cards */}
                      <div className="account-type-group">
                        <span className="field-label">I WANT TO REGISTER AS:</span>
                        <div className="account-type-grid">
                          <button
                            type="button"
                            className={`account-type-card ${accountType === "customer" ? "active" : ""}`}
                            onClick={() => setAccountType("customer")}
                          >
                            <span className="card-emoji">⚽</span>
                            <div className="card-info">
                              <strong>Player / Customer</strong>
                              <small>Book turfs &amp; join tournaments</small>
                            </div>
                            <span className="card-check">✓</span>
                          </button>

                          <button
                            type="button"
                            className={`account-type-card ${accountType === "playground-admin" ? "active" : ""}`}
                            onClick={() => setAccountType("playground-admin")}
                          >
                            <span className="card-emoji">🏟️</span>
                            <div className="card-info">
                              <strong>Venue Owner</strong>
                              <small>List playground &amp; manage slots</small>
                            </div>
                            <span className="card-check">✓</span>
                          </button>
                        </div>
                      </div>

                      <label className="auth-field">
                        <span className="field-label">Full Name</span>
                        <input
                          required
                          placeholder="e.g. Fahim Muntasir"
                          value={form.name}
                          onChange={update("name")}
                          className="auth-input"
                        />
                      </label>

                      <label className="auth-field">
                        <span className="field-label">Mobile Phone</span>
                        <input
                          required
                          type="tel"
                          placeholder="01XXXXXXXXX"
                          value={form.phone}
                          onChange={update("phone")}
                          className="auth-input"
                        />
                      </label>
                    </>
                  )}

                  <label className="auth-field">
                    <span className="field-label">Email Address</span>
                    <input
                      required
                      type="email"
                      placeholder="name@example.com"
                      value={form.email}
                      onChange={update("email")}
                      className="auth-input"
                    />
                  </label>

                  <label className="auth-field">
                    <div className="label-row">
                      <span className="field-label">Password</span>
                      {mode === "login" && (
                        <button
                          type="button"
                          className="label-hint-btn"
                          onClick={() => setMode("forgot")}
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="password-input-wrap">
                      <input
                        required
                        minLength="6"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your secure password"
                        value={form.password}
                        onChange={update("password")}
                        className="auth-input password-input"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                            <line x1="1" y1="1" x2="23" y2="23" />
                          </svg>
                        ) : (
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                        <span>{showPassword ? "Hide" : "Show"}</span>
                      </button>
                    </div>
                  </label>

                  <div className="auth-form__actions">
                    <button type="submit" className="auth-submit-btn" disabled={busy}>
                      {busy ? (
                        <span className="btn-spinner-wrap">
                          <span className="btn-spinner" />
                          <span>Processing…</span>
                        </span>
                      ) : mode === "login" ? (
                        "Sign in to Dashboard →"
                      ) : (
                        "Create Account & Continue →"
                      )}
                    </button>
                  </div>

                  {/* Clean Trust & Security Footer (No duplicate registration text) */}
                  <div className="auth-footer">
                    <p className="auth-security-note">🔒 Secured by TURF 256-bit SSL · Instant venue gate entry</p>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
