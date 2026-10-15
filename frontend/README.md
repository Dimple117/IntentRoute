# IntentRoute v2 — React Frontend

This replaces the old single-file `docs/index.html` with a React (Vite) app.
Every visual detail of the original design — colors, gradients, fonts, animations,
card styles — has been ported over 1:1 into `src/styles.css`; nothing was
restyled, only re-implemented as components.

## What's new in this version

- **Editable profile**: students can now update their **department** and
  **year of study**, in addition to name and avatar.
- **Student avatars**: a set of 12 original, Bitmoji/Snapchat-style cartoon
  avatars to choose from (see `src/components/Avatar.jsx` / `AvatarPicker.jsx`).
  These are hand-built parametric SVGs — not reproductions of any branded
  character set.
- **Forgot password**: a "Forgot password?" link on the login screen opens a
  reset flow (`/auth/forgot-password` → `/auth/reset-password`). There's also
  a "Change Password" panel in Profile for logged-in users.
  > Note: this demo backend has no SMTP server wired up, so the reset code is
  > shown directly in the UI instead of emailed — swap in a real email
  > provider (SendGrid, SES, etc.) before shipping this to production.
- **Animated campus navigator**: instead of only linking out to Google Maps,
  the Navigate results page now renders a live animated mini-map
  (`src/components/CampusNavigator.jsx`) centered on **ATME College of
  Engineering, Bannur Road, Mysuru**. It shows a "You are here" pulsing
  marker, the recommended facility as a destination pin, and a walking
  figure animating along the route between them. The Google Maps link is
  still there as a real-world fallback for actual turn-by-turn directions.

## Running locally

\`\`\`bash
cd frontend
npm install
cp .env.example .env      # point VITE_API_URL at your backend
npm run dev
\`\`\`

## Building for production

\`\`\`bash
npm run build
\`\`\`

Outputs static files to \`dist/\` — deploy that folder anywhere static
(GitHub Pages, Netlify, Vercel, or the FastAPI backend's \`docs/\` folder as
before).

## Backend changes required

Make sure you're running the updated \`backend/main.py\` and
\`database/db_setup.sql\` from this same drop — they add:

- \`users.department\`, \`users.year_of_study\` columns
- \`password_resets\` table + \`/auth/forgot-password\`, \`/auth/reset-password\`,
  \`/auth/change-password\` endpoints
- Facility coordinates re-centered on ATME College of Engineering, Mysuru
