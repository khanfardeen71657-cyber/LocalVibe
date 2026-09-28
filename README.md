# LocalVibe — A Hyperlocal Event Discovery Platform

> Find out "What's happening near me this weekend?" — without the clutter.

LocalVibe is a location-aware event discovery platform. Users discover
nearby events on an interactive map, RSVP ("Going" / "Interested"), and
see where their friends are going. Organizers can publish events with
address autocomplete and promote them as **Featured**.

**Live demo:** _coming soon_
**Repository:** https://github.com/khanfardeen71657-cyber/LocalVibe

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Local Setup](#local-setup)
- [API Surface](#api-surface)
- [Seed Data](#seed-data)
- [API Key Management](#api-key-management)
- [Deployment](#deployment)
- [Project Status](#project-status)
- [License](#license)

---

## Features

### Geospatial backend
- MongoDB with a **2dsphere** index on `location`
- "Find events within N km" via `$geoNear` aggregation
- Event schema stores **address + `[lng, lat]`** (GeoJSON order)
- Radius filters from 1 km to 500 km

### Mapping & visualization
- Interactive **Leaflet** map (OpenStreetMap tiles — free, no API key)
- Custom markers: **green** for regular events, **orange & larger** for featured
- Live user location with a 5 km radius circle
- Popups with event image, name, address, and a link to the detail page

### Event management
- Organizers create events with **address autocomplete** (Nominatim / OpenStreetMap)
- Address → coordinates conversion automatic on selection
- RSVP system: **Going** and **Interested** (mutually exclusive)
- Attendee list with **Host** badge
- Full CRUD for hosts (create / update / delete)

### Personalization
- **Friends feed:** "Ali and Sara joined this event" — built from who you follow
- **Recommendations:** "Because you've joined music, tech events…" — matches past categories near you
- **Featured listings:** `isFeatured` boolean floats the event to the top of nearby results and renders an orange pin on the map
- Category and date filters on the Nearby page

### Auth
- JWT-based auth (7-day expiry)
- Passwords hashed with bcrypt (12 rounds)
- Protected routes on both client and server

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | React 18 + Vite | Fast dev server, tiny bundle |
| Routing | React Router v6 | Standard, well documented |
| Maps | **Leaflet + react-leaflet** + OpenStreetMap tiles | 100% free, no API key, no billing |
| Geocoding | **Nominatim** (OpenStreetMap) | Free address autocomplete |
| Backend | Node.js + Express | Minimal, standard |
| Database | MongoDB Atlas | Native geospatial queries, 2dsphere |
| ODM | Mongoose | Schema validation, `$geoNear` support |
| Auth | jsonwebtoken + bcrypt | Industry standard |

---

## Architecture
LocalVibe/
├── server/
│ ├── server.js Express app + Mongoose schemas + all routes
│ ├── seed.js Populates DB with demo events
│ ├── package.json
│ └── .env MONGODB_URI, JWT_SECRET, PORT
│
└── client/
├── index.html
├── vite.config.js
├── package.json
└── src/
├── main.jsx
├── App.jsx
├── api.js Fetch wrapper
├── AuthContext.jsx JWT + user state
├── styles.css
├── components/
│ ├── AddressAutocomplete.jsx
│ └── Avatar.jsx
└── pages/
├── Login.jsx
├── Register.jsx
├── Feed.jsx Friends feed + recommendations
├── Nearby.jsx List view with filters
├── NearbyMap.jsx Leaflet map
├── Search.jsx Find users
├── UserProfile.jsx
├── CreateEvent.jsx
└── EventDetail.jsx

text

### Data flow
Browser Express MongoDB
─────── ─────── ───────
Geolocation ───┐
│
├── GET /events/nearby?lng&lat&radius ──▶ $geoNear
│ (2dsphere)
│ ──▶ events[]
▼
Leaflet map renders markers + popups

text

---

## Local Setup

### Prerequisites

- Node.js 18+ (`node -v`)
- A MongoDB Atlas cluster (free tier is enough)
- A modern browser (Chrome, Firefox, Safari)

### 1. Clone and install

```bash
git clone git@github.com:khanfardeen71657-cyber/LocalVibe.git
cd LocalVibe

cd server && npm install
cd ../client && npm install
2. Configure the backend
Create server/.env:

text
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/?appName=Cluster0
JWT_SECRET=<long-random-string>
PORT=5050
Generate a JWT secret:

bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
3. Seed the database (optional but recommended)
bash
cd server
node seed.js
This clears existing data and inserts 10 demo events within 2 km of
your configured city (default: Delhi), plus a demo user:

username: demo

password: demo1234

To seed your own area, edit CITIES in server/seed.js:

js
const CITIES = {
  delhi: { lat: 28.6844, lng: 77.3295, state: 'DL', zip: '110053' }
}
4. Run everything
Two terminals:

bash
# Terminal 1
cd server
node server.js
# → database connected
# → indexes synced
# → server listening on port 5050
bash
# Terminal 2
cd client
npm run dev
# → VITE ready
# → Local: http://localhost:5173
Open http://localhost:5173 in your browser.

Allow location access when prompted — the Nearby and Map pages need it.

API Surface
Method	Endpoint	Auth	Purpose
POST	/register	—	Create account, returns JWT
POST	/login	—	Authenticate, returns JWT
GET	/me	✓	Current user with populated refs
PATCH	/me	✓	Update avatar
GET	/users/search?q=	✓	Search users by username
GET	/user/:id	—	Public user profile
POST	/follow	✓	Follow a user
POST	/unfollow	✓	Unfollow
POST	/events	✓	Create event
GET	/events	—	List all events
GET	/events/nearby?lng&lat&radius&category&from&to&featured	✓	Geo query
GET	/events/recommended?lng&lat&radius	✓	Recommendations by past categories
GET	/events/:id	—	Single event (populated)
PATCH	/events/:id	✓ host	Update
PATCH	/events/:id/feature	✓ host	Toggle isFeatured
DELETE	/events/:id	✓ host	Delete
POST	/events/:id/join	✓	RSVP "Going"
POST	/events/:id/interested	✓	Toggle "Interested"
POST	/events/:id/exit	✓	Leave event
GET	/feed	✓	Events followed users joined
GET	/feed/nearby	✓	Same, restricted to a radius
Route ordering note: /events/nearby and /events/recommended are
declared before /events/:id. Express matches in order, so a
parameterized route like :id would otherwise swallow the specific
paths and throw a Mongoose CastError.

Seed Data
server/seed.js populates the map so it isn't empty on first load. It:

Clears usermodels and eventmodels

Creates a demo user (demo / demo1234)

Inserts 10 events per configured city, randomly jittered ±2 km

Marks ~25% of events as isFeatured

Sets startsAt to random dates in the next 30 days

⚠️ It calls deleteMany({}) first. Don't run it against a database
with real data you want to keep.

API Key Management
Why this project uses zero API keys
LocalVibe uses Leaflet + OpenStreetMap for maps and Nominatim
(OpenStreetMap's geocoder) for address autocomplete. Neither requires a
signup, a credit card, or an API key. This means:

Nothing to leak. No key in the source, in .env, or in the browser.

No billing risk. Google Maps, for comparison, requires a card on
file and will bill you if a key leaks and gets scraped.

No domain restrictions to configure. No localhost:5173 vs
production referrer mismatch, no "Why is my map grey?" debugging.

If you later switch to Google Maps
The brief explicitly allows any of "Leaflet.js, Mapbox GL, or Google Maps
API (or OpenStreetMap alternatives)." If you need to migrate to Google
Maps for a specific feature, here's the correct way to protect the key:

1. Restrict the key by HTTP referrer
In Google Cloud Console → APIs & Services → Credentials → your key →
Application restrictions → HTTP referrers, add only the origins
that should be allowed to use the key:

text
http://localhost:5173/*
http://localhost:5173
https://your-production-domain.com/*
https://your-production-domain.com
Never leave this set to "None" or *. An unrestricted key can be
scraped from your page source and used by anyone — and Google bills the
key owner.

2. Restrict the key by API
Under API restrictions → Restrict key, enable only the APIs you
actually need:

Maps JavaScript API

Places API (for address autocomplete)

Do not enable "All APIs." Every API you don't use is another attack surface.

3. Keep the key out of source control
The key lives in client/.env:

text
VITE_GOOGLE_MAPS_API_KEY=AIza...
client/.gitignore must contain .env. Verify before your first commit:

bash
git status
# .env should NOT appear in the list
4. Rotate immediately if exposed
If you accidentally commit a key or paste it into a chat:

Go to Credentials → delete the leaked key

Create a new key with the same restrictions

Update .env locally and in your hosting provider's env vars

There is no way to "un-leak" a key — rotation is the only fix.

Nominatim rate limits (what we actually use)
The public Nominatim API is free but rate-limited to 1 request per
second. AddressAutocomplete.jsx handles this by debouncing input by
400 ms — a user has to stop typing for 400 ms before a request fires.

For higher volume, either:

Host your own Nominatim instance, or

Switch to a free-tier geocoder like LocationIQ or Geoapify
(both have key-based APIs, and the same referrer-restriction rules
above apply)

Deployment
Backend → Render
Push to GitHub (already done ✅)

Create a Web Service on render.com

Connect your LocalVibe repository

Root directory: server

Build command: npm install

Start command: node server.js

Add env vars: MONGODB_URI, JWT_SECRET

Deploy → copy the URL (e.g. https://localvibe-api.onrender.com)

Frontend → Vercel
New project on vercel.com

Connect your LocalVibe repository

Root directory: client

Framework preset: Vite

Add env var VITE_API_URL=https://localvibe-api.onrender.com

In client/src/api.js, BASE already reads:

js
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5050'
Deploy → copy the URL

Post-deploy checklist
□ Backend responds: curl https://localvibe-api.onrender.com/events
□ Frontend loads: open the Vercel URL
□ Register a new user
□ Create an event with address autocomplete
□ Map renders with pins
□ .env is not committed to git
Mobile
The layout is responsive — grids collapse to a single column below
~600 px. On mobile:

Leaflet supports pinch-zoom and drag out of the box

Geolocation uses the phone's GPS (more accurate than desktop)

Test on a real device: open the deployed URL on your phone

Project Status
Brief requirement	Status
2dsphere index	✅
"Find within N km" query	✅
Event schema (dates, address + lat/lng, category, price, image)	✅
Leaflet / OpenStreetMap map with pins + popups	✅
navigator.geolocation integration	✅
Address autocomplete	✅ (Nominatim)
RSVP: Going and Interested	✅
"3 friends are going" logic	✅
User profile with hosted + joined events	✅
Recommendation engine	✅
Featured listings (isFeatured → orange pin)	✅
Category and date filters	✅
Seed data script	✅
API key management documented	✅ (this section)
Deployed	⬜ pending
License
MIT — do whatever you want with it.

text

## Save karo

Ek command:

```bash
cat > "/Users/shahnawazali/LocalVibe project/README.md" << 'README_EOF'
[paste the content above]
README_EOF
Ya manually README.md file kholo aur content paste karo.

GitHub pe push karo
bash
cd "/Users/shahnawazali/LocalVibe project"
git add README.md
git commit -m "docs: complete project README"
git push
Ab GitHub pe https://github.com/khanfardeen71657-cyber/LocalVibe kholo — naya README dikhega.

Isme kya kya hai
Features — brief ke chaaron phases ke hisaab se

Tech Stack — har choice ka reasoning

Architecture — folder structure + data flow diagram

Local Setup — clone, install, .env, seed, run

API Surface — 20+ endpoints ki table

Seed Data — kya karta hai, warning

API Key Management — Google alternative kaise protect karo + Nominatim limits

Deployment — Render + Vercel step-by-step

Project Status — brief vs reality checklist

License — MIT

Total ~550 lines. Professional README jo koi bhi evaluator padh lega.

