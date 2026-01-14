document.addEventListener('DOMContentLoaded', () => {
    console.log("Script Loaded");

    /* ============================
       1. MOBILE MENU TOGGLE
       ============================ */
    const mobileMenu = document.getElementById('mobile-menu');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links a');

    if (mobileMenu && navLinks) {
        mobileMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            navLinks.classList.toggle('nav-active'); 
            mobileMenu.classList.toggle('is-active');
        });
    } else {
        console.error("Menu elements not found. Check HTML IDs.");
    }

    if (navItems) {
        navItems.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('nav-active');
                if (mobileMenu) mobileMenu.classList.remove('is-active');
            });
        });
    }

    document.addEventListener('click', (e) => {
        if (navLinks && navLinks.classList.contains('nav-active')) {
            if (!navLinks.contains(e.target) && !mobileMenu.contains(e.target)) {
                navLinks.classList.remove('nav-active');
                if (mobileMenu) mobileMenu.classList.remove('is-active');
            }
        }
    });

    /* ============================
       2. SLIDER FUNCTIONALITY
       ============================ */
    const slides = document.querySelectorAll('.slide');
    const prevBtn = document.querySelector('.prev');
    const nextBtn = document.querySelector('.next');
    let currentSlide = 0;

    if(slides.length > 0) {
        function showSlide(index) {
            slides.forEach((slide, i) => {
                slide.classList.remove('active');
                if (i === index) {
                    slide.classList.add('active');
                }
            });
        }

        function nextSlide() {
            currentSlide = (currentSlide + 1) % slides.length;
            showSlide(currentSlide);
        }

        function prevSlide() {
            currentSlide = (currentSlide - 1 + slides.length) % slides.length;
            showSlide(currentSlide);
        }

        if(nextBtn) nextBtn.addEventListener('click', nextSlide);
        if(prevBtn) prevBtn.addEventListener('click', prevSlide);

        setInterval(nextSlide, 10000);
    }

    /* ============================
       3. FAQ ACCORDION
       ============================ */
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');
        const answer = item.querySelector('.faq-answer');

        if(question && answer) {
            question.addEventListener('click', () => {
                faqItems.forEach(otherItem => {
                    if (otherItem !== item && otherItem.classList.contains('active')) {
                        otherItem.classList.remove('active');
                        otherItem.querySelector('.faq-answer').style.maxHeight = null;
                    }
                });

                item.classList.toggle('active');
                if (item.classList.contains('active')) {
                    answer.style.maxHeight = answer.scrollHeight + "px";
                } else {
                    answer.style.maxHeight = null;
                }
            });
        }
    });

    /* ============================
       4. CATEGORY CARD NAVIGATION
       ============================ */
    const categoryCards = document.querySelectorAll('.cards-container .card');

    if (categoryCards) {
        categoryCards.forEach(card => {
            card.addEventListener('click', () => {
                const category = card.getAttribute('data-category');
                
                if (category) {
                    const encodedCategory = encodeURIComponent(category);
                    window.location.href = `pages/find-events.html?category=${encodedCategory}`;
                }
            });
        });
    }

    /* ============================
       5. IMAGE ZOOM MODAL
       ============================ */
    const modal = document.getElementById('imageModal');
    const fullImage = document.getElementById('fullImage');
    const caption = document.getElementById('caption');
    const closeBtn = document.querySelector('.close-modal');
    const zoomBtns = document.querySelectorAll('.zoom-btn');

    if(modal && fullImage && zoomBtns.length > 0) {
        zoomBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const card = btn.closest('.event-card');
                const img = card.querySelector('.card-image img');
                const title = card.querySelector('h3') ? card.querySelector('h3').textContent : 'Image';

                if(img) {
                    modal.style.display = "block";
                    fullImage.src = img.src;
                    caption.textContent = title;
                }
            });
        });

        if(closeBtn) {
            closeBtn.addEventListener('click', () => {
                modal.style.display = "none";
            });
        }

        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = "none";
            }
        });
    }

    /* =======================================
       6. ADD TO CALENDAR (GOOGLE URL INTEGRATION)
       ======================================= */
    const calendarBtns = document.querySelectorAll('.calendar-btn');

    calendarBtns.forEach(btn => {
        // Remove the inline 'onclick' alert from HTML dynamically
        // so we don't annoy the user with an alert AND a redirect.
        btn.removeAttribute('onclick');

        btn.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. Locate the parent Card
            const card = btn.closest('.event-card');
            if (!card) return;

            // 2. Extract Data from DOM
            const titleElement = card.querySelector('h3');
            const dateElement = card.querySelector('.date');
            const locationElement = card.querySelector('.card-location'); 
            const orgElement = card.querySelector('.card-org');
            const contactElement = card.querySelector('.card-contact');

            // 3. Clean and Prepare Strings
            const title = titleElement ? titleElement.innerText.trim() : "Eventify Event";
            const location = locationElement ? locationElement.innerText.trim() : "";
            // Combine Org + Contact for the description body
            const description = `${orgElement ? orgElement.innerText.trim() : ''}\n\n${contactElement ? contactElement.innerText.replace(/\n/g, ', ').trim() : ''}\n\nRegister via Eventify.`;

            // 4. Parse Date (Format: "Aug 24, 2025 • 6:00 PM")
            // We need: YYYYMMDDTHHMMSS
            let startDateStr = '';
            let endDateStr = '';

            if (dateElement) {
                const rawDateText = dateElement.innerText.trim(); // "Aug 24, 2025 • 6:00 PM"
                // Replace the bullet '•' with a space so Date() can parse it easily
                const cleanDateString = rawDateText.replace('•', '');
                
                const startDate = new Date(cleanDateString);

                if (!isNaN(startDate)) {
                    // Create an End Date (Assume 1 hour duration)
                    const endDate = new Date(startDate.getTime() + (60 * 60 * 1000));

                    // Helper to format ISO string to Google's required format (YYYYMMDDTHHMMSS)
                    // We slice off the punctuation from toISOString
                    const formatGoogleDate = (date) => {
                        return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
                    };

                    startDateStr = formatGoogleDate(startDate);
                    endDateStr = formatGoogleDate(endDate);
                }
            }

            // 5. Construct Google Calendar URL
            // Base URL
            let googleUrl = new URL("https://calendar.google.com/calendar/render");
            googleUrl.searchParams.append("action", "TEMPLATE");
            googleUrl.searchParams.append("text", title);
            googleUrl.searchParams.append("details", description);
            googleUrl.searchParams.append("location", location);
            
            if (startDateStr && endDateStr) {
                googleUrl.searchParams.append("dates", `${startDateStr}/${endDateStr}`);
            }

            // 6. Open in New Tab
            window.open(googleUrl.toString(), '_blank');
        });
    });

});