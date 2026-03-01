// Escape HTML to prevent XSS in innerHTML templates
function escapeHtml(str) {
    const el = document.createElement('span');
    el.textContent = str;
    return el.innerHTML;
}

// Format date utility
function formatDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Load streets on page load
async function loadStreets() {
    try {
        const response = await fetch('/api/streets');
        streets = await response.json();

        updateStreetCount();
        renderStreetList();

        // Add markers and polylines to map
        streets.forEach(street => {
            addMarkerToMap(street);
            addPolylineToMap(street);
        });

        // Backfill geometry for streets that are missing it
        for (const street of streets) {
            if (!street.geometry) {
                try {
                    const resp = await fetch(`/api/streets/${street.id}/fetch-geometry`, {
                        method: 'POST'
                    });
                    const data = await resp.json();
                    if (data.geometry) {
                        street.geometry = data.geometry;
                        addPolylineToMap(street);
                    }
                } catch (e) {
                    console.log(`Could not fetch geometry for ${street.street_name}:`, e);
                }
            }
        }

    } catch (error) {
        console.error('Error loading streets:', error);
    }
}

// Initialize (called from index.html after all scripts load)
function init() {
    filterInput.addEventListener('input', renderStreetList);
    loadStreets();
}
