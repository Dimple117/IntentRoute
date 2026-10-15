import { useEffect, useRef, useState } from 'react';
import { WAKE_WORD, SUPPORTED_LANGUAGES } from '../constants';

function speechLangFor(lang) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.speech || 'en-IN';
}
function nativeNameFor(lang) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.native || 'English';
}

export default function VoiceAgent({ onWakeQuery, lang = 'en' }) {
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState('Listening for wake word…');
  const [transcript, setTranscript] = useState('');
  const recogRef = useRef(null);
  const activeRef = useRef(false);
  const langRef = useRef(lang);
  langRef.current = lang; // always read the latest selection, even mid-listen

  // ── Stage 1: always-on wake-word listener, always in English ──────────────
  // "Hello Nav" is an English phrase, so this stage never switches language —
  // an en-US recognizer is what reliably catches it. Stage 2 (below) is what
  // actually understands Kannada/Hindi/etc.
  function startWakeWordListener() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    if (recogRef.current) return;
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      const full = Array.from(e.results).map((r) => r[0].transcript.toLowerCase()).join(' ');
      if (full.includes(WAKE_WORD)) {
        setStatus('✓ Wake word heard…');
        try { rec.stop(); } catch {}
        recogRef.current = null;
        setTimeout(() => startCommandCapture(), 400);
      }
    };
    rec.onend = () => {
      recogRef.current = null;
      if (activeRef.current) setTimeout(startWakeWordListener, 500);
    };
    rec.onerror = () => { recogRef.current = null; };
    try { rec.start(); recogRef.current = rec; } catch {}
  }

  // ── Stage 2: one-shot command capture, in whichever language is selected ──
  function startCommandCapture() {
    if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
    const Rec = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Rec();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = speechLangFor(langRef.current);
    setListening(true);
    setStatus(`🎙 Listening (${nativeNameFor(langRef.current)})…`);
    setTranscript('');

    let finalText = '';
    rec.onresult = (e) => {
      let fin = '', tmp = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) fin += e.results[i][0].transcript;
        else tmp += e.results[i][0].transcript;
      }
      if (fin) finalText += fin;
      setTranscript('"' + (finalText + (tmp ? ' ' + tmp : '')).trim() + '"');
    };
    rec.onend = () => {
      recogRef.current = null;
      setListening(false);
      const said = finalText.trim();
      if (said.length > 1) {
        setStatus('✓ Processing…');
        setTimeout(() => {
          onWakeQuery(said, langRef.current);
          setStatus('Listening for wake word…');
          setTranscript('');
          setTimeout(() => { if (activeRef.current) startWakeWordListener(); }, 1500);
        }, 400);
      } else {
        setStatus('Didn\u2019t catch that — say "Hello Nav" again');
        setTranscript('');
        setTimeout(() => { if (activeRef.current) startWakeWordListener(); }, 1200);
      }
    };
    rec.onerror = () => { recogRef.current = null; };
    try { rec.start(); recogRef.current = rec; } catch {}
  }

  function stopWakeWord() {
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} }
    recogRef.current = null;
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    activeRef.current = next;
    if (next) startWakeWordListener();
    else { stopWakeWord(); setListening(false); }
  }

  useEffect(() => () => { activeRef.current = false; stopWakeWord(); }, []);

  return (
    <div id="voiceAgent">
      <div className={`va-panel ${open ? 'open' : ''}`}>
        <h4>🎙 Voice Assistant <span className="va-wake-badge">● Live</span></h4>
        <div className="va-hint">
          Say <strong>"Hello Nav"</strong>, then ask in <strong>{nativeNameFor(lang)}</strong> —
          e.g. "Hello Nav, I need a quiet place to study."
          {lang !== 'en' && <> Change the assistant language from the sidebar.</>}
        </div>
        <div className={`va-wave ${listening ? 'va-listening' : ''}`}>
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="va-bar"></div>)}
        </div>
        <div className="va-status">{status}</div>
        <div className={`va-transcript ${transcript ? 'show' : ''}`}>{transcript}</div>
      </div>
      <button className={`va-fab ${listening ? 'listening' : ''}`} onClick={toggle} title="Voice assistant">
        <div className="r1"></div><div className="r2"></div><div className="r3"></div>
        🎙
      </button>
    </div>
  );
}