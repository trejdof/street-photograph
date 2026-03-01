// Street search functionality
searchButton.addEventListener('click', searchStreets);
streetSearchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchStreets();
    }
});

async function searchStreets() {
    const query = streetSearchInput.value.trim();
    if (!query) return;

    searchButton.disabled = true;
    searchButton.textContent = 'Searching...';
    searchResults.innerHTML = '<div style="padding: 10px; color: #7f8c8d;">Searching...</div>';
    searchResults.classList.add('visible');

    try {
        // Search for house number 1 on the given street in Belgrade
        const searchQuery = `${query} 1, Belgrade, Serbia`;
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=10&accept-language=sr`,
            {
                headers: {
                    'User-Agent': 'street-collector-app'
                }
            }
        );
        const results = await response.json();

        console.log('Search results:', results);

        if (results.length === 0) {
            searchResults.innerHTML = '<div style="padding: 10px; color: #7f8c8d;">No streets found</div>';
            return;
        }

        searchResults.innerHTML = '';
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'search-result-item';
            item.innerHTML = `
                <div class="search-result-name">${result.display_name.split(',')[0]}</div>
                <div class="search-result-address">${result.display_name}</div>
            `;
            item.addEventListener('click', () => selectSearchResult(result));
            searchResults.appendChild(item);
        });

    } catch (error) {
        console.error('Error searching streets:', error);
        searchResults.innerHTML = '<div style="padding: 10px; color: #e74c3c;">Error searching. Try again.</div>';
    } finally {
        searchButton.disabled = false;
        searchButton.textContent = 'Search';
    }
}

async function selectSearchResult(result) {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    currentLocation = { lat, lng };

    // Pan map to location
    map.setView([lat, lng], 17);

    // Remove old temp marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    // Add new temp marker
    tempMarker = L.marker([lat, lng], {icon: amberIcon}).addTo(map);

    // Hide search, show form
    pickingLocation = false;
    clickMapNotice.classList.remove('visible');
    searchResults.classList.remove('visible');
    searchResults.innerHTML = '';
    streetSearchInput.value = '';

    // Reverse geocode to get clean street name (road only, no house number)
    await fetchStreetName(lat, lng);
}

// Map click handler for location picking
map.on('click', async (e) => {
    if (!pickingLocation) return;

    currentLocation = {
        lat: e.latlng.lat,
        lng: e.latlng.lng
    };

    // Remove old temp marker
    if (tempMarker) {
        map.removeLayer(tempMarker);
    }

    // Add new temp marker
    tempMarker = L.marker([currentLocation.lat, currentLocation.lng], {icon: amberIcon}).addTo(map);

    // Fetch street name
    await fetchStreetName(currentLocation.lat, currentLocation.lng);

    pickingLocation = false;
    clickMapNotice.classList.remove('visible');
});

// Fetch street name from Nominatim
async function fetchStreetName(lat, lng) {
    streetNameInput.value = 'Loading...';
    streetNameGroup.classList.add('visible');
    saveButtonGroup.classList.add('visible');
    saveButton.disabled = true;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=sr`,
            {
                headers: {
                    'User-Agent': 'street-collector-app'
                }
            }
        );
        const data = await response.json();

        console.log('Nominatim response:', data);

        let streetName = '';

        if (data.address?.road) {
            streetName = data.address.road;
        } else if (data.address?.suburb) {
            streetName = data.address.suburb;
        } else if (data.display_name) {
            // Fallback to first part of display name
            streetName = data.display_name.split(',')[0];
        }

        streetNameInput.value = streetName || 'Unknown Street';
        saveButton.disabled = false;
    } catch (error) {
        console.error('Error fetching street name:', error);
        streetNameInput.value = 'Unknown Street';
        saveButton.disabled = false;
    }
}
