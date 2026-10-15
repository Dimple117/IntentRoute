// frontend/src/campus-map/geo.js — small geo helpers specific to rendering.

/** Turns a { lat, lon, w, d } building block (meters, half-extents) into a
 *  Leaflet-ready [[lat,lon], ...] rectangle polygon. */
export function blockToPolygon(block) {
  const mPerDegLat = 110540;
  const mPerDegLon = 111320 * Math.cos((block.lat * Math.PI) / 180);
  const dLat = (block.d / 2) / mPerDegLat;
  const dLon = (block.w / 2) / mPerDegLon;
  return [
    [block.lat - dLat, block.lon - dLon],
    [block.lat - dLat, block.lon + dLon],
    [block.lat + dLat, block.lon + dLon],
    [block.lat + dLat, block.lon - dLon],
  ];
}
