# Modularity Refactoring Tasks

## HIGH Priority

### 1. ~~Extract shared `createPopupContent()` function~~ DONE
- `createPopupContent(street, marker)` in markers.js, used by both `addMarkerToMap()` and `toggleStreetCompletion()`

### 2. ~~Add `markers = {}` registry for O(1) marker lookup~~ DONE
- `markers` dict in state.js, populated in `addMarkerToMap()`, used in delete/toggle/flyTo (replaced all `map.eachLayer` scans)

### 3. CSS custom properties for shared colors
- **Files**: base.css, sidebar.css, map.css, gallery.css
- **Problem**: `#f39c12` (amber), `#27ae60` (green), `#3498db` (blue), `#2c3e50` (dark) hardcoded in 6+ places across CSS and JS
- **Fix**: Define `:root { --color-amber: #f39c12; ... }` in base.css, replace all hardcoded values

### 4. Move `formatDate()` out of app.js
- **Files**: app.js, state.js (or new utils.js)
- **Problem**: Defined in app.js but used by markers.js, streets.js, gallery.js — wrong home
- **Fix**: Move to state.js (loads first) or create a utils.js that loads before other scripts

## MEDIUM Priority

### 5. Parallel geometry backfill
- **Files**: app.js
- **Problem**: `loadStreets()` fetches geometry one street at a time in a sequential loop
- **Fix**: Fire all fetches with `Promise.all()` for faster initial load

### 6. ~~Rewrite gallery rendering with innerHTML + event delegation~~ DONE
- Replaced 50-line createElement loop with innerHTML template literal + single delegated click listener
- Added `escapeHtml()` utility in app.js for safe user string interpolation
- Cards use `data-id` attribute, one listener on `galleryContent` handles all clicks

### 7. Document upload flow across files
- **Files**: upload.js, geocoding.js, streets.js
- **Problem**: Upload state (`currentImage`, `currentLocation`, `pickingLocation`) is mutated by three separate files with no clear ownership
- **Fix**: Add comments documenting the flow, or consolidate upload logic more tightly

## LOW Priority

### 8. Race condition in date-based filename
- **Files**: routes/streets.py (lines 62-68)
- **Problem**: Count query + insert are separate — two simultaneous uploads on the same day could get the same filename
- **Fix**: Use a transaction or catch IntegrityError and retry with incremented N

### 9. Rate limit Nominatim calls
- **Files**: geocoding.js
- **Problem**: Rapid map clicks could exceed Nominatim's 1 req/sec policy
- **Fix**: Add a simple throttle/debounce before making reverse geocode requests

### 10. Clean up requirements.txt
- **Files**: requirements.txt
- **Problem**: Pillow is listed but unused (EXIF is client-side), no version pinning
- **Fix**: Remove Pillow, pin versions (e.g. `flask==3.x.x`)
