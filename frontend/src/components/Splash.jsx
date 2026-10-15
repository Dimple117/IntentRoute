const NAME = 'IntentRoute';

export default function Splash() {
  return (
    <div className="splash-page">
      <div className="splash-glow" />
      <div className="splash-compass">🧭</div>
      <div className="splash-logo" aria-label={NAME}>
        {NAME.split('').map((ch, i) => (
          <span key={i} style={{ animationDelay: `${0.35 + i * 0.045}s` }}>{ch}</span>
        ))}
      </div>
      <div className="splash-tagline">From Intention to Destination.</div>
      <div className="splash-sub">ATME College of Engineering, Mysuru</div>
      <div className="splash-bar"><div className="splash-bar-fill" /></div>
    </div>
  );
}
