# Street №1 Collector — Full App Specification

## Concept
A personal web app to photograph and track house number 1 on every street. The goal is to build a visual collection where you can see on a map which streets you've already covered, and click any street to view its photo. Self-hosted on a local server, with Tailscale access added later.

---

## Stack
- **Backend**: Python 3, Flask, Flask-CORS
- **Frontend**: Single HTML file, vanilla JS, Leaflet.js (via CDN)
- **Street naming**: OpenStreetMap Nominatim reverse geocoding API — free, no API key required, returns exact standardized street names
- **Image storage**: Saved to disk in `/uploads` folder on the server
- **Metadata storage**: SQLite database

---

## Project Structure
```
street-collector/
├── app.py
├── streets.db
├── uploads/
├── static/
│   └── index.html
└── requirements.txt
```

---

## Core Features

### 1. Upload a Photo
- User picks an image file from their device
- App attempts to read GPS EXIF data from the photo automatically
  - If GPS found → map pans to that location, reverse geocodes it, pre-fills the street name
  - If no GPS → user manually clicks the location on the map
- Street name is fetched from **Nominatim reverse geocoding** based on coordinates
- Street name is shown to the user and is **editable** before saving (in case it needs correction)
- User confirms and saves — photo + street entry are stored

### 2. Map View
- Full-height interactive Leaflet map (OpenStreetMap tiles)
- Every saved street has a **marker** at its coordinates
- Markers are visually distinct — use a custom color (gold/amber) so they stand out from the default blue
- Clicking a marker opens a **popup** showing:
  - Street name
  - Thumbnail of the photo
  - Date the entry was added
  - A delete button

### 3. Street List (Sidebar)
- Left sidebar shows a scrollable list of all collected streets
- Each list item shows: street name + date added
- Clicking a list item **flies the map** to that street's marker and opens its popup
- Search/filter field at the top to filter streets by name
- Total count of collected streets shown somewhere visible (e.g. header)

### 4. Delete an Entry
- Available from the marker popup on the map
- Removes the database record and deletes the image file from disk
- Marker is removed from the map immediately
- Street disappears from the sidebar list

---

## Backend — Flask API

### `POST /api/streets`
Save a new street entry.

**Request** (multipart/form-data):
- `image` — image file
- `street_name` — confirmed street name string
- `lat` — latitude (float)
- `lng` — longitude (float)

**Response**:
```json
{
  "id": "uuid",
  "street_name": "Zelená 1, Bratislava",
  "lat": 48.1486,
  "lng": 17.1077,
  "image_url": "/uploads/uuid.jpg",
  "created_at": "2024-01-15T14:30:00"
}
```

### `GET /api/streets`
Returns all saved entries as a JSON array. Used on page load to populate map markers and sidebar list.

### `DELETE /api/streets/<id>`
Deletes the database record and the image file from disk.

### `GET /uploads/<filename>`
Serves the stored image file directly.

---

## Database — SQLite

Table: `streets`

| Column | Type | Notes |
|---|---|---|
| id | TEXT | UUID, primary key |
| street_name | TEXT | Exact name from Nominatim |
| lat | REAL | Latitude |
| lng | REAL | Longitude |
| image_filename | TEXT | Filename in /uploads |
| created_at | TEXT | ISO 8601 timestamp |

---

## Street Name Resolution — Nominatim

- API endpoint: `https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lng={lng}`
- Extract `address.road` from the response as the street name
- If `address.road` is missing, fall back to `display_name`
- Always show the resolved name to the user before saving — they must be able to edit it
- Add a `User-Agent` header to all Nominatim requests (required by their usage policy), e.g. `street-collector-app`
- Nominatim has a 1 request/second rate limit — this is fine for this use case

---

## Frontend — `static/index.html`

Single self-contained HTML file. No build step, no npm.

### Layout
```
┌─────────────────────────────────────────────────────┐
│  HEADER — app title + total street count            │
├──────────────┬──────────────────────────────────────┤
│              │                                      │
│   SIDEBAR    │            MAP                       │
│   340px      │            (Leaflet, fills rest)     │
│              │                                      │
│  [upload UI] │                                      │
│  [street     │                                      │
│   list]      │                                      │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

### Upload Flow (in sidebar)
1. User clicks upload zone or drags a photo onto it
2. Photo preview is shown
3. App tries to read EXIF GPS — if found, map moves there and street name is auto-fetched
4. If no EXIF — a notice says "Click on the map to set the location"
5. Map enters "pick location" mode — clicking the map places a temporary pin and fetches the street name
6. Street name appears in an editable text field, user can correct it
7. "Save" button submits everything to `POST /api/streets`
8. On success: marker added to map, entry added to sidebar list, upload area resets

### Map
- Library: Leaflet.js loaded from CDN
- Tiles: OpenStreetMap (`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Default center: set to somewhere central in Europe (lat: 48.5, lng: 17.0, zoom: 6) — easy to change
- On load: fetch all streets from `GET /api/streets` and place markers
- Custom marker icon: amber/gold color, clearly visible
- Marker popup contains: street name, photo thumbnail, date, delete button

### Sidebar Street List
- Renders all streets sorted by date (newest first)
- Filter input at top — filters by street name in real time (client-side, no API call)
- Clicking a street item: map flies to marker, popup opens
- Empty state message if no streets saved yet

---

## Requirements File

```
flask
flask-cors
Pillow
```

> `Pillow` is used for reading EXIF GPS data from images server-side as a fallback, but primary EXIF reading happens client-side in JS using a small EXIF library loaded from CDN (e.g. `exifr`).

---

## Running the App

```bash
pip install -r requirements.txt
python app.py
```

App runs on `http://localhost:5000` by default.

For Tailscale: no changes needed — just make sure Flask listens on `0.0.0.0`:
```python
app.run(host='0.0.0.0', port=5000, debug=False)
```

---

## Notes & Constraints
- This is a personal app — no authentication needed
- No image size limit enforced (server-side), but consider adding one if disk space matters
- Nominatim must not be abused — one geocode call per upload is fine
- HEIC support is optional/nice to have — iOS photos use this format
- The app should work fine on mobile browser (for use in the field when photographing streets)
