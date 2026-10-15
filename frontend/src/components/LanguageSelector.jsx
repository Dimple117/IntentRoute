import { SUPPORTED_LANGUAGES } from '../constants';

export default function LanguageSelector({ lang, setLang, compact = false }) {
  return (
    <select
      className={`lang-select ${compact ? 'compact' : ''}`}
      value={lang}
      onChange={(e) => setLang(e.target.value)}
      title="Voice assistant language"
    >
      {SUPPORTED_LANGUAGES.map((l) => (
        <option key={l.code} value={l.code}>🌐 {l.native}</option>
      ))}
    </select>
  );
}
