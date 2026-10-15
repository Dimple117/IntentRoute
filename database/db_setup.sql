-- IntentRoute v2 — PostgreSQL Schema
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT DO NOTHING)

CREATE TABLE IF NOT EXISTS facilities (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    category     TEXT NOT NULL,
    description  TEXT,
    latitude     DOUBLE PRECISION NOT NULL,
    longitude    DOUBLE PRECISION NOT NULL,
    opening_time TEXT NOT NULL,
    closing_time TEXT NOT NULL,
    building     TEXT,
    floor        TEXT,
    icon         TEXT
);

-- Safe upgrade for databases created before the live campus map existed
ALTER TABLE facilities ADD COLUMN IF NOT EXISTS icon TEXT;

CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar        TEXT DEFAULT '0',
    department    TEXT DEFAULT '',
    year_of_study TEXT DEFAULT '',
    created_at    TIMESTAMP DEFAULT NOW()
);

-- Safe upgrade for existing databases created before these columns existed
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN IF NOT EXISTS year_of_study TEXT DEFAULT '';

CREATE TABLE IF NOT EXISTS password_resets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMP NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS search_history (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    query         TEXT NOT NULL,
    input_mode    TEXT DEFAULT 'text',
    intent        TEXT NOT NULL,
    facility_name TEXT,
    searched_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS favourites (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    facility_id INTEGER NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
    added_at    TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, facility_id)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- ATME COLLEGE OF ENGINEERING, Bannur Road, Mysuru, Karnataka — facility data
-- ═══════════════════════════════════════════════════════════════════════════
-- This app is scoped to ATME College only. Every time the backend starts it
-- re-runs this file, so the facilities table is wiped and reseeded from here
-- — edit THIS file (not the live DB) to make lasting changes.
--
-- Default/starting location for every student is still the ATME main gate
-- (12.30389, 76.71143) — see CAMPUS_CENTER in backend/main.py and constants.js.
-- That's unrelated to this table and untouched here.
--
-- ⚠ Category is set to STATIONERY, its own dedicated intent (see
--   dataset/intents.csv) — trained to catch queries like "I need to print",
--   "where can I get a record book", "I need an assignment book", etc.
--   After changing dataset/intents.csv you must retrain the model once:
--     python model/train_model.py
--   (regenerates model/intent_model.pkl — the backend just loads it, it
--   doesn't retrain itself automatically).
--
-- ⚠ CHANGED: this used to unconditionally DELETE FROM facilities on every
--   backend startup and reseed from this file. That's no longer safe now
--   that the live campus map lets you add/edit facilities at runtime (see
--   POST/PUT/DELETE /facilities in backend/main.py) — those would be wiped
--   on the very next restart. The seed below now only runs ONCE, the first
--   time the table is empty. To make lasting bulk edits, either use the map's
--   admin panel, or edit this file AND manually TRUNCATE facilities once.
-- (favourites cascade-delete automatically via their FK to facilities.id;
--  search_history is untouched since it only stores a facility NAME, not an id)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM facilities LIMIT 1) THEN
        INSERT INTO facilities (name,category,description,latitude,longitude,opening_time,closing_time,building,floor,icon) VALUES
        ('Stationery','STATIONERY','Campus stationery shop for pens, notebooks, record books, assignment books, printouts and photocopies',12.315006,76.77158,'08:00','20:00','Stationery Shop','Ground Floor',NULL),
        ('Central Library','LIBRARY','College library for books, journals, reading room, study hall, borrowing and returning books, reference section, digital library, quiet study space',12.30460,76.71090,'09:00','18:00','Library Block','Ground Floor',NULL),
        ('Boys Common Area','BOYS_COMMON_AREA','Open common space and recreation area for boys hostel residents, hangout space',12.31468,76.770875,'00:00','23:59','Boys Hostel','First Floor',NULL),
        ('Girls Common Area','GIRLS_COMMON_AREA','Open common space and recreation area for girls hostel residents',12.314563,76.770635,'00:00','23:59','Girls Hostel','—',NULL),
        ('Admin Block','ADMIN','Administration block for admissions, fees, exam cell and general administration',12.31448,76.770655,'09:30','17:30','Admin Block','Ground Floor',NULL);
        ('Waiting Lounge','WAITING_LOUNGE','Covered waiting area for students and visitors',12.314566,76.770506,'00:00','23:59','Waiting Lounge','Ground Floor',NULL),
        ('Temple','TEMPLE','Small campus temple / prayer space',12.315200,76.771480,'06:00','20:00','Temple','—',NULL),
        ('Parking','PARKING','Two-wheeler and four-wheeler parking area',12.315346,76.771103,'00:00','23:59','Parking Area','—',NULL),
        ('Boys Hostel','HOSTEL','Boys hostel accommodation, warden office and mess',12.314726,76.771869,'00:00','23:59','Boys Hostel','—',NULL),
        ('Canteen','FOOD','Main canteen serving breakfast, lunch, snacks and beverages',12.314344,76.771465,'08:00','19:00','Canteen','Ground Floor',NULL),
        ('Open Auditorium','AUDITORIUM','Open-air auditorium for events, seminars and fests',12.314487,76.771513,'08:00','20:00','Open Auditorium','—',NULL),
        ('Seating Arrangement','SEATING','Open-air seating area for students',12.315255,76.771865,'00:00','23:59','Seating Area','—',NULL),
        ('Civil Block','DEPARTMENT','Civil Engineering department office and classrooms',12.315282,76.772160,'09:00','17:00','Civil Block','—',NULL),
        ('Electrical and Electronics (EEE) Block','DEPARTMENT','Electrical & Electronics Engineering department office and classrooms',12.315246,76.772728,'09:00','17:00','EEE Block','—',NULL),
        ('BCA and MCA Block','DEPARTMENT','BCA and MCA department office and classrooms',12.315158,76.773367,'09:00','17:00','BCA & MCA Block','—',NULL),
        ('Mechanical Block','DEPARTMENT','Mechanical Engineering department office, classrooms and workshops',12.315086,76.773384,'09:00','17:00','Mechanical Block','—',NULL),
        ('Cricket Ground','SPORTS','Campus cricket ground',12.314875,76.772590,'06:00','19:00','Sports Ground','—',NULL),
        ('Throwball Court','SPORTS','Campus throwball court',12.315011,76.772410,'06:00','19:00','Sports Ground','—',NULL),
        ('Basketball Court','SPORTS','Campus basketball court',12.315076,76.772221,'06:00','19:00','Sports Ground','—',NULL);
        ('Civil Block', 'CIVIL_BLOCK', 'Civil Engineering department office, HOD chamber, faculty rooms and classrooms', 12.315282, 76.772160, '09:00', '17:00', 'Civil Block', '1st Floor', NULL),
        ('Electrical and Electronics (EEE) Block', 'EEE_BLOCK', 'Electrical and Electronics Engineering department office, faculty rooms and classrooms', 12.315246, 76.772728, '09:00', '17:00', 'EEE Block', '1st Floor', NULL),
        ('BCA and MCA Block', 'BCA_MCA_BLOCK', 'BCA and MCA department office, faculty rooms and classrooms', 12.315158, 76.773367, '09:00', '17:00', 'BCA & MCA Block', '2nd Floor', NULL),
        ('Mechanical Block', 'MECHANICAL_BLOCK', 'Mechanical Engineering department office, faculty rooms and classrooms', 12.315086, 76.773384, '09:00', '17:00', 'Mechanical Block', 'Ground Floor', NULL);

        -- Departments (Engineering Block / CS Building)
        ('Computer Science & Engineering Dept','DEPARTMENT','CSE department office, HOD chamber, faculty rooms and classrooms',12.30465,76.71218,'09:00','17:00','CS Building','1st Floor',NULL),
        ('Information Science & Engineering Dept','DEPARTMENT','ISE department office and classrooms',12.30455,76.71205,'09:00','17:00','Engineering Block','2nd Floor',NULL),
        ('Electronics & Communication Dept','DEPARTMENT','ECE department office and classrooms',12.30448,76.71190,'09:00','17:00','Engineering Block','1st Floor',NULL),
        ('Mechanical Engineering Dept','DEPARTMENT','Mechanical department office and workshops',12.30452,76.71198,'09:00','17:00','Engineering Block','Ground Floor',NULL),
        ('Administration Office','ADMIN','Admissions, fees, exam cell and general administration',12.30420,76.71130,'09:30','17:30','Admin Block','Ground Floor',NULL),

        -- Labs
        ('Computer Science Lab 1','LAB','Programming and networking lab for CSE students',12.30462,76.71222,'09:00','17:00','CS Building','Ground Floor',NULL),
        ('Electronics Lab','LAB','Circuits, embedded systems and microprocessor lab',12.30447,76.71188,'09:00','17:00','Engineering Block','Ground Floor',NULL),
        ('Mechanical Workshop','LAB','Fitting, welding and CNC workshop',12.30453,76.71200,'09:00','17:00','Engineering Block','Ground Floor',NULL),

        -- Food
        ('Campus Canteen','FOOD','Main canteen serving breakfast, lunch, snacks and beverages',12.30392,76.71083,'08:00','19:00','Student Hub','Ground Floor',NULL),
        ('Juice & Snacks Corner','FOOD','Quick snacks, juices and beverages near the plaza',12.30405,76.71100,'08:30','18:30','Student Hub','Ground Floor',NULL),

        -- Hostels
        ('Boys Hostel Block A','HOSTEL','Boys hostel accommodation, warden office and mess',12.30310,76.71000,'00:00','23:59','Hostel Block A','—',NULL),
        ('Girls Hostel','GIRLS_HOSTEL','Girls hostel accommodation, warden office and mess',12.30280,76.71040,'00:00','23:59','Hostel Block B','—',NULL),

        -- Auditorium & Sports
        ('Main Auditorium','AUDITORIUM','Seminar hall and auditorium for events, seminars and fests',12.30432,76.71155,'08:00','20:00','Auditorium','Ground Floor',NULL),
        ('Sports Complex & Grounds','SPORTS','Basketball, volleyball and badminton courts, and the main playground',12.30335,76.71165,'06:00','19:00','Sports Complex','—',NULL),

        -- Parking
        ('Main Parking Area','PARKING','Two-wheeler and four-wheeler parking near the main gate',12.30378,76.71120,'00:00','23:59','Parking Area','—',NULL),

        -- Washrooms
        ('Washroom - Library Block','WASHROOM','Public washroom near the library entrance',12.30458,76.71080,'00:00','23:59','Library Block','Ground Floor',NULL),
        ('Washroom - Engineering Block','WASHROOM','Public washroom near the engineering block',12.30446,76.71180,'00:00','23:59','Engineering Block','Ground Floor',NULL),

        -- ATM & Medical
        ('Campus ATM','ATM','On-campus ATM near the central plaza',12.30402,76.71118,'00:00','23:59','Student Hub','Ground Floor',NULL),
        ('Health Center','MEDICAL','First aid, campus doctor and basic medical facilities',12.30397,76.71102,'09:00','17:00','Health Block','Ground Floor',NULL),

        -- Study
        ('Silent Study Hall','STUDY','24-hour quiet study hall with Wi-Fi',12.30350,76.71050,'00:00','23:59','Learning Center','1st Floor',NULL)
        ;
    END IF;
END $$;