class CalendarManager {
    constructor() {
        this.currentDate = new Date();
        this.selectedDate = null;
        this.events = [];
        this.viewMode = 'month';
        
        this.initializeCalendar();
        this.bindEvents();
        this.loadEvents();
    }

    initializeCalendar() {
        this.calendarGrid = document.getElementById('calendar-grid');
        this.monthYearDisplay = document.getElementById('calendar-month-year');
        this.eventsList = document.getElementById('events-list');
        
        this.renderCalendar();
    }

    bindEvents() {
        // Navigation buttons
        document.getElementById('prev-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });

        document.getElementById('next-month').addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });

        // Add event button
        document.getElementById('add-event-btn').addEventListener('click', () => {
            this.openEventModal();
        });

        // Event form submission
        document.getElementById('event-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEvent();
        });

        // Modal controls
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closeEventModal();
        });

        document.getElementById('cancel-event').addEventListener('click', () => {
            this.closeEventModal();
        });

        // Quick add event
        this.addQuickAddSection();
    }

    
    renderCalendar() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        
        // Update header
        this.monthYearDisplay.textContent = new Intl.DateTimeFormat('pl-PL', {
            month: 'long',
            year: 'numeric'
        }).format(this.currentDate);

        // Clear grid
        this.calendarGrid.innerHTML = '';

        // Add day headers
        const dayHeaders = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
        dayHeaders.forEach(day => {
            const header = document.createElement('div');
            header.className = 'calendar-day-header';
            header.textContent = day;
            this.calendarGrid.appendChild(header);
        });

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = (firstDay.getDay() + 6) % 7; // Adjust for Monday start

        // Add previous month's trailing days
        const prevMonth = new Date(year, month - 1, 0);
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            const dayElement = this.createDayElement(
                prevMonth.getDate() - i,
                new Date(year, month - 1, prevMonth.getDate() - i),
                true
            );
            this.calendarGrid.appendChild(dayElement);
        }

        // Add current month days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const dayElement = this.createDayElement(day, date, false);
            this.calendarGrid.appendChild(dayElement);
        }

        // Add next month's leading days
        const totalCells = this.calendarGrid.children.length - 7; // Subtract headers
        const remainingCells = 42 - totalCells; // 6 rows * 7 days - headers
        for (let day = 1; day <= remainingCells; day++) {
            const dayElement = this.createDayElement(
                day,
                new Date(year, month + 1, day),
                true
            );
            this.calendarGrid.appendChild(dayElement);
        }

        this.renderEventsList();
    }

    createDayElement(dayNumber, date, isOtherMonth) {
        const dayElement = document.createElement('div');
        dayElement.className = 'calendar-day';
        
        if (isOtherMonth) {
            dayElement.classList.add('other-month');
        }

        // Check if it's today
        const today = new Date();
        if (this.isSameDay(date, today)) {
            dayElement.classList.add('today');
        }

        // Check if it's selected
        if (this.selectedDate && this.isSameDay(date, this.selectedDate)) {
            dayElement.classList.add('selected');
        }

        // Create day structure
        const dayNumber_div = document.createElement('div');
        dayNumber_div.className = 'day-number';
        dayNumber_div.textContent = dayNumber;

        const eventsContainer = document.createElement('div');
        eventsContainer.className = 'day-events';

        // Get events for this day
        const dayEvents = this.getEventsForDate(date);
        if (dayEvents.length > 0) {
            dayElement.classList.add('has-events');
        }

        // Show up to 3 events
        dayEvents.slice(0, 3).forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = `day-event ${event.type}-event`;
            eventElement.textContent = event.title;
            eventElement.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showEventDetails(event);
            });
            eventsContainer.appendChild(eventElement);
        });

        // Show "more" indicator if there are additional events
        if (dayEvents.length > 3) {
            const moreElement = document.createElement('div');
            moreElement.className = 'day-event-more';
            moreElement.textContent = `+${dayEvents.length - 3} więcej`;
            eventsContainer.appendChild(moreElement);
        }

        dayElement.appendChild(dayNumber_div);
        dayElement.appendChild(eventsContainer);

        // Add click handler
        dayElement.addEventListener('click', () => {
            this.selectDate(date);
        });

        // Add double-click handler for quick event creation
        dayElement.addEventListener('dblclick', () => {
            this.openEventModal(date);
        });

        return dayElement;
    }

    selectDate(date) {
        // Update selected date
        this.selectedDate = new Date(date);
        
        // Re-render calendar to show selection
        this.renderCalendar();
        
        // Filter events list
        this.renderEventsList();
    }

    getEventsForDate(date) {
        return this.events.filter(event => 
            this.isSameDay(new Date(event.date), date)
        );
    }

    isSameDay(date1, date2) {
        return date1.getDate() === date2.getDate() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getFullYear() === date2.getFullYear();
    }

    renderEventsList() {
        const eventsToShow = this.selectedDate 
            ? this.getEventsForDate(this.selectedDate)
            : this.getUpcomingEvents();

        this.eventsList.innerHTML = '';

        if (eventsToShow.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'events-empty';
            emptyState.innerHTML = `
                <i class="fas fa-calendar-day"></i>
                <p>${this.selectedDate ? 'Brak wydarzeń w tym dniu' : 'Brak nadchodzących wydarzeń'}</p>
            `;
            this.eventsList.appendChild(emptyState);
            return;
        }

        eventsToShow.forEach(event => {
            const eventElement = this.createEventElement(event);
            this.eventsList.appendChild(eventElement);
        });
    }

    createEventElement(event) {
        const eventElement = document.createElement('div');
        eventElement.className = `event-item ${event.type}-event`;
        
        const eventDate = new Date(event.date);
        const timeString = event.time ? ` o ${event.time}` : '';
        // If forecast wasn't attached when event was saved, try to get cached forecast now
        if (!event.weatherForecast && window.weatherManager) {
            try {
                const f = window.weatherManager.getForecastForDate(new Date(event.date));
                event.weatherForecast = f ? f : { unavailable: true };
            } catch (e) {
                // ignore
            }
        }
        // Create forecast display if available
        let forecastHtml = '';
        if (event.weatherForecast) {
            if (event.weatherForecast.unavailable) {
                forecastHtml = `<div class="event-forecast">Prognoza niedostępna</div>`;
            } else {
                const wf = event.weatherForecast;
                forecastHtml = `
                    <div class="event-forecast">
                        <i class="fas ${window.weatherManager?.getWeatherIconClass(wf.icon) || 'fa-question-circle'}"></i>
                        <span>${wf.tempMin}\u00b0 / ${wf.tempMax}\u00b0</span>
                        <small>${wf.description || wf.condition}</small>
                    </div>
                `;
            }
        }
        
        eventElement.innerHTML = `
            <div class="event-title">${event.title}</div>
            <div class="event-date">
                <i class="fas fa-calendar"></i>
                ${eventDate.toLocaleDateString('pl-PL')}${timeString}
            </div>
            ${event.location ? `
                <div class="event-location">
                    <i class="fas fa-map-marker-alt"></i>
                    ${event.location}
                </div>
            ` : ''}
            ${event.description ? `
                <div class="event-description">${event.description}</div>
            ` : ''}
            ${forecastHtml}
            <div class="event-actions">
                <button class="event-action-btn edit" onclick="calendarManager.editEvent('${event.id}')">
                    <i class="fas fa-edit"></i> Edytuj
                </button>
                <button class="event-action-btn delete" onclick="calendarManager.deleteEvent('${event.id}')">
                    <i class="fas fa-trash"></i> Usuń
                </button>
            </div>
        `;

        return eventElement;
    }

    getUpcomingEvents() {
        const today = new Date();
        return this.events
            .filter(event => new Date(event.date) >= today)
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(0, 10);
    }

    openEventModal(date = null) {
        const modal = document.getElementById('event-modal');
        const form = document.getElementById('event-form');
        
        // Reset form
        form.reset();
        
        // Set default date if provided
        if (date) {
            document.getElementById('event-date').value = this.formatDateForInput(date);
        } else if (this.selectedDate) {
            document.getElementById('event-date').value = this.formatDateForInput(this.selectedDate);
        }

        // Pre-fill location if available from map selection
        if (window.globeManager?.locationDetails) {
            const locationInput = document.getElementById('event-location-input');
            if (locationInput && !locationInput.value) {
                locationInput.value = window.globeManager.locationDetails.name;
            }
        }

        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    closeEventModal() {
        const modal = document.getElementById('event-modal');
        modal.classList.remove('show');
        document.body.style.overflow = 'auto';
    }

    saveEvent() {
        const form = document.getElementById('event-form');
        const editingId = form.dataset.editingId;
        
        const event = {
            id: editingId || Date.now().toString(),
            title: document.getElementById('event-name').value,
            date: document.getElementById('event-date').value,
            time: document.getElementById('event-time').value,
            location: document.getElementById('event-location-input').value,
            description: document.getElementById('event-description').value,
            reminder: document.getElementById('event-reminder').checked,
            type: 'personal',
            created: editingId ? this.events.find(e => e.id === editingId)?.created : new Date().toISOString()
        };

        // Attach forecast data synchronously from weatherManager if available
        try {
            const eventDateObj = new Date(event.date);
            if (window.weatherManager) {
                const forecast = window.weatherManager.getForecastForDate(eventDateObj);
                if (forecast) {
                    event.weatherForecast = forecast;
                    console.log('Forecast attached to event:', forecast);
                } else {
                    console.log('No forecast available for date:', eventDateObj);
                    event.weatherForecast = { unavailable: true };
                }
            } else {
                console.warn('WeatherManager not initialized');
                event.weatherForecast = { unavailable: true };
            }
        } catch (err) {
            console.error('Error attaching forecast:', err);
            event.weatherForecast = { unavailable: true };
        }

        // Validate required fields
        if (!event.title || !event.date) {
            window.notificationManager?.show('Wypełnij wymagane pola', 'error');
            return;
        }

        if (editingId) {
            // Update existing event
            const index = this.events.findIndex(e => e.id === editingId);
            if (index !== -1) {
                this.events[index] = event;
            }
            delete form.dataset.editingId;
        } else {
            // Add new event
            this.events.push(event);
        }

        this.saveEventsToStorage();
        this.renderCalendar();
        this.closeEventModal();
        
        window.notificationManager?.show(
            editingId ? 'Wydarzenie zostało zaktualizowane' : 'Wydarzenie zostało dodane', 
            'success'
        );

        // Set reminder if requested
        if (event.reminder) {
            this.setEventReminder(event);
        }
    }

    showEventDetails(event) {
        // Create event details modal or expand inline
        const existingDetails = document.querySelector('.event-details-popup');
        if (existingDetails) {
            existingDetails.remove();
        }

        const detailsPopup = document.createElement('div');
        detailsPopup.className = 'event-details-popup';
        detailsPopup.innerHTML = `
            <div class="event-details-content">
                <div class="event-details-header">
                    <h4>${event.title}</h4>
                    <button class="close-details-btn">&times;</button>
                </div>
                <div class="event-details-body">
                    <div class="detail-row">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(event.date).toLocaleDateString('pl-PL')}</span>
                        ${event.time ? `<span>o ${event.time}</span>` : ''}
                    </div>
                    ${event.location ? `
                        <div class="detail-row">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${event.location}</span>
                        </div>
                    ` : ''}
                    ${event.description ? `
                        <div class="detail-row">
                            <i class="fas fa-info-circle"></i>
                            <span>${event.description}</span>
                        </div>
                    ` : ''}
                    ${event.weatherForecast ? `
                        <div class="detail-row">
                            <i class="fas fa-cloud-sun"></i>
                            <strong>Prognoza:</strong>
                            <div style="margin-top:6px;">
                                ${event.weatherForecast.unavailable ? 'Prognoza niedostępna' : `
                                    <span>${event.weatherForecast.tempMin}\u00b0 / ${event.weatherForecast.tempMax}\u00b0</span>
                                    <span style="margin-left:8px;">${event.weatherForecast.description || event.weatherForecast.condition}</span>
                                    <span style="margin-left:8px;">(${event.weatherForecast.pop}% opad)</span>
                                `}
                            </div>
                        </div>
                    ` : ''}
                    <div class="event-details-actions">
                        <button class="action-btn secondary" onclick="calendarManager.editEvent('${event.id}')">
                            <i class="fas fa-edit"></i> Edytuj
                        </button>
                        <button class="action-btn secondary" onclick="calendarManager.deleteEvent('${event.id}')">
                            <i class="fas fa-trash"></i> Usuń
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(detailsPopup);
        
        // Close button handler
        detailsPopup.querySelector('.close-details-btn').addEventListener('click', () => {
            detailsPopup.remove();
        });

        // Close on outside click
        detailsPopup.addEventListener('click', (e) => {
            if (e.target === detailsPopup) {
                detailsPopup.remove();
            }
        });
    }

    setEventReminder(event) {
        const eventDate = new Date(`${event.date}T${event.time || '09:00'}`);
        const now = new Date();
        const timeDiff = eventDate.getTime() - now.getTime();

        if (timeDiff > 0) {
            // Set reminder 15 minutes before the event
            const reminderTime = Math.max(timeDiff - (15 * 60 * 1000), 1000);
            
            setTimeout(() => {
                window.notificationManager?.show(
                    `Przypomnienie: ${event.title}`,
                    'info',
                    5000
                );
            }, reminderTime);
        }
    }

    addQuickAddSection() {
        const sidebar = document.querySelector('.events-sidebar');
        if (!sidebar) return;
        
        const addEventBtn = document.getElementById('add-event-btn');
        if (!addEventBtn) return;
        
        const quickAdd = document.createElement('div');
        quickAdd.className = 'quick-add-event';
        quickAdd.innerHTML = `
            <i class="fas fa-plus-circle"></i>
            <p>Dodaj szybko wydarzenie</p>
        `;
        
        quickAdd.addEventListener('click', () => {
            this.openEventModal();
        });

        sidebar.insertBefore(quickAdd, addEventBtn);
    }

    formatDateForInput(date) {
        return date.toISOString().split('T')[0];
    }

    saveEventsToStorage() {
        localStorage.setItem('calendar-events', JSON.stringify(this.events));
    }

    loadEvents() {
        const stored = localStorage.getItem('calendar-events');
        if (stored) {
            this.events = JSON.parse(stored);
        }
    }

    // Public methods for integration with other modules
    addWeatherEvent(location, weather, date) {
        const locationDetails = window.globeManager?.locationDetails;
        const fullLocationName = locationDetails ? 
            `${locationDetails.name}${locationDetails.state ? `, ${locationDetails.state}` : ''}${locationDetails.country ? `, ${locationDetails.country}` : ''}` : 
            location;

        const event = {
            id: `weather-${Date.now()}`,
            title: `Weather: ${weather.condition} in ${locationDetails?.name || location}`,
            date: this.formatDateForInput(new Date(date)),
            time: '12:00',
            location: fullLocationName,
            description: `Temperature: ${weather.temperature}°C\nCondition: ${weather.description}\n${locationDetails?.elevation ? `Elevation: ${locationDetails.elevation}m\n` : ''}Coordinates: ${locationDetails?.coordinates?.lat.toFixed(4) || 'N/A'}, ${locationDetails?.coordinates?.lon.toFixed(4) || 'N/A'}`,
            type: 'weather',
            created: new Date().toISOString(),
            weatherData: weather,
            locationData: locationDetails
        };

        // Attach forecast snapshot if manager has cached data
        try {
            if (window.weatherManager) {
                const f = window.weatherManager.getForecastForDate(new Date(event.date));
                event.weatherForecast = f ? f : { unavailable: true };
            }
        } catch (e) {
            // ignore
        }

        this.events.push(event);
        this.saveEventsToStorage();
        this.renderCalendar();
        
        return event.id;
    }

    exportEvents() {
        const dataStr = JSON.stringify(this.events, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `calendar-events-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        
        window.notificationManager?.show('Wydarzenia zostały wyeksportowane', 'success');
    }

    importEvents(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const importedEvents = JSON.parse(e.target.result);
                this.events = [...this.events, ...importedEvents];
                this.saveEventsToStorage();
                this.renderCalendar();
                window.notificationManager?.show('Wydarzenia zostały zaimportowane', 'success');
            } catch (error) {
                window.notificationManager?.show('Błąd podczas importu', 'error');
            }
        };
        reader.readAsText(file);
    }

    editEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return;

        // Populate form with event data
        document.getElementById('event-name').value = event.title;
        document.getElementById('event-date').value = event.date;
        document.getElementById('event-time').value = event.time || '';
        document.getElementById('event-location-input').value = event.location || '';
        document.getElementById('event-description').value = event.description || '';
        document.getElementById('event-reminder').checked = event.reminder || false;

        // Store event ID for updating
        document.getElementById('event-form').dataset.editingId = eventId;
        
        this.openEventModal();
    }

    deleteEvent(eventId) {
        if (confirm('Czy na pewno chcesz usunąć to wydarzenie?')) {
            this.events = this.events.filter(e => e.id !== eventId);
            this.saveEventsToStorage();
            this.renderCalendar();
            window.notificationManager?.show('Wydarzenie zostało usunięte', 'success');
        }
    }
}

// Initialize calendar when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.calendarManager = new CalendarManager();
});
