class MapManager {
    constructor() {
        this.map = null;
        this.selectedLocation = null;
        this.markers = [];
        this.autoRotate = false;
        this.currentMarker = null;
        this.cloudsLayer = null;
        this.precipitationLayer = null;
        this.temperatureLayer = null;
        this.windLayer = null;
        this.pressureLayer = null;
        this.autoPanInterval = null;
        this.locationDetails = null;
        this.timeUpdateInterval = null;
        
        // Wait for Leaflet to be available
        if (typeof L !== 'undefined') {
            this.initializeMap();
            this.bindEvents();
        } else {
            console.log('Waiting for Leaflet to load...');
        }
    }

    initializeMap() {
        const container = document.getElementById('globe-canvas');
        if (!container) {
            console.error('Map container not found');
            return;
        }

        // Ensure Leaflet CSS is loaded (some setups only include JS)
        if (!document.querySelector('link[href*="leaflet"]')) {
            const leafletCSS = document.createElement('link');
            leafletCSS.rel = 'stylesheet';
            leafletCSS.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            leafletCSS.integrity = '';
            leafletCSS.crossOrigin = '';
            document.head.appendChild(leafletCSS);
        }
        
        try {
            // Initialize Leaflet map
            // Use the id string so Leaflet handles finding the element and avoids some timing issues
            this.map = L.map('globe-canvas', {
                center: [20, 0], // Center of the world
                zoom: 2.5,
                zoomControl: true,
                attributionControl: true,
                scrollWheelZoom: true,
                doubleClickZoom: false, // We'll handle double clicks manually
                minZoom: 2.5, // Fixed zoom level - cannot zoom out
                maxZoom: 18,
                zoomSnap: 0.5, // Allow half-zoom levels
                zoomDelta: 0.5,
                maxBounds: [[-90, -180], [90, 180]], // Prevent moving outside map boundaries
                maxBoundsViscosity: 1.0 // Make bounds completely solid
            });

            // Add OpenStreetMap tile layer
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 18,
                minZoom: 2.5,
                noWrap: true, // Prevent map from wrapping horizontally
                bounds: [[-90, -180], [90, 180]] // Limit tile loading to world bounds
            }).addTo(this.map);

            // Add weather overlay layer
            this.addWeatherLayer();

            // Custom map styles
            this.customizeMapAppearance();

            // Handle map events
            this.setupMapEvents();
            
            // Ensure the container and map size are synced
            setTimeout(() => {
                try {
                    this.map.invalidateSize();
                } catch (e) {
                    // ignore
                }
            }, 200);

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
        }
    }

    addWeatherLayer() {
        // Add weather overlay from OpenWeatherMap
        const weatherApiKey = window.weatherManager?.apiKey || 'f34ace7e2ceaf413f870653d6cc2eef3';
        
        if (weatherApiKey && weatherApiKey !== 'your_api_key_here') {
            try {
                // Enhanced weather layers with better styling
                this.cloudsLayer = L.tileLayer(`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
                    attribution: 'Weather data © OpenWeatherMap',
                    opacity: 0.7,
                    maxZoom: 18
                });

                this.precipitationLayer = L.tileLayer(`https://tile.openweathermap.org/map/precipitation_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
                    attribution: 'Weather data © OpenWeatherMap',
                    opacity: 0.8,
                    maxZoom: 18
                });

                this.temperatureLayer = L.tileLayer(`https://tile.openweathermap.org/map/temp_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
                    attribution: 'Weather data © OpenWeatherMap',
                    opacity: 0.6,
                    maxZoom: 18
                });

                // Add wind layer
                this.windLayer = L.tileLayer(`https://tile.openweathermap.org/map/wind_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
                    attribution: 'Weather data © OpenWeatherMap',
                    opacity: 0.5,
                    maxZoom: 18
                });

                // Add pressure layer
                this.pressureLayer = L.tileLayer(`https://tile.openweathermap.org/map/pressure_new/{z}/{x}/{y}.png?appid=${weatherApiKey}`, {
                    attribution: 'Weather data © OpenWeatherMap',
                    opacity: 0.6,
                    maxZoom: 18
                });

                // Enhanced layer control with more options
                const overlayMaps = {
                    "☁️ Chmury": this.cloudsLayer,
                    "🌧️ Opady": this.precipitationLayer,
                    "🌡️ Temperatura": this.temperatureLayer,
                    "💨 Wiatr": this.windLayer,
                    "📊 Ciśnienie": this.pressureLayer
                };

                // Note: default Leaflet layers control removed so we can use the
                // custom bottom-left checkbox control that matches site styling.
                // If you want the default control back, uncomment the lines below.
                // L.control.layers(null, overlayMaps, {
                //     position: 'topright',
                //     collapsed: false
                // }).addTo(this.map);
                // Bind any custom checkbox controls (bottom-left) to these layers
                setTimeout(() => {
                    try {
                        this.bindLayerControls();
                    } catch (e) {
                        console.warn('Failed to bind custom layer controls:', e);
                    }
                }, 80);
            } catch (error) {
                console.error('Error adding weather layers:', error);
            }
        } else {
            console.warn('Weather API key not available - weather layers disabled');
        }
    }

    customizeMapAppearance() {
        try {
            // Add custom CSS for dark theme
            const mapContainer = this.map.getContainer();
            mapContainer.style.background = '#1e293b';
            
            // Create custom map style - only add if not already exists
            if (!document.getElementById('map-custom-styles')) {
                const style = document.createElement('style');
                style.id = 'map-custom-styles';
                style.textContent = `
                    .leaflet-container {
                        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #334155 100%);
                        font-family: 'Inter', sans-serif;
                    }
                    .leaflet-control-container .leaflet-control {
                        background: rgba(14,23,34,0.85);
                        color: #e6eef8;
                        backdrop-filter: blur(8px);
                        border-radius: 8px;
                        border: 1px solid rgba(99,102,241,0.08);
                        box-shadow: 0 6px 18px rgba(2,6,23,0.6);
                    }
                    .leaflet-control-layers {
                        min-width: 200px;
                    }
                    .leaflet-control-layers-expanded {
                        padding: 10px;
                    }
                    .leaflet-bar a {
                        background: rgba(14,23,34,0.6);
                        color: #dbeafe;
                        border-radius: 8px;
                        margin: 4px;
                        border: 1px solid rgba(99,102,241,0.04);
                    }
                    .leaflet-bar a:hover {
                        background: rgba(18,28,44,0.72);
                    }
                `;
                document.head.appendChild(style);
            }
        } catch (error) {
            console.error('Error customizing map appearance:', error);
        }
    }

    setupMapEvents() {
        if (!this.map) return;
        
        try {
            // Click event for location selection
            this.map.on('click', (e) => {
                this.handleMapClick(e);
            });

            // Double click event for weather data
            this.map.on('dblclick', (e) => {
                this.handleMapDoubleClick(e);
            });

            // Zoom events
            this.map.on('zoomend', () => {
                this.updateMarkersVisibility();
            });
        } catch (error) {
            console.error('Error setting up map events:', error);
        }
    }

    async handleMapClick(e) {
        const lat = e.latlng.lat;
        const lon = e.latlng.lng;
        
        this.selectedLocation = {
            lat: lat,
            lon: lon,
            latlng: e.latlng
        };

        // Show loading state
        this.showLocationInfoLoading({ lat, lon });
        
        this.addLocationMarker(e.latlng);
        
        try {
            // Get detailed location information immediately
            await this.getLocationDetails(lat, lon);
            
            // Show complete location info with all details
            this.showLocationInfoComplete({ lat, lon });
            
        } catch (error) {
            console.error('Error getting location details:', error);
            this.showLocationInfoBasic({ lat, lon });
        }
        
        // Update weather input if available
        const eventLocation = document.getElementById('event-location');
        if (eventLocation) {
            eventLocation.value = `${this.locationDetails?.name || lat.toFixed(4) + ', ' + lon.toFixed(4)}`;
        }

        // Update events manager if available
        if (window.eventsManager) {
            window.eventsManager.updateLocation(this.selectedLocation);
        }
    }

    async handleMapDoubleClick(e) {
        if (e.originalEvent) {
            e.originalEvent.preventDefault();
        }
        
        if (this.selectedLocation) {
            // Show loading state
            window.app?.showLoading(true);
            
            try {
                // Get weather for selected location and show detailed info
                if (window.weatherManager) {
                    await window.weatherManager.getWeatherByCoordinates(
                        this.selectedLocation.lat,
                        this.selectedLocation.lon,
                        this.locationDetails?.name
                    );
                }
                
                // Show detailed location popup
                this.showDetailedLocationInfo();
                
            } catch (error) {
                console.error('Error getting detailed weather:', error);
                window.notificationManager?.show('Błąd pobierania szczegółowych danych', 'error');
            } finally {
                window.app?.showLoading(false);
            }
        }
    }

    async getLocationDetails(lat, lon) {
        try {
            // Initialize location details
            this.locationDetails = {
                name: 'Ładowanie...',
                country: '',
                state: '',
                coordinates: { lat, lon },
                timezone: null,
                elevation: null
            };

            // Get all data in parallel for faster loading
            const promises = [
                this.getLocationName(lat, lon),
                this.getTimezone(lat, lon),
                this.getElevation(lat, lon)
            ];

            const [locationData, timezone, elevation] = await Promise.allSettled(promises);

            // Process location name
            if (locationData.status === 'fulfilled' && locationData.value) {
                this.locationDetails.name = locationData.value.name;
                this.locationDetails.country = locationData.value.country;
                this.locationDetails.state = locationData.value.state;
            } else {
                this.locationDetails.name = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
            }

            // Process timezone
            if (timezone.status === 'fulfilled') {
                this.locationDetails.timezone = timezone.value;
            }

            // Process elevation
            if (elevation.status === 'fulfilled') {
                this.locationDetails.elevation = elevation.value;
            }

        } catch (error) {
            console.error('Error getting location details:', error);
            this.locationDetails = {
                name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
                country: '',
                state: '',
                coordinates: { lat, lon },
                timezone: null,
                elevation: null
            };
        }
    }

    async getLocationName(lat, lon) {
        try {
            const weatherApiKey = window.weatherManager?.apiKey || 'f34ace7e2ceaf413f870653d6cc2eef3';
            const response = await fetch(
                `https://api.openweathermap.org/geo/1.0/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${weatherApiKey}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.length > 0) {
                    const location = data[0];
                    return {
                        name: location.name || 'Unknown location',
                        country: location.country || '',
                        state: location.state || ''
                    };
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting location name:', error);
            return null;
        }
    }

    async getTimezone(lat, lon) {
        try {
            // Try multiple timezone APIs for better reliability
            const apis = [
                `https://worldtimeapi.org/api/timezone/Etc/GMT`,
                `https://api.timezonedb.com/v2.1/get-time-zone?key=demo&format=json&by=position&lat=${lat}&lng=${lon}`
            ];

            // For now, use a simple calculation based on longitude
            const timezoneOffset = Math.round(lon / 15);
            const now = new Date();
            const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
            const localTime = new Date(utc + (timezoneOffset * 3600000));
            
            return {
                name: `UTC${timezoneOffset >= 0 ? '+' : ''}${timezoneOffset}`,
                offset: timezoneOffset * 3600,
                currentTime: localTime.toLocaleString('pl-PL')
            };
        } catch (error) {
            console.error('Error getting timezone:', error);
            return null;
        }
    }

    async getElevation(lat, lon) {
        try {
            const response = await fetch(
                `https://api.open-elevation.com/api/v1/lookup?locations=${lat},${lon}`
            );
            
            if (response.ok) {
                const data = await response.json();
                if (data.results && data.results.length > 0) {
                    return data.results[0].elevation;
                }
            }
            return null;
        } catch (error) {
            console.error('Error getting elevation:', error);
            return null;
        }
    }

    showLocationInfoLoading(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        // Improved loading header with close button
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-spinner fa-spin"></i> Ładowanie danych lokalizacji...</h3>
                    <p class="coords">Szerokość: ${coordinates.lat.toFixed(4)}°, Długość: ${coordinates.lon.toFixed(4)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.globeManager.hideLocationInfo()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="location-details">
                <div class="location-detail">
                    <i class="fas fa-map-pin"></i>
                    <span>Pobieranie informacji o lokalizacji...</span>
                </div>
            </div>
        `;

        locationInfo.classList.add('show');
    }

    showLocationInfoBasic(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        // Compact basic view with close button
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-map-marker-alt"></i> Wybrana lokalizacja</h3>
                    <p class="coords">Szerokość: ${coordinates.lat.toFixed(4)}°, Długość: ${coordinates.lon.toFixed(4)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.globeManager.hideLocationInfo()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="location-details">
                <div class="location-detail">
                    <i class="fas fa-map-pin"></i>
                    <span>Dostępne podstawowe współrzędne</span>
                </div>
                <div class="location-detail">
                    <i class="fas fa-mouse"></i>
                    <span>Kliknij dwukrotnie, aby pobrać dane pogodowe</span>
                </div>
            </div>
        `;

        locationInfo.classList.add('show');
    }

    showLocationInfoComplete(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        
    const locationName = this.locationDetails?.name || 'Wybrana lokalizacja';
        const country = this.locationDetails?.country ? `, ${this.locationDetails.country}` : '';
        const state = this.locationDetails?.state ? `, ${this.locationDetails.state}` : '';
        
        // Create comprehensive location display with close button and nicer actions
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-map-marker-alt"></i> ${locationName}${state}${country}</h3>
                    <p class="coords"><strong>Współrzędne:</strong> ${coordinates.lat.toFixed(6)}°, ${coordinates.lon.toFixed(6)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.globeManager.hideLocationInfo()">
                    <i class="fas fa-times"></i>
                </button>
            </div>

            <div class="location-comprehensive-details">
                <div class="detail-grid">
                    ${this.locationDetails?.elevation !== null ? `
                        <div class="detail-card elevation-card">
                            <div class="detail-icon">
                                <i class="fas fa-mountain"></i>
                            </div>
                            <div class="detail-content">
                                <label>Wysokość</label>
                                <span class="detail-value">${Math.round(this.locationDetails.elevation)}m</span>
                                <small>nad poziomem morza</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.locationDetails?.timezone ? `
                        <div class="detail-card timezone-card">
                            <div class="detail-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="detail-content">
                                <label>Czas lokalny</label>
                                <span class="detail-value" id="live-time">${this.locationDetails.timezone.currentTime}</span>
                                <small>${this.locationDetails.timezone.name}</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-card coordinates-card">
                        <div class="detail-icon">
                            <i class="fas fa-crosshairs"></i>
                        </div>
                        <div class="detail-content">
                            <label>Dokładność</label>
                            <span class="detail-value">±10m</span>
                            <small>Dokładność GPS</small>
                        </div>
                    </div>
                    
                    <div class="detail-card distance-card">
                        <div class="detail-icon">
                            <i class="fas fa-route"></i>
                        </div>
                        <div class="detail-content">
                            <label>Odległość</label>
                            <span class="detail-value" id="distance-from-center">${this.calculateDistanceFromCenter(coordinates.lat, coordinates.lon)}</span>
                            <small>od równika</small>
                        </div>
                    </div>
                </div>
                
                <div class="action-grid">
                    <button class="location-action-btn favorite-btn" onclick="window.app?.addCurrentLocationToFavorites()">
                        <i class="fas fa-star action-icon"></i>
                        <span>Dodaj do ulubionych</span>
                    </button>
                    <button class="location-action-btn weather-btn" onclick="window.globeManager.getWeatherForLocation(${coordinates.lat}, ${coordinates.lon})">
                        <i class="fas fa-cloud-sun action-icon"></i>
                        <span>Pobierz pogodę</span>
                    </button>
                    
                    <button class="location-action-btn calendar-btn" onclick="(function(){ window.calendarManager?.openEventModal(); const locationInput = document.getElementById('event-location-input'); if(locationInput) locationInput.value = '${locationName.replace(/'/g, "\\'")} — ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}'; else console.warn('Event location input not found'); })();">
                        <i class="fas fa-calendar-plus action-icon"></i>
                        <span>Dodaj wydarzenie</span>
                    </button>
                    
                    <button class="location-action-btn copy-btn" onclick="navigator.clipboard?.writeText('${coordinates.lat}, ${coordinates.lon}'); window.notificationManager?.show('Skopiowano współrzędne!', 'success', 2000)">
                        <i class="fas fa-copy action-icon"></i>
                        <span>Kopiuj współrzędne</span>
                    </button>
                    
                    <button class="location-action-btn maps-btn" onclick="window.open('https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}', '_blank')">
                        <i class="fab fa-google action-icon"></i>
                        <span>Mapy Google</span>
                    </button>
                </div>
            </div>
        `;
        
        // Start live time updates
        this.startLiveTimeUpdate();
        
        locationInfo.classList.add('show', 'comprehensive');
    }

    // Add method to handle weather requests from location panel
    async getWeatherForLocation(lat, lon, locationName) {
        try {
            // Check if weather manager is available
            if (!window.weatherManager) {
                console.warn('Weather manager not initialized, attempting to initialize...');
                
                // Try to initialize weather manager if not available
                if (typeof WeatherManager !== 'undefined') {
                    window.weatherManager = new WeatherManager();
                    // Wait a moment for initialization
                    await new Promise(resolve => setTimeout(resolve, 100));
                } else {
                    throw new Error('WeatherManager class not found');
                }
            }

            // Check if weather manager has required methods
            if (typeof window.weatherManager.fetchCurrentWeather !== 'function') {
                throw new Error('Weather manager missing required methods');
            }

            // Fetch weather data directly without opening the dashboard
            const weatherData = await window.weatherManager.fetchCurrentWeather(lat, lon);
            
            // Update the location info panel with weather data
            this.updateLocationInfoWithWeather(lat, lon, locationName, weatherData);
            
            window.notificationManager?.show('Dane pogodowe załadowane pomyślnie', 'success');
            
        } catch (error) {
            console.error('Error getting weather:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Failed to load weather data';
            if (error.message.includes('not found')) {
                errorMessage = 'Weather system not available - please check if all scripts are loaded';
            } else if (error.message.includes('API')) {
                errorMessage = 'Weather API error - please try again later';
            }
            
            window.notificationManager?.show(errorMessage, 'error');
        }
    }

    updateLocationInfoWithWeather(lat, lon, locationName, weatherData) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;

        const temp = Math.round(weatherData.main.temp);
        const description = weatherData.weather[0].description;
        const humidity = weatherData.main.humidity;
        const windSpeed = Math.round(weatherData.wind.speed * 3.6);
        const pressure = weatherData.main.pressure;
        const feelsLike = Math.round(weatherData.main.feels_like);

        locationInfo.innerHTML = `
            <div class="info-header">
                <div class="location-header-row">
                    <div class="location-title">
                        <h3>${locationName || 'Wybrana lokalizacja'}</h3>
                        <p class="coords">${lat.toFixed(4)}°, ${lon.toFixed(4)}°</p>
                    </div>
                    <button class="location-close-btn" onclick="window.globeManager.hideLocationInfo()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="location-details">
                    <div class="detail-grid">
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-thermometer-half"></i>
                            </div>
                            <div class="detail-content">
                                <label>Temperatura</label>
                                <span class="detail-value">${temp}°C</span>
                            </div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-cloud"></i>
                            </div>
                            <div class="detail-content">
                                <label>Warunki</label>
                                <span class="detail-value">${description}</span>
                            </div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-tint"></i>
                            </div>
                            <div class="detail-content">
                                <label>Wilgotność</label>
                                <span class="detail-value">${humidity}%</span>
                            </div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-wind"></i>
                            </div>
                            <div class="detail-content">
                                <label>Wiatr</label>
                                <span class="detail-value">${windSpeed} km/h</span>
                            </div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-compress-arrows-alt"></i>
                            </div>
                            <div class="detail-content">
                                <label>Ciśnienie</label>
                                <span class="detail-value">${pressure} hPa</span>
                            </div>
                        </div>
                        <div class="detail-card">
                            <div class="detail-icon">
                                <i class="fas fa-temperature-low"></i>
                            </div>
                            <div class="detail-content">
                                <label>Odczuwalna temperatura</label>
                                <span class="detail-value">${feelsLike}°C</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        locationInfo.classList.add('show');
    }

    hideLocationInfo() {
        const locationInfo = document.getElementById('location-info');
        if (locationInfo) {
            locationInfo.classList.remove('show');
            // Reset to default content immediately
            locationInfo.innerHTML = `
                <div class="info-header">
                    <div class="location-header-row">
                        <div class="location-title">
                            <h3>Kliknij na lokalizację aby dostać informacje o pogodzie</h3>
                        
                        </div>
                    </div>
                </div>
            `;
        }
    }

    showDetailedLocationInfo() {
        if (!this.locationDetails) return;
        
        const existingModal = document.querySelector('.location-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'location-details-modal modal';
        modal.innerHTML = `
            <div class="modal-content location-modal-content">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-map-marker-alt"></i>
                        Szczegóły lokalizacji
                    </h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="location-info-grid">
                        <div class="info-section">
                            <h4><i class="fas fa-globe"></i> Informacje geograficzne</h4>
                            <div class="info-grid">
                                <div class="info-item">
                                    <label>Lokalizacja:</label>
                                    <span>${this.locationDetails.name}</span>
                                </div>
                                ${this.locationDetails.state ? `
                                    <div class="info-item">
                                        <label>Region:</label>
                                        <span>${this.locationDetails.state}</span>
                                    </div>
                                ` : ''}
                                ${this.locationDetails.country ? `
                                    <div class="info-item">
                                        <label>Kraj:</label>
                                        <span>${this.locationDetails.country}</span>
                                    </div>
                                ` : ''}
                                <div class="info-item">
                                    <label>Współrzędne:</label>
                                    <span>${this.locationDetails.coordinates.lat.toFixed(6)}°, ${this.locationDetails.coordinates.lon.toFixed(6)}°</span>
                                </div>
                                ${this.locationDetails.elevation !== null ? `
                                    <div class="info-item">
                                        <label>Wysokość:</label>
                                        <span>${Math.round(this.locationDetails.elevation)} m n.p.m.</span>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div class="info-section">
                            <h4><i class="fas fa-tools"></i> Dostępne działania</h4>
                            <div class="action-buttons">
                                <button class="action-btn primary" onclick="window.globeManager.getWeatherForLocation(${this.locationDetails.coordinates.lat}, ${this.locationDetails.coordinates.lon})">
                                    <i class="fas fa-cloud-sun"></i>
                                    Pobierz pogodę
                                </button>
                                <button class="action-btn secondary" onclick="navigator.clipboard?.writeText('${this.locationDetails.coordinates.lat}, ${this.locationDetails.coordinates.lon}'); window.notificationManager?.show('Skopiowano współrzędne!', 'success', 2000)">
                                    <i class="fas fa-copy"></i>
                                    Kopiuj współrzędne
                                </button>
                                <button class="action-btn secondary" onclick="window.globeManager.exportLocationData('json')">
                                    <i class="fas fa-download"></i>
                                    Eksportuj JSON
                                </button>
                                <button class="action-btn secondary" onclick="window.globeManager.exportLocationData('csv')">
                                    <i class="fas fa-file-csv"></i>
                                    Eksportuj CSV
                                </button>
                                <button class="action-btn secondary" onclick="window.open('https://www.google.com/maps?q=${this.locationDetails.coordinates.lat},${this.locationDetails.coordinates.lon}', '_blank')">
                                    <i class="fab fa-google"></i>
                                    Mapy Google
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        setTimeout(() => {
            if (document.body.contains(modal)) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        }, 30000);
    }

    // Export location data in different formats
    exportLocationData(format) {
        if (!this.locationDetails) {
            window.notificationManager?.show('Brak danych lokalizacji do eksportu', 'error');
            return;
        }

        const data = {
            name: this.locationDetails.name,
            country: this.locationDetails.country,
            state: this.locationDetails.state,
            latitude: this.locationDetails.coordinates.lat,
            longitude: this.locationDetails.coordinates.lon,
            elevation: this.locationDetails.elevation,
            timezone: this.locationDetails.timezone?.name,
            utc_offset: this.locationDetails.timezone?.offset,
            export_date: new Date().toISOString()
        };

        if (format === 'json') {
            this.exportAsJSON(data);
        } else if (format === 'csv') {
            this.exportAsCSV(data);
        }
    }

    exportAsJSON(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `location-${data.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
    window.notificationManager?.show('Dane lokalizacji wyeksportowane jako JSON', 'success');
    }

    exportAsCSV(data) {
        const headers = ['Name', 'Country', 'State', 'Latitude', 'Longitude', 'Elevation (m)', 'Timezone', 'UTC Offset', 'Export Date'];
        const values = [
            data.name,
            data.country || '',
            data.state || '',
            data.latitude,
            data.longitude,
            data.elevation || '',
            data.timezone || '',
            data.utc_offset || '',
            data.export_date
        ];
        
        const csvContent = [
            headers.join(','),
            values.map(value => `"${value}"`).join(',')
        ].join('\n');
        
        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `location-${data.name.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
    window.notificationManager?.show('Dane lokalizacji wyeksportowane jako CSV', 'success');
    }

    showLocationInfoLoading(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        // include a close button so the user can dismiss the panel
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-spinner fa-spin"></i> Ładowanie szczegółów lokalizacji...</h3>
                    <p class="coords">Szerokość: ${coordinates.lat.toFixed(4)}°, Długość: ${coordinates.lon.toFixed(4)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.closeGlobeLocationInfo()">&times;</button>
            </div>
            <div class="location-details">
                <div class="location-detail">
                    <i class="fas fa-map-pin"></i>
                    <span>Pobieranie informacji o lokalizacji...</span>
                </div>
            </div>
        `;
        
        locationInfo.classList.add('show');
    }

    showLocationInfoBasic(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        // compact basic view with close button
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-map-marker-alt"></i> Wybrana lokalizacja</h3>
                    <p class="coords">Szerokość: ${coordinates.lat.toFixed(4)}°, Długość: ${coordinates.lon.toFixed(4)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.closeGlobeLocationInfo()">&times;</button>
            </div>
            <div class="location-details">
                <div class="location-detail">
                    <i class="fas fa-map-pin"></i>
                    <span>Dostępne podstawowe współrzędne</span>
                </div>
                <div class="location-detail">
                    <i class="fas fa-mouse"></i>
                    <span>Kliknij dwukrotnie, aby pobrać dane pogodowe</span>
                </div>
            </div>
        `;
        
        locationInfo.classList.add('show');
    }

    showLocationInfoComplete(coordinates) {
        const locationInfo = document.getElementById('location-info');
        if (!locationInfo) return;
        
        const infoHeader = locationInfo.querySelector('.info-header');
        if (!infoHeader) return;
        
    const locationName = this.locationDetails?.name || 'Wybrana lokalizacja';
        const country = this.locationDetails?.country ? `, ${this.locationDetails.country}` : '';
        const state = this.locationDetails?.state ? `, ${this.locationDetails.state}` : '';
        
        // Create comprehensive location display
        infoHeader.innerHTML = `
            <div class="location-header-row">
                <div class="location-title">
                    <h3><i class="fas fa-map-marker-alt"></i> ${locationName}${state}${country}</h3>
                    <p class="coords"><strong>Coordinates:</strong> ${coordinates.lat.toFixed(6)}°, ${coordinates.lon.toFixed(6)}°</p>
                </div>
                <button class="location-close-btn" title="Zamknij" onclick="window.closeGlobeLocationInfo()">&times;</button>
            </div>

            <div class="location-comprehensive-details">
                <div class="detail-grid">
                    ${this.locationDetails?.elevation !== null ? `
                        <div class="detail-card elevation-card">
                            <div class="detail-icon">
                                <i class="fas fa-mountain"></i>
                            </div>
                            <div class="detail-content">
                                <label>Elevation</label>
                                <span class="detail-value">${Math.round(this.locationDetails.elevation)}m</span>
                                <small>above sea level</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    ${this.locationDetails?.timezone ? `
                        <div class="detail-card timezone-card">
                            <div class="detail-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="detail-content">
                                <label>Local Time</label>
                                <span class="detail-value" id="live-time">${this.locationDetails.timezone.currentTime}</span>
                                <small>${this.locationDetails.timezone.name}</small>
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="detail-card coordinates-card">
                        <div class="detail-icon">
                            <i class="fas fa-crosshairs"></i>
                        </div>
                        <div class="detail-content">
                            <label>Precision</label>
                            <span class="detail-value">±10m</span>
                            <small>GPS accuracy</small>
                        </div>
                    </div>
                    
                    <div class="detail-card distance-card">
                        <div class="detail-icon">
                            <i class="fas fa-route"></i>
                        </div>
                        <div class="detail-content">
                            <label>Distance</label>
                            <span class="detail-value" id="distance-from-center">${this.calculateDistanceFromCenter(coordinates.lat, coordinates.lon)}</span>
                            <small>from equator</small>
                        </div>
                    </div>
                </div>
                
                <div class="action-grid">
                    <button class="location-action-btn weather-btn" onclick="window.globeManager.getWeatherForLocation(${coordinates.lat}, ${coordinates.lon})">
                        <i class="fas fa-cloud-sun"></i>
                        <span>Pobierz pogodę</span>
                    </button>
                    
                    <button class="location-action-btn calendar-btn" onclick="(function(){ window.calendarManager?.openEventModal(); const locationInput = document.getElementById('event-location-input'); if(locationInput) locationInput.value = '${locationName.replace(/'/g, "\\'")} — ${coordinates.lat.toFixed(6)}, ${coordinates.lon.toFixed(6)}'; else console.warn('Event location input not found'); })();">
                        <i class="fas fa-calendar-plus"></i>
                        <span>Dodaj wydarzenie</span>
                    </button>
                    
                    <button class="location-action-btn copy-btn" onclick="navigator.clipboard?.writeText('${coordinates.lat}, ${coordinates.lon}'); window.notificationManager?.show('Coordinates copied!', 'success', 2000)">
                        <i class="fas fa-copy"></i>
                        <span>Kopiuj współrzędne</span>
                    </button>
                    
                    <button class="location-action-btn maps-btn" onclick="window.open('https://www.google.com/maps?q=${coordinates.lat},${coordinates.lon}', '_blank')">
                        <i class="fab fa-google"></i>
                        <span>Google Maps</span>
                    </button>
                </div>
            </div>
        `;
        
        // Start live time updates
        this.startLiveTimeUpdate();
        
        locationInfo.classList.add('show', 'comprehensive');
        
        // Auto-hide after 15 seconds (longer for detailed info)
        setTimeout(() => {
            if (!window.weatherManager?.weatherDashboard?.classList.contains('open')) {
                locationInfo.classList.remove('show', 'comprehensive');
                this.stopLiveTimeUpdate();
            }
        }, 15000);
    }

    calculateDistanceFromCenter(lat, lon) {
        // Calculate distance from equator
        const distanceFromEquator = Math.abs(lat) * 111; // Approximate km per degree
        return `${Math.round(distanceFromEquator)}km`;
    }

    startLiveTimeUpdate() {
        this.stopLiveTimeUpdate(); // Clear any existing interval
        
        this.timeUpdateInterval = setInterval(() => {
            const timeElement = document.getElementById('live-time');
            if (timeElement && this.locationDetails?.timezone) {
                const now = new Date();
                const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
                const localTime = new Date(utc + (this.locationDetails.timezone.offset * 1000));
                timeElement.textContent = localTime.toLocaleString('pl-PL');
            }
        }, 1000);
    }

    stopLiveTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }

    bindEvents() {
        try {
            // Auto rotate button - now does auto-pan
            const autoRotateBtn = document.getElementById('auto-rotate-btn');
            if (autoRotateBtn) {
                autoRotateBtn.addEventListener('click', () => {
                    this.toggleAutoPan();
                });
            }
            
            // Reset view button
            const resetViewBtn = document.getElementById('reset-view-btn');
            if (resetViewBtn) {
                resetViewBtn.addEventListener('click', () => {
                    this.resetView();
                });
            }

            // Add map layer controls
            this.addCustomControls();
        } catch (error) {
            console.error('Error binding events:', error);
        }
    }

    addCustomControls() {
        // Custom control removed — rely on Leaflet's built-in layer control
        // This prevents injecting the white-styled leaflet-bar into the map.
        return;
    }

    bindLayerControls() {
        const layerControls = {
            'weather-clouds': this.cloudsLayer,
            'weather-rain': this.precipitationLayer,
            'weather-temp': this.temperatureLayer,
            'weather-wind': this.windLayer,
            'weather-pressure': this.pressureLayer
        };
        // Human-readable Polish names for notifications
        const layerNames = {
            'weather-clouds': 'Chmury',
            'weather-rain': 'Opady',
            'weather-temp': 'Temperatura',
            'weather-wind': 'Wiatr',
            'weather-pressure': 'Ciśnienie'
        };
        // If the custom checkbox controls are not present (we removed them), do nothing.
        const anyCheckboxExists = Object.keys(layerControls).some(id => document.getElementById(id));
        if (!anyCheckboxExists) return;

        Object.entries(layerControls).forEach(([checkboxId, layer]) => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox && layer) {
                // If checkbox is already checked when binding, ensure layer and legend reflect it
                if (checkbox.checked) {
                    try { this.map.addLayer(layer); this.showLegendFor(checkboxId); } catch (err) { /* ignore */ }
                }

                checkbox.addEventListener('change', (e) => {
                    if (e.target.checked) {
                        this.map.addLayer(layer);
                        // Show legend for this layer
                        try { this.showLegendFor(checkboxId); } catch (err) { /* ignore */ }
                        window.notificationManager?.show(
                            `Włączono warstwę: ${layerNames[checkboxId] || checkboxId.replace('weather-', '')}`,
                            'info',
                            2000
                        );
                    } else {
                        this.map.removeLayer(layer);
                        // Hide legend when layer disabled
                        try { this.hideLegendFor(checkboxId); } catch (err) { /* ignore */ }
                    }
                });
            }
        });
    }

    // Legend helpers - create/remove interactive legends attached to the map container
    showLegendFor(checkboxId) {
        if (!this.map) return;
        const mapContainer = this.map.getContainer();
        const legendId = `map-legend-${checkboxId}`;
        if (mapContainer.querySelector(`#${legendId}`)) return; // already present

        const legend = document.createElement('div');
        legend.id = legendId;
        legend.className = 'map-legend';
        legend.innerHTML = this.getLegendContentFor(checkboxId);

        // Append and then stack legends vertically
        mapContainer.appendChild(legend);

        // Position stacked legends with small gaps
        const legends = Array.from(mapContainer.querySelectorAll('.map-legend'));
        legends.forEach((el, i) => {
            el.style.top = `${8 + i * (el.offsetHeight + 8)}px`;
        });
    }

    hideLegendFor(checkboxId) {
        if (!this.map) return;
        const mapContainer = this.map.getContainer();
        const legendId = `map-legend-${checkboxId}`;
        const el = mapContainer.querySelector(`#${legendId}`);
        if (el) el.remove();

        // Re-stack remaining legends
        const legends = Array.from(mapContainer.querySelectorAll('.map-legend'));
        legends.forEach((el, i) => {
            el.style.top = `${8 + i * (el.offsetHeight + 8)}px`;
        });
    }

    getLegendContentFor(checkboxId) {
        switch (checkboxId) {
            case 'weather-clouds':
                return `
                    <div class="legend-title">Zachmurzenie</div>
                    <div class="legend-scale legend-gradient-clouds"></div>
                    <div class="legend-labels"><span>0%</span><span>50%</span><span>100%</span></div>
                `;
            case 'weather-rain':
                return `
                    <div class="legend-title">Opady (mm/h)</div>
                    <div class="legend-scale legend-gradient-precip"></div>
                    <div class="legend-labels"><span>0</span><span>1</span><span>5</span><span>10+</span></div>
                `;
            case 'weather-temp':
                return `
                    <div class="legend-title">Temperatura (°C)</div>
                    <div class="legend-scale legend-gradient-temp"></div>
                    <div class="legend-labels"><span>-40</span><span>0</span><span>20</span><span>40+</span></div>
                `;
            case 'weather-wind':
                return `
                    <div class="legend-title">Prędkość wiatru (km/h)</div>
                    <div class="legend-scale legend-gradient-wind"></div>
                    <div class="legend-labels"><span>0</span><span>20</span><span>60</span><span>120+</span></div>
                `;
            case 'weather-pressure':
                return `
                    <div class="legend-title">Ciśnienie (hPa)</div>
                    <div class="legend-scale legend-gradient-pressure"></div>
                    <div class="legend-labels"><span>980</span><span>1005</span><span>1025</span><span>1045</span></div>
                `;
            default:
                return `<div class="legend-title">Warstwa</div><div class="legend-scale" style="height:8px;background:#ddd"></div>`;
        }
    }

    toggleAutoPan() {
        this.autoRotate = !this.autoRotate;
        const button = document.getElementById('auto-rotate-btn');
        
        if (button) {
            if (this.autoRotate) {
                button.innerHTML = '<i class="fas fa-pause"></i> Stop Auto-Pan';
                this.startAutoPan();
            } else {
                button.innerHTML = '<i class="fas fa-play"></i> Auto-Pan';
                this.stopAutoPan();
            }
        }
    }

    startAutoPan() {
        if (!this.map) return;
        
        let currentLng = 0;
        
        this.autoPanInterval = setInterval(() => {
            if (!this.autoRotate) return;
            
            currentLng += 1;
            if (currentLng > 180) currentLng = -180;
            
            try {
                this.map.panTo([0, currentLng], {
                    animate: true,
                    duration: 1
                });
            } catch (error) {
                console.error('Error during auto-pan:', error);
                this.stopAutoPan();
            }
        }, 100);
    }

    stopAutoPan() {
        if (this.autoPanInterval) {
            clearInterval(this.autoPanInterval);
            this.autoPanInterval = null;
        }
    }

    resetView() {
        if (!this.map) return;
        
        try {
            this.map.setView([20, 0], 2.5);
            this.clearMarkers();
            this.stopAutoPan();
            this.autoRotate = false;
            
            const button = document.getElementById('auto-rotate-btn');
            if (button) {
                button.innerHTML = '<i class="fas fa-play"></i> Auto-Pan';
            }
            
            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                locationInfo.classList.remove('show', 'comprehensive');
            }
            
            this.stopLiveTimeUpdate();
            
            if (window.weatherManager) {
                window.weatherManager.closeWeatherDashboard();
            }
        } catch (error) {
            console.error('Error resetting view:', error);
        }
    }

    addLocationMarker(latlng) {
        try {
            // Remove previous marker
            this.clearMarkers();

            // Create custom marker icon
            const markerIcon = L.divIcon({
                className: 'custom-location-marker',
                html: `
                    <div class="marker-pulse">
                        <div class="marker-dot"></div>
                    </div>
                `,
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            });

            // Add marker to map
            this.currentMarker = L.marker(latlng, { icon: markerIcon })
                .addTo(this.map);

            // Add marker styles - only add if not already exists
            if (!document.getElementById('marker-styles')) {
                const markerStyles = document.createElement('style');
                markerStyles.id = 'marker-styles';
                markerStyles.textContent = `
                    .custom-location-marker {
                        background: transparent;
                        border: none;
                    }
                    .marker-pulse {
                        width: 30px;
                        height: 30px;
                        border-radius: 50%;
                        background: rgba(239, 68, 68, 0.3);
                        position: relative;
                        animation: pulse 2s infinite;
                    }
                    .marker-dot {
                        width: 12px;
                        height: 12px;
                        border-radius: 50%;
                        background: #ef4444;
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        border: 2px solid white;
                        box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
                    }
                    @keyframes pulse {
                        0% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.5); opacity: 0.5; }
                        100% { transform: scale(1); opacity: 1; }
                    }
                `;
                document.head.appendChild(markerStyles);
            }

            this.markers.push(this.currentMarker);
        } catch (error) {
            console.error('Error adding location marker:', error);
        }
    }

    clearMarkers() {
        try {
            this.markers.forEach(marker => {
                if (this.map && marker) {
                    this.map.removeLayer(marker);
                }
            });
            this.markers = [];
            this.currentMarker = null;
        } catch (error) {
            console.error('Error clearing markers:', error);
        }
    }

    /**
     * Geocode a query string (e.g., "Warszawa") and place a marker on the first result.
     * Uses Nominatim OpenStreetMap API (no key required, keep usage polite).
     */
    async searchAndMark(query) {
        if (!query || !this.map) return null;
        try {
            const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&accept-language=en`;
            const resp = await fetch(url, { headers: { 'User-Agent': 'TerraScope/1.0 (your-email@example.com)' } });
            if (!resp.ok) throw new Error('Geocoding request failed');
            const results = await resp.json();
            if (!results || results.length === 0) return null;
            const place = results[0];
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);

            // Center map and add marker
            const latlng = L.latLng(lat, lon);
            this.map.setView(latlng, Math.max(this.map.getZoom(), 10));
            this.addLocationMarker(latlng);
            // set current selection so other features (favorites) can use it
            this.selectedLocation = { lat, lon, latlng };
            // load details and show info panel
            try {
                await this.getLocationDetails(lat, lon);
                this.showLocationInfoComplete({ lat, lon });
            } catch (e) {
                this.showLocationInfoBasic({ lat, lon });
            }

            // Optionally show basic popup with display name
            if (this.currentMarker) {
                this.currentMarker.bindPopup(`<strong>${place.display_name}</strong>`).openPopup();
            }

            return { lat, lon, display_name: place.display_name };
        } catch (error) {
            console.error('Geocode error:', error);
            return null;
        }
    }

    // Close the location info panel and clear selection/marker
    closeLocationInfo() {
        try {
            this.selectedLocation = null;
            this.locationDetails = null;
            this.clearMarkers();

            const locationInfo = document.getElementById('location-info');
            if (locationInfo) {
                locationInfo.classList.remove('show', 'comprehensive');
            }

            // Also clear event input if present
            const eventLocation = document.getElementById('event-location');
            if (eventLocation) {
                eventLocation.value = '';
            }
        } catch (error) {
            console.error('Error closing location info:', error);
        }
    }

    addWeatherMarker(lat, lon, weatherData) {
        if (!this.map || !weatherData) return null;
        
        try {
            const weatherIcon = this.getWeatherIcon(weatherData.weather[0].icon);
            
            const weatherMarkerIcon = L.divIcon({
                className: 'weather-marker',
                html: `
                    <div class="weather-marker-content">
                        <i class="${weatherIcon}"></i>
                        <span>${Math.round(weatherData.main.temp)}°</span>
                    </div>
                `,
                iconSize: [60, 40],
                iconAnchor: [30, 40]
            });

            const weatherMarker = L.marker([lat, lon], { icon: weatherMarkerIcon })
                .addTo(this.map);

            // Add weather marker styles - only add if not already exists
            if (!document.getElementById('weather-marker-styles')) {
                const weatherStyles = document.createElement('style');
                weatherStyles.id = 'weather-marker-styles';
                weatherStyles.textContent = `
                    .weather-marker {
                        background: transparent;
                        border: none;
                    }
                    .weather-marker-content {
                        background: rgba(255, 255, 255, 0.9);
                        border-radius: 20px;
                        padding: 8px 12px;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #1e293b;
                        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
                        backdrop-filter: blur(10px);
                        border: 1px solid rgba(255, 255, 255, 0.3);
                    }
                    .weather-marker-content i {
                        font-size: 16px;
                        color: #3b82f6;
                    }
                `;
                document.head.appendChild(weatherStyles);
            }

            return weatherMarker;
        } catch (error) {
            console.error('Error adding weather marker:', error);
            return null;
        }
    }

    getWeatherIcon(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun',
            '01n': 'fas fa-moon',
            '02d': 'fas fa-cloud-sun',
            '02n': 'fas fa-cloud-moon',
            '03d': 'fas fa-cloud',
            '03n': 'fas fa-cloud',
            '04d': 'fas fa-clouds',
            '04n': 'fas fa-clouds',
            '09d': 'fas fa-cloud-rain',
            '09n': 'fas fa-cloud-rain',
            '10d': 'fas fa-cloud-sun-rain',
            '10n': 'fas fa-cloud-moon-rain',
            '11d': 'fas fa-bolt',
            '11n': 'fas fa-bolt',
            '13d': 'fas fa-snowflake',
            '13n': 'fas fa-snowflake',
            '50d': 'fas fa-smog',
            '50n': 'fas fa-smog'
        };
        
        return iconMap[iconCode] || 'fas fa-question-circle';
    }

    // Cleanup method
    destroy() {
        try {
            this.stopAutoPan();
            this.stopLiveTimeUpdate();
            this.clearMarkers();
            
            if (this.map) {
                this.map.remove();
                this.map = null;
            }
        } catch (error) {
            console.error('Error destroying map:', error);
        }
    }
}

// Initialize map when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Check if Leaflet is already loaded
    if (typeof L !== 'undefined') {
        window.globeManager = new MapManager();
        
        // Update weather manager reference
        if (window.weatherManager) {
            window.weatherManager.mapManager = window.globeManager;
        }
    } else {
        // Load Leaflet if not already loaded
        const leafletJS = document.createElement('script');
        leafletJS.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        leafletJS.onload = () => {
            // Initialize map manager after Leaflet loads
            window.globeManager = new MapManager();
            
            // Update weather manager reference
            if (window.weatherManager) {
                window.weatherManager.mapManager = window.globeManager;
            }
        };
        leafletJS.onerror = () => {
            console.error('Failed to load Leaflet library');
        };
        document.body.appendChild(leafletJS);
    }
});

// Safe helper to allow inline onclick handlers to call close without throwing
if (!window.closeGlobeLocationInfo) {
    window.closeGlobeLocationInfo = function () {
        try {
            if (window.globeManager && typeof window.globeManager.closeLocationInfo === 'function') {
                window.globeManager.closeLocationInfo();
            }
        } catch (e) {
            console.warn('closeGlobeLocationInfo failed', e);
        }
    };
}
