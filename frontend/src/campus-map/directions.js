// frontend/src/campus-map/directions.js
//
// Turn-by-turn directions are generated client-side from the route polyline
// the backend's Dijkstra router already returns (`route_path`), rather than
// requiring a separate backend endpoint. We look at the bearing change at
// each waypoint to decide whether it's a "turn left/right" or "continue".

import { bearing, distanceM } from './useLiveLocation';

function turnLabel(deltaDeg) {
  const d = ((deltaDeg + 180) % 360) - 180; // normalize to [-180, 180]
  if (Math.abs(d) < 20) return 'Continue straight';
  if (d >= 20 && d < 100) return 'Turn right';
  if (d <= -20 && d > -100) return 'Turn left';
  return d > 0 ? 'Make a sharp right' : 'Make a sharp left';
}

/**
 * @param {[number, number][]} path - [[lat, lon], ...] from route_path
 * @param {string} destinationName
 * @returns {{steps: Array<{instruction:string, distance_m:number}>, totalDistanceM:number}}
 */
export function buildDirections(path, destinationName = 'your destination') {
  if (!path || path.length < 2) return { steps: [], totalDistanceM: 0 };

  const steps = [];
  let prevBearing = null;
  let segStartIdx = 0;
  let segDist = 0;

  for (let i = 0; i < path.length - 1; i++) {
    const [lat1, lon1] = path[i];
    const [lat2, lon2] = path[i + 1];
    const d = distanceM(lat1, lon1, lat2, lon2);
    const b = bearing(lat1, lon1, lat2, lon2);

    if (prevBearing === null) {
      segDist = d;
    } else {
      const label = turnLabel(b - prevBearing);
      if (label === 'Continue straight') {
        segDist += d;
      } else {
        steps.push({ instruction: `Head ${compass(prevBearing)} for ${Math.round(segDist)}m`, distance_m: Math.round(segDist) });
        steps.push({ instruction: `${label}`, distance_m: 0 });
        segDist = d;
        segStartIdx = i;
      }
    }
    prevBearing = b;
  }
  if (prevBearing !== null) {
    steps.push({ instruction: `Head ${compass(prevBearing)} for ${Math.round(segDist)}m`, distance_m: Math.round(segDist) });
  }
  steps.push({ instruction: `Arrive at ${destinationName}`, distance_m: 0 });

  const totalDistanceM = Math.round(
    path.slice(1).reduce((sum, p, i) => sum + distanceM(path[i][0], path[i][1], p[0], p[1]), 0)
  );

  return { steps, totalDistanceM, _segStartIdx: segStartIdx };
}

function compass(deg) {
  const dirs = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
  return dirs[Math.round(deg / 45) % 8];
}

/**
 * Perpendicular distance (meters, approx) from a point to the nearest
 * segment of a polyline — used to detect route deviation.
 */
export function distanceToPolylineM(lat, lon, path) {
  if (!path || path.length === 0) return Infinity;
  if (path.length === 1) return distanceM(lat, lon, path[0][0], path[0][1]);

  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const d = pointToSegmentM(lat, lon, path[i], path[i + 1]);
    if (d < min) min = d;
  }
  return min;
}

function pointToSegmentM(lat, lon, a, b) {
  // Flatten to a local planar approx (fine for campus-scale distances).
  const mPerDegLat = 110540;
  const mPerDegLon = 111320 * Math.cos((lat * Math.PI) / 180);
  const px = (lon - a[1]) * mPerDegLon, py = (lat - a[0]) * mPerDegLat;
  const bx = (b[1] - a[1]) * mPerDegLon, by = (b[0] - a[0]) * mPerDegLat;
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / (bx * bx + by * by || 1)));
  const cx = bx * t, cy = by * t;
  return Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
}
