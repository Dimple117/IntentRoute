// frontend/src/campus-map/mapConfig.js
//
// Static configuration for the live campus map module. Kept separate from
// the rest of the app's constants.js so this module stays a self-contained,
// drop-in piece — nothing here is imported by any other part of the app.

import { CAMPUS_CENTER } from '../constants';

// Fallback marker icon per category — mirrors backend/main.py CATEGORY_ICON.
// A facility can still override this with its own `icon` field.
export const CATEGORY_ICON = {
  LIBRARY: '📚', STUDY: '📖', FOOD: '🍽️', MEDICAL: '🏥',
  ADMIN: '🏛️', LAB: '🔬', HOSTEL: '🏠', GIRLS_HOSTEL: '🏠',
  BOYS_COMMON_AREA: '🛋️', STATIONERY: '🖊️', PARKING: '🚗',
  AUDITORIUM: '🎭', SPORTS: '🏸', WASHROOM: '🚻', ATM: '🏦',
  DEPARTMENT: '🎓', CANTEEN: '🍽️',
};

export const CATEGORY_COLOR = {
  LIBRARY: '#818cf8', STUDY: '#a855f7', FOOD: '#d97706', MEDICAL: '#e53e3e',
  ADMIN: '#00a86b', LAB: '#0891b2', HOSTEL: '#d97706', GIRLS_HOSTEL: '#c2680a',
  BOYS_COMMON_AREA: '#5b8fff', STATIONERY: '#94a3b8', PARKING: '#6b7280',
  AUDITORIUM: '#be185d', SPORTS: '#16a34a', WASHROOM: '#64748b', ATM: '#0d9488',
  DEPARTMENT: '#5b8fff', CANTEEN: '#d97706',
};

export function iconFor(facility) {
  return facility?.icon || CATEGORY_ICON[facility?.category] || '📍';
}
export function colorFor(facility) {
  return CATEGORY_COLOR[facility?.category] || '#5b8fff';
}

// Every facility list of categories, used to populate the admin add/edit form.
export const ALL_CATEGORIES = Object.keys(CATEGORY_ICON);

// Campus bounding box (roughly 350m around the campus center) — Leaflet's
// `maxBounds` uses this to stop the user panning/zooming out to see the rest
// of the world, so the map "only works within campus" as requested.
const DEG_LAT_PER_M = 1 / 110540;
const DEG_LON_PER_M = 1 / (111320 * Math.cos((CAMPUS_CENTER.latitude * Math.PI) / 180));
const HALF_SPAN_M = 450;

export const CAMPUS_BOUNDS = [
  [
    CAMPUS_CENTER.latitude - HALF_SPAN_M * DEG_LAT_PER_M,
    CAMPUS_CENTER.longitude - HALF_SPAN_M * DEG_LON_PER_M,
  ],
  [
    CAMPUS_CENTER.latitude + HALF_SPAN_M * DEG_LAT_PER_M,
    CAMPUS_CENTER.longitude + HALF_SPAN_M * DEG_LON_PER_M,
  ],
];

export const CAMPUS_MIN_ZOOM = 16;
export const CAMPUS_MAX_ZOOM = 20;

// Distance (meters) the user can stray from the current route polyline
// before we treat them as "off route" and recalculate.
export const OFF_ROUTE_THRESHOLD_M = 25;

// How often (ms) to poll geolocation via getCurrentPosition as a watchPosition
// fallback on browsers/devices that deliver watchPosition updates too slowly.
export const POSITION_POLL_MS = 5000;
