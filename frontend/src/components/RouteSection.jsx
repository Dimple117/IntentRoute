import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { CAMPUS_CENTER, CAMPUS_NODES, CAMPUS_EDGES, INTENT_ICONS } from '../constants';

const VB_W = 720, VB_H = 420;
const METERS_PER_DEG_LAT = 110540;
const CATEGORY_COLOR = { STUDY: '#818cf8', FOOD: '#d97706', MEDICAL: '#e53e3e', ADMIN: '#00a86b', LAB: '#0891b2', HOSTEL: '#d97706', STATIONERY: '#a855f7' };
const CATEGORY_PHOTO = { LIBRARY: '/library-photo.jpg' };

function project(lat, lon, originLat, originLon, scale) {
  const metersPerDegLon = 111320 * Math.cos((originLat * Math.PI) / 180);
  const dx = (lon - originLon) * metersPerDegLon;
  const dy = (lat - originLat) * METERS_PER_DEG_LAT;
  return { x: VB_W / 2 + dx * scale, y: VB_H / 2 - dy * scale };
}

export default function RouteSection({ token, onUnauthorized, userLat, userLon, facility, onBack, toast }) {
  const [live, setLive] = useState(facility);
  const [loading, setLoading] = useState(true);
  const [elapsed, setElapsed] = useState(0);

  const origin = { lat: CAMPUS_CENTER.latitude, lon: CAMPUS_CENTER.longitude };
  const scale = 0.9;

  useEffect(() => {
    let cancelled = false;
    async function fetchRoute() {
      try {
        const lat = CAMPUS_CENTER.latitude;
        const lon = CAMPUS_CENTER.longitude;
        const r = await apiFetch(`/route/${facility.id}?user_lat=${lat}&user_lon=${lon}`, token, {}, onUnauthorized);
        const d = await r.json();
        if (!cancelled) setLive(d);
      } catch (e) {
        toast?.('Could not refresh live route: ' + e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchRoute();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility.id]);

  // Cosmetic "on the way" timer, like a food-delivery tracker
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const path = useMemo(() => {
    const raw = live.route_path && live.route_path.length ? live.route_path : [[live.latitude, live.longitude]];
    return raw.map(([lat, lon]) => project(lat, lon, origin.lat, origin.lon, scale));
  }, [live]);

  const pathD = useMemo(() => {
    if (path.length < 2) return '';
    return 'M ' + path.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L ');
  }, [path]);

  const you = path[0];
  const dest = path[path.length - 1];
  const destColor = CATEGORY_COLOR[live.category] || '#5b8fff';

  const roads = useMemo(
    () => CAMPUS_EDGES.map(([a, b]) => {
      const pa = project(CAMPUS_NODES[a].lat, CAMPUS_NODES[a].lon, origin.lat, origin.lon, scale);
      const pb = project(CAMPUS_NODES[b].lat, CAMPUS_NODES[b].lon, origin.lat, origin.lon, scale);
      return { pa, pb };
    }),
    []
  );

  const totalEtaSec = (live.eta_min || 1) * 60;
  const remainingSec = Math.max(0, totalEtaSec - elapsed);
  const progressPct = Math.min(100, Math.round((elapsed / totalEtaSec) * 100));
  const arrived = remainingSec <= 0;

  return (
    <div id="sec-route">
      <div className="pg-header route-head">
        <button className="back-btn" onClick={onBack}>← Back</button>
        <div>
          <div className="pg-title">Live Campus Route 🎒</div>
          <div className="pg-sub">
            <span className={`ic ${live.category}`}>{INTENT_ICONS[live.category] || '📍'} {live.category}</span>
            {' '}→ heading to <strong>{live.name}</strong>
          </div>
        </div>
      </div>

      <div className="route-map-wrap">
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} width="100%" style={{ display: 'block' }}>
          <defs>
            <linearGradient id="rground" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#12321f" />
              <stop offset="100%" stopColor="#0a1e13" />
            </linearGradient>
            <radialGradient id="ryouGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#5b8fff" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#5b8fff" stopOpacity="0" />
            </radialGradient>
            <pattern id="collegePhoto" patternUnits="userSpaceOnUse" x="0" y="0" width={VB_W} height={VB_H}>
              <image href="/college-photo.jpg" x="0" y="0" width={VB_W} height={VB_H} preserveAspectRatio="xMidYMid slice" />
            </pattern>
            <clipPath id="destPhotoClip">
              <circle cx="0" cy="0" r="20" />
            </clipPath>
          </defs>

          <rect x="0" y="0" width={VB_W} height={VB_H} fill="url(#collegePhoto)" />
          <rect x="0" y="0" width={VB_W} height={VB_H} fill="#0a1e13" opacity="0.55" />

          {/* campus walkways (the same graph Dijkstra runs over) */}
          {roads.map((r, i) => (
            <line key={i} x1={r.pa.x} y1={r.pa.y} x2={r.pb.x} y2={r.pb.y} stroke="#264a34" strokeWidth="9" opacity="0.55" strokeLinecap="round" />
          ))}

          {/* decorative trees */}
          {[[30, 30], [690, 30], [30, 390], [690, 390], [360, 20], [360, 400]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6" fill="#1f4a2e" opacity="0.6" />
          ))}

          {/* animated route line */}
          {pathD && (
            <path d={pathD} fill="none" stroke="#5b8fff" strokeWidth="3.5" strokeDasharray="10 8" opacity="0.7">
              <animate attributeName="stroke-dashoffset" from="0" to="-36" dur="1s" repeatCount="indefinite" />
            </path>
          )}

          {/* moving marker: a student with a backpack, walking the exact Dijkstra path */}
          {pathD && !arrived && (
            <g>
              <animateMotion dur={`${Math.max(5, (live.eta_min || 1) * 2.5)}s`} repeatCount="indefinite" path={pathD} />
              <g transform="scale(1.3)" filter="drop-shadow(0 2px 3px rgba(0,0,0,.4))">
                <ellipse cx="0" cy="1.5" rx="4.2" ry="1.3" fill="#000" opacity="0.28" />
                {/* back leg */}
                <line x1="0" y1="-8" x2="3.2" y2="1" stroke="#3a2c1f" strokeWidth="2.6" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="-20 0 -8;20 0 -8;-20 0 -8" dur="0.6s" repeatCount="indefinite" />
                </line>
                {/* backpack */}
                <rect x="-5.8" y="-16.5" width="4.6" height="9.5" rx="1.6" fill="#d97706" />
                <rect x="-5.8" y="-16.5" width="4.6" height="9.5" rx="1.6" fill="none" stroke="#8a4f04" strokeWidth="0.5" />
                {/* back arm */}
                <line x1="0" y1="-15" x2="3" y2="-8" stroke="#ffcf9e" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="16 0 -15;-16 0 -15;16 0 -15" dur="0.6s" repeatCount="indefinite" />
                </line>
                {/* torso */}
                <rect x="-3" y="-17.5" width="6" height="10.5" rx="2.6" fill="#5b8fff" />
                {/* front arm */}
                <line x1="0" y1="-15" x2="-3" y2="-8" stroke="#ffcf9e" strokeWidth="2" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="-16 0 -15;16 0 -15;-16 0 -15" dur="0.6s" repeatCount="indefinite" />
                </line>
                {/* front leg */}
                <line x1="0" y1="-8" x2="-3.2" y2="1" stroke="#2b2019" strokeWidth="2.6" strokeLinecap="round">
                  <animateTransform attributeName="transform" type="rotate" values="20 0 -8;-20 0 -8;20 0 -8" dur="0.6s" repeatCount="indefinite" />
                </line>
                {/* head + hair */}
                <circle cx="0" cy="-21" r="3.7" fill="#ffcf9e" />
                <path d="M -3.7 -21.4 Q 0 -25.6 3.7 -21.4 Q 2.2 -22.8 0 -22.8 Q -2.2 -22.8 -3.7 -21.4 Z" fill="#2b2019" />
              </g>
            </g>
          )}

          {/* You are here */}
          {you && (
            <>
              <circle cx={you.x} cy={you.y} r="22" fill="url(#ryouGlow)" />
              <circle cx={you.x} cy={you.y} r="6.5" fill="#5b8fff" stroke="#fff" strokeWidth="1.5">
                <animate attributeName="r" values="6.5;9;6.5" dur="1.6s" repeatCount="indefinite" />
              </circle>
              <text x={you.x} y={you.y - 16} fontSize="11" fill="#cfe0ff" textAnchor="middle" fontWeight="700">You</text>
            </>
          )}

          {/* Destination pin */}
          {dest && (
            <g>
              <path
                d={`M ${dest.x} ${dest.y - 24} C ${dest.x - 11} ${dest.y - 24} ${dest.x - 11} ${dest.y - 9} ${dest.x} ${dest.y}
                    C ${dest.x + 11} ${dest.y - 9} ${dest.x + 11} ${dest.y - 24} ${dest.x} ${dest.y - 24} Z`}
                fill={destColor}
              >
                <animate attributeName="opacity" values="1;0.6;1" dur="1.4s" repeatCount="indefinite" />
              </path>
              <circle cx={dest.x} cy={dest.y - 16} r="3.6" fill="#fff" />
              {CATEGORY_PHOTO[live.category] && (
                <g transform={`translate(${dest.x}, ${dest.y - 58})`}>
                  <circle r="22" fill="#0a1e13" />
                  <image href={CATEGORY_PHOTO[live.category]} x="-20" y="-20" width="40" height="40" clipPath="url(#destPhotoClip)" preserveAspectRatio="xMidYMid slice" />
                  <circle r="20" fill="none" stroke="#fff" strokeWidth="2" />
                </g>
              )}
              <text x={dest.x} y={dest.y + 18} fontSize="11.5" fill="#eef4ff" textAnchor="middle" fontWeight="700">
                {live.name.length > 26 ? live.name.slice(0, 24) + '…' : live.name}
              </text>
            </g>
          )}
        </svg>
      </div>

      <div className="route-status-bar">
        <div className="route-status-top">
          <span className="route-status-icon">{arrived ? '🎉' : '🚶'}</span>
          <div>
            <div className="route-status-title">
              {loading ? 'Calculating shortest walkway path…' : arrived ? `You've arrived at ${live.name}!` : `On the way to ${live.name}`}
            </div>
            <div className="route-status-sub">
              {live.building ? `${live.building}${live.floor ? ' · ' + live.floor : ''}` : ''}
              {live.is_open !== undefined && (
                <span className={`ob ${live.is_open ? 'op' : 'cl'}`} style={{ marginLeft: 8, fontSize: 11, padding: '2px 8px' }}>
                  {live.is_open ? '🟢 Open' : '🔴 Closed'}
                </span>
              )}
            </div>
          </div>
          <div className="route-status-eta">
            {!arrived && live.eta_min !== null && <><strong>{remainingSec > 0 ? Math.ceil(remainingSec / 60) : 0}</strong> min</>}
            {live.distance_m !== null && <div className="route-status-dist">{live.distance_m}m via shortest path</div>}
          </div>
        </div>
        <div className="route-progress"><div className="route-progress-fill" style={{ width: `${progressPct}%` }} /></div>
      </div>

      {live.maps_link && (
        <a className="maps-btn" style={{ marginTop: 14, display: 'inline-block' }} href={live.maps_link} target="_blank" rel="noreferrer">
          🗺 Open in Google Maps
        </a>
      )}
    </div>
  );
}