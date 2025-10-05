class App {
    constructor() {
        this.currentTab = 'calendar';
        this.currentTheme = 'space';
        this.initializeApp();
        this.bindEvents();
    }

    applyMapConstraints() {
        const map = window.globeManager?.map;
        if (!map || typeof L === 'undefined') return;
        // Don't apply maxBounds - let the map extend naturally
        // Reasonable zoom limits - minZoom 2.5 prevents zooming out too far
        try { map.setMinZoom(2.5); } catch (e) { /* ignore */ }
        try { map.setMaxZoom(18); } catch (e) { /* ignore */ }
        // Disable infinite horizontal wrapping
        map.options.worldCopyJump = false;
    }

    initializeApp() {
        console.log('Initializing Weather Dashboard App...');
        
        // Initialize theme system
        this.initializeThemes();
        
        // Check URL parameters for initial tab
        this.checkUrlParams();
        
        // Initialize notification system first
        if (typeof NotificationManager !== 'undefined') {
            window.notificationManager = new NotificationManager();
        }

        // Show loading spinner and screen
        this.showLoading(true);
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            loadingScreen.classList.remove('hidden');
        }

        // Initialize components in sequence
        setTimeout(() => {
            this.initializeComponents();
            this.showLoading(false);
            
            // Hide loading screen after initialization
            if (loadingScreen) {
                setTimeout(() => {
                    loadingScreen.classList.add('hidden');
                }, 500);
            }
            
            this.showWelcomeMessage();
        }, 1500);
    }

    checkUrlParams() {
        // Check if there's a tab parameter in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab');
        
        if (tabParam && ['calendar', 'events', 'globe'].includes(tabParam)) {
            this.currentTab = tabParam;
        }
    }

    initializeThemes() {
        // Load saved theme from localStorage
        const savedTheme = localStorage.getItem('terrascape-theme') || 'space';
        this.setTheme(savedTheme);
        
        // Update active theme button
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === savedTheme) {
                btn.classList.add('active');
            }
        });
    }

    setTheme(themeName) {
        this.currentTheme = themeName;
        document.documentElement.setAttribute('data-theme', themeName);
        localStorage.setItem('terrascape-theme', themeName);
        
        // Update theme button states
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === themeName) {
                btn.classList.add('active');
            }
        });
        
        console.log(`Theme changed to: ${themeName}`);
    }

    initializeComponents() {
        // Components will initialize themselves via their own DOMContentLoaded events
        console.log('App components initialized');
        
        // Set initial tab based on URL parameter or default
        setTimeout(() => {
            this.switchTab(this.currentTab);
        }, 100);

        // Initial render of favorites if UI exists
        this.renderFavoritesList();

        // Observe location info panel to inject inline favorites section
        this.setupLocationInfoObserver();

        // Prepare map theme integration after map initializes
        setTimeout(() => this.setupMapThemeIntegration(), 300);
    }

    bindEvents() {
        // Tab navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-link') || e.target.closest('.nav-link')) {
                const link = e.target.matches('.nav-link') ? e.target : e.target.closest('.nav-link');
                const tabName = link.dataset.tab;
                if (tabName) {
                    e.preventDefault();
                    this.switchTab(tabName);
                }
                // If no data-tab, let the link work normally (for external links)
            }
            
            // Theme switching
            if (e.target.matches('.theme-btn') || e.target.closest('.theme-btn')) {
                const button = e.target.matches('.theme-btn') ? e.target : e.target.closest('.theme-btn');
                const themeName = button.dataset.theme;
                if (themeName) {
                    this.setTheme(themeName);
                }
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case '1':
                        e.preventDefault();
                        this.switchTab('globe');
                        break;
                    case '2':
                        e.preventDefault();
                        this.switchTab('calendar');
                        break;
                    case '3':
                        e.preventDefault();
                        this.switchTab('events');
                        break;
                }
            }
        });

        // Location search (press Enter to search)
        const searchInput = document.getElementById('locationSearch');
        if (searchInput) {
            // Enter handler
            searchInput.addEventListener('keydown', async (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const q = searchInput.value.trim();
                    if (!q) return;
                    if (window.globeManager && typeof window.globeManager.searchAndMark === 'function') {
                        const res = await window.globeManager.searchAndMark(q);
                        if (res) {
                            window.notificationManager?.show(`Found: ${res.display_name}`, 'success', 3000);
                        } else {
                            window.notificationManager?.show('Location not found', 'warn', 2500);
                        }
                    }
                }
            });

            // Autocomplete: debounced search as user types
            const resultsBox = document.getElementById('searchResults');
            let acTimer = null;
            searchInput.addEventListener('input', (e) => {
                const q = searchInput.value.trim();
                clearTimeout(acTimer);
                if (!q) {
                    if (resultsBox) resultsBox.innerHTML = '';
                    return;
                }
                acTimer = setTimeout(async () => {
                    try {
                            // request a few more results because we will filter by place type
                            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=8&accept-language=en`;
                        const resp = await fetch(url, { headers: { 'User-Agent': 'TerraScope/1.0 (your-email@example.com)' } });
                        if (!resp.ok) throw new Error('Autocomplete request failed');
                        const items = await resp.json();
                        if (!resultsBox) return;
                        resultsBox.innerHTML = '';
                            if (!items || items.length === 0) return;
                            // Only keep items that are settlements: city, town, village, hamlet, municipality
                            const allowedTypes = new Set(['city', 'town', 'village', 'hamlet', 'municipality']);
                            const filtered = items.filter(it => {
                                if (!it) return false;
                                // prefer class 'place' and allowed types
                                if (it.class === 'place' && allowedTypes.has(it.type)) return true;
                                // sometimes type alone is enough
                                if (allowedTypes.has(it.type)) return true;
                                return false;
                            });
                            if (filtered.length === 0) return;
                            const useItems = filtered.slice(0, 5);
                        resultsBox.classList.add('active');
                            useItems.forEach(item => {
                            const div = document.createElement('div');
                            div.className = 'search-result-item';
                            div.innerHTML = `
                                <div class="result-info">
                                    <h4>${item.display_name.split(',')[0]}</h4>
                                    <p>${item.display_name}</p>
                                </div>
                            `;
                            div.addEventListener('click', async () => {
                                searchInput.value = item.display_name.split(',')[0];
                                resultsBox.innerHTML = '';
                                if (window.globeManager && typeof window.globeManager.searchAndMark === 'function') {
                                    await window.globeManager.searchAndMark(item.display_name);
                                }
                            });
                                resultsBox.appendChild(div);
                        });
                        // hide when clicking outside
                        document.addEventListener('click', function onDocClick(ev) {
                            if (!resultsBox.contains(ev.target) && ev.target !== searchInput) {
                                resultsBox.innerHTML = '';
                                resultsBox.classList.remove('active');
                                document.removeEventListener('click', onDocClick);
                            }
                        });
                    } catch (err) {
                        console.warn('Autocomplete error', err);
                    }
                }, 300);
            });
        }

        // Handle window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });

        // Favorites: toggle and close
        const favToggle = document.getElementById('favoritesToggle');
        const favClose = document.getElementById('closeFavorites');
        if (favToggle) {
            favToggle.addEventListener('click', (e) => {
                e.preventDefault();
                this.toggleFavoritesPanel();
            });
        }
        if (favClose) {
            favClose.addEventListener('click', (e) => {
                e.preventDefault();
                this.closeFavoritesPanel();
            });
        }

        // Close favorites when clicking outside
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('favoritesPanel');
            const toggle = document.getElementById('favoritesToggle');
            if (!panel) return;
            if (panel.classList.contains('open')) {
                if (!panel.contains(e.target) && e.target !== toggle && !toggle?.contains(e.target)) {
                    this.closeFavoritesPanel();
                }
            }
        });

        // Map theme toggle in header was removed; control is rendered on map in setupMapThemeIntegration()
    }

    switchTab(tabName) {
        if (this.currentTab === tabName) return;

        // Update navigation
        document.querySelectorAll('.nav-link').forEach(btn => {
            btn.classList.remove('active');
        });
        const targetNavBtn = document.querySelector(`[data-tab="${tabName}"]`);
        if (targetNavBtn) {
            targetNavBtn.classList.add('active');
        }

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        const targetTab = document.getElementById(`${tabName}-tab`);
        if (targetTab) {
            targetTab.classList.add('active');
        }

        this.currentTab = tabName;

        // Handle tab-specific actions
        this.handleTabChange(tabName);
    }

    handleTabChange(tabName) {
        switch(tabName) {
            case 'globe':
                // Trigger map resize if needed
                if (window.globeManager && window.globeManager.map) {
                    setTimeout(() => {
                        window.globeManager.map.invalidateSize();
                    }, 100);
                }
                break;
            case 'calendar':
                // Refresh calendar if needed
                if (window.calendarManager) {
                    window.calendarManager.renderCalendar();
                }
                break;
            case 'events':
                // Load events if needed
                break;
        }
    }

    handleResize() {
        // Handle responsive behavior
        if (window.globeManager && window.globeManager.map) {
            window.globeManager.map.invalidateSize();
        }
    }

    // Favorites: UI helpers
    toggleFavoritesPanel() {
        const panel = document.getElementById('favoritesPanel');
        const btn = document.getElementById('favoritesToggle');
        if (!panel || !btn) return;
        const isOpen = panel.classList.toggle('open');
        panel.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        btn.classList.toggle('active', isOpen);
        if (isOpen) this.renderFavoritesList();
    }

    closeFavoritesPanel() {
        const panel = document.getElementById('favoritesPanel');
        const btn = document.getElementById('favoritesToggle');
        if (!panel || !btn) return;
        panel.classList.remove('open');
        panel.setAttribute('aria-hidden', 'true');
        btn.classList.remove('active');
    }

    renderFavoritesList() {
        const list = document.getElementById('favoritesList');
        if (!list || !window.database) return;
        const favorites = window.database.getFavorites();
        list.innerHTML = '';
        if (!favorites || favorites.length === 0) {
            list.innerHTML = '<div class="favorites-empty">Brak ulubionych lokalizacji. Dodaj pierwszą z panelu lokalizacji.</div>';
            return;
        }
        favorites.forEach((fav) => {
            const item = document.createElement('div');
            item.className = 'favorite-item';
            item.innerHTML = `
                <div class="result-icon"><i class="fa-solid fa-location-dot"></i></div>
                <div class="favorite-meta">
                    <div class="favorite-name">${(fav.name || 'Lokalizacja').replace(/</g,'&lt;')}</div>
                    <div class="favorite-coords">${Number(fav.lat).toFixed(4)}°, ${Number(fav.lon).toFixed(4)}°</div>
                </div>
                <div class="favorite-actions">
                    <button class="fav-btn" data-action="goto" title="Pokaż na mapie"><i class="fas fa-map"></i></button>
                    <button class="fav-btn" data-action="weather" title="Pogoda"><i class="fas fa-cloud-sun"></i></button>
                    <button class="fav-btn" data-action="remove" title="Usuń"><i class="fas fa-trash"></i></button>
                </div>
            `;

            // Item click: go to favorite
            item.addEventListener('click', (e) => {
                const actionBtn = e.target.closest('button.fav-btn');
                if (actionBtn) return; // action handled below
                this.gotoFavorite(fav);
            });

            // Action buttons
            item.querySelector('[data-action="goto"]').addEventListener('click', (e) => {
                e.stopPropagation();
                this.gotoFavorite(fav);
            });
            item.querySelector('[data-action="weather"]').addEventListener('click', async (e) => {
                e.stopPropagation();
                await this.gotoFavorite(fav, { fetchWeather: true });
            });
            item.querySelector('[data-action="remove"]').addEventListener('click', (e) => {
                e.stopPropagation();
                if (window.database.removeFavorite(fav.id)) {
                    window.notificationManager?.show('Usunięto z ulubionych', 'info', 2000);
                    this.renderFavoritesList();
                }
            });

            list.appendChild(item);
        });
    }

    async gotoFavorite(fav, options = {}) {
        this.closeFavoritesPanel();
        if (!window.globeManager || !window.globeManager.map) return;
        const lat = Number(fav.lat);
        const lon = Number(fav.lon);
        try {
            const latlng = L.latLng(lat, lon);
            window.globeManager.map.setView(latlng, Math.max(window.globeManager.map.getZoom(), 10));
            window.globeManager.addLocationMarker(latlng);
            window.globeManager.selectedLocation = { lat, lon, latlng };
            // Refresh details
            await window.globeManager.getLocationDetails(lat, lon);
            window.globeManager.showLocationInfoComplete({ lat, lon });
            if (options.fetchWeather) {
                await window.globeManager.getWeatherForLocation(lat, lon, fav.name);
            }
        } catch (err) {
            console.warn('gotoFavorite failed', err);
        }
    }

    // Add current selection (from map/search) to favorites
    addCurrentLocationToFavorites() {
        if (!window.globeManager || !window.globeManager.selectedLocation) {
            window.notificationManager?.show('Najpierw wybierz lokalizację na mapie', 'warning', 2500);
            return false;
        }
        const { lat, lon } = window.globeManager.selectedLocation;
        const name = window.globeManager.locationDetails?.name || `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        const added = window.database?.addFavorite({ lat, lon, name });
        if (added) {
            window.notificationManager?.show('Dodano do ulubionych', 'success', 2000);
            this.renderFavoritesList();
            return true;
        } else {
            window.notificationManager?.show('Ta lokalizacja już jest w ulubionych', 'info', 2500);
            return false;
        }
    }

    // Observe and inject an inline "Ulubione" section under Google Maps button
    setupLocationInfoObserver() {
        const target = document.getElementById('location-info');
        if (!target) return;
        const injectIfNeeded = () => {
            // Ensure we only inject once per render
            if (target.querySelector('.favorites-inline')) return;
            const mapsBtn = target.querySelector('.location-action-btn.maps-btn');
            const actionGrid = mapsBtn?.closest('.action-grid');
            if (!actionGrid || !mapsBtn) return;

            // Create container below action grid
            const container = document.createElement('div');
            container.className = 'favorites-inline';
            container.style.marginTop = '0.75rem';
            container.innerHTML = `
                <div class="action-grid">
                    <button class="location-action-btn" id="inlineAddFavorite">
                        <i class="fas fa-star action-icon"></i>
                        <span>Dodaj do ulubionych</span>
                    </button>
                </div>
            `;
            actionGrid.insertAdjacentElement('afterend', container);

            const addBtn = container.querySelector('#inlineAddFavorite');
            addBtn?.addEventListener('click', () => {
                this.addCurrentLocationToFavorites();
            });
        };

        // Run once in case panel is already present
        setTimeout(injectIfNeeded, 0);

        const observer = new MutationObserver(() => {
            try { injectIfNeeded(); } catch (e) { /* noop */ }
        });
        observer.observe(target, { childList: true, subtree: true });
        // Save observer if we need to disconnect later
        this._locationInfoObserver = observer;
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (spinner) {
            if (show) {
                spinner.classList.add('show');
            } else {
                spinner.classList.remove('show');
            }
        }
    }

    // ============= Map Theme (Light/Dark) =============
    setupMapThemeIntegration() {
        // Ensure map exists
        if (!window.globeManager || !window.globeManager.map || typeof L === 'undefined') {
            // Try again shortly if map not ready yet
            setTimeout(() => this.setupMapThemeIntegration(), 300);
            return;
        }

        // Apply map constraints (fixed bounds, limited zoom, no endless pan)
        this.applyMapConstraints();

        // Create base layers once
        if (!this._mapThemes) {
            const light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 19,
                noWrap: true
            });
            const dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; OpenStreetMap &copy; CARTO',
                maxZoom: 19,
                noWrap: true
            });
            this._mapThemes = { light, dark };
        }

        // Default to dark to match current UI
        if (!this._currentMapTheme) {
            this._currentMapTheme = 'dark';
            this.applyMapTheme('dark');
        } else {
            // Reapply current theme if needed after map re-init
            this.applyMapTheme(this._currentMapTheme);
        }

        // Create Leaflet control for theme toggle (top-right)
        if (!this._mapThemeControl) {
            const ThemeControl = L.Control.extend({
                options: { position: 'topright' },
                onAdd: (map) => {
                    const container = L.DomUtil.create('div', 'leaflet-bar map-theme-control');
                    const a = L.DomUtil.create('a', '', container);
                    a.href = '#';
                    a.title = 'Przełącz motyw mapy';
                    // prevent map drag/zoom on click
                    L.DomEvent.disableClickPropagation(container);
                    L.DomEvent.on(a, 'click', (e) => {
                        e.preventDefault();
                        this.toggleMapTheme();
                    });
                    this._mapThemeToggleEl = a;
                    // initial UI
                    this.updateMapThemeControlUI();
                    return container;
                }
            });
            this._mapThemeControl = new ThemeControl();
            this._mapThemeControl.addTo(window.globeManager.map);
        } else {
            // Ensure toggle element exists after possible map re-init
            this.updateMapThemeControlUI();
        }
    }

    applyMapTheme(theme) {
        const map = window.globeManager?.map;
        if (!map || !this._mapThemes) return;

        const light = this._mapThemes.light;
        const dark = this._mapThemes.dark;

        // Remove our theme layers first
        try { map.removeLayer(light); } catch (e) { /* ignore */ }
        try { map.removeLayer(dark); } catch (e) { /* ignore */ }

        // Also remove any existing non-weather base tile layers from globe.js
        try {
            Object.values(map._layers).forEach((layer) => {
                // Only consider Leaflet tile layers
                if (layer instanceof L.TileLayer) {
                    const url = layer._url || '';
                    const isWeather = url.includes('openweathermap.org');
                    const isOurTheme = (layer === light || layer === dark);
                    if (!isWeather && !isOurTheme) {
                        // Likely a base map from initialization — remove it
                        map.removeLayer(layer);
                    }
                }
            });
        } catch (e) { /* ignore */ }

        // Add selected base
        if (theme === 'light') {
            light.addTo(map);
        } else {
            dark.addTo(map);
        }

        // Toggle container classes for CSS-based theming of controls
        try {
            const container = map.getContainer();
            container.classList.remove('map-theme-light', 'map-theme-dark');
            container.classList.add(theme === 'light' ? 'map-theme-light' : 'map-theme-dark');
        } catch (e) { /* ignore */ }

        // Update Leaflet control UI
        this.updateMapThemeControlUI();
    }

    toggleMapTheme() {
        if (!this._currentMapTheme) this._currentMapTheme = 'dark';
        this._currentMapTheme = this._currentMapTheme === 'dark' ? 'light' : 'dark';
        this.applyMapTheme(this._currentMapTheme);
    }

    updateMapThemeControlUI() {
        const el = this._mapThemeToggleEl;
        if (!el) return;
        if (this._currentMapTheme === 'light') {
            el.innerHTML = '<i class="fas fa-sun"></i>';
            el.title = 'Mapa: Jasny (kliknij, aby zmienić na ciemny)';
        } else {
            el.innerHTML = '<i class="fas fa-moon"></i>';
            el.title = 'Mapa: Ciemny (kliknij, aby zmienić na jasny)';
        }
    }

    showWelcomeMessage() {
        if (window.notificationManager) {
            window.notificationManager.show(
                'Witaj w Mapie! Wybierz lokalizację, aby zobaczyć pogodę i wydarzenia.',
                'info',
                5000
            );
        }
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
