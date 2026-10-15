import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api';
import { DEPARTMENTS, YEARS } from '../../constants';
import Avatar from '../Avatar';
import AvatarPicker from '../AvatarPicker';

function AnimatedCount({ value }) {
  const [cur, setCur] = useState(0);
  useEffect(() => {
    let n = 0;
    const step = Math.max(1, Math.ceil(value / 20));
    const t = setInterval(() => { n = Math.min(n + step, value); setCur(n); if (n >= value) clearInterval(t); }, 40);
    return () => clearInterval(t);
  }, [value]);
  return <>{cur}</>;
}

export default function ProfileSection({ token, onUnauthorized, active, user, setUser, toast }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [year, setYear] = useState('');
  const [avatar, setAvatar] = useState('0');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState('');
  const [pwErr, setPwErr] = useState('');

  async function load() {
    try {
      const r = await apiFetch('/profile', token, {}, onUnauthorized);
      const p = await r.json();
      setProfile(p);
      setName(p.name); setDepartment(p.department || ''); setYear(p.year_of_study || ''); setAvatar(p.avatar || '0');
    } catch {}
  }

  useEffect(() => { if (active) load(); }, [active]);

  async function saveProfile() {
    setSaving(true); setSaved(false);
    try {
      const r = await apiFetch('/profile', token, {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), avatar, department, year_of_study: year }),
      }, onUnauthorized);
      const updated = await r.json();
      const merged = { ...user, ...updated };
      setUser(merged);
      setSaved(true);
      load();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { toast('Error: ' + e.message); }
    finally { setSaving(false); }
  }

  async function changePassword() {
    setPwErr(''); setPwMsg('');
    if (newPass.length < 6) { setPwErr('New password must be at least 6 characters'); return; }
    setPwBusy(true);
    try {
      const r = await apiFetch('/auth/change-password', token, {
        method: 'POST',
        body: JSON.stringify({ current_password: curPass, new_password: newPass }),
      }, onUnauthorized);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Could not change password');
      setPwMsg(d.message || 'Password updated');
      setCurPass(''); setNewPass('');
      toast('🔒 Password updated');
    } catch (e) { setPwErr(e.message); }
    finally { setPwBusy(false); }
  }

  if (!active) return null;

  return (
    <div id="sec-profile" className="section-page active">
      <div className="pg-header">
        <div className="pg-title">My Profile 👤</div>
        <div className="pg-sub">Manage your account and preferences</div>
      </div>

      {profile && (
        <div className="profile-top">
          <div className="profile-avatar"><Avatar avatar={profile.avatar} name={profile.name} size={80} /></div>
          <div>
            <div className="profile-name">{profile.name}</div>
            <div className="profile-email">{profile.email}</div>
            <div className="profile-tags">
              {profile.department && <span className="profile-tag">🎓 {profile.department}</span>}
              {profile.year_of_study && <span className="profile-tag">📅 {profile.year_of_study}</span>}
              <span className="profile-tag">Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}

      {profile && (
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-val"><AnimatedCount value={profile.history_count || 0} /></div><div className="stat-lbl">Searches</div></div>
          <div className="stat-card"><div className="stat-val"><AnimatedCount value={profile.favourites_count || 0} /></div><div className="stat-lbl">Favourites</div></div>
          <div className="stat-card"><div className="stat-val"><AnimatedCount value={Math.max(1, Math.ceil((Date.now() - new Date(profile.created_at).getTime()) / 86400000))} /></div><div className="stat-lbl">Days Active</div></div>
        </div>
      )}

      <div className="edit-section">
        <h3>Edit Profile</h3>
        <div className="field"><label>Display Name</label><input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></div>
        <div className="field-row">
          <div className="field">
            <label>Department</label>
            <select value={department} onChange={(e) => setDepartment(e.target.value)}>
              <option value="">Select department</option>
              {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Year of Study</label>
            <select value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Select year</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 10, fontWeight: 500 }}>Choose Avatar</div>
        <AvatarPicker value={avatar} onChange={setAvatar} />
        <button className="save-btn" disabled={saving} onClick={saveProfile}>{saving ? 'Saving…' : 'Save Changes'}</button>
        <div className={`save-msg ${saved ? 'show' : ''}`}>✓ Profile updated!</div>
      </div>

      <div className="edit-section">
        <h3>Change Password</h3>
        {pwErr && <div className="auth-err">{pwErr}</div>}
        {pwMsg && <div className="auth-ok">{pwMsg}</div>}
        <div className="field"><label>Current Password</label><input type="password" value={curPass} onChange={(e) => setCurPass(e.target.value)} placeholder="••••••••" /></div>
        <div className="field"><label>New Password</label><input type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Min 6 characters" /></div>
        <button className="save-btn" disabled={pwBusy} onClick={changePassword}>{pwBusy ? 'Updating…' : 'Update Password'}</button>
      </div>
    </div>
  );
}
