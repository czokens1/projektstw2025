class Database {
    constructor() {
        this.storageKey = 'weather-dashboard-data';
        this.data = this.loadData();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            return stored ? JSON.parse(stored) : {
                events: [],
                favorites: [],
                settings: {
                    units: 'metric',
                    language: 'pl',
                    theme: 'light'
                }
            };
        } catch (error) {
            console.error('Error loading data from localStorage:', error);
            return {
                events: [],
                favorites: [],
                settings: {
                    units: 'metric',
                    language: 'pl',
                    theme: 'light'
                }
            };
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            return true;
        } catch (error) {
            console.error('Error saving data to localStorage:', error);
            return false;
        }
    }

    // Events methods
    addEvent(event) {
        event.id = event.id || Date.now().toString();
        this.data.events.push(event);
        this.saveData();
        return event.id;
    }

    updateEvent(eventId, updatedEvent) {
        const index = this.data.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.data.events[index] = { ...this.data.events[index], ...updatedEvent };
            this.saveData();
            return true;
        }
        return false;
    }

    deleteEvent(eventId) {
        const index = this.data.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.data.events.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    getEvents() {
        return this.data.events;
    }

    getEventsByDate(date) {
        const dateStr = date.toISOString().split('T')[0];
        return this.data.events.filter(event => 
            event.date === dateStr
        );
    }

    // Favorites methods
    addFavorite(location) {
        const existing = this.data.favorites.find(f => 
            f.lat === location.lat && f.lon === location.lon
        );
        
        if (!existing) {
            this.data.favorites.push({
                ...location,
                id: Date.now().toString(),
                addedAt: new Date().toISOString()
            });
            this.saveData();
            return true;
        }
        return false;
    }

    removeFavorite(locationId) {
        const index = this.data.favorites.findIndex(f => f.id === locationId);
        if (index !== -1) {
            this.data.favorites.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    getFavorites() {
        return this.data.favorites;
    }

    // Settings methods
    updateSetting(key, value) {
        this.data.settings[key] = value;
        this.saveData();
    }

    getSetting(key) {
        return this.data.settings[key];
    }

    getAllSettings() {
        return this.data.settings;
    }

    // Export/Import methods
    exportData() {
        return JSON.stringify(this.data, null, 2);
    }

    importData(jsonData) {
        try {
            const importedData = JSON.parse(jsonData);
            this.data = { ...this.data, ...importedData };
            this.saveData();
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    clearData() {
        this.data = {
            events: [],
            favorites: [],
            settings: {
                units: 'metric',
                language: 'pl',
                theme: 'light'
            }
        };
        this.saveData();
    }
}

// Initialize database
window.database = new Database();
