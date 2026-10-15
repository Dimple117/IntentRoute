// frontend/src/campus-map/CampusMap.jsx
//
// A modular, drop-in "live campus map" — Leaflet.js under the hood, styled
// to match the rest of the app. Nothing outside this folder depends on its
// internals; it only needs `token`, `onUnauthorized`, `toast`, and the
// user's lat/lon (all of which App.jsx already tracks for the rest of the
// app). See README.md in this folder for integration details.
//
// Requirements covered here: facility markers with search, add/edit by
// lat/lon, live geolocation tracking, A*/Dijkstra shortest-route (backend),
// turn-by-turn directions, distance/ETA, auto-recalculation off-route,
// animated + auto-centered user marker, and bounded pan/zoom (map only
// "works" within the campus footprint).

import { useEffect, useMemo, useState } from 'react';
import {
  MapContainer, TileLayer, Marker, Popup, Polyline, Polygon, Tooltip, useMap, useMapEvents,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './CampusMap.css';

import { CAMPUS_CENTER } from '../constants';
import {
  CAMPUS_BOUNDS, CAMPUS_MIN_ZOOM, CAMPUS_MAX_ZOOM, iconFor, colorFor,
} from './mapConfig';
import { blockToPolygon } from './geo';
import { fetchFacilities, fetchCampusBlocks, fetchCampusGraph } from './campusMapApi';
import { useLiveLocation } from './useLiveLocation';
import { useCampusRoute } from './useCampusRoute';
import FacilityAdminPanel from './FacilityAdminPanel';

function divIcon(html, size = 34) {
  return L.divIcon({ html, className: 'cm-div-icon', iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

function facilityIcon(f) {
  return divIcon(
    `<div class="cm-pin" style="--pin-color:${colorFor(f)}"><span>${iconFor(f)}</span></div>`
  );
}

function userIcon(heading) {
  return divIcon(
    `<div class="cm-user-dot"><div class="cm-user-pulse"></div><div class="cm-user-arrow" style="transform:rotate(${heading || 0}deg)">▲</div></div>`,
    30
  );
}

/** Keeps the map centered on the user while navigating (follow mode). */
function FollowController({ position, following, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (following && position) {
      map.setView([position.lat, position.lon], zoom ?? map.getZoom(), { animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lon, following]);
  return null;
}

/** Programmatic flyTo, exposed via a ref-like effect trigger. */
function FlyToController({ target }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 18), { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
}

/** Captures map clicks while in "pick a point" mode (used by the admin panel). */
function ClickCapture({ active, onPick }) {
  useMapEvents({
    click(e) {
      if (active) onPick([e.latlng.lat, e.latlng.lng]);
    },
  });
  return null;
}

export default function CampusMap({ token, onUnauthorized, toast, userLat, userLon }) {
  const [facilities, setFacilities] = useState([]);
  const [blocks, setBlocks] = useState([]);
  const [graph, setGraph] = useState({ nodes: {}, edges: [] });
  const [loadErr, setLoadErr] = useState(null);

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);     // facility being navigated to
  const [flyTarget, setFlyTarget] = useState(null);
  const [following, setFollowing] = useState(false);

  const [pickMode, setPickMode] = useState(false);
  const [pickedPoint, setPickedPoint] = useState(null);
  const [panelInitial, setPanelInitial] = useState(undefined); // undefined=closed, null=new, object=edit

  const fallbackFix = useMemo(
    () => ({ lat: userLat ?? CAMPUS_CENTER.latitude, lon: userLon ?? CAMPUS_CENTER.longitude, heading: 0 }),
    [userLat, userLon]
  );
  const { position: livePosition, status: geoStatus } = useLiveLocation({ enabled: true, fallback: fallbackFix });
  const position = livePosition || fallbackFix;

  const { route, directions, loading: routeLoading, recalculating, arrived } = useCampusRoute({
    token, onUnauthorized, facility: selected, position, toast,
  });

  useEffect(() => {
    (async () => {
      try {
        const [f, b, g] = await Promise.all([fetchFacilities(), fetchCampusBlocks(), fetchCampusGraph()]);
        setFacilities(f); setBlocks(b); setGraph(g);
      } catch (e) {
        setLoadErr(e.message);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return facilities.filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q)).slice(0, 8);
  }, [query, facilities]);

  function startNavigation(f) {
    setSelected(f);
    setFollowing(true);
    setFlyTarget([f.latitude, f.longitude]);
    setQuery('');
  }
  function stopNavigation() {
    setSelected(null);
    setFollowing(false);
  }

  function openAddPanel() {
    setPickMode(true);
    setPickedPoint(null);
    toast?.('Tap anywhere on the map to place the new facility');
  }
  function openEditPanel(f) {
    setPanelInitial(f);
  }
  function handlePick(latlng) {
    setPickedPoint(latlng);
    setPickMode(false);
    setPanelInitial({ latitude: latlng[0], longitude: latlng[1] });
  }
  function handleSaved(saved, deletedId) {
    if (deletedId) {
      setFacilities((prev) => prev.filter((f) => f.id !== deletedId));
      if (selected?.id === deletedId) stopNavigation();
    } else if (saved) {
      setFacilities((prev) => {
        const exists = prev.some((f) => f.id === saved.id);
        return exists ? prev.map((f) => (f.id === saved.id ? saved : f)) : [...prev, saved];
      });
    }
    setPanelInitial(undefined);
    setPickedPoint(null);
  }

  const buildingPolygons = useMemo(() => blocks.map((b) => ({ ...b, poly: blockToPolygon(b) })), [blocks]);
  const routePath = route?.route_path;

  return (
    <div className="cm-wrap">
      <div className="cm-toolbar">
        <div className="cm-search">
          <input
            placeholder="🔎 Search facilities, buildings, departments…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {filtered.length > 0 && (
            <div className="cm-search-results">
              {filtered.map((f) => (
                <button key={f.id} className="cm-search-item" onClick={() => startNavigation(f)}>
                  <span>{iconFor(f)}</span> {f.name}
                  <span className="cm-search-cat">{f.category}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="cm-btn-primary" onClick={openAddPanel}>+ Add facility</button>
      </div>

      {loadErr && <div className="cm-banner cm-banner-err">Couldn't load map data: {loadErr}</div>}
      {geoStatus === 'denied' && (
        <div className="cm-banner">Live location is off — using your last known / default position.</div>
      )}
      {pickMode && <div className="cm-banner cm-banner-info">Tap the map to place the new facility…</div>}

      <div className="cm-map-shell">
        <MapContainer
          bounds={CAMPUS_BOUNDS}
          maxBounds={CAMPUS_BOUNDS}
          maxBoundsViscosity={1.0}
          minZoom={CAMPUS_MIN_ZOOM}
          maxZoom={CAMPUS_MAX_ZOOM}
          scrollWheelZoom
          className="cm-leaflet"
        >
          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <ClickCapture active={pickMode} onPick={handlePick} />
          <FollowController position={position} following={following} />
          <FlyToController target={flyTarget} />

          {/* Buildings */}
          {buildingPolygons.map((b, i) => (
            <Polygon key={i} positions={b.poly} pathOptions={{ color: b.color, weight: 1.5, fillColor: b.color, fillOpacity: 0.35 }}>
              <Tooltip sticky>{b.name}</Tooltip>
            </Polygon>
          ))}

          {/* Walkways / roads */}
          {graph.edges?.map((e, i) => {
            const a = graph.nodes[e.from], b = graph.nodes[e.to];
            if (!a || !b) return null;
            return (
              <Polyline
                key={i}
                positions={[[a.lat, a.lon], [b.lat, b.lon]]}
                pathOptions={{ color: '#94a3b8', weight: 5, opacity: 0.55 }}
              />
            );
          })}

          {/* Facilities */}
          {facilities.map((f) => (
            <Marker key={f.id} position={[f.latitude, f.longitude]} icon={facilityIcon(f)}>
              <Popup>
                <div className="cm-popup">
                  <div className="cm-popup-title">{iconFor(f)} {f.name}</div>
                  <div className="cm-popup-cat">{f.category}{f.building ? ` · ${f.building}` : ''}{f.floor ? ` · ${f.floor}` : ''}</div>
                  {f.description && <div className="cm-popup-desc">{f.description}</div>}
                  <div className={`cm-popup-open ${f.is_open ? 'open' : 'closed'}`}>{f.is_open ? '🟢 Open now' : '🔴 Closed'}</div>
                  <div className="cm-popup-actions">
                    <button className="cm-btn-primary cm-btn-sm" onClick={() => startNavigation(f)}>Navigate</button>
                    <button className="cm-btn-ghost cm-btn-sm" onClick={() => openEditPanel(f)}>Edit</button>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* Active route */}
          {routePath && routePath.length > 1 && (
            <Polyline positions={routePath} pathOptions={{ color: '#5b8fff', weight: 5, opacity: 0.9, className: 'cm-route-line' }} />
          )}

          {/* Live user marker */}
          <Marker position={[position.lat, position.lon]} icon={userIcon(position.heading)} zIndexOffset={1000} />
        </MapContainer>

        {selected && (
          <DirectionsPanel
            facility={selected}
            route={route}
            directions={directions}
            loading={routeLoading}
            recalculating={recalculating}
            arrived={arrived}
            following={following}
            onToggleFollow={() => setFollowing((v) => !v)}
            onStop={stopNavigation}
          />
        )}
      </div>

      {panelInitial !== undefined && (
        <FacilityAdminPanel
          token={token}
          onUnauthorized={onUnauthorized}
          toast={toast}
          initial={panelInitial?.id ? panelInitial : null}
          pickedPoint={pickedPoint}
          myPosition={position}
          onRequestPickPoint={() => { setPickMode(true); setPanelInitial(undefined); toast?.('Tap the map to set the point, then reopen edit'); }}
          onSaved={handleSaved}
          onClose={() => { setPanelInitial(undefined); setPickedPoint(null); }}
        />
      )}
    </div>
  );
}

function DirectionsPanel({ facility, route, directions, loading, recalculating, arrived, following, onToggleFollow, onStop }) {
  return (
    <div className="cm-directions">
      <div className="cm-directions-head">
        <div>
          <div className="cm-directions-title">{arrived ? '🎉 Arrived' : `Navigating to ${facility.name}`}</div>
          {!loading && route && (
            <div className="cm-directions-sub">
              {route.distance_m}m · ~{route.eta_min} min walk {recalculating && '· recalculating…'}
            </div>
          )}
        </div>
        <div className="cm-directions-actions">
          <button className={`cm-btn-ghost cm-btn-sm ${following ? 'active' : ''}`} onClick={onToggleFollow} title="Follow me">🎯</button>
          <button className="cm-btn-ghost cm-btn-sm" onClick={onStop}>✕</button>
        </div>
      </div>
      {loading ? (
        <div className="cm-directions-loading">Calculating shortest walking route…</div>
      ) : (
        <ol className="cm-steps">
          {directions.steps.map((s, i) => <li key={i}>{s.instruction}</li>)}
        </ol>
      )}
    </div>
  );
}
