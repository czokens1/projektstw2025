class WeatherManager {
    constructor() {
        // OpenWeatherMap API key - replace with your actual key
        this.apiKey = 'f34ace7e2ceaf413f870653d6cc2eef3';
        this.baseUrl = 'https://api.openweathermap.org/data/2.5';
        this.geocodingUrl = 'https://api.openweathermap.org/geo/1.0';
        this.oneCallUrl = 'https://api.openweathermap.org/data/3.0/onecall';
        
        this.currentLocation = null;
        this.weatherData = null;
        this.forecastData = null;
        this.oneCallData = null;
        this.airQualityData = null;
        
        this.initializeWeatherDashboard();
        this.bindEvents();
        this.loadApiKey();
    }

    initializeWeatherDashboard() {
        this.weatherDashboard = document.getElementById('weather-dashboard');
        this.locationInfo = document.getElementById('location-info');
        
        // Show initial help message
        this.showLocationInfo();
        
        // Initialize default weather data in background
        setTimeout(() => {
            this.initializeDefaultWeather();
        }, 1000);
    }

    bindEvents() {
        // Close weather dashboard
        document.getElementById('close-weather')?.addEventListener('click', () => {
            this.closeWeatherDashboard();
        });

        // Add to calendar button
        document.getElementById('add-to-calendar')?.addEventListener('click', () => {
            this.addWeatherToCalendar();
        });

        // Download data button
        document.getElementById('download-data')?.addEventListener('click', () => {
            this.showExportOptions();
        });
    }

    // Show export options modal
    showExportOptions() {
        if (!this.weatherData) {
            window.notificationManager?.show('Brak danych pogodowych do eksportu', 'error');
            return;
        }

        const existingModal = document.querySelector('.export-options-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'export-options-modal modal';
        modal.innerHTML = `
            <div class="modal-content export-modal-content">
                <div class="modal-header">
                    <h3>
                        <i class="fas fa-download"></i>
                        Eksport danych pogodowych
                    </h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove(); document.body.style.overflow = 'auto';">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="export-options">
                        <div class="export-section">
                            <h4>Wybierz dane do eksportu</h4>
                            <div class="export-checkboxes">
                                <label class="export-checkbox">
                                    <input type="checkbox" id="export-current" checked>
                                    <span>Aktualna pogoda</span>
                                </label>
                                <label class="export-checkbox">
                                    <input type="checkbox" id="export-forecast" ${this.forecastData ? 'checked' : 'disabled'}>
                                    <span>Prognoza 5 dni</span>
                                </label>
                                <label class="export-checkbox">
                                    <input type="checkbox" id="export-hourly" ${this.oneCallData?.hourly ? 'checked' : 'disabled'}>
                                    <span>Prognoza godzinowa</span>
                                </label>
                                <label class="export-checkbox">
                                    <input type="checkbox" id="export-air-quality" ${this.airQualityData ? 'checked' : 'disabled'}>
                                    <span>Jakość powietrza</span>
                                </label>
                            </div>
                        </div>
                        
                        <div class="export-section">
                            <h4>Format eksportu</h4>
                            <div class="export-format-buttons">
                                <button class="export-format-btn" onclick="window.weatherManager.exportWeatherData('json')">
                                    <i class="fas fa-file-code"></i>
                                    <span>JSON</span>
                                    <small>Pełna struktura danych</small>
                                </button>
                                <button class="export-format-btn" onclick="window.weatherManager.exportWeatherData('csv')">
                                    <i class="fas fa-file-csv"></i>
                                    <span>CSV</span>
                                    <small>Kompatybilny z arkuszami</small>
                                </button>
                                <button class="export-format-btn" onclick="window.weatherManager.exportWeatherData('txt')">
                                    <i class="fas fa-file-alt"></i>
                                    <span>TXT</span>
                                    <small>Raport czytelny dla człowieka</small>
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

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }

    exportWeatherData(format) {
        const exportOptions = this.getExportOptions();
        const data = this.prepareExportData(exportOptions);

        switch (format) {
            case 'json':
                this.exportAsJSON(data);
                break;
            case 'csv':
                this.exportAsCSV(data);
                break;
            case 'txt':
                this.exportAsTXT(data);
                break;
        }

        // Close export modal
        const modal = document.querySelector('.export-options-modal');
        if (modal) {
            modal.remove();
            document.body.style.overflow = 'auto';
        }
    }

    getExportOptions() {
        return {
            current: document.getElementById('export-current')?.checked || false,
            forecast: document.getElementById('export-forecast')?.checked || false,
            hourly: document.getElementById('export-hourly')?.checked || false,
            airQuality: document.getElementById('export-air-quality')?.checked || false
        };
    }

    prepareExportData(options) {
        const data = {
            location: this.currentLocation,
            export_date: new Date().toISOString(),
            data_source: 'OpenWeatherMap API'
        };

        if (options.current && this.weatherData) {
            data.current_weather = {
                temperature: this.weatherData.main.temp,
                feels_like: this.weatherData.main.feels_like,
                temperature_min: this.weatherData.main.temp_min,
                temperature_max: this.weatherData.main.temp_max,
                pressure: this.weatherData.main.pressure,
                humidity: this.weatherData.main.humidity,
                visibility: this.weatherData.visibility,
                wind_speed: this.weatherData.wind.speed,
                wind_direction: this.weatherData.wind.deg,
                cloudiness: this.weatherData.clouds.all,
                weather_condition: this.weatherData.weather[0].main,
                weather_description: this.weatherData.weather[0].description,
                sunrise: new Date(this.weatherData.sys.sunrise * 1000).toISOString(),
                sunset: new Date(this.weatherData.sys.sunset * 1000).toISOString(),
                uv_index: this.oneCallData?.current?.uvi,
                dew_point: this.oneCallData?.current?.dew_point
            };
        }

        if (options.forecast && this.forecastData) {
            data.forecast_5day = this.forecastData.list.map(item => ({
                datetime: new Date(item.dt * 1000).toISOString(),
                temperature: item.main.temp,
                feels_like: item.main.feels_like,
                pressure: item.main.pressure,
                humidity: item.main.humidity,
                weather_condition: item.weather[0].main,
                weather_description: item.weather[0].description,
                wind_speed: item.wind.speed,
                wind_direction: item.wind.deg,
                cloudiness: item.clouds.all,
                precipitation_probability: item.pop
            }));
        }

        if (options.hourly && this.oneCallData?.hourly) {
            data.hourly_forecast = this.oneCallData.hourly.slice(0, 48).map(item => ({
                datetime: new Date(item.dt * 1000).toISOString(),
                temperature: item.temp,
                feels_like: item.feels_like,
                pressure: item.pressure,
                humidity: item.humidity,
                dew_point: item.dew_point,
                uv_index: item.uvi,
                weather_condition: item.weather[0].main,
                weather_description: item.weather[0].description,
                wind_speed: item.wind_speed,
                wind_direction: item.wind_deg,
                cloudiness: item.clouds,
                precipitation_probability: item.pop
            }));
        }

        if (options.airQuality && this.airQualityData) {
            const aqi = this.airQualityData.list[0];
            data.air_quality = {
                aqi_index: aqi.main.aqi,
                aqi_level: this.getAQILevel(aqi.main.aqi).label,
                co: aqi.components.co,
                no: aqi.components.no,
                no2: aqi.components.no2,
                o3: aqi.components.o3,
                so2: aqi.components.so2,
                pm2_5: aqi.components.pm2_5,
                pm10: aqi.components.pm10,
                nh3: aqi.components.nh3
            };
        }

        return data;
    }

    exportAsJSON(data) {
        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
    link.download = `weather-data-${(this.currentLocation.safeName || this.currentLocation.name||'location')}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
    window.notificationManager?.show('Dane pogodowe wyeksportowane jako JSON', 'success');
    }

    exportAsCSV(data) {
        let csvContent = '';

        // Current weather CSV
        if (data.current_weather) {
            csvContent += 'Bieżąca pogoda\n';
            csvContent += 'Parametr,Wartość,Jednostka\n';
            Object.entries(data.current_weather).forEach(([key, value]) => {
                const unit = this.getUnitForParameter(key);
                csvContent += `"${key.replace(/_/g, ' ').toUpperCase()}","${value}","${unit}"\n`;
            });
            csvContent += '\n';
        }

        // Forecast CSV
        if (data.forecast_5day) {
            csvContent += 'Prognoza\n';
            csvContent += 'Data i godzina,Temperatura(°C),Odczuwalna(°C),Ciśnienie(hPa),Wilgotność(%),Pogoda,Opis,Prędkość wiatru(m/s),Kierunek wiatru(°),Zachmurzenie(%),Prawdopodobieństwo opadów(%)\n';
            data.forecast_5day.forEach(item => {
                csvContent += `"${item.datetime}","${item.temperature}","${item.feels_like}","${item.pressure}","${item.humidity}","${item.weather_condition}","${item.weather_description}","${item.wind_speed}","${item.wind_direction}","${item.cloudiness}","${Math.round((item.precipitation_probability || 0) * 100)}"\n`;
            });
            csvContent += '\n';
        }

        // Air quality CSV
        if (data.air_quality) {
            csvContent += 'Jakość powietrza\n';
            csvContent += 'Parametr,Wartość,Jednostka\n';
            Object.entries(data.air_quality).forEach(([key, value]) => {
                const unit = this.getUnitForAirQuality(key);
                csvContent += `"${key.replace(/_/g, ' ').toUpperCase()}","${value}","${unit}"\n`;
            });
        }

        const dataBlob = new Blob([csvContent], { type: 'text/csv' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
    link.download = `weather-data-${(this.currentLocation.safeName || this.currentLocation.name||'location')}-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        
    window.notificationManager?.show('Dane pogodowe wyeksportowane jako CSV', 'success');
    }

    exportAsTXT(data) {
    let txtContent = `RAPORT POGODOWY\n`;
    txtContent += `==============\n\n`;
    txtContent += `Lokalizacja: ${data.location.name}\n`;
    txtContent += `Współrzędne: ${data.location.lat.toFixed(4)}°, ${data.location.lon.toFixed(4)}°\n`;
    txtContent += `Data eksportu: ${new Date(data.export_date).toLocaleString()}\n`;
    txtContent += `Źródło danych: ${data.data_source}\n\n`;

        if (data.current_weather) {
            txtContent += `BIEŻĄCA POGODA\n`;
            txtContent += `---------------\n`;
            txtContent += `Temperatura: ${data.current_weather.temperature}°C (odczuwalna ${data.current_weather.feels_like}°C)\n`;
            txtContent += `Warunki: ${data.current_weather.weather_condition} - ${data.current_weather.weather_description}\n`;
            txtContent += `Ciśnienie: ${data.current_weather.pressure} hPa\n`;
            txtContent += `Wilgotność: ${data.current_weather.humidity}%\n`;
            txtContent += `Wiatr: ${(data.current_weather.wind_speed * 3.6).toFixed(1)} km/h, ${this.getWindDirection(data.current_weather.wind_direction)}\n`;
            txtContent += `Zachmurzenie: ${data.current_weather.cloudiness}%\n`;
            txtContent += `Widoczność: ${(data.current_weather.visibility / 1000).toFixed(1)} km\n`;
            if (data.current_weather.uv_index) {
                txtContent += `Indeks UV: ${data.current_weather.uv_index}\n`;
            }
            txtContent += `Wschód słońca: ${new Date(data.current_weather.sunrise).toLocaleTimeString()}\n`;
            txtContent += `Zachód słońca: ${new Date(data.current_weather.sunset).toLocaleTimeString()}\n\n`;
        }

        if (data.air_quality) {
            txtContent += `AIR QUALITY\n`;
            txtContent += `===========\n`;
            txtContent += `AQI Level: ${data.air_quality.aqi_level} (${data.air_quality.aqi_index}/5)\n`;
            txtContent += `PM2.5: ${data.air_quality.pm2_5.toFixed(1)} μg/m³\n`;
            txtContent += `PM10: ${data.air_quality.pm10.toFixed(1)} μg/m³\n`;
            txtContent += `NO₂: ${data.air_quality.no2.toFixed(1)} μg/m³\n`;
            txtContent += `O₃: ${data.air_quality.o3.toFixed(1)} μg/m³\n`;
            txtContent += `SO₂: ${data.air_quality.so2.toFixed(1)} μg/m³\n`;
            txtContent += `CO: ${data.air_quality.co.toFixed(1)} μg/m³\n\n`;
        }

        if (data.forecast_5day) {
            txtContent += `5-DAY FORECAST\n`;
            txtContent += `==============\n`;
            data.forecast_5day.slice(0, 40).forEach((item, index) => {
                if (index % 8 === 0) { // Daily summary
                    const date = new Date(item.datetime);
                    txtContent += `\n${date.toLocaleDateString()} - ${item.weather_condition}: ${item.temperature}°C\n`;
                }
            });
        }

        const dataBlob = new Blob([txtContent], { type: 'text/plain' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
    link.download = `weather-report-${(this.currentLocation.safeName || this.currentLocation.name||'location')}-${new Date().toISOString().split('T')[0]}.txt`;
        link.click();
        
    window.notificationManager?.show('Raport pogodowy wyeksportowany jako TXT', 'success');
    }

    getUnitForParameter(param) {
        const units = {
            temperature: '°C',
            feels_like: '°C',
            temperature_min: '°C',
            temperature_max: '°C',
            pressure: 'hPa',
            humidity: '%',
            visibility: 'm',
            wind_speed: 'm/s',
            wind_direction: '°',
            cloudiness: '%',
            uv_index: 'index',
            dew_point: '°C'
        };
        return units[param] || '';
    }

    getUnitForAirQuality(param) {
        const units = {
            aqi_index: 'index',
            aqi_level: '',
            co: 'μg/m³',
            no: 'μg/m³',
            no2: 'μg/m³',
            o3: 'μg/m³',
            so2: 'μg/m³',
            pm2_5: 'μg/m³',
            pm10: 'μg/m³',
            nh3: 'μg/m³'
        };
        return units[param] || '';
    }

    downloadWeatherData() {
        // Legacy method - redirect to new export options
        this.showExportOptions();
    }

    async getWeatherByCoordinates(lat, lon, locationName = null) {
        try {
            this.showLoading(true);
            
            // Get location name if not provided
            if (!locationName) {
                locationName = await this.getLocationName(lat, lon);
            }

            // Keep both a display name and a sanitized 'safe' name for filenames / API-safe usage
            const displayName = locationName || `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
            const safeName = this.sanitizeLocationName(displayName);

            this.currentLocation = {
                name: displayName,
                safeName: safeName,
                lat: lat,
                lon: lon
            };

            // Get all weather data simultaneously
            const [currentData, forecastData, airQualityData] = await Promise.all([
                this.fetchCurrentWeather(lat, lon),
                this.fetchForecast(lat, lon),
                this.fetchAirQuality(lat, lon)
            ]);
            
            // Try to get One Call API data
            const oneCallData = await this.fetchOneCallData(lat, lon);
            
            this.weatherData = currentData;
            this.forecastData = forecastData;
            this.oneCallData = oneCallData;
            this.airQualityData = airQualityData;
            
            this.displayWeatherData();
            this.openWeatherDashboard();
            
            // Add weather marker to map
            if (window.globeManager) {
                window.globeManager.addWeatherMarker(lat, lon, currentData);
            }
            
        } catch (error) {
            console.error('Weather fetch error:', error);
            this.showWeatherError(error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async fetchCurrentWeather(lat, lon) {
        const response = await fetch(
            `${this.baseUrl}/weather?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=pl`
        );
        
        if (!response.ok) {
            throw new Error(`Błąd API pogodowego: ${response.status}`);
        }
        
        return await response.json();
    }

    async fetchForecast(lat, lon) {
        const response = await fetch(
            `${this.baseUrl}/forecast?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=pl`
        );
        
        if (!response.ok) {
            throw new Error(`Błąd API prognozy: ${response.status}`);
        }
        
        return await response.json();
    }

    async fetchAirQuality(lat, lon) {
        try {
            const response = await fetch(
                `${this.baseUrl}/air_pollution?lat=${lat}&lon=${lon}&appid=${this.apiKey}`
            );
            
            if (!response.ok) {
                console.warn('Dane o jakości powietrza niedostępne');
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.warn('Air quality API error:', error);
            return null;
        }
    }

    async fetchOneCallData(lat, lon) {
        try {
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/onecall?lat=${lat}&lon=${lon}&appid=${this.apiKey}&units=metric&lang=pl&exclude=minutely`
            );
            
            if (!response.ok) {
                console.warn('One Call API niedostępne, używam podstawowej prognozy');
                return null;
            }
            
            return await response.json();
        } catch (error) {
                console.warn('Błąd One Call API:', error);
            return null;
        }
    }

    async getLocationName(lat, lon) {
        try {
            const response = await fetch(
                `${this.geocodingUrl}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${this.apiKey}`
            );
            const data = await response.json();
            
                if (data.length > 0) {
                    const location = data[0];
                    // Prefer English name in local_names if available, otherwise use returned name
                    const enName = location.local_names && (location.local_names.en || location.local_names.english);
                    const chosenName = enName || location.name;
                    return `${chosenName}${location.country ? `, ${location.country}` : ''}`;
                }
        } catch (error) {
            console.error('Geocoding error:', error);
        }
        return `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`;
    }

    // Make a filesystem/API-safe ascii-only name from a possibly non-latin display name
    sanitizeLocationName(name) {
        if (!name) return 'location';

        // Basic transliteration map for common Cyrillic letters (extend as needed)
        const translitMap = {
            'А':'A','Б':'B','В':'V','Г':'G','Д':'D','Е':'E','Ё':'E','Ж':'ZH','З':'Z','И':'I','Й':'I','К':'K','Л':'L','М':'M','Н':'N','О':'O','П':'P','Р':'R','С':'S','Т':'T','У':'U','Ф':'F','Х':'KH','Ц':'TS','Ч':'CH','Ш':'SH','Щ':'SHCH','Ы':'Y','Э':'E','Ю':'YU','Я':'YA','Ь':'','Ъ':'' ,
            'а':'a','б':'b','в':'v','г':'g','д':'d','е':'e','ё':'e','ж':'zh','з':'z','и':'i','й':'i','к':'k','л':'l','м':'m','н':'n','о':'o','п':'p','р':'r','с':'s','т':'t','у':'u','ф':'f','х':'kh','ц':'ts','ч':'ch','ш':'sh','щ':'shch','ы':'y','э':'e','ю':'yu','я':'ya'
        };

        let out = '';
        for (let ch of name) {
            if (translitMap[ch]) out += translitMap[ch];
            else out += ch;
        }

        // Remove diacritics
        out = out.normalize('NFKD').replace(/\p{Diacritic}/gu, '');

        // Replace non-alphanumeric with dashes, collapse multiple dashes
        out = out.replace(/[^0-9A-Za-z\- ]+/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
        if (!out) out = 'location';
        return out;
    }

    displayWeatherData() {
        if (!this.weatherData) return;

        // Update location
        document.getElementById('weather-location').textContent = this.currentLocation.name;

        // Update all weather sections
        this.updateCurrentWeather();
        this.updateDetailedWeatherInfo();
        this.updateAirQuality();
        this.updateForecast();
        this.updateHourlyForecast();
        this.updateDailyForecast();
        this.updateWeatherAlerts();
        this.updateProbabilityCharts();
        this.updateSunMoonInfo();
    }

    updateCurrentWeather() {
        const weather = this.weatherData;
        
        // Temperature
        document.getElementById('current-temp').textContent = Math.round(weather.main.temp);
        
        // Weather icon
        const iconElement = document.getElementById('weather-icon');
        iconElement.className = this.getWeatherIconClass(weather.weather[0].icon);
        
        // Basic details
        document.getElementById('humidity').textContent = `${weather.main.humidity}%`;
        document.getElementById('wind-speed').textContent = `${Math.round(weather.wind.speed * 3.6)} km/h`;
        document.getElementById('feels-like').textContent = `${Math.round(weather.main.feels_like)}°C`;
        document.getElementById('precipitation').textContent = `${weather.rain?.['1h'] || weather.snow?.['1h'] || 0} mm`;
    }

    updateDetailedWeatherInfo() {
        const weather = this.weatherData;
        const detailsContainer = document.querySelector('.weather-details');
        
        // Add comprehensive weather details
        const existingDetails = detailsContainer.querySelectorAll('.detail-item.extended');
        existingDetails.forEach(item => item.remove());
        
        const extendedDetails = `
            <div class="detail-item extended">
                <i class="fas fa-thermometer-quarter"></i>
                <span>Ciśnienie</span>
                <span>${weather.main.pressure} hPa</span>
            </div>
            <div class="detail-item extended">
                <i class="fas fa-eye"></i>
                <span>Widoczność</span>
                <span>${weather.visibility ? (weather.visibility / 1000).toFixed(1) + ' km' : 'brak danych'}</span>
            </div>
            <div class="detail-item extended">
                <i class="fas fa-sun"></i>
                <span>Indeks UV</span>
                <span id="uv-index">${this.oneCallData?.current?.uvi?.toFixed(1) || 'brak'}</span>
            </div>
            <div class="detail-item extended">
                <i class="fas fa-cloud"></i>
                <span>Zachmurzenie</span>
                <span>${weather.clouds.all}%</span>
            </div>
            <div class="detail-item extended">
                <i class="fas fa-temperature-low"></i>
                <span>Punkt rosy</span>
                <span>${this.oneCallData?.current?.dew_point ? Math.round(this.oneCallData.current.dew_point) + '°C' : 'brak'}</span>
            </div>
            <div class="detail-item extended">
                <i class="fas fa-compass"></i>
                <span>Kierunek wiatru</span>
                <span>${this.getWindDirection(weather.wind.deg || 0)}</span>
            </div>
        `;
        
        detailsContainer.insertAdjacentHTML('beforeend', extendedDetails);
    }

    updateAirQuality() {
        if (!this.airQualityData) return;

        let airQualitySection = document.querySelector('.air-quality-section');
        
        if (!airQualitySection) {
            airQualitySection = document.createElement('div');
            airQualitySection.className = 'air-quality-section';
            airQualitySection.innerHTML = `
                <h3>Jakość powietrza</h3>
                <div class="air-quality-container"></div>
            `;
            document.querySelector('.current-weather').after(airQualitySection);
        }

        const container = airQualitySection.querySelector('.air-quality-container');
        const aqi = this.airQualityData.list[0];
        const aqiLevel = this.getAQILevel(aqi.main.aqi);
        
        container.innerHTML = `
            <div class="aqi-main">
                <div class="aqi-value ${aqiLevel.class}">
                    <span class="aqi-number">${aqi.main.aqi}</span>
                    <span class="aqi-label">${aqiLevel.label}</span>
                </div>
                <div class="aqi-description">${aqiLevel.description}</div>
            </div>
            <div class="pollutants-grid">
                <div class="pollutant-item">
                    <label>PM2.5</label>
                    <span>${aqi.components.pm2_5.toFixed(1)} μg/m³</span>
                </div>
                <div class="pollutant-item">
                    <label>PM10</label>
                    <span>${aqi.components.pm10.toFixed(1)} μg/m³</span>
                </div>
                <div class="pollutant-item">
                    <label>NO₂</label>
                    <span>${aqi.components.no2.toFixed(1)} μg/m³</span>
                </div>
                <div class="pollutant-item">
                    <label>O₃</label>
                    <span>${aqi.components.o3.toFixed(1)} μg/m³</span>
                </div>
                <div class="pollutant-item">
                    <label>SO₂</label>
                    <span>${aqi.components.so2.toFixed(1)} μg/m³</span>
                </div>
                <div class="pollutant-item">
                    <label>CO</label>
                    <span>${aqi.components.co.toFixed(1)} μg/m³</span>
                </div>
            </div>
        `;
    }

    updateSunMoonInfo() {
        const weather = this.weatherData;
        
        let sunMoonSection = document.querySelector('.sun-moon-section');
        
        if (!sunMoonSection) {
            sunMoonSection = document.createElement('div');
            sunMoonSection.className = 'sun-moon-section';
            sunMoonSection.innerHTML = `
                <h3>Słońce i Księżyc</h3>
                <div class="sun-moon-container"></div>
            `;
            document.querySelector('.air-quality-section, .current-weather').after(sunMoonSection);
        }

        const container = sunMoonSection.querySelector('.sun-moon-container');
        const sunrise = new Date(weather.sys.sunrise * 1000);
        const sunset = new Date(weather.sys.sunset * 1000);
        
        // Calculate daylight duration
        const daylightMs = sunset.getTime() - sunrise.getTime();
        const daylightHours = Math.floor(daylightMs / (1000 * 60 * 60));
        const daylightMinutes = Math.floor((daylightMs % (1000 * 60 * 60)) / (1000 * 60));
        
        container.innerHTML = `
            <div class="sun-moon-grid">
                <div class="sun-moon-item">
                    <i class="fas fa-sun sunrise"></i>
                    <label>Wschód słońca</label>
                    <span>${sunrise.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="sun-moon-item">
                    <i class="fas fa-sun sunset"></i>
                    <label>Zachód słońca</label>
                    <span>${sunset.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div class="sun-moon-item">
                    <i class="fas fa-clock"></i>
                    <label>Długość dnia</label>
                    <span>${daylightHours}h ${daylightMinutes}m</span>
                </div>
                ${this.oneCallData?.daily?.[0]?.moon_phase ? `
                        <div class="sun-moon-item">
                        <i class="fas fa-moon"></i>
                        <label>Faza księżyca</label>
                        <span>${this.getMoonPhase(this.oneCallData.daily[0].moon_phase)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    }

    getWindDirection(degrees) {
        const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
        const index = Math.round(degrees / 22.5) % 16;
        return `${directions[index]} (${degrees}°)`;
    }

    getAQILevel(aqi) {
        const levels = {
            1: { label: 'Dobry', class: 'aqi-good', description: 'Jakość powietrza zadowalająca' },
            2: { label: 'Umiarkowany', class: 'aqi-fair', description: 'Jakość powietrza akceptowalna' },
            3: { label: 'Średni', class: 'aqi-moderate', description: 'Osoby wrażliwe mogą odczuwać drobne dolegliwości' },
            4: { label: 'Zły', class: 'aqi-poor', description: 'Możliwe skutki zdrowotne dla grup wrażliwych' },
            5: { label: 'Bardzo zły', class: 'aqi-very-poor', description: 'Ostrzeżenia zdrowotne — warunki kryzysowe' }
        };
        return levels[aqi] || levels[1];
    }

    getMoonPhase(phase) {
    if (phase === 0 || phase === 1) return 'Nów';
    if (phase < 0.25) return 'Księżyc w przybywaniu (mający rosnący sierp)';
    if (phase === 0.25) return 'Pierwsza kwadra';
    if (phase < 0.5) return 'Księżyc w przybywaniu (półpełnia rosnąca)';
    if (phase === 0.5) return 'Pełnia';
    if (phase < 0.75) return 'Księżyc w ubywaniu (półpełnia malejąca)';
    if (phase === 0.75) return 'Ostatnia kwadra';
    return 'Księżyc w ubywaniu (malejący sierp)';
    }

    updateForecast() {
        const forecastContainer = document.getElementById('forecast-container');
        if (!forecastContainer) return;
        
        forecastContainer.innerHTML = '';

        // Use One Call API daily data if available
        const dailyData = this.oneCallData?.daily?.slice(0, 7) || this.groupForecastByDay(this.forecastData?.list || []);
        
        if (this.oneCallData?.daily) {
            // Use detailed daily forecast from One Call API
            dailyData.forEach((day, index) => {
                const date = new Date(day.dt * 1000);
                const dayName = index === 0 ? 'Dziś' : date.toLocaleDateString('pl-PL', { 
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                
                const forecastElement = document.createElement('div');
                forecastElement.className = 'forecast-day';
                
                forecastElement.innerHTML = `
                    <div class="forecast-day-name">${dayName}</div>
                    <div class="forecast-icon">
                        <i class="${this.getWeatherIconClass(day.weather[0].icon)}"></i>
                    </div>
                    <div class="forecast-temps">
                        <div class="forecast-high">${Math.round(day.temp.max)}°</div>
                        <div class="forecast-low">${Math.round(day.temp.min)}°</div>
                    </div>
                    <div class="forecast-precipitation">
                        <i class="fas fa-tint"></i>
                        ${Math.round((day.pop || 0) * 100)}%
                    </div>
                    <div class="forecast-details">
                        <div class="detail-small">
                            <i class="fas fa-wind"></i>
                            ${Math.round(day.wind_speed * 3.6)} km/h
                        </div>
                        <div class="detail-small">
                            <i class="fas fa-eye"></i>
                            ${day.humidity}%
                        </div>
                        ${day.uvi ? `
                            <div class="detail-small">
                                <i class="fas fa-sun"></i>
                                UV ${Math.round(day.uvi)}
                            </div>
                        ` : ''}
                    </div>
                `;
                
                forecastContainer.appendChild(forecastElement);
            });
        } else {
            // Fallback to 5-day forecast
            this.updateBasicForecast();
        }
    }

    updateBasicForecast() {
        const forecastContainer = document.getElementById('forecast-container');
        if (!forecastContainer) return;
        
        const dailyForecasts = this.groupForecastByDay(this.forecastData?.list || []);
        
        Object.keys(dailyForecasts).slice(0, 5).forEach(date => {
            const dayData = dailyForecasts[date];
            const avgTemp = this.calculateAverageTemp(dayData);
            const mainWeather = this.getMostCommonWeather(dayData);
            const precipitation = this.calculatePrecipitation(dayData);
            
            const forecastElement = document.createElement('div');
            forecastElement.className = 'forecast-day';
            
            const dayName = new Date(date).toLocaleDateString('pl-PL', { 
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
            
            forecastElement.innerHTML = `
                <div class="forecast-day-name">${dayName}</div>
                <div class="forecast-icon">
                    <i class="${this.getWeatherIconClass(mainWeather.icon)}"></i>
                </div>
                <div class="forecast-temps">
                    <div class="forecast-high">${avgTemp.max}°</div>
                    <div class="forecast-low">${avgTemp.min}°</div>
                </div>
                <div class="forecast-precipitation">
                    <i class="fas fa-tint"></i>
                    ${precipitation}%
                </div>
            `;
            
            forecastContainer.appendChild(forecastElement);
        });
    }

    updateHourlyForecast() {
        let hourlySection = document.querySelector('.hourly-forecast');
        
        if (!hourlySection) {
            hourlySection = document.createElement('div');
            hourlySection.className = 'hourly-forecast';
            hourlySection.innerHTML = `
                <h4>Prognoza godzinowa (24h)</h4>
                <div class="hourly-container"></div>
            `;
            document.querySelector('.forecast-section').after(hourlySection);
        }

        const hourlyContainer = hourlySection.querySelector('.hourly-container');
        hourlyContainer.innerHTML = '';

        const hourlyData = this.oneCallData?.hourly?.slice(0, 24) || this.forecastData?.list?.slice(0, 8);
        
        if (!hourlyData) return;

        hourlyData.forEach((item, index) => {
            const time = new Date((item.dt || item.dt) * 1000);
            const hourElement = document.createElement('div');
            hourElement.className = 'hourly-item';
            
            hourElement.innerHTML = `
                <div class="hourly-time">${time.getHours()}:00</div>
                <div class="hourly-icon">
                    <i class="${this.getWeatherIconClass(item.weather[0].icon)}"></i>
                </div>
                <div class="hourly-temp">${Math.round(item.temp || item.main.temp)}°</div>
                <div class="hourly-precipitation">
                    <i class="fas fa-tint"></i>
                    ${Math.round((item.pop || 0) * 100)}%
                </div>
                <div class="hourly-wind">
                    <i class="fas fa-wind"></i>
                    ${Math.round((item.wind_speed || item.wind.speed) * 3.6)} km/h
                </div>
                <div class="hourly-pressure">
                    <i class="fas fa-thermometer-quarter"></i>
                    ${Math.round(item.pressure || item.main.pressure)} hPa
                </div>
            `;
            
            hourlyContainer.appendChild(hourElement);
        });
    }

    updateDailyForecast() {
        // This method calls updateForecast() for consistency
        this.updateForecast();
    }

    updateWeatherAlerts() {
        if (!this.oneCallData?.alerts) return;

        let alertsSection = document.querySelector('.weather-alerts');
        
        if (!alertsSection) {
            alertsSection = document.createElement('div');
            alertsSection.className = 'weather-alerts';
            alertsSection.innerHTML = '<h4>Ostrzeżenia pogodowe</h4><div class="alerts-container"></div>';
            document.querySelector('.current-weather').after(alertsSection);
        }

        const alertsContainer = alertsSection.querySelector('.alerts-container');
        alertsContainer.innerHTML = '';

        this.oneCallData.alerts.forEach(alert => {
            const alertElement = document.createElement('div');
            alertElement.className = 'weather-alert';
            
            const startTime = new Date(alert.start * 1000).toLocaleString('pl-PL');
            const endTime = new Date(alert.end * 1000).toLocaleString('pl-PL');
            
            alertElement.innerHTML = `
                <div class="alert-header">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>${alert.event}</strong>
                </div>
                <div class="alert-description">${alert.description}</div>
                <div class="alert-time">
                    Od: ${startTime}<br>
                    Do: ${endTime}
                </div>
            `;
            
            alertsContainer.appendChild(alertElement);
        });
    }

    updateProbabilityCharts() {
        const chartsContainer = document.getElementById('probability-charts');
        if (!chartsContainer) return;
        
        chartsContainer.innerHTML = '';

        if (!this.weatherData) return;

        const weather = this.weatherData;
        const current = this.oneCallData?.current || weather;
        
        // Prawdopodobieństwo deszczu
        const rainProb = Math.min((weather.clouds.all * weather.main.humidity / 100 * 0.8), 100);
        this.createProbabilityChart(chartsContainer, 'Prawdopodobieństwo opadów', rainProb, 'fas fa-cloud-rain');
        
        // Prawdopodobieństwo pogody bezchmurnej
        const clearProb = 100 - weather.clouds.all;
        this.createProbabilityChart(chartsContainer, 'Pogoda bezchmurna', clearProb, 'fas fa-sun');
        
        // Siła wiatru
        const windProb = Math.min((weather.wind.speed * 3.6 / 50) * 100, 100);
        this.createProbabilityChart(chartsContainer, 'Siła wiatru', windProb, 'fas fa-wind');

        // Indeks UV
        if (current.uvi) {
            const uvProb = Math.min((current.uvi / 11) * 100, 100);
            this.createProbabilityChart(chartsContainer, 'Poziom UV', uvProb, 'fas fa-sun');
        }

        // Jakość powietrza
        if (this.airQualityData) {
            const aqiProb = (this.airQualityData.list[0].main.aqi / 5) * 100;
            this.createProbabilityChart(chartsContainer, 'Indeks jakości powietrza', aqiProb, 'fas fa-smog');
        }
    }

    createProbabilityChart(container, label, probability, iconClass) {
        const chartElement = document.createElement('div');
        chartElement.className = 'probability-chart';
        
        chartElement.innerHTML = `
            <div class="chart-header">
                <div class="chart-label">
                        <i class="${iconClass}"></i>
                        ${label}
                    </div>
                    <div class="chart-value">${Math.round(probability)}%</div>
            </div>
            <div class="probability-bar">
                <div class="probability-fill" style="width: ${Math.min(probability, 100)}%"></div>
            </div>
        `;
        
        container.appendChild(chartElement);
    }

    getWeatherIconClass(iconCode) {
        const iconMap = {
            '01d': 'fas fa-sun weather-sunny',
            '01n': 'fas fa-moon weather-clear-night',
            '02d': 'fas fa-cloud-sun weather-partly-cloudy',
            '02n': 'fas fa-cloud-moon weather-partly-cloudy-night',
            '03d': 'fas fa-cloud weather-cloudy',
            '03n': 'fas fa-cloud weather-cloudy',
            '04d': 'fas fa-clouds weather-overcast',
            '04n': 'fas fa-clouds weather-overcast',
            '09d': 'fas fa-cloud-rain weather-rain',
            '09n': 'fas fa-cloud-rain weather-rain',
            '10d': 'fas fa-cloud-sun-rain weather-light-rain',
            '10n': 'fas fa-cloud-moon-rain weather-light-rain',
            '11d': 'fas fa-bolt weather-thunderstorm',
            '11n': 'fas fa-bolt weather-thunderstorm',
            '13d': 'fas fa-snowflake weather-snow',
            '13n': 'fas fa-snowflake weather-snow',
            '50d': 'fas fa-smog weather-fog',
            '50n': 'fas fa-smog weather-fog'
        };
        
        return iconMap[iconCode] || 'fas fa-question-circle';
    }

    /**
     * Return a concise forecast summary for a given Date object.
     * Uses cached One Call daily data (up to 7 days) first, then falls back
     * to grouped 3-hour forecast data (5-day). If no forecast is available
     * for the requested date, returns null.
     *
     * Returned shape (example):
     * {
     *   source: 'daily' | 'forecast3h',
     *   date: 'Mon Oct 05 2025',
     *   tempMin: 5,
     *   tempMax: 12,
     *   condition: 'Clouds',
     *   description: 'broken clouds',
     *   pop: 20, // precipitation probability in percent
     *   icon: '04d'
     * }
     */
    getForecastForDate(date) {
        if (!date) return null;
        const target = new Date(date);
        const targetStr = target.toDateString();

        console.log(`Looking for forecast for date: ${targetStr}`);

        // 1) Try One Call daily data (best, up to 7 days)
        if (this.oneCallData?.daily) {
            console.log(`Checking One Call daily data (${this.oneCallData.daily.length} days available)`);
            const found = this.oneCallData.daily.find(d => new Date(d.dt * 1000).toDateString() === targetStr);
            if (found) {
                console.log('Found forecast in One Call daily data');
                return {
                    source: 'daily',
                    date: targetStr,
                    tempMin: Math.round(found.temp.min),
                    tempMax: Math.round(found.temp.max),
                    condition: found.weather?.[0]?.main || '',
                    description: found.weather?.[0]?.description || '',
                    pop: Math.round((found.pop || 0) * 100),
                    icon: found.weather?.[0]?.icon || ''
                };
            }
        } else {
            console.log('No One Call daily data available');
        }

        // 2) Fallback to 3-hour forecast grouping (usually 5 days)
        if (this.forecastData?.list) {
            console.log(`Checking 3-hour forecast data (${this.forecastData.list.length} items available)`);
            const grouped = this.groupForecastByDay(this.forecastData.list);
            const dayList = grouped[target.toDateString()];
            if (dayList && dayList.length > 0) {
                console.log('Found forecast in 3-hour forecast data');
                const temps = dayList.map(i => i.main.temp);
                const max = Math.round(Math.max(...temps));
                const min = Math.round(Math.min(...temps));
                // pick most common weather (icon from helper)
                const mostCommon = this.getMostCommonWeather(dayList);
                const pop = Math.round(Math.max(...dayList.map(i => (i.pop || 0))) * 100);
                const sample = dayList[0].weather?.[0] || {};
                return {
                    source: 'forecast3h',
                    date: targetStr,
                    tempMin: min,
                    tempMax: max,
                    condition: sample.main || (mostCommon && mostCommon.icon) || '',
                    description: sample.description || '',
                    pop: pop,
                    icon: sample.icon || (mostCommon && mostCommon.icon) || ''
                };
            }
        } else {
            console.log('No 3-hour forecast data available');
        }

        // No forecast available for that date in cached data
        console.log('No forecast found for the requested date');
        return null;
    }

    addWeatherToCalendar() {
        if (!this.weatherData || !this.currentLocation) return;

        const weather = {
            condition: this.weatherData.weather[0].main,
            temperature: Math.round(this.weatherData.main.temp),
            description: this.weatherData.weather[0].description
        };

        const today = new Date();
        
        if (window.calendarManager) {
            window.calendarManager.addWeatherEvent(
                this.currentLocation.name,
                weather,
                today
            );
            
            window.notificationManager?.show(
                'Wydarzenie pogodowe dodane do kalendarza',
                'success'
            );
        }
    }

    downloadWeatherData() {
        if (!this.weatherData) return;

        const data = {
            location: this.currentLocation,
            current: this.weatherData,
            forecast: this.forecastData,
            oneCall: this.oneCallData,
            airQuality: this.airQualityData,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(data, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
    link.download = `weather-data-${(this.currentLocation.safeName || this.currentLocation.name||'location')}-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
    window.notificationManager?.show('Dane pogodowe pobrane', 'success');
    }

    showWeatherError(message) {
        window.notificationManager?.show(
            `Błąd danych pogodowych: ${message}`,
            'error'
        );
    }

    showLoading(show) {
        const spinner = document.getElementById('loading-spinner');
        if (show) {
            spinner?.classList.add('show');
        } else {
            spinner?.classList.remove('show');
        }
    }

    setApiKey(apiKey) {
        this.apiKey = apiKey;
        localStorage.setItem('weather-api-key', apiKey);
    }

    loadApiKey() {
        const stored = localStorage.getItem('weather-api-key');
        if (stored) {
            this.apiKey = stored;
        }
    }

    groupForecastByDay(forecastList) {
        const grouped = {};
        
        forecastList.forEach(item => {
            const date = new Date(item.dt * 1000).toDateString();
            if (!grouped[date]) {
                grouped[date] = [];
            }
            grouped[date].push(item);
        });
        
        return grouped;
    }

    calculateAverageTemp(dayData) {
        const temps = dayData.map(item => item.main.temp);
        return {
            max: Math.round(Math.max(...temps)),
            min: Math.round(Math.min(...temps))
        };
    }

    getMostCommonWeather(dayData) {
        const weatherCounts = {};
        dayData.forEach(item => {
            const weather = item.weather[0];
            const key = weather.main;
            if (!weatherCounts[key]) {
                weatherCounts[key] = { count: 0, icon: weather.icon };
            }
            weatherCounts[key].count++;
        });
        
        return Object.entries(weatherCounts)
            .sort(([,a], [,b]) => b.count - a.count)[0][1];
    }

    calculatePrecipitation(dayData) {
        const precipProbs = dayData.map(item => (item.pop || 0) * 100);
        return Math.round(Math.max(...precipProbs));
    }

    openWeatherDashboard() {
        if (this.weatherDashboard) {
            this.weatherDashboard.classList.add('open');
        }
    }

    closeWeatherDashboard() {
        if (this.weatherDashboard) {
            this.weatherDashboard.classList.remove('open');
        }
    }

    showLocationInfo(title = 'Kliknij lokalizację na mapie aby uzyskać informacje o pogodzie', description = ' ') {
        const infoHeader = this.locationInfo?.querySelector('.info-header');
        if (infoHeader) {
            const h3 = infoHeader.querySelector('h3');
            const p = infoHeader.querySelector('p');
            if (h3) h3.textContent = title;
            if (p) p.textContent = description;
        }
        this.locationInfo?.classList.add('show');
    }

    /**
     * Fetch weather data in background without displaying dashboard
     * Useful for getting forecast data for calendar events
     * @param {number} lat - Latitude
     * @param {number} lon - Longitude
     * @returns {Promise<boolean>} - Success status
     */
    async fetchWeatherDataInBackground(lat, lon) {
        try {
            console.log(`Fetching background weather data for lat=${lat}, lon=${lon}`);
            
            // Get all weather data simultaneously
            const [currentData, forecastData] = await Promise.all([
                this.fetchCurrentWeather(lat, lon),
                this.fetchForecast(lat, lon)
            ]);
            
            // Try to get One Call API data
            const oneCallData = await this.fetchOneCallData(lat, lon);
            
            // Store the data without displaying dashboard
            this.weatherData = currentData;
            this.forecastData = forecastData;
            this.oneCallData = oneCallData;
            
            console.log('Background weather data fetched successfully');
            return true;
        } catch (error) {
            console.error('Background weather fetch error:', error);
            return false;
        }
    }

    /**
     * Initialize with default location to have weather data available
     * This ensures calendar can show forecasts even if user hasn't clicked map
     */
    async initializeDefaultWeather() {
        // Default to Warsaw, Poland coordinates
        const defaultLat = 52.2297;
        const defaultLon = 21.0122;
        
        try {
            await this.fetchWeatherDataInBackground(defaultLat, defaultLon);
            console.log('Default weather data initialized');
        } catch (error) {
            console.error('Failed to initialize default weather:', error);
        }
    }
}

// Initialize weather manager
document.addEventListener('DOMContentLoaded', () => {
    window.weatherManager = new WeatherManager();
});
