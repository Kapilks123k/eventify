document.addEventListener('DOMContentLoaded', async () => {
    // =========================================
    // 1. SELECTORS & VARIABLES
    // =========================================
    const filterBtns = document.querySelectorAll('.filter-btn');
    const searchInput = document.getElementById('searchInput'); 

    // =========================================
    // MOBILE NAVIGATION LOGIC (Toggle & Auto-Close)
    // =========================================
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a'); // Select all menu links

    if (hamburger && navLinks) {
        // 1. Toggle Menu on Hamburger Click
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('nav-active');
        });

        // 2. Auto-Close Menu When a Link is Clicked
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if (navLinks.classList.contains('nav-active')) {
                    navLinks.classList.remove('nav-active');
                }
            });
        });
    }
    const locationSelect = document.getElementById('location-select');
    const eventList = document.getElementById('eventsGrid');
    const noEventsMessage = document.getElementById('noResults');

    // Context Variables
    let pendingRegistrationLink = null;
    let pendingCard = null;
    let pendingEventName = null;

    // =========================================
    // FAQ LOGIC (Replicated from Landing Page)
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
                
                // 3. Handle animation
                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                } else {
                    answer.style.maxHeight = null;
                }
            });
        }
    });
    
    // NEW: Server-backed source of truth
    let userRegistrations = new Set(); 
    let isLoggedIn = false;

    // =========================================
    // 2. HELPER: STATE MANAGEMENT (UPDATED)
    // =========================================
    
    // Fetch user's history from server on load
    async function syncRegistrationState() {
        try {
            const authRes = await fetch('/api/auth-status');
            const authData = await authRes.json();
            isLoggedIn = authData.isAuthenticated;

            if (isLoggedIn) {
                const regRes = await fetch('/api/user-registrations');
                const regData = await regRes.json();
                userRegistrations = new Set(regData.registeredEvents);
            } else {
                userRegistrations.clear();
            }
        } catch (e) {
            console.error("Sync failed:", e);
        }
    }
    // --- NEW: MISSING DATE/TIME HELPERS ---
    const getMonthName = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? 'Jan' : date.toLocaleString('default', { month: 'short' });
    };

    const getDayNumber = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? '01' : date.getDate();
    };

    const getYear = (dateStr) => {
        const date = new Date(dateStr);
        return isNaN(date) ? '2026' : date.getFullYear();
    };

    const formatTime12Hour = (timeStr) => {
        if (!timeStr) return 'TBD';
        const [hours, minutes] = timeStr.split(':');
        const h = parseInt(hours, 10);
        const ampm = h >= 12 ? 'PM' : 'AM';
        const h12 = h % 12 || 12;
        return `${h12}:${minutes} ${ampm}`;
    };

    // Calendar Helpers (LocalStorage is fine for Calendar as it's device-specific preference)
    const getCalendarEvents = () => {
        const stored = localStorage.getItem('myCalendarEvents');
        return stored ? JSON.parse(stored) : [];
    };
    const addCalendarEvent = (eventName) => {
        const events = getCalendarEvents();
        if (!events.includes(eventName)) {
            events.push(eventName);
            localStorage.setItem('myCalendarEvents', JSON.stringify(events));
        }
    };
    const removeCalendarEvent = (eventName) => {
        let events = getCalendarEvents();
        events = events.filter(name => name !== eventName);
        localStorage.setItem('myCalendarEvents', JSON.stringify(events));
    };
    const isEventInCalendar = (eventName) => getCalendarEvents().includes(eventName);

    // =========================================
    // 3. LOGIC: GOOGLE CALENDAR
    // =========================================
    // ... [Keep existing formatToGoogleDate & addToGoogleCalendar functions exactly as they were] ...
    const formatToGoogleDate = (dateStr, timeStr) => {
        try {
            const combinedString = `${dateStr} ${timeStr}`;
            const dateObj = new Date(combinedString);
            if (isNaN(dateObj.getTime())) return null;
            const pad = (n) => n < 10 ? '0' + n : n;
            return `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}00`;
        } catch (e) { return null; }
    };

    const addToGoogleCalendar = (card) => {
        const title = card.querySelector('h3') ? card.querySelector('h3').innerText.trim() : 'Event';
        const dateLine = card.querySelector('.date') ? card.querySelector('.date').innerText : '';
        
        let dateStr = '', timeStr = '09:00 AM';
        
        // Handle different date formats
        if (dateLine.includes('•')) {
            [dateStr, timeStr] = dateLine.split('•').map(s => s.trim());
        } else if (dateLine.includes(',')) {
            // Handle format like "Aug 24, 2025 • 6:00 PM"
            const parts = dateLine.split(',');
            if (parts.length >= 2) {
                const monthDay = parts[0].trim();
                const yearTime = parts[1].trim();
                if (yearTime.includes('•')) {
                    const [year, time] = yearTime.split('•').map(s => s.trim());
                    dateStr = `${monthDay}, ${year}`;
                    timeStr = time;
                } else {
                    dateStr = dateLine;
                }
            }
        } else {
            dateStr = dateLine;
        }
        
        // Convert to proper date format for Google Calendar
        let startDateTime, endDateTime;
        try {
            // Try parsing the date string
            const dateObj = new Date(dateStr + ' ' + timeStr);
            if (isNaN(dateObj.getTime())) {
                // Fallback: try different parsing
                const fallbackDate = new Date(dateStr);
                if (!isNaN(fallbackDate.getTime())) {
                    // Set time manually
                    const [hours, minutes] = timeStr.replace(/[AP]M/i, '').split(':').map(s => parseInt(s.trim()));
                    const isPM = timeStr.toUpperCase().includes('PM');
                    fallbackDate.setHours(isPM && hours !== 12 ? hours + 12 : (hours === 12 && !isPM ? 0 : hours));
                    fallbackDate.setMinutes(minutes || 0);
                    dateObj = fallbackDate;
                }
            }
            
            if (isNaN(dateObj.getTime())) {
                alert("Could not parse event date: " + dateLine);
                return;
            }
            
            const pad = (n) => n < 10 ? '0' + n : n;
            startDateTime = `${dateObj.getFullYear()}${pad(dateObj.getMonth() + 1)}${pad(dateObj.getDate())}T${pad(dateObj.getHours())}${pad(dateObj.getMinutes())}00`;
        } catch (e) {
            alert("Could not read event date.");
            return;
        }
        
        // End time (1 hour later)
        const endDate = new Date(startDateTime.replace(/T(\d{6})/, (match, time) => {
            const hours = parseInt(time.substring(0, 2));
            const minutes = time.substring(2, 4);
            const seconds = time.substring(4, 6);
            const endHours = (hours + 1) % 24;
            return `T${String(endHours).padStart(2, '0')}${minutes}${seconds}`;
        }));
        
        const pad = (n) => n < 10 ? '0' + n : n;
        const endDateTime = `${endDate.getFullYear()}${pad(endDate.getMonth() + 1)}${pad(endDate.getDate())}T${pad(endDate.getHours())}${pad(endDate.getMinutes())}00`;
        
        const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startDateTime}/${endDateTime}&ctz=Asia/Kolkata`;
        window.open(calendarUrl, '_blank');
    };

    // =========================================
    // 4. CORE LOGIC: REGISTER & MODAL (FIXED)
    // =========================================

    // --- Helper: UI Update & Backend Save ---
    async function proceedWithRegistration(card, eventName, link) {
        const btn = card.querySelector('.register-btn');

        // If already registered, we treat it as persistent (no toggle OFF in this flow)
        if (userRegistrations.has(eventName)) {
            // Already registered visual state
             if (link) window.open(link, '_blank'); // Just open link again if they click
             return;
        }

        // 1. Optimistic UI Update
        btn.textContent = "Registered";
        btn.style.backgroundColor = "#6c757d"; 
        btn.style.color = "#fff";
        card.classList.add('is-registered');
        
        // 2. Open Link (FIXED: Alert Removed)
        if (link) {
            window.open(link, '_blank');
        } else {
            // Alert removed as requested. 
            // Only logs to console if a link is missing, preventing user interruption.
            console.warn("No registration link found for event:", eventName);
        }

        // 3. Persist to Backend
        try {
            await fetch('/api/register-event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventName })
            });
            userRegistrations.add(eventName); // Update local set
        } catch (err) {
            console.error("Failed to save registration", err);
            // Revert UI on error if needed, but keeping it simple for now
        }

        filterAllEvents();
    }

    // --- MAIN HANDLER: Register Button Click ---
    async function handleRegisterClick(e, card, eventName, link) {
        if (e) e.preventDefault();
        
        // Check Auth Status dynamically just in case session expired
        const authRes = await fetch('/api/auth-status');
        const authData = await authRes.json();

        if (authData.isAuthenticated) {
            proceedWithRegistration(card, eventName, link);
        } else {
            // Store intent and show modal
            pendingRegistrationLink = link;
            pendingCard = card;
            pendingEventName = eventName;
            
            const modal = document.getElementById('loginModal');
            if(modal) modal.style.display = 'block';
        }
    }

    // --- MAIN HANDLER: Calendar Button Click (Preserved) ---
    function handleCalendarClick(e, card, eventName) {
        if (e) e.preventDefault();
        const btn = card.querySelector('.calendar-btn');

        if (isEventInCalendar(eventName)) {
            removeCalendarEvent(eventName);
            btn.innerHTML = '<i class="far fa-calendar-plus"></i> Add to Calendar';
            btn.style.backgroundColor = "#fff"; 
            btn.style.color = "#555";
            btn.style.borderColor = "#ccc";
        } else {
            addToGoogleCalendar(card);
            addCalendarEvent(eventName);
            btn.innerHTML = '<i class="fas fa-check"></i> Added';
            btn.style.backgroundColor = "#27ae60"; 
            btn.style.color = "#fff";
            btn.style.borderColor = "#27ae60";
        }
    }

    // =========================================
    // 5. CARD STATE & CREATION
    // =========================================
    
    // Updated to use server-synced Set
    const updateCardInitialState = (card, eventName) => {
        const regBtn = card.querySelector('.register-btn');
        
        // CHECK AGAINST SERVER DATA
        if (userRegistrations.has(eventName)) {
            card.classList.add('is-registered');
            if (regBtn) {
                regBtn.textContent = "Registered";
                regBtn.style.backgroundColor = "#6c757d";
                regBtn.style.color = "#fff";
            }
        } else {
            card.classList.remove('is-registered');
            if (regBtn) {
                regBtn.textContent = "Register";
                regBtn.style.backgroundColor = "#32CD32";
                regBtn.style.color = "#fff";
            }
        }

        // Calendar check remains LocalStorage
        const calBtn = card.querySelector('.calendar-btn');
        if (calBtn) {
            if (isEventInCalendar(eventName)) {
                calBtn.innerHTML = '<i class="fas fa-check"></i> Added';
                calBtn.style.backgroundColor = "#27ae60";
                calBtn.style.color = "#fff";
                calBtn.style.borderColor = "#27ae60";
            } else {
                calBtn.innerHTML = '<i class="far fa-calendar-plus"></i> Add to Calendar';
                calBtn.style.backgroundColor = "#fff";
                calBtn.style.color = "#555";
                calBtn.style.borderColor = "#ccc";
            }
        }
    };

    // Initialize Static HTML Cards
    function initializeStaticCards() {
        const allCards = document.querySelectorAll('.event-card:not(.dynamic-card)');
        
        allCards.forEach(card => {
            // --- NEW: CATEGORIZATION FIX FOR DEMO EVENTS ---
            // Read the badge text (e.g., "Exhibition", "Students") and set it as data-category
            const badge = card.querySelector('.badge');
            const categoryText = badge ? badge.textContent.trim() : 'Other';
            card.setAttribute('data-category', categoryText);

            // Also ensure data-location is set for search
            const locationLink = card.querySelector('.card-location a');
            if (locationLink && !card.hasAttribute('data-location')) {
                card.setAttribute('data-location', locationLink.textContent.trim());
            }
            // -----------------------------------------------

            const title = card.querySelector('h3').textContent.trim();
            updateCardInitialState(card, title);
            
            // Re-attach Register Listener
            const registerBtn = card.querySelector('.register-btn');
            if(registerBtn) {
                registerBtn.replaceWith(registerBtn.cloneNode(true)); // Clear old listeners
                const newRegBtn = card.querySelector('.register-btn');
                // Get the link from the HTML attribute you added
                const link = newRegBtn.getAttribute('data-link'); 
                
                newRegBtn.addEventListener('click', (e) => {
                    // Pass the 'link' variable instead of null
                    handleRegisterClick(e, card, title, link); 
                });
            }

            // Re-attach Calendar Listener
            const calendarBtn = card.querySelector('.calendar-btn');
            if(calendarBtn) {
                calendarBtn.replaceWith(calendarBtn.cloneNode(true));
                const newCalBtn = card.querySelector('.calendar-btn');
                
                newCalBtn.addEventListener('click', (e) => {
                    handleCalendarClick(e, card, title);
                });
            }
            
            // Zoom Listener
            const zoomBtn = card.querySelector('.zoom-btn');
            if(zoomBtn) {
                 zoomBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const img = card.querySelector('.card-image img');
                    const modal = document.getElementById('imageModal');
                    const fullImage = document.getElementById('fullImage');
                    const caption = document.getElementById('caption');
                    if(modal && fullImage && img) {
                        modal.style.display = "block";
                        fullImage.src = img.src;
                        caption.textContent = title;
                    }
                });
            }

            // Ensure unified structure elements for static/demo cards
            // 1) Brochure icon in header
            const demoPdf = '../assets/demo/Demo%20Brochure.pdf';
            const headerRow = card.querySelector('.card-header-row');
            let brochure = headerRow ? headerRow.querySelector('.brochure-icon') : null;
            if (!brochure && headerRow) {
                brochure = document.createElement('a');
                brochure.className = 'brochure-icon';
                headerRow.appendChild(brochure);
            }
            if (brochure) {
                brochure.href = demoPdf;
                brochure.target = '_blank';
                brochure.download = '';
                brochure.title = 'Download Brochure';
                brochure.innerHTML = '<i class="fas fa-file-pdf"></i>';
            }

            // 2) Contact section
            if (!card.querySelector('.card-contact')) {
                const dateEl = card.querySelector('.date');
                const contactHtml = `
                    <div class="card-contact">
                        <h4>Contact Details</h4>
                        <p><i class="fas fa-envelope"></i> N/A</p>
                        <p><i class="fas fa-phone"></i> N/A</p>
                    </div>
                `;
                if (dateEl) {
                    dateEl.insertAdjacentHTML('afterend', contactHtml);
                } else {
                    const content = card.querySelector('.card-content');
                    if (content) content.insertAdjacentHTML('beforeend', contactHtml);
                }
            }

            // 3) Delete button intentionally omitted on Find Events page
            // (No delete controls on Find page — only view/register)
        });
    }

    // Helper: normalize server file paths to web paths under /uploads
    function toWebPath(p) {
        if (!p) return null;
        if (typeof p !== 'string') return null;
        // Replace backslashes
        let s = p.replace(/\\/g, '/');
        // If absolute path contains /uploads/, cut from there
        const idx = s.toLowerCase().lastIndexOf('/uploads/');
        if (idx >= 0) {
            s = s.substring(idx);
        }
        // If still relative and not http(s), ensure leading slash
        if (!s.startsWith('http') && !s.startsWith('/')) {
            s = '/' + s;
        }
        return s;
    }

    // Create Dynamic Event Card (HTML Template)
    const createEventCard = (event) => {
        const card = document.createElement('div');
        card.className = 'event-card dynamic-card'; 

        // ============================================================
        // FIX: NORMALIZE CATEGORY NAMES
        // The DB might send "Student", but your button expects "Students".
        // We fix this here so the Filter logic works correctly.
        // ============================================================
        let rawCategory = (event.category || 'Other').trim();
        let displayCategory = rawCategory;

        // Check for singular "Student" and convert to "Students"
        if (rawCategory.toLowerCase() === 'student') {
            displayCategory = 'Students';
        }

        if (rawCategory.toLowerCase().includes('social')) {
            displayCategory = 'Social';
        }
        
        // Optional: specific fix if your DB sends "NGO" instead of "NGO/Org"
        if (rawCategory.toLowerCase() === 'ngo') {
            displayCategory = 'NGO/Org';
        }

        // Set the attribute that the filter function reads
        card.setAttribute('data-category', displayCategory);
        card.setAttribute('data-location', event.city ? event.city.trim() : 'Unknown');

        // Normalize media paths to be web-accessible
        let imgSrc = toWebPath(event.imagePath) || 'https://via.placeholder.com/400x200?text=Event+Image';
        let pdfSrc = toWebPath(event.brochurePath) || '#';

        card.innerHTML = `
            <div class="card-image">
                <img src="${imgSrc}" alt="${event.eventName}" onerror="this.src='https://via.placeholder.com/400x200?text=Image+Not+Found'">
                <span class="badge" style="text-transform: none;">${displayCategory}</span>
                <button class="zoom-btn"><i class="fas fa-expand"></i></button>
            </div>
            <div class="card-content">
                <div class="card-header-row">
                    <h3>${event.eventName}</h3>
                    <a href="${pdfSrc}" download class="brochure-icon" title="Download Brochure" target="_blank"><i class="fas fa-file-pdf"></i></a>
                </div>
                <div class="card-org">Organized by: <strong>${event.organizationName || 'Unknown'}</strong></div>
                <p class="date">${getMonthName(event.date)} ${getDayNumber(event.date)}, ${getYear(event.date)} • ${formatTime12Hour(event.time)}</p>
                <div class="card-contact">
                    <h4>Contact Details</h4>
                    <p><i class="fas fa-envelope"></i> ${event.organizerEmail || 'N/A'}</p>
                    <p><i class="fas fa-phone"></i> ${event.mobileNumber || 'N/A'}</p>
                </div>
                <div class="card-location">
                    <i class="fas fa-map-marker-alt"></i>
                    <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address + ' ' + event.city)}" target="_blank">${event.address}, ${event.city}</a>
                </div>
                <div class="card-actions">
                    <button class="register-btn db-register-btn" data-link="${event.googleFormLink}">Register</button>
                    <button class="calendar-btn db-calendar-btn">
                        <i class="far fa-calendar-plus"></i> Add to Calendar
                    </button>
                </div>
            </div>
        `;

        // Set Initial State using Server Data
        updateCardInitialState(card, event.eventName);

        // Register Listener
        const registerBtn = card.querySelector('.db-register-btn');
        registerBtn.addEventListener('click', function(e) {
            const link = this.getAttribute('data-link');
            handleRegisterClick(e, card, event.eventName, link);
        });

        // Calendar Listener
        const calendarBtn = card.querySelector('.db-calendar-btn');
        calendarBtn.addEventListener('click', function(e) {
            handleCalendarClick(e, card, event.eventName);
        });

        // Zoom Listener
        const zoomBtn = card.querySelector('.zoom-btn');
        zoomBtn.addEventListener('click', () => {
             const modal = document.getElementById('imageModal');
             const fullImage = document.getElementById('fullImage');
             const caption = document.getElementById('caption');
             if(modal) {
                 modal.style.display = "block";
                 fullImage.src = imgSrc;
                 caption.textContent = event.eventName;
             }
        });

        // No delete option in Find Events page
        return card;
    };

    // =========================================
    // 6. FILTERING LOGIC (FIXED)
    // =========================================
    function filterAllEvents() {
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const locationValue = locationSelect ? locationSelect.value : 'all';
        
        let activeCategory = 'all';
        if (filterBtns) {
            filterBtns.forEach(btn => {
                if (btn.classList.contains('active')) activeCategory = btn.getAttribute('data-category');
            });
        }

        const allEventCards = document.querySelectorAll('.event-card');
        let visibleCount = 0;

        allEventCards.forEach(card => {
            // 1. Get Event Details
            const title = card.querySelector('h3') ? card.querySelector('h3').textContent.toLowerCase() : '';
            
            // 2. Get Category: Try attribute first, fallback to Badge text (Reference from Old File)
            let cardCategory = card.getAttribute('data-category');
            if (!cardCategory) {
                const badge = card.querySelector('.badge');
                cardCategory = badge ? badge.textContent.trim() : '';
            }

            // 3. Get Location
            let cardLocationAttr = card.getAttribute('data-location');
            if (!cardLocationAttr) {
                const locLink = card.querySelector('.card-location a');
                cardLocationAttr = locLink ? locLink.textContent : '';
            }
            cardLocationAttr = cardLocationAttr.toLowerCase();
            
            const isRegistered = card.classList.contains('is-registered');

            // 4. Matching Logic
            const matchesSearch = title.includes(searchTerm) || cardLocationAttr.includes(searchTerm) || cardCategory.toLowerCase().includes(searchTerm);
            
            let matchesCategory = false;
            if (activeCategory === 'Registered') {
                // For registered filter, check if user is logged in and event is registered
                matchesCategory = isLoggedIn && userRegistrations.has(card.querySelector('h3').textContent.trim());
            } else {
                // Compare categories (trim to ensure no whitespace issues)
                matchesCategory = (activeCategory === 'all') || (cardCategory.trim() === activeCategory);
            }

            // Location dropdown filter (if you have one, otherwise ignore)
            const matchesLocationSelect = (locationValue === 'all') || (cardLocationAttr.includes(locationValue));

            if (matchesSearch && matchesCategory && matchesLocationSelect) {
                card.style.display = "flex";
                visibleCount++;
            } else {
                card.style.display = "none";
            }
        });

        // 5. Show/Hide "No Results" Message
        if (noEventsMessage) {
            if (visibleCount === 0) {
                noEventsMessage.style.display = 'block';
                noEventsMessage.classList.remove('hidden');
            } else {
                noEventsMessage.style.display = 'none';
                noEventsMessage.classList.add('hidden');
            }
        }
    }
    // =========================================
    // 7. INITIALIZATION & EXECUTION FLOW
    // =========================================
    
    // STARTUP: 1. Sync Data -> 2. Init Static -> 3. Fetch Dynamic
    await syncRegistrationState(); // Wait for server data first

    // =========================================
    // 8. NEW: URL PARAMETER HANDLING
    // =========================================
    const urlParams = new URLSearchParams(window.location.search);
    const categoryParam = urlParams.get('category');
    
    if (categoryParam) {
        // Decode URI component to handle spaces/special chars (e.g. "NGO/Org")
        const decodedCategory = decodeURIComponent(categoryParam);
        
        // Update active class on filter buttons
        if (filterBtns) {
            filterBtns.forEach(btn => {
                const btnCategory = btn.getAttribute('data-category');
                // Use includes or strict match depending on preference, strict match is safer here
                if (btnCategory === decodedCategory) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });
        }
    }

    initializeStaticCards();
    
    // Listeners for Filters
    if (filterBtns) {
        filterBtns.forEach(button => {
            button.addEventListener('click', () => {
                filterBtns.forEach(btn => btn.classList.remove('active'));
                button.classList.add('active');
                filterAllEvents();
            });
        });
    }
    if (searchInput) searchInput.addEventListener('input', filterAllEvents);
    if (locationSelect) locationSelect.addEventListener('change', filterAllEvents);

    // Fetch Dynamic Events
    if (eventList) {
        fetch('/api/events')
            .then(res => res.json())
            .then(events => {
                if(events && events.length > 0) {
                    // =========================================================
                    // CRITICAL FIX: REVERSE ORDER FOR PROPER STACKING
                    // The server returns [Newest, Older, Oldest].
                    // insertBefore(card, firstChild) behaves like a stack.
                    // If we insert "Newest" first, it gets pushed down by "Older".
                    // By reversing here, we insert "Oldest" first, then "Newest" last,
                    // ensuring "Newest" ends up at the very top of the list.
                    // =========================================================
                    events.slice().reverse().forEach(event => {
                        try {
                            const newCard = createEventCard(event);
                            // Prepend dynamic cards before the first static card
                            eventList.insertBefore(newCard, eventList.firstChild);
                        } catch (err) {
                            console.error("Error creating card for event:", event.eventName, err);
                        }
                    });
                }
            })
            .catch(err => console.error("Error fetching events:", err))
            .finally(() => {
                filterAllEvents();
            });
    } else {
        filterAllEvents();
    }

    // =========================================
    // 9. MODAL LISTENERS (PRESERVED & FIXED)
    // =========================================
    // ... [Previous Modal Logic: Image Modal, Login Modal Close, Outside Click, etc.] ...

    const imageModal = document.getElementById('imageModal');
    const closeImageBtn = document.querySelector('.close-modal');
    if (closeImageBtn) closeImageBtn.addEventListener('click', () => { if(imageModal) imageModal.style.display = "none"; });
    window.addEventListener('click', (e) => { if (e.target === imageModal) imageModal.style.display = "none"; });

    const loginModal = document.getElementById('loginModal');
    const closeLoginBtn = document.querySelector('.close-login-modal');
    const loginForm = document.getElementById('modal-login-form');
    const googleBtn = document.getElementById('modal-google-btn'); 
    const statusMsg = document.getElementById('modal-status-message');

    if (closeLoginBtn && loginModal) {
        closeLoginBtn.onclick = function() { 
            loginModal.style.display = 'none';
            if (statusMsg) statusMsg.style.display = 'none';
        }
    }
    window.addEventListener('click', (e) => { if (e.target === loginModal) loginModal.style.display = 'none'; });

// --- MODIFIED: Manual Login Submit ---
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('modal-email').value;
            const password = document.getElementById('modal-password').value;
            
            statusMsg.textContent = "Verifying...";
            statusMsg.className = "status-message status-success";
            statusMsg.style.display = "block";

            try {
                const res = await fetch('/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();

                if (data.success) {
                    statusMsg.textContent = "Success!";
                    
                    // 1. Sync state so backend knows we are logged in
                    await syncRegistrationState(); 

                    // 2. Hide Modal
                    loginModal.style.display = 'none';

                    // 3. REFRESH UI STATE 
                    const allCards = document.querySelectorAll('.event-card');
                    allCards.forEach(card => {
                        const title = card.querySelector('h3').textContent.trim();
                        updateCardInitialState(card, title);
                    });

                    // [ADD THIS NEW CODE HERE]
                    // 4. Case 2 Requirement: SHOW ALERT DIRECTLY
                    setTimeout(() => {
                        alert("Now you can perform registration to any Events in this section");
                    }, 200);
                } else {
                    statusMsg.textContent = data.message || "Login failed.";
                    statusMsg.className = "status-message status-error";
                }
            } catch (err) {
                console.error(err);
                statusMsg.textContent = "Server error.";
                statusMsg.className = "status-message status-error";
            }
        });
    }

// --- MODIFIED: Google Login Button ---
    // Use Event Delegation for robustness
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('#modal-google-btn');
        if (target) {
            e.preventDefault();
            window.location.href = '/auth/google?origin=find_events';
        }
    });
    
    // --- MODIFIED: Google Login Return Logic ---
    const storedEventName = sessionStorage.getItem('pendingEventName');
    
    if (storedEventName) {
        // Wait a moment to ensure page load
        setTimeout(() => {
            alert("Now you can perform registration to any of the events");
        }, 500);

        // Clean up storage
        sessionStorage.removeItem('pendingEventName');
        sessionStorage.removeItem('pendingEventLink'); // Clean up unused key if present
    }
    
    // =========================================
    // 10. NEW: HANDLE GOOGLE REDIRECT RETURN
    // =========================================
    const finalUrlParams = new URLSearchParams(window.location.search);
    if (finalUrlParams.get('login_success') === 'true') {
        // Remove the param from URL so the user doesn't see it
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show the mandated alert
        setTimeout(() => {
            alert("Now you can register to any Events in this section");
        }, 500);
    }
    // =========================================
    // 11. NEW: HANDLE SIGNUP REDIRECT ALERT
    // =========================================

    const params = new URLSearchParams(window.location.search);
    
    if (params.get('new_signup') === 'true') {
        // Clean the URL so the alert doesn't show again on refresh
        window.history.replaceState({}, document.title, window.location.pathname);
        
        // Show the specific alert message you requested
        setTimeout(() => {
            alert("Click on Register button for login");
        }, 800);
    }
}); // End of DOMContentLoaded
