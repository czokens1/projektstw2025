class EventsManager {
    constructor() {
        this.discoveredEvents = [];
        this.currentLocation = null;
        this.bindEvents();
    }

    bindEvents() {
        document.addEventListener('DOMContentLoaded', () => {
            const searchBtn = document.getElementById('search-events');
            const locationInput = document.getElementById('event-location');
            const categorySelect = document.getElementById('event-category');

            if (searchBtn) {
                searchBtn.addEventListener('click', () => {
                    this.searchEvents();
                });
            }

            if (locationInput) {
                locationInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.searchEvents();
                    }
                });
            }
        });
    }

    searchEvents() {
        const location = document.getElementById('event-location').value;
        const category = document.getElementById('event-category').value;

        if (!location) {
            window.notificationManager?.show('Please enter a location', 'warning');
            return;
        }

        window.app?.showLoading(true);

        // Simulate AI event discovery
        setTimeout(() => {
            this.generateMockEvents(location, category);
            window.app?.showLoading(false);
        }, 1500);
    }

    generateMockEvents(location, category) {
        const mockEvents = [
            {
                id: 'evt-1',
                title: 'Weather Alert: Heavy Rain Expected',
                description: 'Meteorological services predict heavy rainfall in the coming days.',
                category: 'weather',
                date: this.getRandomFutureDate(),
                location: location,
                confidence: 0.85,
                source: 'Weather Service'
            },
            {
                id: 'evt-2',
                title: 'Outdoor Music Festival',
                description: 'Annual summer music festival featuring local and international artists.',
                category: 'festivals',
                date: this.getRandomFutureDate(),
                location: location,
                confidence: 0.72,
                source: 'Event Discovery AI'
            },
            {
                id: 'evt-3',
                title: 'Marathon Race',
                description: 'City marathon open for registration. Perfect weather conditions expected.',
                category: 'sports',
                date: this.getRandomFutureDate(),
                location: location,
                confidence: 0.68,
                source: 'Sports Calendar'
            },
            {
                id: 'evt-4',
                title: 'Art Exhibition Opening',
                description: 'Contemporary art exhibition featuring works by local artists.',
                category: 'cultural',
                date: this.getRandomFutureDate(),
                location: location,
                confidence: 0.79,
                source: 'Cultural Events'
            },
            {
                id: 'evt-5',
                title: 'Hiking Group Meetup',
                description: 'Weekly hiking group exploring nearby trails and nature spots.',
                category: 'outdoor',
                date: this.getRandomFutureDate(),
                location: location,
                confidence: 0.91,
                source: 'Community Groups'
            }
        ];

        // Filter by category if selected
        let filteredEvents = mockEvents;
        if (category) {
            filteredEvents = mockEvents.filter(event => event.category === category);
        }

        this.discoveredEvents = filteredEvents;
        this.renderDiscoveredEvents();

        window.notificationManager?.show(
            `Found ${filteredEvents.length} events in ${location}`,
            'success'
        );
    }

    getRandomFutureDate() {
        const today = new Date();
        const futureDate = new Date(today);
        futureDate.setDate(today.getDate() + Math.floor(Math.random() * 30) + 1);
        return futureDate.toISOString().split('T')[0];
    }

    renderDiscoveredEvents() {
        const container = document.getElementById('discovered-events');
        if (!container) return;

        container.innerHTML = '';

        if (this.discoveredEvents.length === 0) {
            container.innerHTML = `
                <div class="events-empty">
                    <i class="fas fa-search"></i>
                    <h3>No events found</h3>
                    <p>Try searching for a different location or category.</p>
                </div>
            `;
            return;
        }

        this.discoveredEvents.forEach(event => {
            const eventElement = this.createEventCard(event);
            container.appendChild(eventElement);
        });
    }

    createEventCard(event) {
        const card = document.createElement('div');
        card.className = 'discovered-event-card';
        
        const confidenceClass = this.getConfidenceClass(event.confidence);
        const categoryIcon = this.getCategoryIcon(event.category);
        
        card.innerHTML = `
            <div class="event-card-header">
                <div class="event-category">
                    <i class="${categoryIcon}"></i>
                    <span>${event.category}</span>
                </div>
                <div class="event-confidence ${confidenceClass}">
                    ${Math.round(event.confidence * 100)}% match
                </div>
            </div>
            <div class="event-card-body">
                <h4 class="event-card-title">${event.title}</h4>
                <p class="event-card-description">${event.description}</p>
                <div class="event-card-meta">
                    <div class="event-meta-item">
                        <i class="fas fa-calendar"></i>
                        <span>${new Date(event.date).toLocaleDateString('pl-PL')}</span>
                    </div>
                    <div class="event-meta-item">
                        <i class="fas fa-map-marker-alt"></i>
                        <span>${event.location}</span>
                    </div>
                    <div class="event-meta-item">
                        <i class="fas fa-info-circle"></i>
                        <span>Source: ${event.source}</span>
                    </div>
                </div>
            </div>
            <div class="event-card-actions">
                <button class="action-btn secondary" onclick="eventsManager.addToCalendar('${event.id}')">
                    <i class="fas fa-calendar-plus"></i>
                    Add to Calendar
                </button>
                <button class="action-btn primary" onclick="eventsManager.viewDetails('${event.id}')">
                    <i class="fas fa-eye"></i>
                    View Details
                </button>
            </div>
        `;

        return card;
    }

    getCategoryIcon(category) {
        const icons = {
            'weather': 'fas fa-cloud-sun',
            'outdoor': 'fas fa-mountain',
            'festivals': 'fas fa-music',
            'sports': 'fas fa-running',
            'cultural': 'fas fa-palette'
        };
        return icons[category] || 'fas fa-calendar';
    }

    getConfidenceClass(confidence) {
        if (confidence >= 0.8) return 'high-confidence';
        if (confidence >= 0.6) return 'medium-confidence';
        return 'low-confidence';
    }

    addToCalendar(eventId) {
        const event = this.discoveredEvents.find(e => e.id === eventId);
        if (!event) return;

        if (window.calendarManager) {
            const calendarEvent = {
                title: event.title,
                date: event.date,
                location: event.location,
                description: event.description,
                type: 'discovered'
            };

            // Switch to calendar tab and add event
            window.app?.switchTab('calendar');
            
            setTimeout(() => {
                const modal = document.getElementById('event-modal');
                if (modal) {
                    // Pre-fill form
                    document.getElementById('event-name').value = calendarEvent.title;
                    document.getElementById('event-date').value = calendarEvent.date;
                    document.getElementById('event-location-input').value = calendarEvent.location;
                    document.getElementById('event-description').value = calendarEvent.description;
                    
                    modal.classList.add('show');
                    document.body.style.overflow = 'hidden';
                }
            }, 300);
        }

        window.notificationManager?.show('Event details copied to calendar form', 'success');
    }

    viewDetails(eventId) {
        const event = this.discoveredEvents.find(e => e.id === eventId);
        if (!event) return;

        // Create details modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${event.title}</h3>
                    <button class="close-btn">&times;</button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="detail-row">
                        <strong>Category:</strong> ${event.category}
                    </div>
                    <div class="detail-row">
                        <strong>Date:</strong> ${new Date(event.date).toLocaleDateString('pl-PL')}
                    </div>
                    <div class="detail-row">
                        <strong>Location:</strong> ${event.location}
                    </div>
                    <div class="detail-row">
                        <strong>Confidence:</strong> ${Math.round(event.confidence * 100)}%
                    </div>
                    <div class="detail-row">
                        <strong>Source:</strong> ${event.source}
                    </div>
                    <div class="detail-row" style="margin-top: 1rem;">
                        <strong>Description:</strong><br>
                        ${event.description}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Close handlers
        const closeBtn = modal.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => {
            modal.remove();
            document.body.style.overflow = 'auto';
        });

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });
    }

    updateLocation(location) {
        this.currentLocation = location;
        const locationInput = document.getElementById('event-location');
        if (locationInput && location) {
            locationInput.value = `${location.lat.toFixed(4)}, ${location.lon.toFixed(4)}`;
        }
    }
}

// Add event card styles
const eventCardStyles = document.createElement('style');
eventCardStyles.textContent = `
    .discovered-event-card {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        margin-bottom: 1.5rem;
        overflow: hidden;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .discovered-event-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .event-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
    }

    .event-category {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
        font-weight: 500;
        text-transform: capitalize;
    }

    .event-confidence {
        padding: 0.25rem 0.75rem;
        border-radius: 20px;
        font-size: 0.875rem;
        font-weight: 600;
    }

    .high-confidence {
        background: #dcfce7;
        color: #166534;
    }

    .medium-confidence {
        background: #fef3c7;
        color: #92400e;
    }

    .low-confidence {
        background: #fee2e2;
        color: #dc2626;
    }

    .event-card-body {
        padding: 1.5rem;
    }

    .event-card-title {
        margin: 0 0 0.75rem 0;
        color: #1e293b;
        font-size: 1.25rem;
        font-weight: 600;
    }

    .event-card-description {
        margin: 0 0 1.25rem 0;
        color: #64748b;
        line-height: 1.6;
    }

    .event-card-meta {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .event-meta-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        color: #64748b;
        font-size: 0.875rem;
    }

    .event-meta-item i {
        color: #3b82f6;
        width: 16px;
    }

    .event-card-actions {
        display: flex;
        gap: 0.75rem;
        padding: 1rem 1.5rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
    }

    .events-empty {
        text-align: center;
        padding: 4rem 2rem;
        color: #64748b;
    }

    .events-empty i {
        font-size: 3rem;
        margin-bottom: 1rem;
        opacity: 0.5;
    }

    .events-empty h3 {
        margin: 0 0 0.5rem 0;
        color: #1e293b;
    }

    .detail-row {
        margin-bottom: 0.75rem;
        color: #64748b;
    }

    @media (max-width: 768px) {
        .event-card-actions {
            flex-direction: column;
        }
    }
`;
document.head.appendChild(eventCardStyles);

// Initialize events manager
document.addEventListener('DOMContentLoaded', () => {
    window.eventsManager = new EventsManager();
});
