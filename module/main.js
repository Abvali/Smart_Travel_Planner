import "../leaflet/leaflet.js";
import { el, create } from "./lib.js";

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

// API KEYS
const API_KEY = "618da3fb696e4cc89e1440c269d6577d";
const WEATHER_KEY = "d3b3106d76b06f32427ed094c9d586f7";

// Layer für Attraktionen
const attractionsLayer = L.layerGroup();

// MAP INITIALISIEREN
export function showMap() {
  map = L.map("map").setView([48.8566, 2.3522], 10);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(map);

  attractionsLayer.addTo(map);

  // default weather: Paris
  getWeather(48.8566, 2.3522);
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

    map.flyTo([lat, lon], 12, {
      animate: true,
      duration: 3,
    });

    getWeather(lat, lon);

    L.marker([lat, lon], { icon: defaultIcon }).addTo(map);

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

// Wetterbericht zeigen
async function getWeather(lat, lon) {
  const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`;

  const res = await fetch(url);
  const data = await res.json();
  //   console.log(data);

  const city = data.name;
  const country = data.sys.country;

  const temp = Math.round(data.main.temp);
  const humidity = data.main.humidity;
  const wind = data.wind.speed;
  const description = data.weather[0].description;
  const icon = data.weather[0].icon;

  updateWeatherUI({
    city,
    country,
    temp,
    humidity,
    wind,
    description,
    icon,
  });
}

// update html elemente
function updateWeatherUI(weather) {
  // city + flag
  const flag = getFlagEmoji(weather.country);

  document.querySelector(".city-name").textContent =
    `${flag} ${weather.city}, ${weather.country}`;

  // temperature
  el(".temp").textContent = `${weather.temp}°C`;

  // description
  el(".description").textContent = `☁️ ${weather.description}`;

  // humidity
  el(".humidity").textContent = `💧 humidity ${weather.humidity}%`;

  // wind
  el(".wind").textContent = `💨 Wind ${weather.wind} km/h`;

  // weather icon
  el(".weather-icon").src =
    `https://openweathermap.org/img/wn/${weather.icon}@2x.png`;
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());

  return String.fromCodePoint(...codePoints);
}

//create To-Do List
export const toDoList = () => {
  const input = el("#todo-input");
  const todo = input.value;
  if (!todo.trim()) return;

  const li = create("li");

  const text = create("span");
  text.innerText = todo;

  const checkBtn = create("input");
  checkBtn.type = "checkbox";

  const editBtn = create("button");
  editBtn.innerText = "✏️";

  const deleteBtn = create("button");
  deleteBtn.innerText = "🗑";

  const actions = create("div");
  actions.append(checkBtn, editBtn, deleteBtn);

  li.append(text, actions);

  el("#todo-List").append(li);
};
