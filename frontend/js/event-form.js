// Global map variables
let map, marker, autocomplete;

// --- 1. Initialize Google Map & Autocomplete ---
function initMap() {
    // Default location (e.g., Pune, India)
    const defaultLoc = { lat: 18.5204, lng: 73.8567 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 13,
        center: defaultLoc,
        mapTypeControl: false, 
        streetViewControl: false
    });

    marker = new google.maps.Marker({
        position: defaultLoc,
        map: map,
        draggable: true
    });

    // Search bar inside map
    const input = document.getElementById("pac-input");
    map.controls[google.maps.ControlPosition.TOP_CENTER].push(input);

    // Setup Autocomplete on the MAP INPUT
    autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo("bounds", map);

    // Event: Place Changed
    autocomplete.addListener("place_changed", function () {
        const place = autocomplete.getPlace();
        if (!place.geometry) {
            alert("No details available for input: '" + place.name + "'");
            return;
        }

        // Center map and move marker
        if (place.geometry.viewport) {
            map.fitBounds(place.geometry.viewport);
        } else {
            map.setCenter(place.geometry.location);
            map.setZoom(17);
        }
        marker.setPosition(place.geometry.location);

        fillAddressDetails(place);
    });

    // Event: Marker Dragged
    marker.addListener("dragend", () => {
        const position = marker.getPosition();
        geocodePosition(position);
    });

    // Event: Map Clicked
    map.addListener("click", (e) => {
        marker.setPosition(e.latLng);
        geocodePosition(e.latLng);
    });
}

window.initMap = initMap;

// Reverse Geocoding (Lat/Lng -> Address)
function geocodePosition(latLng) {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: latLng }, function (results, status) {
        if (status === "OK" && results[0]) {
            document.getElementById("pac-input").value = results[0].formatted_address;
            fillAddressDetails(results[0]);
        }
    });
}

// Helper: Fill Form Fields from Place Data
function fillAddressDetails(place) {
    // Fill Hidden Form Address Field
    document.getElementById("address").value = place.formatted_address;

    // Fill Lat/Lng
    if (place.geometry) {
        document.getElementById("latitude").value = place.geometry.location.lat();
        document.getElementById("longitude").value = place.geometry.location.lng();
    }

    // Extract City
    let city = "";
    if (place.address_components) {
        for (let component of place.address_components) {
            if (component.types.includes("locality")) {
                city = component.long_name;
                break;
            }
        }
    }
    document.getElementById("city").value = city;
}

// --- 2. File Validation ---
const imageInput = document.getElementById('eventImage');
const imageError = document.getElementById('imageError');
const brochureInput = document.getElementById('eventBrochure');
const brochureError = document.getElementById('brochureError');

function validateFile(input, errorElement, maxSizeMB, allowedTypes) {
    const file = input.files[0];
    errorElement.style.display = 'none';
    input.setCustomValidity("");

    if (file) {
        // Check Size
        if (file.size > maxSizeMB * 1024 * 1024) {
            showError(errorElement, `File is too big! Max size allowed is ${maxSizeMB}MB.`);
            input.value = "";
            return;
        }
        
        // Check Type
        if (!allowedTypes.includes(file.type)) {
            showError(errorElement, `Invalid format. Allowed: ${allowedTypes.join(', ')}`);
            input.value = "";
            return;
        }
    }
}

function showError(element, msg) {
    element.textContent = msg;
    element.style.display = 'block';
}

// Image Listener (Max 1MB, Images only)
imageInput.addEventListener('change', () => {
    validateFile(imageInput, imageError, 1, ['image/jpeg', 'image/png', 'image/jpg']);
});

// Brochure Listener (Max 5MB, PDF only)
brochureInput.addEventListener('change', () => {
    validateFile(brochureInput, brochureError, 5, ['application/pdf']);
});

// --- 3. Form Submission (Updated for new structure) ---
document.getElementById('eventForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.textContent = "Submitting...";
    submitBtn.disabled = true;

    const formData = new FormData(e.target);

    try {
        const response = await fetch('/api/events', {
            method: 'POST',
            body: formData,
            credentials: 'include' 
        });

        const result = await response.json();

        if (response.ok) {
            alert('Event submitted successfully!'); 
            window.location.href = '/pages/create-event.html'; 
        } else {
            alert('Error: ' + (result.message || 'Submission failed'));
            submitBtn.textContent = "Submit Event";
            submitBtn.disabled = false;
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Server error. Please check console.');
        submitBtn.textContent = "Submit Event";
        submitBtn.disabled = false;
    } 
});