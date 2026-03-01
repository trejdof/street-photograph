// Gallery toggle
galleryToggle.addEventListener('click', () => {
    galleryOpen = !galleryOpen;
    if (galleryOpen) {
        mapContainer.style.display = 'none';
        toggleSidebar.style.display = 'none';
        galleryView.style.display = 'block';
        galleryToggle.classList.add('active');
        galleryToggle.textContent = 'Map';
        document.body.classList.add('gallery-open');
        renderGallery();
    } else {
        galleryView.style.display = 'none';
        mapContainer.style.display = 'flex';
        toggleSidebar.style.display = '';
        galleryToggle.classList.remove('active');
        galleryToggle.textContent = 'Gallery';
        document.body.classList.remove('gallery-open');
        map.invalidateSize();
    }
});

// Render gallery view
function renderGallery() {
    if (streets.length === 0) {
        galleryContent.innerHTML = '<div class="gallery-empty">No photos yet. Start collecting!</div>';
        return;
    }

    // Sort by date descending
    const sorted = [...streets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Group by date
    const groups = {};
    sorted.forEach(street => {
        const dateKey = new Date(street.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(street);
    });

    galleryContent.innerHTML = Object.entries(groups).map(([date, dateStreets]) => `
        <div class="gallery-date-group">
            <div class="gallery-date-header">${escapeHtml(date)} (${dateStreets.length})</div>
            <div class="gallery-grid">
                ${dateStreets.map(street => `
                    <div class="gallery-card${street.completed ? ' completed' : ''}" data-id="${street.id}">
                        <img src="${street.image_url}" alt="${escapeHtml(street.street_name)}" loading="lazy">
                        <div class="gallery-card-info">
                            <div class="gallery-card-text">
                                <div class="gallery-card-name${street.completed ? ' completed' : ''}">${escapeHtml(street.street_name)}</div>
                                <div class="gallery-card-time">${new Date(street.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                            <button class="btn-show-map">Map</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

}

// Event delegation — one listener handles all gallery cards and map buttons
galleryContent.addEventListener('click', (e) => {
    const mapBtn = e.target.closest('.btn-show-map');
    const card = e.target.closest('.gallery-card');
    if (!card) return;

    const id = card.dataset.id;
    if (mapBtn) {
        flyToStreet(id);
    } else {
        const street = streets.find(s => s.id === id);
        if (street) openLightbox(street);
    }
});

// Lightbox with swipe navigation
let lightboxEl = null;
let lightboxStreets = [];
let lightboxIndex = 0;

function openLightbox(street) {
    // Build sorted flat list matching gallery order
    lightboxStreets = [...streets].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    lightboxIndex = lightboxStreets.findIndex(s => s.id === street.id);
    if (lightboxIndex === -1) lightboxIndex = 0;

    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';

    // Top bar
    const top = document.createElement('div');
    top.className = 'lightbox-top';
    const counter = document.createElement('span');
    counter.className = 'lightbox-counter';
    top.appendChild(counter);
    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox-close';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeLightbox);
    top.appendChild(closeBtn);
    lightboxEl.appendChild(top);

    // Body with image and nav arrows
    const body = document.createElement('div');
    body.className = 'lightbox-body';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'lightbox-nav prev';
    prevBtn.innerHTML = '&#8249;';
    prevBtn.addEventListener('click', (e) => { e.stopPropagation(); lightboxNav(-1); });
    body.appendChild(prevBtn);

    const img = document.createElement('img');
    body.appendChild(img);

    const nextBtn = document.createElement('button');
    nextBtn.className = 'lightbox-nav next';
    nextBtn.innerHTML = '&#8250;';
    nextBtn.addEventListener('click', (e) => { e.stopPropagation(); lightboxNav(1); });
    body.appendChild(nextBtn);

    lightboxEl.appendChild(body);

    // Bottom bar
    const bottom = document.createElement('div');
    bottom.className = 'lightbox-bottom';
    const caption = document.createElement('span');
    caption.className = 'lightbox-caption';
    bottom.appendChild(caption);
    const mapBtn = document.createElement('button');
    mapBtn.className = 'lightbox-map-btn';
    mapBtn.textContent = 'Show on Map';
    mapBtn.addEventListener('click', () => {
        const s = lightboxStreets[lightboxIndex];
        closeLightbox();
        flyToStreet(s.id);
    });
    bottom.appendChild(mapBtn);
    lightboxEl.appendChild(bottom);

    // Swipe support
    let touchStartX = 0;
    body.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
    }, { passive: true });
    body.addEventListener('touchend', (e) => {
        const dx = e.changedTouches[0].clientX - touchStartX;
        if (Math.abs(dx) > 50) {
            lightboxNav(dx < 0 ? 1 : -1);
        }
    });

    // Keyboard navigation
    lightboxEl._keyHandler = (e) => {
        if (e.key === 'ArrowLeft') lightboxNav(-1);
        else if (e.key === 'ArrowRight') lightboxNav(1);
        else if (e.key === 'Escape') closeLightbox();
    };
    document.addEventListener('keydown', lightboxEl._keyHandler);

    document.body.appendChild(lightboxEl);
    lightboxUpdate();
}

function lightboxNav(dir) {
    lightboxIndex += dir;
    if (lightboxIndex < 0) lightboxIndex = lightboxStreets.length - 1;
    if (lightboxIndex >= lightboxStreets.length) lightboxIndex = 0;
    lightboxUpdate();
}

function lightboxUpdate() {
    if (!lightboxEl) return;
    const s = lightboxStreets[lightboxIndex];
    lightboxEl.querySelector('.lightbox-body img').src = s.image_url;
    lightboxEl.querySelector('.lightbox-caption').textContent = s.street_name;
    lightboxEl.querySelector('.lightbox-counter').textContent = `${lightboxIndex + 1} / ${lightboxStreets.length}`;
}

function closeLightbox() {
    if (!lightboxEl) return;
    document.removeEventListener('keydown', lightboxEl._keyHandler);
    lightboxEl.remove();
    lightboxEl = null;
}
