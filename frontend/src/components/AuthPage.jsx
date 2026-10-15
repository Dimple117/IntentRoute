import { useState } from 'react';
import { apiPublic } from '../api';
import ForgotPasswordModal from './ForgotPasswordModal';

export default function AuthPage({ onLogin, toast }) {
  const [mode, setMode] = useState('login'); // login | signup
  const [showForgot, setShowForgot] = useState(false);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);

  const [name, setName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPass, setSignupPass] = useState('');
  const [signupErr, setSignupErr] = useState('');
  const [signupBusy, setSignupBusy] = useState(false);

  async function doLogin() {
    setLoginErr(''); setLoginBusy(true);
    try {
      const r = await apiPublic('/auth/login', { method: 'POST', body: JSON.stringify({ email: loginEmail.trim(), password: loginPass }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Login failed');
      onLogin(d.token, d.user);
    } catch (e) { setLoginErr(e.message); }
    finally { setLoginBusy(false); }
  }

  async function doSignup() {
    setSignupErr(''); setSignupBusy(true);
    try {
      const r = await apiPublic('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), email: signupEmail.trim(), password: signupPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Signup failed');
      onLogin(d.token, d.user);
    } catch (e) { setSignupErr(e.message); }
    finally { setSignupBusy(false); }
  }

  return (
    <div id="authPage" className="page">
      <div className="auth-box">
        <div className="auth-logo">
          <div className="logo-mark">IntentRoute</div>
          <div className="tagline">From Intention to Destination.</div>
          <div className="logo-dots"><div className="logo-dot"></div><div className="logo-dot"></div><div className="logo-dot"></div></div>
        </div>

        {mode === 'login' ? (
          <div className="auth-card">
            <div className="auth-title">Welcome back 👋</div>
            <div className="auth-sub">Sign in to your IntentRoute account</div>
            {loginErr && <div className="auth-err">{loginErr}</div>}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@campus.edu" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input
                type="password" placeholder="••••••••" value={loginPass}
                onChange={(e) => setLoginPass(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && doLogin()}
              />
            </div>
            <div className="forgot-link" onClick={() => setShowForgot(true)}>Forgot password?</div>
            <button className="auth-btn" disabled={loginBusy} onClick={doLogin}>
              {loginBusy ? 'Signing in…' : 'Sign In →'}
            </button>
            <div className="auth-switch">No account? <a onClick={() => setMode('signup')}>Create one free</a></div>
          </div>
        ) : (
          <div className="auth-card">
            <div className="auth-title">Create account 🚀</div>
            <div className="auth-sub">Join IntentRoute and navigate smarter</div>
            {signupErr && <div className="auth-err">{signupErr}</div>}
            <div className="field">
              <label>Full Name</label>
              <input type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@campus.edu" value={signupEmail} onChange={(e) => setSignupEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" placeholder="Min 6 characters" value={signupPass} onChange={(e) => setSignupPass(e.target.value)} />
            </div>
            <button className="auth-btn" disabled={signupBusy} onClick={doSignup}>
              {signupBusy ? 'Creating…' : 'Create Account →'}
            </button>
            <div className="auth-switch">Have an account? <a onClick={() => setMode('login')}>Sign in</a></div>
          </div>
        )}
      </div>

      {showForgot && <ForgotPasswordModal onClose={() => setShowForgot(false)} toast={toast} />}
    </div>
  );
}
