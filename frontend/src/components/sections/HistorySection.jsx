import { useEffect, useState } from 'react';
import { apiFetch } from '../../api';
import { INTENT_ICONS } from '../../constants';

export default function HistorySection({ token, onUnauthorized, active, onReplay, toast }) {
  const [items, setItems] = useState(null);
  const [err, setErr] = useState('');

  async function load() {
    try {
      const r = await apiFetch('/history', token, {}, onUnauthorized);
      setItems(await r.json());
    } catch (e) { setErr(e.message); }
  }

  useEffect(() => { if (active) load(); }, [active]);

  async function del(id) {
    setItems((prev) => prev.filter((h) => h.id !== id));
    try { await apiFetch(`/history/${id}`, token, { method: 'DELETE' }, onUnauthorized); toast('Deleted'); } catch {}
  }

  async function clearAll() {
    if (!confirm('Clear all history?')) return;
    await apiFetch('/history', token, { method: 'DELETE' }, onUnauthorized);
    load(); toast('🗑 History cleared');
  }

  if (!active) return null;

  return (
    <div id="sec-history" className="section-page active">
      <div className="pg-header">
        <div className="pg-title">Search History 🕐</div>
        <div className="pg-sub">Your recent searches — tap any to run it again</div>
      </div>
      {items && items.length > 0 && <button className="clear-all-btn" onClick={clearAll}>🗑 Clear All</button>}
      {err && <div className="errbox">{err}</div>}
      {items === null ? null : items.length === 0 ? (
        <div className="empty-state"><span className="ei">🕐</span><p>No search history yet.</p></div>
      ) : (
        <div className="history-list">
          {items.map((h, i) => (
            <div key={h.id} className="h-item" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => onReplay(h.query)}>
              <div className="h-icon" style={{ background: 'rgba(91,143,255,.1)' }}>{INTENT_ICONS[h.intent] || '📍'}</div>
              <div style={{ flex: 1 }}>
                <div className="h-query">{h.query}</div>
                <div className="h-meta">{INTENT_ICONS[h.intent] || '📍'} {h.intent} · {h.facility_name || '—'} · {new Date(h.searched_at).toLocaleString()}</div>
              </div>
              <button className="h-del" onClick={(e) => { e.stopPropagation(); del(h.id); }}>✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
