export default function LocationPopup({ onAllow, onSkip }) {
  return (
    <div id="locPopup">
      <div className="loc-box">
        <span className="loc-icon">📍</span>
        <h2>Allow Location Access</h2>
        <p>
          IntentRoute uses your location to show nearby facilities and calculate walking distances.
          If you're off-campus or skip this, we'll start you at the ATME College of Engineering main gate.
        </p>
        <div className="loc-btns">
          <button className="btn-allow" onClick={onAllow}>📍 Allow Location</button>
          <button className="btn-skip" onClick={onSkip}>Skip for now</button>
        </div>
      </div>
    </div>
  );
}
