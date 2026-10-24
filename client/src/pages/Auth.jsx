import { useState } from "react";
import { request } from "../services/api";
import "./Auth.css";

function Visual() {
  return (
    <aside className="turf-auth-visual">
      <div className="turf-auth-visual__header">
        <span className="turf-auth-brand">
          <img src="/legacy/assets/images/favicon.png" alt="TURF" />
          TURF
        </span>
        <span>SMART SPORTS BOOKING</span>
      </div>
      <div>
        <p className="turf-auth-eyebrow">READY WHEN YOU ARE</p>
        <h2>Welcome back<br />to the game.</h2>
        <p>Manage your bookings, digital entry passes, venue slots, and tournament updates in one place.</p>
      </div>
      <ul>
        <li>
          <i>✓</i>
          <span><b>Instant slot booking</b><small>Find and reserve top turf in seconds</small></span>
        </li>
        <li>
          <i>✓</i>
          <span><b>Digital QR entry passes</b><small>Show your phone at the scanner gate</small></span>
        </li>
        <li>
          <i>✓</i>
          <span><b>Venue & tournament hub</b><small>Host or join verified competitions</small></span>
        </li>
      </ul>
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
    <>
      <div>
        <span className="form-kicker">EMAIL VERIFICATION</span>
        <h1>Verify account</h1>
        <p>Enter the six-digit OTP sent to <strong>{email}</strong>.</p>
      </div>
      <label>
        6-Digit Verification Code
        <input
          required
          inputMode="numeric"
          maxLength="6"
          placeholder="123456"
          value={otp}
          onChange={(event) => setOtp(event.target.value)}
          style={{ letterSpacing: "4px", fontSize: "1.2rem", textAlign: "center" }}
        />
      </label>
      <div className="auth-form__actions" style={{ marginTop: "16px" }}>
        <button
          type="button"
          className="auth-btn auth-btn--primary"
          onClick={verify}
          disabled={busy || otp.length < 4}
        >
          {busy ? "Verifying…" : "Verify and Continue"}
        </button>
      </div>
    </>
  );
}

export default function Auth({ onLogin, showNotice, goHome }) {
  const [mode, setMode] = useState("login");
  const [accountType, setAccountType] = useState("customer"); // customer | playground-admin
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      const endpoint = accountType === "playground-admin" ? "/auth/register-playground" : "/auth/register";
      await request(endpoint, {
        method: "POST",
        body: form
      });
      setPending(true);
      showNotice("Registration successful! We sent a 6-digit OTP code to your email.");
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next) => {
    setMode(next);
    setPending(false);
  };

  return (
    <main className="turf-auth-page">
      <section className="turf-auth-card">
        <Visual />
        <form className="turf-auth-form" onSubmit={submit}>
          <button type="button" className="auth-back" onClick={goHome}>
            ← Back to home
          </button>

          {pending ? (
            <OtpVerify email={form.email} showNotice={showNotice} onDone={() => switchMode("login")} />
          ) : (
            <>
              <div>
                <span className="form-kicker">{mode === "login" ? "ACCOUNT ACCESS" : "JOIN TURF"}</span>
                <h1>{mode === "login" ? "Sign in" : "Create account"}</h1>
                <p>
                  {mode === "login"
                    ? "Enter your registered email and password to access your dashboard."
                    : "Register to reserve sports venues, access QR passes, and compete in tournaments."}
                </p>
              </div>

              {mode === "register" && (
                <>
                  {/* Account Type Selector */}
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px", display: "block" }}>
                      I am registering as:
                    </label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                      <button
                        type="button"
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          border: `2px solid ${accountType === "customer" ? "#16a34a" : "#cbd5e1"}`,
                          background: accountType === "customer" ? "#f0fdf4" : "#fff",
                          color: accountType === "customer" ? "#15803d" : "#475569",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: "pointer"
                        }}
                        onClick={() => setAccountType("customer")}
                      >
                        ⚽ Player / Customer
                      </button>
                      <button
                        type="button"
                        style={{
                          padding: "10px",
                          borderRadius: "10px",
                          border: `2px solid ${accountType === "playground-admin" ? "#16a34a" : "#cbd5e1"}`,
                          background: accountType === "playground-admin" ? "#f0fdf4" : "#fff",
                          color: accountType === "playground-admin" ? "#15803d" : "#475569",
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          cursor: "pointer"
                        }}
                        onClick={() => setAccountType("playground-admin")}
                      >
                        🏟 Venue Admin
                      </button>
                    </div>
                  </div>

                  <label>
                    Full Name
                    <input required placeholder="Your full name" value={form.name} onChange={update("name")} />
                  </label>

                  <label>
                    Mobile Phone
                    <input required type="tel" placeholder="01XXXXXXXXX" value={form.phone} onChange={update("phone")} />
                  </label>
                </>
              )}

              <label>
                Email Address
                <input required type="email" placeholder="name@example.com" value={form.email} onChange={update("email")} />
              </label>

              <label style={{ position: "relative" }}>
                Password
                <input
                  required
                  minLength="6"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your secure password"
                  value={form.password}
                  onChange={update("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "12px",
                    top: "35px",
                    background: "none",
                    border: "none",
                    color: "#64748b",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    padding: 0
                  }}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </label>

              <div className="auth-form__actions">
                <button className="auth-btn auth-btn--primary" disabled={busy}>
                  {busy ? "Please wait…" : mode === "login" ? "Sign in to Dashboard" : "Register Account"}
                </button>
              </div>

              <p className="auth-footer">
                {mode === "login" ? (
                  <>
                    New to TURF?{" "}
                    <button type="button" onClick={() => switchMode("register")}>
                      Create an account
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button type="button" onClick={() => switchMode("login")}>
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </>
          )}
        </form>
      </section>
    </main>
  );
}
