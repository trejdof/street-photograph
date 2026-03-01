// Toggle sidebar for mobile
toggleSidebar.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    const isOpen = sidebar.classList.contains('open');
    toggleSidebar.textContent = isOpen ? '\u2715 Close' : '\u2630 Menu';
    document.body.classList.toggle('sidebar-open', isOpen);
});

// Close sidebar when clicking on map (mobile only)
map.on('click', () => {
    if (window.innerWidth <= 768 && sidebar.classList.contains('open') && !pickingLocation) {
        sidebar.classList.remove('open');
        toggleSidebar.textContent = '\u2630 Menu';
        document.body.classList.remove('sidebar-open');
    }
});

// Upload zone click
uploadZone.addEventListener('click', () => fileInput.click());

// File selection
fileInput.addEventListener('change', handleFileSelect);

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('active');
});

uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('active');
});

uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('active');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect();
    }
});

// Handle file selection
async function handleFileSelect() {
    const file = fileInput.files[0];
    if (!file) return;

    currentImage = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreview.style.display = 'block';
    };
    reader.readAsDataURL(file);

    // Try to read EXIF GPS data
    try {
        const exif = await exifr.gps(file);
        if (exif && exif.latitude && exif.longitude) {
            currentLocation = {
                lat: exif.latitude,
                lng: exif.longitude
            };

            // Pan map to location
            map.setView([currentLocation.lat, currentLocation.lng], 16);

            // Add temporary marker
            if (tempMarker) {
                map.removeLayer(tempMarker);
            }
            tempMarker = L.marker([currentLocation.lat, currentLocation.lng], {icon: amberIcon}).addTo(map);

            // Fetch street name
            await fetchStreetName(currentLocation.lat, currentLocation.lng);

            pickingLocation = false;
            clickMapNotice.classList.remove('visible');
        } else {
            // No GPS data, user needs to click on map
            enableLocationPicking();
        }
    } catch (error) {
        console.log('No EXIF data found:', error);
        enableLocationPicking();
    }
}

// Enable location picking mode
function enableLocationPicking() {
    pickingLocation = true;
    locationActions.classList.add('visible');
    clickMapNotice.classList.add('visible');
    searchStreetGroup.classList.add('visible');
    streetNameGroup.classList.remove('visible');
    saveButtonGroup.classList.remove('visible');
}

// Use device GPS location via Leaflet's locate API
locateBtn.addEventListener('click', () => {
    locateBtn.textContent = 'Locating...';
    locateBtn.disabled = true;
    map.once('locationfound', async (e) => {
        const { lat, lng } = e.latlng;
        currentLocation = { lat, lng };

        map.setView([lat, lng], 17);

        if (tempMarker) map.removeLayer(tempMarker);
        tempMarker = L.marker([lat, lng], { icon: amberIcon }).addTo(map);

        pickingLocation = false;
        clickMapNotice.classList.remove('visible');

        await fetchStreetName(lat, lng);

        locateBtn.textContent = 'Use My Location';
        locateBtn.disabled = false;
    });
    map.once('locationerror', () => {
        alert('Could not get your location. Allow location access in your browser, then try again.');
        locateBtn.textContent = 'Use My Location';
        locateBtn.disabled = false;
    });
    map.locate({ enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 });
});

// Map view "show my location" button
let myLocationMarker = null;
const myLocationBtn = document.getElementById('myLocationBtn');
myLocationBtn.addEventListener('click', () => {
    myLocationBtn.classList.add('locating');
    map.once('locationfound', async (e) => {
        const { lat, lng } = e.latlng;
        map.setView([lat, lng], 17);

        // Always show blue dot
        if (myLocationMarker) map.removeLayer(myLocationMarker);
        myLocationMarker = L.circleMarker([lat, lng], {
            radius: 10,
            color: '#3498db',
            fillColor: '#3498db',
            fillOpacity: 0.8,
            weight: 3
        }).addTo(map);

        // If an image is loaded and waiting for a location, use this as the pin
        if (currentImage && pickingLocation) {
            currentLocation = { lat, lng };
            if (tempMarker) map.removeLayer(tempMarker);
            tempMarker = L.marker([lat, lng], { icon: amberIcon }).addTo(map);
            pickingLocation = false;
            clickMapNotice.classList.remove('visible');
            await fetchStreetName(lat, lng);
        }

        myLocationBtn.classList.remove('locating');
    });
    map.once('locationerror', () => {
        alert('Could not get your location.');
        myLocationBtn.classList.remove('locating');
    });
    map.locate({ enableHighAccuracy: false, timeout: 30000, maximumAge: 60000 });
});

// Reset upload form
function resetUploadForm() {
    currentImage = null;
    currentLocation = null;
    pickingLocation = false;

    fileInput.value = '';
    imagePreview.style.display = 'none';
    imagePreview.src = '';
    streetNameInput.value = '';
    streetSearchInput.value = '';

    locationActions.classList.remove('visible');
    clickMapNotice.classList.remove('visible');
    searchStreetGroup.classList.remove('visible');
    searchResults.classList.remove('visible');
    searchResults.innerHTML = '';
    streetNameGroup.classList.remove('visible');
    saveButtonGroup.classList.remove('visible');

    if (tempMarker) {
        map.removeLayer(tempMarker);
        tempMarker = null;
    }


    uploadZone.innerHTML = '<p>\uD83D\uDCF8 Click or drag a photo here</p>';
}
