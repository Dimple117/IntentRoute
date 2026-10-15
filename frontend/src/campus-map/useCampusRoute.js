// frontend/src/campus-map/useCampusRoute.js
//
// Drives one "active navigation" session: fetches the shortest walking
// route to a facility (backend Dijkstra), keeps it updated as the user's
// live location changes, and automatically recalculates if the user
// strays more than OFF_ROUTE_THRESHOLD_M from the current path.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchRoute } from './campusMapApi';
import { buildDirections, distanceToPolylineM } from './directions';
import { OFF_ROUTE_THRESHOLD_M } from './mapConfig';

export function useCampusRoute({ token, onUnauthorized, facility, position, toast }) {
  const [route, setRoute] = useState(null);   // raw backend response (route_path, distance_m, eta_min, ...)
  const [directions, setDirections] = useState({ steps: [], totalDistanceM: 0 });
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const lastFetchAt = useRef(0);

  const recalc = useCallback(async (lat, lon) => {
    if (!facility) return;
    try {
      const d = await fetchRoute(token, facility.id, lat, lon, onUnauthorized);
      setRoute(d);
      setDirections(buildDirections(d.route_path, facility.name));
      lastFetchAt.current = Date.now();
    } catch (e) {
      toast?.('Could not calculate route: ' + e.message);
    } finally {
      setLoading(false);
      setRecalculating(false);
    }
  }, [facility, token, onUnauthorized, toast]);

  // Initial fetch whenever the target facility changes.
  useEffect(() => {
    if (!facility || !position) return;
    setLoading(true);
    recalc(position.lat, position.lon);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facility?.id]);

  // Watch live position: recalc if the user has drifted off the current
  // route polyline, throttled so we don't hammer the backend every fix.
  useEffect(() => {
    if (!facility || !position || !route?.route_path) return;
    const strayM = distanceToPolylineM(position.lat, position.lon, route.route_path);
    const throttleOk = Date.now() - lastFetchAt.current > 4000;
    if (strayM > OFF_ROUTE_THRESHOLD_M && throttleOk) {
      setRecalculating(true);
      toast?.('You\u2019ve gone off route \u2014 recalculating\u2026', 1800);
      recalc(position.lat, position.lon);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position?.lat, position?.lon]);

  const arrived = route?.distance_m !== undefined && route?.distance_m !== null && route.distance_m < 8;

  return { route, directions, loading, recalculating, arrived, recalc };
}
