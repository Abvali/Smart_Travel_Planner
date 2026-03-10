import "../leaflet/leaflet.js";

let map;

// ICONS
const museumIcon = L.icon({
  iconUrl: "../assets/icons/museum.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const parkIcon = L.icon({
  iconUrl: "../assets/icons/park.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const monumentIcon = L.icon({
  iconUrl: "../assets/icons/monument.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

const defaultIcon = L.icon({
  iconUrl: "../assets/icons/marker.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

// API KEY
const API_KEY = "618da3fb696e4cc89e1440c269d6577d";

// Layer für Attraktionen
const attractionsLayer = L.layerGroup();

// MAP INITIALISIEREN
export function showMap() {
  map = L.map("map").setView([51.505, -0.09], 8);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  attractionsLayer.addTo(map);
}

// STADT SUCHEN
export async function searchCity(city) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${city}`,
    );

    const data = await res.json();

    if (!data.length) {
      console.log("City not found");
      return;
    }

    const lat = Number(data[0].lat);
    const lon = Number(data[0].lon);

    map.setView([lat, lon], 13);

    L.marker([lat, lon]).addTo(map).bindPopup(city).openPopup();

    getAttractions(lat, lon);
  } catch (err) {
    console.error("City search error:", err);
  }
}

// ATTRAKTIONEN LADEN
async function getAttractions(lat, lon) {
  attractionsLayer.clearLayers();

  if (!map.hasLayer(attractionsLayer)) {
    attractionsLayer.addTo(map);
  }
  const radius = 5000; // 5km

  const categories = "building.historic,leisure.park,entertainment";
  // Achte auf das Format: filter=circle:longitude,latitude,radius
  const url = `https://api.geoapify.com/v2/places?categories=${categories}&filter=circle:${lon},${lat},${radius}&limit=20&apiKey=${API_KEY}`;
  console.log(url);

  try {
    const res = await fetch(url);

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Geoapify Error ${res.status}: ${errorText}`);
      return;
    }

    const data = await res.json();

    data.features.forEach((place) => {
      // GeoJSON Koordinaten sind [lon, lat]
      const [pLon, pLat] = place.geometry.coordinates;
      const name = place.properties.name || "Unbekannte Attraktion";

      const categories = place.properties.categories || [];

      let icon = defaultIcon;

      if (categories.some((c) => c.includes("museum"))) {
        icon = museumIcon;
      } else if (categories.some((c) => c.includes("park"))) {
        icon = parkIcon;
      } else if (categories.some((c) => c.includes("historic"))) {
        icon = monumentIcon;
      }

      L.marker([pLat, pLon], { icon }).addTo(attractionsLayer).bindPopup(name);
    });
  } catch (err) {
    console.error("Netzwerkfehler:", err);
  }
}
