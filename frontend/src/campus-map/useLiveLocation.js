// frontend/src/campus-map/useLiveLocation.js
//
// Wraps the browser Geolocation API's watchPosition() so the live campus
// map always has an up-to-date { lat, lon, heading, accuracy } for the
// "You are here" marker, updating continuously as the user moves.

import { useEffect, useRef, useState } from 'react';

export function useLiveLocation({ enabled = true, fallback = null } = {}) {
  const [position, setPosition] = useState(fallback);
  const [status, setStatus] = useState('idle'); // idle | requesting | granted | denied | unsupported
  const [error, setError] = useState(null);
  const watchId = useRef(null);
  const lastFix = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    if (!('geolocation' in navigator)) {
      setStatus('unsupported');
      return;
    }

    setStatus('requesting');
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading, speed, accuracy } = pos.coords;
        // Derive a heading from consecutive fixes when the device doesn't
        // report one (many phones only fill `heading` while actually moving).
        let derivedHeading = heading;
        if ((derivedHeading === null || derivedHeading === undefined) && lastFix.current) {
          derivedHeading = bearing(lastFix.current.lat, lastFix.current.lon, latitude, longitude);
        }
        const fix = { lat: latitude, lon: longitude, heading: derivedHeading ?? 0, speed: speed || 0, accuracy, ts: Date.now() };
        lastFix.current = fix;
        setPosition(fix);
        setStatus('granted');
        setError(null);
      },
      (err) => {
        setStatus('denied');
        setError(err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 15000 }
    );

    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled]);

  return { position, status, error };
}

/** Compass bearing (0-360, 0 = north) from point A to point B. */
export function bearing(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const toDeg = (r) => (r * 180) / Math.PI;
  const φ1 = toRad(lat1), φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

/** Haversine distance in meters. */
export function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
