// Create popup content for a street marker
function createPopupContent(street, marker) {
    const el = document.createElement('div');
    el.className = 'popup-content';
    el.innerHTML = `
        <h3>${street.street_name}</h3>
        <img src="${street.image_url}" class="popup-image" alt="${street.street_name}" style="cursor:pointer">
        <div class="popup-date">${formatDate(street.created_at)}</div>
    `;
    el.querySelector('.popup-image').addEventListener('click', () => openLightbox(street));

    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'btn btn-primary';
    toggleBtn.textContent = street.completed ? 'Mark as Incomplete' : 'Mark as Complete';
    toggleBtn.style.marginRight = '10px';
    toggleBtn.addEventListener('click', () => toggleStreetCompletion(street.id, marker));
    el.appendChild(toggleBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-delete';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => deleteStreet(street.id));
    el.appendChild(deleteBtn);

    return el;
}

// Add marker to map
function addMarkerToMap(street) {
    const icon = street.completed ? greenIcon : amberIcon;
    const marker = L.marker([street.lat, street.lng], {icon: icon}).addTo(map);

    marker.bindPopup(createPopupContent(street, marker));
    marker.on('click', () => map.panTo(marker.getLatLng()));
    marker.streetId = street.id;
    markers[street.id] = marker;
}

// Add street polyline to map
function addPolylineToMap(street) {
    if (!street.geometry || street.geometry.length === 0) return;

    const color = street.completed ? '#27ae60' : '#f39c12';
    const lines = [];

    street.geometry.forEach(segment => {
        const latLngs = segment.map(coord => [coord[0], coord[1]]);
        const polyline = L.polyline(latLngs, {
            color: color,
            weight: 5,
            opacity: 0.7
        }).addTo(map);
        lines.push(polyline);
    });

    polylines[street.id] = lines;
}
