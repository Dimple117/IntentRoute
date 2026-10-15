import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../../api';
import { INTENT_ICONS, SUPPORTED_LANGUAGES, DEFAULT_LANG } from '../../constants';

const CHIPS = [
  '🔕 Quiet place to study',
  '🍜 Where can I get food?',
  '🏥 I need medical help',
  '🖥 Computer lab',
  '📋 Admin office',
  '🏠 My hostel',
];

function distLabel(m) {
  if (m === null || m === undefined) return null;
  return m < 1000 ? `${m}m` : `${(m / 1000).toFixed(1)}km`;
}

function speechLangFor(lang) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.speech || 'en-IN';
}

// Speaks a reply out loud in the given language, if the browser supports it.
function speak(text, lang) {
  if (!text || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel(); // don't stack replies
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = speechLangFor(lang);
    window.speechSynthesis.speak(utter);
  } catch {}
}

function FacilityCard({ f, intent, primary, isFav, onToggleFav, onViewRoute }) {
  return (
    <div className={`fcard ${primary ? 'primary' : ''}`}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div className="fname">{f.name}</div>
          <div className="fdesc">{f.description}</div>
        </div>
        <span className={`ic ${intent}`}>{INTENT_ICONS[intent] || '📍'} {intent}</span>
      </div>
      <div className="fmeta">
        <span className={`ob ${f.is_open ? 'op' : 'cl'}`}>
          {f.is_open ? '🟢' : '🔴'} {f.is_open ? 'Open · Until ' + f.closing_time : 'Closed · Opens ' + f.opening_time}
        </span>
        {f.distance_m !== null && <span className="mi">📏 {distLabel(f.distance_m)} · shortest path</span>}
        {f.eta_min !== null && f.eta_min !== undefined && <span className="mi">🚶 ~{f.eta_min} min</span>}
        <span className="mi">🏢 {f.building}</span>
        <span className="mi">📐 {f.floor}</span>
      </div>
      <div className="fcard-actions">
        {primary && onViewRoute && (
          <button className="maps-btn route-btn" onClick={() => onViewRoute(f)}>🎒 View Live Route</button>
        )}
        <a className="maps-btn ghost" href={f.maps_link} target="_blank" rel="noreferrer">🗺 Google Maps</a>
        <button className={`fav-btn ${isFav ? 'saved' : ''}`} onClick={() => onToggleFav(f.id)}>
          {isFav ? '❤️ Saved' : '🤍 Save'}
        </button>
      </div>
    </div>
  );
}

export default function NavigateSection({
  token, onUnauthorized, userLat, userLon, favIds, toggleFav, toast,
  initialQuery = '', autoRun = false, autoRunMode = 'text', onViewRoute,
  lang = DEFAULT_LANG,
}) {
  const [mode, setMode] = useState('text');
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [loaderMsg, setLoaderMsg] = useState('');
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  const [isRecording, setIsRecording] = useState(false);
  const [micText, setMicText] = useState('');
  const [micStatus, setMicStatus] = useState('Click to start recording');
  const recognitionRef = useRef(null);

  async function callNav(q, m) {
    if (!q.trim()) return;
    setLoading(true); setLoaderMsg('Analysing query…'); setErr(''); setResult(null);
    try {
      const body = { query: q, lang };
      if (userLat !== null && userLat !== undefined) { body.user_lat = userLat; body.user_lon = userLon; }
      const r = await apiFetch('/navigate', token, { method: 'POST', body: JSON.stringify(body) }, onUnauthorized);
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Error');
      setResult({ ...d, _mode: m });
      // Spoken-origin queries (wake word or mic) get a spoken reply back,
      // in whichever language the assistant is currently set to.
      if (m === 'voice' || m === 'audio') speak(d.message_local || d.message, lang);
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  const ranAutoRef = useRef(false);
  useEffect(() => {
    if (autoRun && initialQuery && !ranAutoRef.current) {
      ranAutoRef.current = true;
      setMode('text');
      callNav(initialQuery, autoRunMode);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goText() { callNav(query, 'text'); }
  function chip(text) { setMode('text'); const q = text.replace(/^[^\w]+/, '').trim(); setQuery(q); callNav(q, 'text'); }

  function toggleMic() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) { alert('Use Chrome/Edge for mic support.'); return; }
    if (isRecording) { recognitionRef.current?.stop(); return; }
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.lang = speechLangFor(lang); rec.interimResults = true;
    let finalText = '';
    rec.onstart = () => { setIsRecording(true); finalText = ''; setMicText(''); setMicStatus('🔴 Listening…'); };
    rec.onresult = (e) => {
      let fin = '', tmp = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else tmp += e.results[i][0].transcript;
      }
      if (fin) finalText += fin;
      setMicText(finalText + (tmp ? ' ' + tmp : ''));
    };
    rec.onend = () => {
      setIsRecording(false);
      setMicStatus(finalText.trim() ? '✓ Done' : 'No speech detected');
      recognitionRef.current = null;
    };
    rec.start();
    recognitionRef.current = rec;
  }

  function sendMic() { if (micText.trim()) callNav(micText, 'audio'); }

  return (
    <div id="sec-navigate">
      <div className="pg-header">
        <div className="pg-title">Find a Place 🧭</div>
        <div className="pg-sub">Type or speak — <span className="va-wake-badge">🎙 Say "Hello Nav"</span> to go hands-free</div>
      </div>

      <div className="mode-tabs">
        <button className={`tab ${mode === 'text' ? 'active' : ''}`} onClick={() => setMode('text')}>⌨️ Type Query</button>
        <button className={`tab ${mode === 'mic' ? 'active' : ''}`} onClick={() => setMode('mic')}>🎙 Microphone</button>
      </div>

      <div className={`input-panel ${mode === 'text' ? 'active' : ''}`}>
        <div className="search-box">
          <span className="si">🔍</span>
          <input
            className="search-input"
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && goText()}
            type="text" autoComplete="off" placeholder='e.g. "I need a quiet place to study"'
          />
          <button className="send-btn" disabled={loading} onClick={goText}>Navigate →</button>
        </div>
        <div className="chips">
          {CHIPS.map((c) => <span key={c} className="chip" onClick={() => chip(c)}>{c}</span>)}
        </div>
      </div>

      <div className={`input-panel ${mode === 'mic' ? 'active' : ''}`}>
        <div className="audio-grid">
          <div className="audio-card">
            <h3>🎙 Microphone</h3>
            <p>Press the button, speak your query, then press again to stop.</p>
            <button id="micBtn" className={isRecording ? 'recording' : ''} onClick={toggleMic}>🎙</button>
            <div id="micStatus">{micStatus}</div>
            <div className={`mic-tx ${micText ? 'show' : ''}`}>{micText}</div>
            <button className={`mic-send ${micText.trim() && !isRecording ? 'show' : ''}`} onClick={sendMic}>Navigate with this →</button>
          </div>
          <div className="audio-card">
            <h3>💡 Tips</h3>
            <p>Speak naturally — "Where can I print my assignment?" or "I twisted my ankle, need help" both work great.</p>
          </div>
        </div>
      </div>

      <div id="loader" className={loading ? 'show' : ''}>
        <div className="loader-inner">
          <div className="loader-ring"></div>
          <div className="loader-dots"><div className="loader-dot"></div><div className="loader-dot"></div><div className="loader-dot"></div></div>
          <div id="loaderMsg">{loaderMsg}</div>
        </div>
      </div>

      <div id="results">
        {err && <div className="errbox">⚠ <strong>Error:</strong> {err}</div>}
        {result && (
          <>
            <div className="res-header">
              <span className="res-title">Results for "<em>{result.query}</em>"</span>
              <span className="conf-badge">🎯 {result.confidence}%</span>
            </div>
            {result.lang && result.lang !== 'en' && result.query_en && result.query_en.toLowerCase() !== result.query.toLowerCase() && (
              <div className="mi" style={{ marginBottom: 10, color: 'var(--muted)' }}>
                🌐 Understood as: <em>"{result.query_en}"</em>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <span className={`ic ${result.intent}`}>{INTENT_ICONS[result.intent] || '📍'} {result.intent}</span>
            </div>
            {!result.recommended ? (
              <div className="errbox">No facilities found for <strong>{result.intent}</strong>.</div>
            ) : (
              <>
                <FacilityCard f={result.recommended} intent={result.intent} primary isFav={favIds.has(result.recommended.id)} onToggleFav={toggleFav} onViewRoute={onViewRoute} />
                {result.alternatives?.length > 0 && (
                  <>
                    <div className="alt-title">Other Options ({result.alternatives.length})</div>
                    {result.alternatives.map((f) => (
                      <a key={f.id} className="acard" href={f.maps_link} target="_blank" rel="noreferrer">
                        <div>
                          <div className="an">{f.name}</div>
                          <div className="am">
                            <span className={`ob ${f.is_open ? 'op' : 'cl'}`} style={{ fontSize: 11, padding: '2px 8px' }}>
                              {f.is_open ? '🟢 Open' : '🔴 Closed'}
                            </span> {f.building}{f.distance_m !== null ? ` · ${distLabel(f.distance_m)}` : ''}
                          </div>
                        </div>
                        <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>↗</span>
                      </a>
                    ))}
                  </>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}