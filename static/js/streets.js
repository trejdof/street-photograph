// Save button handler
saveButton.addEventListener('click', async () => {
    if (!currentImage || !currentLocation || !streetNameInput.value) return;

    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        const formData = new FormData();
        formData.append('image', currentImage);
        formData.append('street_name', streetNameInput.value);
        formData.append('lat', currentLocation.lat);
        formData.append('lng', currentLocation.lng);

        const response = await fetch('/api/streets', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to save street');
        }

        const newStreet = await response.json();

        // Add to streets array
        streets.unshift(newStreet);

        // Update UI
        updateStreetCount();
        renderStreetList();
        addMarkerToMap(newStreet);
        addPolylineToMap(newStreet);
        if (galleryOpen) renderGallery();

        // Reset form
        resetUploadForm();

    } catch (error) {
        console.error('Error saving street:', error);
        alert('Failed to save street entry. Please try again.');
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Entry';
    }
});

// Toggle street completion
async function toggleStreetCompletion(id, marker) {
    try {
        const response = await fetch(`/api/streets/${id}/toggle`, {
            method: 'PATCH'
        });

        if (!response.ok) {
            throw new Error('Failed to toggle completion');
        }

        const data = await response.json();
        const completed = data.completed;

        // Update in streets array
        const street = streets.find(s => s.id === id);
        if (street) {
            street.completed = completed;
        }

        // Update marker icon
        const newIcon = completed ? greenIcon : amberIcon;
        marker.setIcon(newIcon);

        // Update polyline color
        const newColor = completed ? '#27ae60' : '#f39c12';
        if (polylines[id]) {
            polylines[id].forEach(line => line.setStyle({ color: newColor }));
        }

        // Rebuild popup with updated button text
        const street2 = streets.find(s => s.id === id);
        if (street2) {
            marker.setPopupContent(createPopupContent(street2, marker));
        }

        // Update sidebar list and gallery
        renderStreetList();
        if (galleryOpen) renderGallery();

    } catch (error) {
        console.error('Error toggling completion:', error);
        alert('Failed to update street status. Please try again.');
    }
}

// Delete street
async function deleteStreet(id) {
    if (!confirm('Are you sure you want to delete this street entry?')) return;

    try {
        const response = await fetch(`/api/streets/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete street');
        }

        // Remove from array
        streets = streets.filter(s => s.id !== id);

        // Remove marker from map
        if (markers[id]) {
            map.removeLayer(markers[id]);
            delete markers[id];
        }

        // Remove polylines from map
        if (polylines[id]) {
            polylines[id].forEach(line => map.removeLayer(line));
            delete polylines[id];
        }

        // Close lightbox if showing the deleted street
        if (lightboxEl && lightboxStreets[lightboxIndex]?.id === id) {
            closeLightbox();
        }

        // Update UI
        updateStreetCount();
        renderStreetList();
        if (galleryOpen) renderGallery();

    } catch (error) {
        console.error('Error deleting street:', error);
        alert('Failed to delete street entry. Please try again.');
    }
}

// Render street list
function renderStreetList() {
    const filterText = filterInput.value.toLowerCase();
    const filteredStreets = streets.filter(s =>
        s.street_name.toLowerCase().includes(filterText)
    );

    if (filteredStreets.length === 0) {
        streetList.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.textContent = filterText ? 'No streets found matching your search.' : 'No streets collected yet. Start by uploading a photo!';
        return;
    }

    emptyState.style.display = 'none';
    streetList.innerHTML = '';

    filteredStreets.forEach(street => {
        const li = document.createElement('li');
        li.className = 'street-item' + (street.completed ? ' completed' : '');

        const infoDiv = document.createElement('div');
        infoDiv.className = 'street-info';
        infoDiv.innerHTML = `
            <div class="street-name">${street.street_name}</div>
            <div class="street-date">${formatDate(street.created_at)}</div>
        `;
        infoDiv.addEventListener('click', () => flyToStreet(street.id));
        li.appendChild(infoDiv);

        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'btn-toggle-complete ' + (street.completed ? 'completed' : 'not-completed');
        toggleBtn.textContent = street.completed ? 'Undo' : 'Done';
        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleStreetCompletionFromList(street.id);
        });
        li.appendChild(toggleBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn-delete-list';
        deleteBtn.textContent = 'X';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteStreet(street.id);
        });
        li.appendChild(deleteBtn);

        streetList.appendChild(li);
    });
}

// Toggle completion from list
async function toggleStreetCompletionFromList(id) {
    if (markers[id]) {
        await toggleStreetCompletion(id, markers[id]);
    }
}

// Fly to street on map
function flyToStreet(id) {
    const street = streets.find(s => s.id === id);
    if (!street) return;

    // Switch to map view if in gallery
    if (galleryOpen) {
        galleryToggle.click();
    }

    const doFly = () => {
        map.flyTo([street.lat, street.lng], 16);
        if (markers[id]) {
            markers[id].openPopup();
        }
    };

    // Close sidebar on mobile first, then fly after transition ends
    if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        toggleSidebar.textContent = '\u2630 Menu';
        document.body.classList.remove('sidebar-open');
        setTimeout(doFly, 320);
    } else {
        doFly();
    }
}

// Update street count
function updateStreetCount() {
    const count = streets.length;
    streetCount.textContent = `${count} street${count !== 1 ? 's' : ''}`;
}
