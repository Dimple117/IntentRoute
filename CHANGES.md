<<<<<<< HEAD
# Multilingual voice assistant — Hindi & Kannada support

## 1. New language selector (sidebar)
- Pick English / हिंदी / ಕನ್ನಡ from a dropdown above your profile in the
  sidebar (`components/LanguageSelector.jsx`). Saved to `localStorage`
  (`ir_lang`), applies to both the mic tab and the "Hello Nav" wake-word
  assistant.

## 2. Backend translation layer (`utils/translation.py`)
- The intent model is TF-IDF + Logistic Regression trained only on English
  text (`utils/preprocessing.py` strips any non a-z0-9 characters, so Kannada/
  Hindi script would previously be wiped out before classification).
- `NavigationRequest` now accepts a `lang` field (`"en"`, `"hi"`, `"kn"`).
  `POST /navigate` translates the query to English first (`to_english()`)
  before running the existing classifier — so the model itself is completely
  unchanged. The response includes `query_en` (what was actually classified)
  and `message_local` (the reply translated back into the requested
  language, for the frontend to read aloud).
- Uses `deep-translator`'s free Google Translate wrapper (`pip install
  deep-translator`, added to `requirements.txt`) — no API key. If translation
  fails (offline, rate-limited, etc.) it silently falls back to the original
  text instead of breaking navigation.
- New `GET /languages` lists the languages the assistant currently supports.

## 3. Voice assistant — wake word stays English, commands go multilingual
- `components/VoiceAgent.jsx` still listens for the **"Hello Nav"** wake
  phrase in English (that's the one phrase that needs to stay reliable), but
  once triggered it opens a *second* speech-recognition pass in whichever
  language is selected (`hi-IN` / `kn-IN` / `en-IN`) to actually capture your
  request.
- `components/sections/NavigateSection.jsx`'s microphone tab now records in
  the selected language too, and speaks results back out loud
  (`speechSynthesis`) for any voice-originated query, in that language.
- Results panel shows a small "🌐 Understood as: ..." line when the
  translated English interpretation differs from what you said, so it's
  clear what the model actually matched on.

## 4. Adding another language later
- Add one entry to `SUPPORTED_LANGS` in `utils/translation.py` and one to
  `SUPPORTED_LANGUAGES` in `frontend/src/constants.js` (language code, label,
  and the BCP-47 speech tag) — no other code changes needed.

---

=======
>>>>>>> e1d7357d478ce04fa60ab7a0ac63b312e0b4296e
# Latest update — ATME campus data, real emails, Dijkstra routing, live map

## 1. Facilities reset to ATME College of Engineering only
- `database/db_setup.sql` now `DELETE`s the whole `facilities` table and reseeds
  it fresh every time the backend starts (previously it only ever inserted —
  meaning duplicates would silently pile up on every restart; this also fixes
  that). All 24 facilities are centered on ATME College of Engineering, Bannur
  Road, Mysuru (main gate: `12.30389, 76.71143`).
- **Two rows are marked `ACTUAL COORDS — VERIFY`** (Central Library, Main
  Campus Cafeteria) — open `database/db_setup.sql` and swap in the exact
  latitude/longitude you have for those two facilities. Everything else is
  placed relative to the main gate; nudge any other row the same way once you
  know it more precisely.
- The ATME main gate is the default/starting location for every student —
  used automatically if they skip location sharing or their browser can't get
  a GPS fix (`CAMPUS_CENTER` in `backend/main.py` and `constants.js`).

## 2. Real password-reset emails (Gmail SMTP)
- New `utils/mailer.py` sends a styled HTML email with a 6-digit reset code
  via Gmail's SMTP relay — no third-party email API needed.
- Setup: turn on 2-Step Verification + create a Gmail **App Password**, then
  add `GMAIL_USER` / `GMAIL_APP_PASSWORD` / `GMAIL_FROM_NAME` to `.env` (see
  `.env.example` for the exact steps).
- If Gmail isn't configured yet, the code is still returned directly in the
  API response as a dev fallback, so local testing works either way.
- `POST /auth/reset-password` now takes `code` (the 6-digit code) instead of
  a long token; `ForgotPasswordModal.jsx` updated to match.

## 3. Search bar fix + animated splash screen
- **Found and fixed the actual "dim" bug**: the search input's CSS rule was
  targeting `#textInput`, an id that didn't exist anywhere in the React
  markup — so the input had no color, padding, or font styling applied at
  all. It's now a proper `.search-input` class with full styling, better
  placeholder contrast, and a responsive layout for small phone screens.
- New `Splash.jsx` — an animated "IntentRoute" intro (letter-by-letter
  reveal, spinning compass, gradient loading bar) shown for ~2.4s before the
  sign-in page on cold app load.

## 4. Dijkstra shortest-path routing + full-page live animated map
- `backend/main.py` now models the campus as a small walkway graph
  (`CAMPUS_NODES` / `CAMPUS_EDGES`) and runs a real **Dijkstra shortest-path**
  search between the student's nearest walkway node and the facility's
  nearest walkway node — so "distance" and sorting are based on an actual
  walking route, not a straight line through buildings.
- Facility results are sorted by **open/closed status first, then walking
  distance** (existing behavior, now Dijkstra-powered) — see `recommend()`.
- Selecting **"🛵 View Live Route"** on a facility now redirects to a
  dedicated full-page animated map (`RouteSection.jsx`): campus buildings
  drawn as illustrated 3D-style blocks, the walkway graph as roads, and a
  moving 🛵 marker that tracks the exact Dijkstra path — Swiggy/Zomato-style,
  complete with a live ETA countdown and progress bar. New endpoints:
  `GET /route/{facility_id}` and `GET /campus/graph`.

---

# What changed in this update

## 1. Profile: department + year of study
- New `department` and `year_of_study` columns on `users` (see `database/db_setup.sql`).
- `PUT /profile` now accepts `department` and `year_of_study` in addition to `name`/`avatar`.
- Editable in the new React app under **Profile → Edit Profile**.

## 2. Student avatars
- 12 original, hand-built cartoon "student" avatars (Bitmoji/Snapchat-style, but original
  artwork) to pick from in **Profile → Choose Avatar**.
  See `frontend/src/components/Avatar.jsx` and `AvatarPicker.jsx`.
- Old flat-color initials avatars still work as a fallback for any existing accounts.

## 3. Forgot / change password
- `POST /auth/forgot-password` — generates a 30-minute reset code for an email
  (returned directly in the response since there's no SMTP server wired up in this
  demo backend — wire up SendGrid/SES etc. before shipping to production).
- `POST /auth/reset-password` — redeems the reset code for a new password.
- `POST /auth/change-password` — lets a logged-in student change their password
  from **Profile → Change Password**.
- "Forgot password?" link added to the login screen.

## 4. Frontend rewritten: HTML/vanilla JS → React
- The old `docs/index.html` (kept for reference in `docs_legacy/`) has been rebuilt as a
  Vite + React app in `frontend/`.
- Every design detail — colors, gradients, fonts (Clash Display / Outfit), card styles,
  and every CSS animation — was ported 1:1 into `frontend/src/styles.css`. Nothing was
  restyled; it's the same look, now made of reusable components.
- See `frontend/README.md` for setup/run instructions.

## 5. Animated in-campus navigator (ATME College of Engineering, Mysuru)
- All facility coordinates in `database/db_setup.sql` were moved from the old
  placeholder city to real coordinates around **ATME College of Engineering,
  Bannur Road, Mysuru** (12.30389° N, 76.71143° E).
- A new **Live Campus Walk** animated mini-map appears under every search result
  (`frontend/src/components/CampusNavigator.jsx`): a pulsing "You" marker, the
  destination pin, and a little walking figure animating along the route between
  them, with a live distance/ETA readout.
- The real Google Maps "🗺 Google Maps" button is still there next to it for actual
  turn-by-turn directions — the animated map is a fun, gamified layer on top, not a
  replacement for real routing.
- If the browser denies/skips location permission, the student's starting point
  defaults to the ATME main gate instead of showing nothing.

## Running it
1. Backend: unchanged setup, see original `README.md` — just re-run
   `python model/train_model.py` isn't needed again, but do re-run the app once so
   `db_setup.sql` applies the new columns/table (`ALTER TABLE ... IF NOT EXISTS`,
   safe to run on an existing database).
2. Frontend: `cd frontend && npm install && npm run dev` (see `frontend/README.md`).
