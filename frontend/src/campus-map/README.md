# Live Campus Map module

A self-contained, drop-in Leaflet.js map for the IntentRoute Smart Campus
Navigation System. Everything lives in this one folder — nothing else in
the codebase imports from it except the two integration points below.

## What it does

- Renders the real campus footprint on an OpenStreetMap base layer, bounded
  so panning/zooming can't leave campus (`mapConfig.js: CAMPUS_BOUNDS`).
- Draws walkways (`/campus/graph`) and building outlines (`/campus/blocks`)
  pulled straight from the backend, and every facility (`/facilities`) as a
  clickable, categorized marker (name, category, icon, hours, description).
- Tracks the user's live position continuously via `navigator.geolocation
  .watchPosition` (`useLiveLocation.js`) and shows it as an animated,
  auto-rotating marker.
- Search-to-navigate: pick any facility and get the shortest walking route,
  computed server-side with Dijkstra over the same walkway graph the rest of
  the app already uses (`GET /route/:id`).
- Turn-by-turn directions, total distance, and ETA are derived client-side
  from the route polyline (`directions.js`), no extra backend endpoint
  needed.
- If the live position strays more than ~25m from the current route
  (`mapConfig.js: OFF_ROUTE_THRESHOLD_M`), the route is automatically
  recalculated (`useCampusRoute.js`).
- "Follow me" mode keeps the map centered and can be toggled off to freely
  pan while still navigating.
- Add/edit/delete a facility by typed latitude/longitude, "pick a point on
  the map", or "use my current location" (`FacilityAdminPanel.jsx`), backed
  by the new `POST/PUT/DELETE /facilities` endpoints.

## Files

| File                     | Responsibility                                            |
|--------------------------|------------------------------------------------------------|
| `CampusMap.jsx`          | Main component — map, layers, search, directions panel     |
| `FacilityAdminPanel.jsx` | Add/edit/delete facility modal form                        |
| `campusMapApi.js`        | Fetch wrappers, built on the app's existing `api.js`        |
| `useLiveLocation.js`     | Geolocation watch + bearing/distance helpers                |
| `useCampusRoute.js`      | Route fetch, off-route detection, auto-recalculation        |
| `directions.js`          | Polyline → turn-by-turn steps, deviation distance           |
| `geo.js`                 | Building footprint (meters) → lat/lon polygon               |
| `mapConfig.js`           | Icons, colors, campus bounds, thresholds                    |
| `CampusMap.css`          | Scoped `.cm-*` styles matching the app's existing theme      |

## Integration points (the only two files touched outside this folder)

1. `frontend/src/components/Sidebar.jsx` — added one nav item (`Live Map`).
2. `frontend/src/App.jsx` — imports `CampusMap` and renders it when
   `section === 'map'`.

Everything else (auth, favourites, history, the chatbot navigator) is
untouched. To remove the module, delete this folder and revert those two
small diffs.

## Backend endpoints this module uses

All in `backend/main.py`, alongside the app's existing routes:

- `GET /facilities` — public, list all facilities (icon now included)
- `POST /facilities`, `PUT /facilities/:id`, `DELETE /facilities/:id` — new,
  auth required, power the admin panel
- `GET /campus/graph` — existing, walkway nodes/edges
- `GET /campus/blocks` — new, building footprint polygons
- `GET /route/:id?user_lat=&user_lon=` — existing, Dijkstra route + ETA

## Setup

```bash
cd frontend
npm install   # pulls in leaflet + react-leaflet, added to package.json
```

No other setup needed — the module reads `VITE_API_URL` the same way the
rest of the frontend does.

## Extending

- **More precise building outlines**: replace the rectangle approximation in
  `geo.js`/`CAMPUS_BLOCKS` with real GeoJSON polygons if you survey the
  buildings; `Polygon` in `CampusMap.jsx` already accepts any point list.
- **Admin-only editing**: there's no `role` column yet, so any logged-in
  user can add/edit/delete facilities. Add a `role` column to `users` and
  a check in the three facility endpoints if you need to restrict this.
- **A\* instead of Dijkstra**: the backend's `dijkstra()` in `main.py` is a
  plain Dijkstra (no heuristic) — for this graph size (a few dozen nodes)
  it's already effectively instant, but a haversine-to-goal heuristic can
  be added to `dijkstra()` to turn it into A* if the walkway graph grows
  much larger.
