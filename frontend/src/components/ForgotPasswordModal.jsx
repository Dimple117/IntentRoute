import { useState } from 'react';
import { apiPublic } from '../api';

export default function ForgotPasswordModal({ onClose, toast }) {
  const [step, setStep] = useState('request'); // request -> sent -> reset -> done
  const [email, setEmail] = useState('');
  const [devCode, setDevCode] = useState('');
  const [sentMessage, setSentMessage] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [newPass, setNewPass] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function requestReset() {
    if (!email.trim()) return;
    setBusy(true); setErr('');
    try {
      const r = await apiPublic('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim() }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Something went wrong');
      setDevCode(d.dev_code || '');
      setSentMessage(d.message || '');
      setStep('sent');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  async function doReset() {
    if (!codeInput.trim() || newPass.length < 6) { setErr('Enter the code from your email and a password with 6+ characters'); return; }
    setBusy(true); setErr('');
    try {
      const r = await apiPublic('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ code: codeInput.trim(), new_password: newPass }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Reset failed');
      setStep('done');
      toast('🔒 Password reset — you can sign in now');
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-box" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          className="logout-btn modal-close"
          onClick={onClose}
          style={{ position: 'absolute', top: 16, right: 16 }}
        >
          ✕
        </button>

        {step === 'request' && (
          <>
            <h3>Forgot your password? 🔑</h3>
            <p>Enter your campus email and we'll send a 6-digit reset code to your inbox.</p>
            {err && <div className="auth-err">{err}</div>}
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="you@campus.edu" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <button className="auth-btn" disabled={busy} onClick={requestReset}>
              {busy ? 'Sending…' : 'Send Reset Code →'}
            </button>
          </>
        )}

        {step === 'sent' && (
          <>
            <h3>{devCode ? 'Reset code generated ✅' : 'Check your email 📩'}</h3>
            <p>{sentMessage || 'If that email is registered, a 6-digit reset code has been sent to it.'}</p>
            {devCode && (
              <div className="reset-token-box">{devCode}</div>
            )}
            {err && <div className="auth-err">{err}</div>}
            <div className="field">
              <label>6-digit reset code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} placeholder="123456"
                value={codeInput} onChange={(e) => setCodeInput(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="field">
              <label>New password</label>
              <input type="password" placeholder="Min 6 characters" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
            </div>
            <button className="auth-btn" disabled={busy} onClick={doReset}>
              {busy ? 'Resetting…' : 'Reset Password →'}
            </button>
          </>
        )}

        {step === 'done' && (
          <>
            <h3>All set! 🎉</h3>
            <p>Your password has been reset. You can close this window and sign in with your new password.</p>
            <button className="auth-btn" onClick={onClose}>Close</button>
          </>
        )}
      </div>
    </div>
  );
}
