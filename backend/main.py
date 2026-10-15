"""
backend/main.py — IntentRoute v2
=================================
Database  : PostgreSQL (via psycopg2)
ENV       : Reads DATABASE_URL from .env file automatically
STT       : Browser Web Speech API only (no audio file upload)

HOW TO SET UP:
  1. Install PostgreSQL from https://www.postgresql.org/download/windows
  2. Open pgAdmin → Create a database called: intentroute
  3. Create a .env file in the project root with:
        DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/intentroute
     (encode special chars: # → %23,  $ → %24,  @ → %40)
  4. pip install -r requirements.txt
  5. python model/train_model.py
  6. uvicorn backend.main:app --reload --port 8000
"""

import os, sys, math, pickle, hashlib, secrets, heapq, urllib.parse
from datetime import datetime, timedelta
from typing import Optional
from contextlib import contextmanager

# ── Auto-load .env file ───────────────────────────────────────────────────────
from dotenv import load_dotenv
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.join(BASE_DIR, '..')
load_dotenv(os.path.join(ROOT_DIR, '.env'))
# ─────────────────────────────────────────────────────────────────────────────

sys.path.append(ROOT_DIR)

import psycopg2
import psycopg2.extras
from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from utils.preprocessing import preprocess_text
from utils.mailer import send_reset_code_email, email_configured
from utils.translation import to_english, from_english, SUPPORTED_LANGS, DEFAULT_LANG

MODEL_PATH = os.path.join(ROOT_DIR, 'model', 'intent_model.pkl')

# ── Load ML model ─────────────────────────────────────────────────────────────
if not os.path.exists(MODEL_PATH):
    raise RuntimeError("Model not found. Run: python model/train_model.py")
with open(MODEL_PATH, 'rb') as f:
    MODEL = pickle.load(f)

# ── Read DATABASE_URL ─────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "\n\n❌ DATABASE_URL not found!\n"
        "Create a .env file in your project root with:\n"
        "  DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/intentroute\n"
        "  (Special chars: # → %23   $ → %24   @ → %40)\n"
    )

# ── FastAPI ───────────────────────────────────────────────────────────────────
app = FastAPI(
    title="IntentRoute v2 API",
    description="From Intention to Destination — PostgreSQL",
    version="2.0.0"
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── PostgreSQL connection ─────────────────────────────────────────────────────
@contextmanager
def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

# ── Init DB tables on startup ─────────────────────────────────────────────────
def init_db():
    sql_path = os.path.join(ROOT_DIR, 'database', 'db_setup.sql')
    with get_db() as conn:
        with conn.cursor() as cur:
            with open(sql_path, encoding='utf-8') as f:
                cur.execute(f.read())
    print("[DB] PostgreSQL tables initialised ✓")

@app.on_event("startup")
def startup():
    try:
        init_db()
        print("[DB] Connected to PostgreSQL ✓")
    except Exception as e:
        print(f"[DB] Warning: {e}")

# ── Auth helpers ──────────────────────────────────────────────────────────────
_tokens: dict[str, int] = {}

def hash_password(pw: str) -> str:
    return hashlib.sha256(pw.encode()).hexdigest()

def make_token(user_id: int) -> str:
    token = secrets.token_hex(32)
    _tokens[token] = user_id
    return token

def get_current_user(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Not authenticated")
    token = authorization[7:]
    user_id = _tokens.get(token)
    if not user_id:
        raise HTTPException(401, "Invalid or expired token. Please log in again.")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE id=%s", (user_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(401, "User not found")
    return dict(row)

# ── Schemas ───────────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name:     str = Field(..., min_length=2)
    email:    str = Field(...)
    password: str = Field(..., min_length=6)

class LoginRequest(BaseModel):
    email:    str
    password: str

class NavigationRequest(BaseModel):
    query:      str             = Field(..., min_length=2)
    user_lat:   Optional[float] = None
    user_lon:   Optional[float] = None
    input_mode: str             = "text"
    lang:       str             = "en"  # e.g. "en", "hi", "kn" — see utils/translation.py

class ProfileUpdate(BaseModel):
    name:          Optional[str] = None
    avatar:        Optional[str] = None
    department:    Optional[str] = None
    year_of_study: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password:      str = Field(..., min_length=6)

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    code:         str = Field(..., min_length=4, max_length=6)
    new_password: str = Field(..., min_length=6)

# ATME College of Engineering, Bannur Road, Mysuru — used as the default
# campus anchor point for the in-app campus navigator.
CAMPUS_CENTER = {
    "name": "ATME College of Engineering, Mysuru",
    "latitude": 12.3145253,
    "longitude": 76.7708636,
}

# Google's verified Place ID for ATME College of Engineering — used to force
# Google Maps directions to resolve the origin to the college itself, since
# raw lat/lon coordinates this close to the Library get auto-snapped to the
# nearest indexed POI (which can end up being "ATME Library" instead).
CAMPUS_PLACE_ID = "ChIJBffMemZyrzsRhQthe4biN7I"

# ── Geo / time helpers ────────────────────────────────────────────────────────
def haversine(lat1, lon1, lat2, lon2):
    R = 6_371_000
    p1, p2 = math.radians(lat1), math.radians(lat2)
    a = (math.sin(math.radians(lat2 - lat1) / 2) ** 2
         + math.cos(p1) * math.cos(p2)
         * math.sin(math.radians(lon2 - lon1) / 2) ** 2)
    return round(R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a)), 1)

def is_open(o, c):
    if o == '00:00' and c == '23:59':
        return True
    return o <= datetime.now().strftime('%H:%M') <= c

# ═══════════════════════════════════════════════════════════════════════════════
# CAMPUS WALKWAY GRAPH — used for Dijkstra shortest-path routing
# ═══════════════════════════════════════════════════════════════════════════════
CAMPUS_NODES = {
    "main":        (12.3145253, 76.7708636),  # ATME College of Engineering gate — verified Google Place coords
    "route_mid":   (12.314907, 76.771088),    # midpoint of the shown walking path (loop road)
    "upper_walk":  (12.315137, 76.771188),    # upper bend of the path, near the road junction
    "library_jn":  (12.314699, 76.770381),    # walkway at ATME Library
    "auditorium":  (12.314981, 76.771472),    # plaza near the circular auditorium building
    "highway_jn":  (12.315504, 76.770647),    # road curving toward NH-33 / library approach
    "devi_hall":   (12.315656, 76.771800),    # main road passing Devi Convention Hall
    "sports_jn":   (12.314789, 76.772037),    # ATME sports area
    "cricket_jn":  (12.314231, 76.772356),    # ATME cricket ground
}

CAMPUS_EDGES = [
    ("main", "route_mid"),
    ("route_mid", "upper_walk"),
    ("upper_walk", "auditorium"),
    ("upper_walk", "highway_jn"),
    ("highway_jn", "library_jn"),
    ("upper_walk", "devi_hall"),
    ("devi_hall", "sports_jn"),
    ("sports_jn", "cricket_jn"),
]

_CAMPUS_GRAPH: dict[str, dict[str, float]] = {n: {} for n in CAMPUS_NODES}
for _a, _b in CAMPUS_EDGES:
    _w = haversine(*CAMPUS_NODES[_a], *CAMPUS_NODES[_b])
    _CAMPUS_GRAPH[_a][_b] = _w
    _CAMPUS_GRAPH[_b][_a] = _w

def nearest_node(lat, lon):
    return min(CAMPUS_NODES, key=lambda n: haversine(lat, lon, *CAMPUS_NODES[n]))

def dijkstra(src, dst):
    """Standard Dijkstra shortest path over the campus walkway graph."""
    dist = {n: math.inf for n in CAMPUS_NODES}
    prev = {}
    dist[src] = 0.0
    pq = [(0.0, src)]
    visited = set()
    while pq:
        d, u = heapq.heappop(pq)
        if u in visited:
            continue
        visited.add(u)
        if u == dst:
            break
        for v, w in _CAMPUS_GRAPH[u].items():
            nd = d + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))
    if dist[dst] == math.inf:
        return math.inf, []
    path = [dst]
    while path[-1] != src:
        path.append(prev[path[-1]])
    path.reverse()
    return dist[dst], [CAMPUS_NODES[n] for n in path]

def route_to_facility(ulat, ulon, flat, flon):
    """Full walking route = last-mile-in + Dijkstra(shortest walkway path) +
    last-mile-out. Returns (total_distance_m, [[lat,lon], ...] polyline)."""
    u_node = nearest_node(ulat, ulon)
    f_node = nearest_node(flat, flon)
    leg_in  = haversine(ulat, ulon, *CAMPUS_NODES[u_node])
    leg_out = haversine(flat, flon, *CAMPUS_NODES[f_node])
    if u_node == f_node:
        mid_dist, mid_path = 0.0, [CAMPUS_NODES[u_node]]
    else:
        mid_dist, mid_path = dijkstra(u_node, f_node)
    total = round(leg_in + mid_dist + leg_out, 1)
    polyline = [[ulat, ulon]] + [list(p) for p in mid_path] + [[flat, flon]]
    return total, polyline

def enrich(row, ulat=None, ulon=None):
    d = dict(row)
    d['is_open'] = is_open(d['opening_time'], d['closing_time'])
    if ulat is not None:
        dist_m, polyline = route_to_facility(ulat, ulon, d['latitude'], d['longitude'])
        d['distance_m'] = dist_m               # Dijkstra walkway distance (used for sorting)
        d['route_path'] = polyline             # full walking path, for the live map animation
        d['eta_min']    = max(1, round(dist_m / 80))  # ~80 m/min walking pace
        origin_name = urllib.parse.quote_plus(CAMPUS_CENTER['name'])
        d['maps_link']  = (
            f"https://www.google.com/maps/dir/?api=1"
            f"&origin={origin_name}&origin_place_id={CAMPUS_PLACE_ID}"
            f"&destination={d['latitude']},{d['longitude']}"
        )
    else:
        d['distance_m'] = None
        d['route_path'] = None
        d['eta_min']    = None
        d['maps_link']  = f"https://www.google.com/maps/search/?api=1&query={d['latitude']},{d['longitude']}"
    return d

# ── Intent classification ─────────────────────────────────────────────────────
def classify(query):
    clean  = preprocess_text(query)
    intent = MODEL.predict([clean])[0]
    conf   = round(float(max(MODEL.predict_proba([clean])[0])) * 100, 1)
    return intent, conf

# ── Recommendation ────────────────────────────────────────────────────────────
def recommend(intent, ulat=None, ulon=None):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM facilities WHERE category=%s", (intent,))
            rows = cur.fetchall()
    if not rows:
        return None, []
    items = [enrich(r, ulat, ulon) for r in rows]
    items.sort(key=lambda f: (0 if f['is_open'] else 1, f['distance_m'] or 999_999))
    return items[0], items[1:]

# ── Core navigate logic ───────────────────────────────────────────────────────
def _do_navigate(query, mode, ulat, ulon, user, lang=DEFAULT_LANG):
    # The TF-IDF model only understands English, so a Kannada/Hindi query gets
    # translated first. `query` (as spoken/typed) is what we store in history
    # and echo back; `query_en` is only used internally for classification.
    lang = lang if lang in SUPPORTED_LANGS else DEFAULT_LANG
    query_en = to_english(query, lang)

    intent, conf = classify(query_en)
    best, alts   = recommend(intent, ulat, ulon)

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO search_history(user_id,query,input_mode,intent,facility_name) VALUES(%s,%s,%s,%s,%s)",
                (user['id'], query, mode, intent, best['name'] if best else None)
            )

    if not best:
        message = f"No facilities found for '{intent}'"
        return {
            "query": query, "query_en": query_en, "lang": lang, "input_mode": mode,
            "intent": intent, "confidence": conf,
            "recommended": None, "alternatives": [],
            "message": message, "message_local": from_english(message, lang)
        }

    dist = f", {best['distance_m']}m away" if best['distance_m'] else ""
    st   = "open ✓" if best['is_open'] else "closed ✗"
    message = f"Found {len(alts)+1} {intent} places. Best: '{best['name']}' — {st}{dist}."
    return {
        "query": query, "query_en": query_en, "lang": lang, "input_mode": mode,
        "intent": intent, "confidence": conf,
        "recommended": best, "alternatives": alts,
        "message": message, "message_local": from_english(message, lang)
    }

# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/auth/signup")
def signup(req: SignupRequest):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM users WHERE email=%s", (req.email.lower(),))
            if cur.fetchone():
                raise HTTPException(409, "Email already registered")
            cur.execute(
                "INSERT INTO users(name,email,password_hash) VALUES(%s,%s,%s) RETURNING id",
                (req.name, req.email.lower(), hash_password(req.password))
            )
            uid = cur.fetchone()['id']
            cur.execute(
                "SELECT id,name,email,avatar,department,year_of_study,created_at FROM users WHERE id=%s",
                (uid,)
            )
            user = dict(cur.fetchone())
    token = make_token(uid)
    return {"token": token, "user": user}

@app.post("/auth/login")
def login(req: LoginRequest):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM users WHERE email=%s", (req.email.lower(),))
            row = cur.fetchone()
    if not row or row['password_hash'] != hash_password(req.password):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(row['id'])
    return {"token": token, "user": {
        "id": row['id'], "name": row['name'], "email": row['email'],
        "avatar": row['avatar'], "department": row.get('department', ''),
        "year_of_study": row.get('year_of_study', ''), "created_at": str(row['created_at'])
    }}

@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {k: v for k, v in user.items() if k != 'password_hash'}

# ═══════════════════════════════════════════════════════════════════════════════
# NAVIGATION
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/navigate")
def navigate(req: NavigationRequest, user=Depends(get_current_user)):
    if not req.query.strip():
        raise HTTPException(400, "Query cannot be empty")
    mode = req.input_mode if req.input_mode in ("text", "voice", "audio") else "text"
    lang = req.lang if req.lang in SUPPORTED_LANGS else DEFAULT_LANG
    return _do_navigate(req.query, mode, req.user_lat, req.user_lon, user, lang)

@app.get("/languages")
def get_languages():
    """Languages the voice assistant currently supports for speech input/output."""
    return {"languages": [{"code": c, "label": l} for c, l in SUPPORTED_LANGS.items()], "default": DEFAULT_LANG}

# ═══════════════════════════════════════════════════════════════════════════════
# HISTORY
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/history")
def get_history(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM search_history WHERE user_id=%s ORDER BY searched_at DESC LIMIT 50",
                (user['id'],)
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]

@app.delete("/history/{hid}")
def delete_history(hid: int, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM search_history WHERE id=%s AND user_id=%s", (hid, user['id']))
    return {"deleted": hid}

@app.delete("/history")
def clear_history(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM search_history WHERE user_id=%s", (user['id'],))
    return {"message": "History cleared"}

# ═══════════════════════════════════════════════════════════════════════════════
# FAVOURITES
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/favourites")
def get_favs(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT f.*, fav.added_at AS fav_added
                FROM facilities f
                JOIN favourites fav ON fav.facility_id = f.id
                WHERE fav.user_id = %s
                ORDER BY fav.added_at DESC
            """, (user['id'],))
            rows = cur.fetchall()
    return [enrich(r) for r in rows]

@app.post("/favourites/{fid}")
def add_fav(fid: int, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO favourites(user_id,facility_id) VALUES(%s,%s) ON CONFLICT DO NOTHING",
                (user['id'], fid)
            )
    return {"message": "Added to favourites"}

@app.delete("/favourites/{fid}")
def remove_fav(fid: int, user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM favourites WHERE user_id=%s AND facility_id=%s",
                (user['id'], fid)
            )
    return {"message": "Removed from favourites"}

# ═══════════════════════════════════════════════════════════════════════════════
# PROFILE
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/profile")
def get_profile(user=Depends(get_current_user)):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) AS c FROM search_history WHERE user_id=%s", (user['id'],))
            hc = cur.fetchone()['c']
            cur.execute("SELECT COUNT(*) AS c FROM favourites WHERE user_id=%s", (user['id'],))
            fc = cur.fetchone()['c']
    return {
        **{k: v for k, v in user.items() if k != 'password_hash'},
        "history_count": hc,
        "favourites_count": fc
    }

@app.put("/profile")
def update_profile(req: ProfileUpdate, user=Depends(get_current_user)):
    fields, vals = [], []
    if req.name:                    fields.append("name=%s");          vals.append(req.name)
    if req.avatar is not None:      fields.append("avatar=%s");        vals.append(req.avatar)
    if req.department is not None:  fields.append("department=%s");    vals.append(req.department)
    if req.year_of_study is not None: fields.append("year_of_study=%s"); vals.append(req.year_of_study)
    if not fields:
        raise HTTPException(400, "Nothing to update")
    vals.append(user['id'])
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(f"UPDATE users SET {','.join(fields)} WHERE id=%s", vals)
            cur.execute(
                "SELECT id,name,email,avatar,department,year_of_study,created_at FROM users WHERE id=%s",
                (user['id'],)
            )
            updated = dict(cur.fetchone())
    return updated

# ═══════════════════════════════════════════════════════════════════════════════
# PASSWORD — change (while logged in) & forgot/reset (while logged out)
# ═══════════════════════════════════════════════════════════════════════════════
@app.post("/auth/change-password")
def change_password(req: ChangePasswordRequest, user=Depends(get_current_user)):
    if user['password_hash'] != hash_password(req.current_password):
        raise HTTPException(401, "Current password is incorrect")
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password_hash=%s WHERE id=%s",
                (hash_password(req.new_password), user['id'])
            )
    return {"message": "Password updated successfully"}

@app.post("/auth/forgot-password")
def forgot_password(req: ForgotPasswordRequest):
    """
    Generates a 6-digit reset code valid for 30 minutes and emails it to the
    user via Gmail SMTP (see utils/mailer.py). If Gmail isn't configured yet
    in .env, the code is returned directly in the response instead so local
    dev/testing still works without a real inbox.
    """
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, name FROM users WHERE email=%s", (req.email.lower(),))
            row = cur.fetchone()
            # Always respond success (don't reveal whether the email exists)
            if not row:
                return {"message": "If that email is registered, a reset code has been sent to it.", "dev_code": None}
            code = f"{secrets.randbelow(1_000_000):06d}"
            code_hash = hash_password(code)
            expires = datetime.utcnow() + timedelta(minutes=30)
            cur.execute(
                "INSERT INTO password_resets(user_id, token_hash, expires_at) VALUES(%s,%s,%s)",
                (row['id'], code_hash, expires)
            )
            user_name = row['name']
            user_email = req.email.lower()

    sent = send_reset_code_email(user_email, user_name, code)
    if sent:
        return {"message": "A 6-digit reset code has been emailed to you.", "dev_code": None}
    return {
        "message": "Couldn't send email (Gmail isn't configured on this server yet) — "
                    "here's your reset code directly instead.",
        "dev_code": code
    }

@app.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest):
    code_hash = hash_password(req.code.strip())
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM password_resets WHERE token_hash=%s AND used=FALSE AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
                (code_hash,)
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(400, "Reset code is invalid or has expired")
            cur.execute(
                "UPDATE users SET password_hash=%s WHERE id=%s",
                (hash_password(req.new_password), row['user_id'])
            )
            cur.execute("UPDATE password_resets SET used=TRUE WHERE id=%s", (row['id'],))
    return {"message": "Password reset successfully. You can now log in."}

# ═══════════════════════════════════════════════════════════════════════════════
# CAMPUS — static campus anchor info for the in-app animated navigator
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/campus")
def get_campus():
    return CAMPUS_CENTER

@app.get("/campus/graph")
def get_campus_graph():
    """Static walkway graph (nodes + edges) so the frontend can draw the same
    roads the Dijkstra router uses — kept in sync automatically since both
    read from the same source of truth conceptually (mirrored in constants.js)."""
    return {
        "nodes": {n: {"lat": lat, "lon": lon} for n, (lat, lon) in CAMPUS_NODES.items()},
        "edges": [{"from": a, "to": b} for a, b in CAMPUS_EDGES],
    }

@app.get("/route/{facility_id}")
def get_route(facility_id: int, user_lat: float, user_lon: float, user=Depends(get_current_user)):
    """Fresh Dijkstra-computed walking route to a single facility — used by the
    dedicated animated live-route page, so it can refetch as the student's
    live location updates."""
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM facilities WHERE id=%s", (facility_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Facility not found")
    return enrich(row, user_lat, user_lon)

# ═══════════════════════════════════════════════════════════════════════════════
# MISC
# ═══════════════════════════════════════════════════════════════════════════════
@app.get("/facilities")
def list_facilities(category: Optional[str] = None):
    with get_db() as conn:
        with conn.cursor() as cur:
            if category:
                cur.execute("SELECT * FROM facilities WHERE category=%s", (category.upper(),))
            else:
                cur.execute("SELECT * FROM facilities")
            rows = cur.fetchall()
    return [enrich(r) for r in rows]

@app.get("/health")
def health():
    try:
        with get_db() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {e}"
    return {"status": "ok", "version": "2.0.0", "database": "postgresql", "db_status": db_status}

if __name__ == '__main__':
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)