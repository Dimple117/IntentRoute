import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { INTENT_ICONS } from '../../constants';

export default function FavouritesSection({ token, onUnauthorized, active, onRemoved, toast }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const r = await apiFetch('/favourites', token, {}, onUnauthorized);
      setItems(await r.json());
    } catch (e) { setErr(e.message); }
  }

  useEffect(() => { if (active) load(); }, [active]);

  async function remove(id) {
    await apiFetch(`/favourites/${id}`, token, { method: 'DELETE' }, onUnauthorized);
    setItems((prev) => prev.filter((f) => f.id !== id));
    onRemoved(id);
    toast('Removed');
  }

  if (!active) return null;

  return (
    <div id="sec-favourites" className="section-page active">
      <div className="pg-header">
        <div className="pg-title">Favourites ❤️</div>
        <div className="pg-sub">Places you've saved for quick access</div>
      </div>
      {err && <div className="errbox">{err}</div>}
      {items === null ? null : items.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1/-1' }}><span className="ei">🤍</span><p>No favourites yet.</p></div>
      ) : (
        <div className="fav-grid">
          {items.map((f, i) => (
            <div key={f.id} className="fav-card" style={{ animationDelay: `${i * 0.06}s` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span className={`ic ${f.category}`}>{INTENT_ICONS[f.category] || '📍'} {f.category}</span>
                <span className={`ob ${f.is_open ? 'op' : 'cl'}`} style={{ fontSize: 11, padding: '3px 8px' }}>
                  {f.is_open ? '🟢 Open' : '🔴 Closed'}
                </span>
              </div>
              <div className="fname">{f.name}</div>
              <div className="fdesc">{f.description}</div>
              <div className="fav-card-actions">
                <a className="maps-btn" href={f.maps_link} target="_blank" rel="noreferrer" style={{ padding: '7px 14px', fontSize: 12 }}>🗺 Navigate</a>
                <button className="fav-rm-btn" onClick={() => remove(f.id)}>✕ Remove</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
