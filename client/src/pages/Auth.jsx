import { useState } from "react";
import { request } from "../services/api";
import "./Auth.css";

function Visual() {
  return <aside className="turf-auth-visual"><div className="turf-auth-visual__header"><span className="turf-auth-brand"><img src="/legacy/assets/images/favicon.png" alt=""/>TURF</span><span>SMART SPORTS BOOKING</span></div><div><p className="turf-auth-eyebrow">READY WHEN YOU ARE</p><h2>Welcome back<br/>to the game.</h2><p>Manage your bookings, entry passes, and tournament updates from one secure place.</p></div><ul><li><i>✓</i><span><b>Secure access</b><small>Your account, protected</small></span></li><li><i>✓</i><span><b>Book in seconds</b><small>Find and reserve a slot fast</small></span></li><li><i>✓</i><span><b>Entry pass ready</b><small>Keep your QR tickets together</small></span></li></ul></aside>;
}

function OtpVerify({ email, showNotice }) {
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const verify = async (event) => { event.preventDefault(); try { setBusy(true); await request("/auth/verify-otp", { method: "POST", body: { email, otp } }); showNotice("Email verified. You can sign in now."); } catch (error) { showNotice(error.message, "error"); } finally { setBusy(false); } };
  return <><h1>Verify email</h1><p>Enter the six-digit code sent to {email}.</p><label>Verification code<input required inputMode="numeric" maxLength="6" value={otp} onChange={(event) => setOtp(event.target.value)}/></label><button type="button" className="auth-btn auth-btn--primary" onClick={verify} disabled={busy}>{busy ? "Verifying..." : "Verify account"}</button></>;
}

export default function Auth({ onLogin, showNotice, goHome }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const update = (field) => (event) => setForm({ ...form, [field]: event.target.value });
  const submit = async (event) => { event.preventDefault(); try { setBusy(true); if (mode === "login") return onLogin(await request("/auth/login", { method: "POST", body: { email: form.email, password: form.password } })); await request("/auth/register", { method: "POST", body: form }); setPending(true); showNotice("We sent a verification code to your email."); } catch (error) { showNotice(error.message, "error"); } finally { setBusy(false); } };
  const switchMode = (next) => { setMode(next); setPending(false); };

  return <main className="turf-auth-page"><section className="turf-auth-card"><Visual/><form className="turf-auth-form" onSubmit={submit}><button type="button" className="auth-back" onClick={goHome}>← Back to home</button>{pending ? <OtpVerify email={form.email} showNotice={showNotice}/> : <><div><span className="form-kicker">{mode === "login" ? "ACCOUNT ACCESS" : "JOIN TURF"}</span><h1>{mode === "login" ? "Login" : "Create account"}</h1><p>{mode === "login" ? "Enter your registered email and password to access your account." : "Create an account to book playgrounds and join tournaments."}</p></div>{mode === "register" && <><label>Full name<input required value={form.name} onChange={update("name")}/></label><label>Mobile number<input required value={form.phone} onChange={update("phone")}/></label></>}<label>Email address<input required type="email" placeholder="name@example.com" value={form.email} onChange={update("email")}/></label><label>Password<input required minLength="6" type="password" placeholder="Enter your password" value={form.password} onChange={update("password")}/></label><div className="auth-form__actions"><button className="auth-btn auth-btn--primary" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Login" : "Create account"}</button>{mode === "login" && <button type="button" className="auth-link-button">Forgot password?</button>}</div><p className="auth-footer">{mode === "login" ? <>New to TURF? <button type="button" onClick={() => switchMode("register")}>Create your account</button></> : <>Already have an account? <button type="button" onClick={() => switchMode("login")}>Login</button></>}</p></>}</form></section></main>;
}
