// frontend/src/campus-map/campusMapApi.js
//
// All network calls the live campus map needs, built on top of the
// project's existing apiFetch/apiPublic helpers (frontend/src/api.js) —
// no new fetch plumbing, no new auth handling.

import { apiFetch, apiPublic } from '../api';

/** All facilities (optionally filtered by category). Public — no auth. */
export async function fetchFacilities(category) {
  const qs = category ? `?category=${encodeURIComponent(category)}` : '';
  const r = await apiPublic(`/facilities${qs}`);
  return r.json();
}

/** Building footprint polygons for the map's building overlay. */
export async function fetchCampusBlocks() {
  const r = await apiPublic('/campus/blocks');
  return r.json();
}

/** Walkway graph (nodes + edges) — same graph the Dijkstra router uses. */
export async function fetchCampusGraph() {
  const r = await apiPublic('/campus/graph');
  return r.json();
}

/**
 * Fresh Dijkstra-computed walking route from (userLat, userLon) to a
 * facility. Returns { route_path, distance_m, eta_min, ... } — same shape
 * RouteSection.jsx already consumes.
 */
export async function fetchRoute(token, facilityId, userLat, userLon, onUnauthorized) {
  const r = await apiFetch(
    `/route/${facilityId}?user_lat=${userLat}&user_lon=${userLon}`,
    token, {}, onUnauthorized
  );
  return r.json();
}

export async function createFacility(token, facility, onUnauthorized) {
  const r = await apiFetch('/facilities', token, {
    method: 'POST',
    body: JSON.stringify(facility),
  }, onUnauthorized);
  return r.json();
}

export async function updateFacility(token, id, facility, onUnauthorized) {
  const r = await apiFetch(`/facilities/${id}`, token, {
    method: 'PUT',
    body: JSON.stringify(facility),
  }, onUnauthorized);
  return r.json();
}

export async function deleteFacility(token, id, onUnauthorized) {
  const r = await apiFetch(`/facilities/${id}`, token, { method: 'DELETE' }, onUnauthorized);
  return r.json();
}
