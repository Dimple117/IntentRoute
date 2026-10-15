export const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';
export const WAKE_WORD = 'hello nav';

// Languages the voice assistant supports. `code` is what's sent to the
// backend (see utils/translation.py -> SUPPORTED_LANGS), `speech` is the
// BCP-47 tag used for both the Web Speech API's recognition (`rec.lang`)
// and text-to-speech (`SpeechSynthesisUtterance.lang`). Add a language here
// (and its counterpart in utils/translation.py) to support more languages —
// no other code changes needed.
export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', speech: 'en-IN' },
  { code: 'hi', label: 'Hindi', native: 'हिंदी', speech: 'hi-IN' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ', speech: 'kn-IN' },
];
export const DEFAULT_LANG = 'en';

// Fallback flat-color "initials" avatars (used until a student picks a
// cartoon avatar, and as the background behind every cartoon avatar).
export const AVATAR_COLORS = [
  { bg: '#1e3a5f', color: '#5b8fff' },
  { bg: '#1a3d2e', color: '#00d68f' },
  { bg: '#3d1a2e', color: '#ff6b9d' },
  { bg: '#3d2e1a', color: '#ffb300' },
  { bg: '#2e1a3d', color: '#a855f7' },
  { bg: '#1a3a3d', color: '#06d6c7' },
];

// Original cartoon "student avatar" presets — Bitmoji/Snapchat-style but
// entirely original artwork, built as parametric SVG in <Avatar/>.
export const AVATAR_PRESETS = [
  { id: 'a1', skin: '#ffcf9e', hair: '#2b2019', hairStyle: 'short',  top: '#5b8fff', accessory: 'none' },
  { id: 'a2', skin: '#f2b98d', hair: '#5c3a21', hairStyle: 'bun',    top: '#ff6b9d', accessory: 'earrings' },
  { id: 'a3', skin: '#8d5a3c', hair: '#141414', hairStyle: 'curly',  top: '#00d68f', accessory: 'none' },
  { id: 'a4', skin: '#ffe0bd', hair: '#caa14b', hairStyle: 'long',   top: '#a855f7', accessory: 'headband' },
  { id: 'a5', skin: '#c98a5e', hair: '#1a1a1a', hairStyle: 'cap',    top: '#06d6c7', accessory: 'cap' },
  { id: 'a6', skin: '#ffd8a8', hair: '#3a3a3a', hairStyle: 'short',  top: '#ffb300', accessory: 'glasses' },
  { id: 'a7', skin: '#a56a43', hair: '#0d0d0d', hairStyle: 'afro',   top: '#5b8fff', accessory: 'none' },
  { id: 'a8', skin: '#f7c9a0', hair: '#8a5a2b', hairStyle: 'bald',   top: '#ff6b9d', accessory: 'glasses' },
  { id: 'a9', skin: '#e8ab77', hair: '#4a2f19', hairStyle: 'long',   top: '#00d68f', accessory: 'glasses' },
  { id: 'a10', skin: '#ffe3c2', hair: '#c94f4f', hairStyle: 'curly', top: '#a855f7', accessory: 'earrings' },
  { id: 'a11', skin: '#7a4a2b', hair: '#111111', hairStyle: 'cap',   top: '#06d6c7', accessory: 'cap' },
  { id: 'a12', skin: '#ffcf9e', hair: '#181818', hairStyle: 'bun',   top: '#ffb300', accessory: 'headband' },
];

export const INTENT_ICONS = { STUDY: '📚', FOOD: '🍽️', MEDICAL: '🏥', ADMIN: '🏛️', LAB: '🔬', HOSTEL: '🏠' };

export const DEPARTMENTS = [
  'Computer Science & Engineering',
  'Information Science & Engineering',
  'Electronics & Communication Engineering',
  'Electrical & Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering',
  'AI & Machine Learning',
  'MBA',
  'MCA',
];

export const YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Postgraduate'];

// ATME College of Engineering, Bannur Road, Mysuru — default campus anchor.
// This is also where every student "starts" from until their live location
// is available (see LocationPopup / App.jsx skipLocation()).
export const CAMPUS_CENTER = { name: 'ATME College of Engineering, Mysuru', latitude: 12.3145253, longitude: 76.7708636 };

// Mirrors the backend's CAMPUS_NODES/CAMPUS_EDGES (backend/main.py) — the same
// walkway graph the Dijkstra router runs over — so the live route page can
// draw the actual campus paths, not just a straight line to the destination.
export const CAMPUS_NODES = {
  main:        { lat: 12.3145253, lon: 76.7708636 },
  route_mid:   { lat: 12.314907, lon: 76.771088 },
  upper_walk:  { lat: 12.315137, lon: 76.771188 },
  library_jn:  { lat: 12.314699, lon: 76.770381 },
  auditorium:  { lat: 12.314981, lon: 76.771472 },
  highway_jn:  { lat: 12.315504, lon: 76.770647 },
  devi_hall:   { lat: 12.315656, lon: 76.771800 },
  sports_jn:   { lat: 12.314789, lon: 76.772037 },
  cricket_jn:  { lat: 12.314231, lon: 76.772356 },
};

export const CAMPUS_EDGES = [
  ['main', 'route_mid'],
  ['route_mid', 'upper_walk'],
  ['upper_walk', 'auditorium'],
  ['upper_walk', 'highway_jn'],
  ['highway_jn', 'library_jn'],
  ['upper_walk', 'devi_hall'],
  ['devi_hall', 'sports_jn'],
  ['sports_jn', 'cricket_jn'],
];

// Approximate footprints for each campus block, drawn as simple 3D-ish blocks
// on the live route map so buildings read clearly at a glance. Sizes are in
// meters (half-width/half-depth from the center point) — nudge freely once
// you know each building's real outline.
export const CAMPUS_BLOCKS = [
  { name: 'Library Block',    lat: 12.31532, lon: 76.77004, w: 34, d: 24, photo: '/blocks/library-block.jpg' },
  { name: 'Engineering Block', lat: 12.31522, lon: 76.77109, w: 42, d: 30, photo: '/blocks/engineering-block.jpg' },
  { name: 'CS Building',      lat: 12.31539, lon: 76.77134, w: 30, d: 26, photo: '/blocks/cs-building.jpg' },
  { name: 'Admin Block',      lat: 12.31492, lon: 76.77044, w: 30, d: 22, photo: '/blocks/admin-block.jpg' },
  { name: 'Health Block',     lat: 12.31469, lon: 76.77016, w: 22, d: 18, photo: '/blocks/health-block.jpg' },
  { name: 'Student Hub',      lat: 12.31462, lon: 76.76984, w: 26, d: 20, photo: '/blocks/student-hub.jpg' },
  { name: 'Hostel Block A',   lat: 12.31382, lon: 76.76914, w: 30, d: 40, photo: '/blocks/hostel-block-a.jpg' },
  { name: 'Hostel Block B',   lat: 12.31362, lon: 76.76894, w: 30, d: 40, photo: '/blocks/hostel-block-b.jpg' },
  { name: 'Learning Center',  lat: 12.31422, lon: 76.76964, w: 24, d: 18, photo: '/blocks/learning-center.jpg' },
];