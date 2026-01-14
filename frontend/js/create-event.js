document.addEventListener('DOMContentLoaded', () => {
// =========================================
    // MOBILE MENU LOGIC (Toggle & Auto-Close)
    // =========================================
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a'); // Select all menu links

    if (mobileMenu && navLinks) {
        // 1. Toggle Menu on Hamburger Click
        mobileMenu.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileMenu.classList.toggle('active');
        });

        // 2. Auto-Close Menu When a Link is Clicked
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                // Remove active class to trigger smooth CSS transition close
                if (navLinks.classList.contains('active')) {
                    navLinks.classList.remove('active');
                    mobileMenu.classList.remove('active'); // Reset hamburger icon state
                }
            });
        });
    }

    // =========================================
    // FAQ LOGIC (Accordion Style - One Open at a Time)
    // =========================================
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if(question && answer) {
            question.addEventListener('click', () => {
                // 1. Close all other open items
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').style.maxHeight = null;
                    }
                });

                // 2. Toggle the clicked item
                item.classList.toggle('active');

                // 3. Handle smooth animation
                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                } else {
                    answer.style.maxHeight = null;
                }
            });
        }
    });

    const eventForm = document.getElementById('eventForm');
    if (eventForm) {
         eventForm.addEventListener('reset', function() {
            setTimeout(() => {
                const imgPrev = document.getElementById('imagePreview');
                const pdfPrev = document.getElementById('brochurePreview');
                if (imgPrev) imgPrev.innerHTML = '';
                if (pdfPrev) pdfPrev.innerHTML = '';
            }, 0);
        });
    }

    // =========================================
    // 2. HELPER FUNCTIONS (Date & Time)
    // =========================================
    const getMonthName = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return 'Jan'; 
        return date.toLocaleString('default', { month: 'short' });
    };

    const getDayNumber = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '01';
        return date.getDate();
    };

    const getYear = (dateStr) => {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '2026';
        return date.getFullYear();
    };

    const formatTime12Hour = (timeStr) => {
        if (!timeStr) return 'TBD';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        if (isNaN(h)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // =========================================
    // 3. CALENDAR LOGIC (State & URL)
    // =========================================
    
    // --- State Management (LocalStorage) ---
    const getCalendarEvents = () => {
        const stored = localStorage.getItem('myCalendarEvents');
        return stored ? JSON.parse(stored) : [];
    };

    const isEventInCalendar = (eventName) => {
        return getCalendarEvents().includes(eventName);
    };

    const toggleCalendarEvent = (eventName) => {
        let events = getCalendarEvents();
        if (events.includes(eventName)) {
            events = events.filter(name => name !== eventName);
        } else {
            events.push(eventName);
        }
        localStorage.setItem('myCalendarEvents', JSON.stringify(events));
        return events.includes(eventName); // return new state
    };

    // --- Google Calendar URL Generator ---
    const generateCalendarUrl = (event) => {
        try {
            const dateStr = event.date;
            const timeStr = event.time || '09:00';
            const combinedString = `${dateStr.split('T')[0]}T${timeStr}:00`;
            const dateObj = new Date(combinedString);
            
            if (isNaN(dateObj.getTime())) return '#';

            const pad = (n) => n < 10 ? '0' + n : n;
            const startDateTime = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}00`;
            
            // Assume 1 hour duration
            dateObj.setHours(dateObj.getHours() + 1);
            const endDateTime = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}00`;

            const title = encodeURIComponent(event.eventName);
            const details = encodeURIComponent(`Organized by ${event.organizationName}. Contact: ${event.organizerEmail}`);
            const location = encodeURIComponent(`${event.address}, ${event.city}`);

            return `https://www.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${startDateTime}/${endDateTime}&ctz=Asia/Kolkata`;
        } catch (e) {
            console.error("Calendar URL error", e);
            return '#';
        }
    };

    // =========================================
    // 4. MODAL LOGIC (Image Zoom)
    // =========================================
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('fullImage');
    const captionText = document.getElementById('caption');
    
    // FIX: Match the class in create-event.html
    const closeBtn = document.querySelector('.close-modal');

    if (closeBtn) {
        closeBtn.onclick = function() {
            if (modal) modal.style.display = "none";
        }
    }
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    // =========================================
    // 5. CARD CREATION FUNCTION (UPDATED)
    // =========================================
    // Helper: normalize server file paths to web paths under /uploads
    const toWebPath = (p) => {
        if (!p || typeof p !== 'string') return null;
        let s = p.replace(/\\/g, '/');
        const idx = s.toLowerCase().lastIndexOf('/uploads/');
        if (idx >= 0) s = s.substring(idx);
        if (!s.startsWith('http') && !s.startsWith('/')) s = '/' + s;
        return s;
    };

    const createEventCard = (event) => {
        const card = document.createElement('div');
        card.className = 'event-card';

        // Path Normalization
        let imgSrc = toWebPath(event.imagePath) || 'https://placehold.co/400x250?text=No+Image';
        let pdfSrc = toWebPath(event.brochurePath) || '#';

        // URL Generation
        const calendarUrl = generateCalendarUrl(event);
        const mapsLink = `https://maps.google.com/?q=${encodeURIComponent(event.address)}`;
        
        // Category Formatting
        let rawCategory = event.category || 'Other';
        let displayCategory = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1).toLowerCase();
        if (displayCategory === 'Student') displayCategory = 'Students';
        if (displayCategory === 'Ngo') displayCategory = 'NGO/Org';

        // --- HTML STRUCTURE ---
        // Added: <button class="delete-btn"> in the .card-image container
        card.innerHTML = `
            <div class="card-image">
                <button class="delete-btn" title="Delete Event">
                    <i class="fas fa-trash-alt"></i>
                </button>
                <img src="${imgSrc}" alt="${event.eventName}" onerror="this.onerror=null;this.src='https://placehold.co/400x250?text=Image+Not+Found'">
                <span class="badge" style="text-transform: none;">${displayCategory}</span>
                <button class="zoom-btn"><i class="fas fa-expand"></i></button>
            </div>
            <div class="card-content">
                <div class="card-header-row">
                    <h3>${event.eventName}</h3>
                    <a href="${pdfSrc}" download class="brochure-icon" title="Download Brochure" target="_blank">
                        <i class="fas fa-file-pdf"></i>
                    </a>
                </div>
                <div class="card-org">Organized by: <strong>${event.organizationName}</strong></div>
                <p class="date">
                    ${getMonthName(event.date)} ${getDayNumber(event.date)}, ${getYear(event.date)} • ${formatTime12Hour(event.time)}
                </p>
                <div class="card-contact">
                    <h4>Contact Details</h4>
                    <p><i class="fas fa-envelope"></i> ${event.organizerEmail}</p>
                    <p><i class="fas fa-phone"></i> ${event.mobileNumber}</p>
                </div>
                <div class="card-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <a href="${mapsLink}" target="_blank">${event.address}</a>
                </div>
                <div class="card-actions">
                    <button class="register-btn" onclick="window.open('${event.googleFormLink}', '_blank')">
                        Register Now
                    </button>
                    <button class="calendar-btn" data-event="${event.eventName}" data-url="${calendarUrl}">
                        <i class="far fa-calendar-plus"></i> Add to Calendar
                    </button>
                </div>
            </div>
        `;

        // --- EVENT LISTENERS ---

        // 1. DELETE LOGIC (New)
        const deleteBtn = card.querySelector('.delete-btn');
        deleteBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation(); // Prevent triggering other card clicks

            const isConfirmed = confirm(`Are you sure you want to delete "${event.eventName}"? This cannot be undone.`);
            
            if (isConfirmed) {
                try {
                    const response = await fetch(`/api/events/${event._id}`, {
                        method: 'DELETE'
                    });

                    if (response.ok) {
                        // Success: Remove card from UI instantly
                        card.style.transition = "all 0.5s ease";
                        card.style.opacity = "0";
                        card.style.transform = "scale(0.9)";
                        setTimeout(() => card.remove(), 500);
                        
                        // Optional: Check if grid is empty to show "No Results" msg
                        // (You can add logic here if needed, but UI updates mostly handle themselves)
                    } else {
                        const err = await response.json();
                        alert('Error: ' + err.message);
                    }
                } catch (error) {
                    console.error('Delete failed', error);
                    alert('Failed to connect to server.');
                }
            }
        });

        // 2. Zoom Button
        const zoomBtn = card.querySelector('.zoom-btn');
        const img = card.querySelector('.card-image img');
        if (zoomBtn && modal && modalImg) {
             zoomBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                modal.style.display = "block";
                modalImg.src = img.src;
                if(captionText) captionText.innerHTML = event.eventName;
            });
        }

        // 3. Calendar Button Logic
        const calBtn = card.querySelector('.calendar-btn');
        calBtn.addEventListener('click', function(e) {
            e.preventDefault(); 
            window.open(calendarUrl, '_blank');
        });

        return card;
    };

    // =========================================
    // 6. FETCH AND RENDER LOGIC
    // =========================================
    const createdEventsGrid = document.getElementById('createdEventsGrid');
    
    // FIX: Match the ID from create-event.html
    const noResultsMessage = document.getElementById('noResults');

    const fetchUserEvents = async () => {
        try {
            const response = await fetch('/api/my-events');
            
            if (response.status === 401 || response.status === 403) {
                 // User not logged in
                 return;
            }

            if (!response.ok) throw new Error('Failed to fetch events');

            const events = await response.json();

            // Clear loading/existing state
            createdEventsGrid.innerHTML = ''; 

            if (events.length === 0) {
                if (noResultsMessage) noResultsMessage.style.display = 'block';
            } else {
                if (noResultsMessage) noResultsMessage.style.display = 'none';
                
                events.forEach(event => {
                    const card = createEventCard(event);
                    createdEventsGrid.appendChild(card);
                });
            }
        } catch (error) {
            console.error('Error loading user events:', error);
            if (createdEventsGrid) {
                createdEventsGrid.innerHTML = '<p style="color: red; text-align:center; grid-column: 1/-1;">Error loading your events. Please check server connection.</p>';
            }
        }
    };

    if (createdEventsGrid) {
        fetchUserEvents();
    }
});
