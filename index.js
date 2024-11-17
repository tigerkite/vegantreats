let map;
let infoWindow;
let autocomplete;
let allMarkers = [];
let userMarker;
let allLocations = [];
let locationsShown = 5;
let shownMarkers = [];

async function fetchGoogleMapsApiKey() {
    try {
        const response = await fetch("https://d2icu8c5skbmjq.cloudfront.net/prod/vegan-treats-key", {
            headers: {
                "x-api-key": ""
            }
        });
        
        if (!response.ok) {
            console.error("Error fetching API key:", response.statusText);
            return null;
        }

        const data = await response.json();
        return data.apiKey;
    } catch (error) {
        console.error("Error fetching Google Maps API key:", error);
        return null;
    }
}

async function initMap() {
    const apiKey = await fetchGoogleMapsApiKey();
    if (!apiKey) {
        console.error("Failed to load Google Maps API key.");
        return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&callback=initializeMap`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
}

function initializeMap() {
const mapStyle = [
    { elementType: "geometry", stylers: [{ color: "#fbf5e5" }] },
    { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#83372a" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#fbf5e5" }] },
    
    {
        featureType: "administrative",
        elementType: "geometry",
        stylers: [{ color: "#d68c45" }]
    },
    {
        featureType: "administrative.locality",
        elementType: "labels.text.fill",
        stylers: [{ color: "#4a2c2a" }]
    },
    {
        featureType: "landscape.man_made",
        stylers: [{ color: "#fbf5e5" }]
    },
    {
        featureType: "poi",
        stylers: [{ visibility: "off" }] // Hide points of interest for simplicity
    },
    {
        featureType: "road",
        stylers: [{ visibility: "off" }] // Hide all roads by default
    },
    {
        featureType: "road.arterial",
        elementType: "geometry",
        stylers: [{ visibility: "on" }, { color: "#d68c45" }] // Show only arterial roads
    },
    {
        featureType: "road.highway",
        elementType: "geometry",
        stylers: [{ visibility: "on" }, { color: "#550c03" }] // Show highways in dark brown
    },
    {
        featureType: "road.highway.controlled_access",
        elementType: "geometry",
        stylers: [{ visibility: "on" }, { color: "#550c03" }]
    },
    {
        featureType: "transit",
        stylers: [{ visibility: "off" }] // Hide transit for less clutter
    },
    {
        featureType: "water",
        elementType: "geometry",
        stylers: [{ color: "#a8c8e8" }]
    },
    {
        featureType: "water",
        elementType: "labels.text.fill",
        stylers: [{ color: "#83372a" }]
    }
];

    const initialPosition = { lat: 40.7128, lng: -73.935242 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 4,
        center: initialPosition,
        styles: mapStyle
    });

    infoWindow = new google.maps.InfoWindow();
    initAutocomplete();

    document.getElementById("show-more-button").style.display = 'none';
    loadMarkers();
}

function initAutocomplete() {
    autocomplete = new google.maps.places.Autocomplete(document.getElementById('addressInput'));
    document.getElementById('addressInput').addEventListener('keydown', (event) => {
        if (event.key === "Enter") {
            event.preventDefault();
            findLocationFromInput();
        }
    });
}

function findLocationFromInput() {
    const place = autocomplete.getPlace();
    if (place && place.geometry) {
        const location = { lat: place.geometry.location.lat(), lng: place.geometry.location.lng() };
        
        map.setCenter(location);
        map.setZoom(12);
        
        if (userMarker) {
            userMarker.setMap(null);
        }

        userMarker = new google.maps.Marker({
            map: map,
            position: location,
            title: "Your selected location",
            icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
        });

        locationsShown = 5;
        displayNearbyLocations(location);
    } else {
        alert("Please select a location from the suggestions.");
    }
}

function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position) => {
            const userLocation = { lat: position.coords.latitude, lng: position.coords.longitude };
            map.setCenter(userLocation);
            map.setZoom(12);
            if (userMarker) {
                userMarker.setMap(null);
            }
            userMarker = new google.maps.Marker({
                map: map,
                position: userLocation,
                title: "Your location",
                icon: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
            });
            locationsShown = 5;
            displayNearbyLocations(userLocation);
        }, (error) => {
            console.error("Error fetching location:", error);
        });
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function loadMarkers() {
    fetch('coordinates.json')
        .then(response => response.json())
        .then(data => {
            allLocations = data;
            data.forEach(coord => {
                if (typeof coord.lat === 'number' && typeof coord.lng === 'number') {
                    const marker = new google.maps.Marker({
                        map: null,
                        position: { lat: coord.lat, lng: coord.lng },
                        title: coord.address,
                    });
                    allMarkers.push({ marker, coord });
                    marker.addListener("click", () => {
                        fetchPlaceDetails(marker, coord.address);
                    });
                } else {
                    console.error(`Invalid coordinates for ${coord.address}`, coord);
                }
            });
        })
        .catch(error => {
            console.error('Error loading coordinates:', error);
        });
}

function fetchPlaceDetails(marker, address) {
    const service = new google.maps.places.PlacesService(map);
    const request = { query: address, fields: ['place_id'] };

    service.textSearch(request, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
            const placeId = results[0].place_id;

            service.getDetails({ placeId, fields: ['name', 'rating', 'photos', 'formatted_address'] }, (place, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK) {
                    const content = `
                        <div style="max-width: 250px; font-family: Arial, sans-serif;">
                            <h4 style="margin: 0; color: #333;">${place.name || 'No Name'}</h4>
                            <p style="margin: 5px 0; font-size: 0.9em;">Rating: ${place.rating || 'N/A'}</p>
                            ${place.photos ? `<img src="${place.photos[0].getUrl({maxWidth: 200, maxHeight: 150})}" style="width:100%; height:auto; border-radius: 8px; margin-bottom: 8px;">` : ""}
                            <p style="font-size: 0.85em; color: #555;">${place.formatted_address || 'N/A'}</p>
                        </div>
                    `;
                    infoWindow.setContent(content);
                    infoWindow.open(map, marker);
                }
            });
        }
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3958.8;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
}

function displayNearbyLocations(location) {
    const nearbyLocations = allMarkers
        .map(({ marker, coord }) => ({
            marker,
            distance: calculateDistance(location.lat, location.lng, coord.lat, coord.lng)
        }))
        .sort((a, b) => a.distance - b.distance);

    const locationsToShow = nearbyLocations.slice(0, locationsShown);

    shownMarkers.forEach(markerObj => markerObj.marker.setMap(null));
    shownMarkers = locationsToShow;
    const bounds = new google.maps.LatLngBounds();

    locationsToShow.forEach(({ marker }) => {
        marker.setMap(map);
        bounds.extend(marker.getPosition());
    });
    map.fitBounds(bounds);

    const nearestLocationsContainer = document.getElementById("nearest-locations");
    nearestLocationsContainer.innerHTML = "";
    locationsToShow.forEach(({ marker, distance }) => {
        const locationItem = document.createElement("div");
        locationItem.classList.add("location-item");
        locationItem.innerHTML = `<strong>${marker.getTitle()}</strong><br><span class="distance">${distance} miles</span> <button onclick="window.open('https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(marker.getTitle())}', '_blank')" class="get-directions">Get Directions</button>`;
        locationItem.addEventListener('mouseenter', () => {
            marker.setAnimation(google.maps.Animation.BOUNCE);
            setTimeout(() => marker.setAnimation(null), 700); 
        });
        nearestLocationsContainer.appendChild(locationItem);
    });

    if (allMarkers.length > shownMarkers.length) {
        document.getElementById("show-more-button").style.display = 'block';
    } else {
        document.getElementById("show-more-button").style.display = 'none';
    }
    nearestLocationsContainer.style.display = "block";
}

function showMoreLocations() {
    locationsShown += 5;
    if (userMarker) {
        displayNearbyLocations({ lat: userMarker.getPosition().lat(), lng: userMarker.getPosition().lng() });
    }
}

document.getElementById("show-more-button").addEventListener("click", showMoreLocations);
