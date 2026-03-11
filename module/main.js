import "../leaflet/leaflet.js";
import { el, create } from "./lib.js";
import { checklists, todos } from "../data/db.js";

let map;
let editing = false;
let input; //edit input

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
const API_KEY = "618da3fb696e4cc89e1440c269d6577d"; // Sehenwürdigkeiten
const WEATHER_KEY = "d3b3106d76b06f32427ed094c9d586f7"; // weater

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
  const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    const city = data.city.name;
    const country = data.city.country;

    const forecast = getDailyForecast(data.list);

    updateWeatherUI({ city, country, forecast });
  } catch (error) {
    console.error("Weather API error:", error);
  }
}

function getDailyForecast(list) {
  return list
    .filter((item) => item.dt_txt.includes("12:00:00"))
    .slice(0, 5)
    .map((item) => ({
      date: item.dt_txt,
      temp: Math.round(item.main.temp),
      icon: item.weather[0].icon,
    }));
}

function getDayName(dateString) {
  const date = new Date(dateString);

  return date.toLocaleDateString("en-US", {
    weekday: "short",
  });
}

// update html elemente
function updateWeatherUI(data) {
  const flag = getFlagEmoji(data.country);

  el("#city").textContent = `${flag} ${data.city}, ${data.country}`;

  const container = el("#forecast");
  container.innerHTML = "";

  data.forecast.forEach((day) => {
    const div = document.createElement("div");
    div.className = "info";

    div.innerHTML = `
      <img src="${getIcon(day.icon)}">
      <h3>${day.temp}°C</h3>
    <p>${getDayName(day.date)}</p>
    `;

    container.append(div);
  });
}

function getIcon(icon) {
  return `https://openweathermap.org/img/wn/${icon}@2x.png`;
}

function getFlagEmoji(countryCode) {
  const codePoints = countryCode
    .toUpperCase()
    .split("")
    .map((char) => 127397 + char.charCodeAt());

  return String.fromCodePoint(...codePoints);
}

//create new To-Do
function createTodoItem(todoObj) {
  const li = create("li");

  const text = create("span");
  text.innerText = todoObj.todo;

  const checkBtn = create("input");
  checkBtn.type = "checkbox";

  checkBtn.addEventListener("change", () => {
    text.classList.toggle("completed");
  });

  const editBtn = create("button");
  editBtn.innerText = "✏️";

  editBtn.addEventListener("click", () => {
    if (!editing) {
      // start editing
      input = create("input");
      input.type = "text";
      input.value = text.innerText;

      li.replaceChild(input, text);

      editBtn.innerText = "💾";
      input.focus();

      editing = true;
    } else {
      // save
      const newValue = input.value.trim();

      if (newValue) {
        text.innerText = newValue;
        todoObj.todo = newValue;
      }

      li.replaceChild(text, input);

      editBtn.innerText = "✏️";

      editing = false;
    }
  });

  const deleteBtn = create("button");
  deleteBtn.innerText = "🗑";

  deleteBtn.addEventListener("click", () => {
    li.remove();
  });

  const actions = create("div");
  actions.append(checkBtn, editBtn, deleteBtn);

  li.append(text, actions);

  return li;
}

// initial render Todo-Liste
export const renderTodos = () => {
  const list = el("#todo-List");
  list.innerHTML = "";

  //   const deleteAllBtn = create("button");
  //   deleteAllBtn.innerText = "Delete All";
  //   deleteAllBtn.addEventListener("click", () => {
  //     list.innerHTML = "";
  //   });

  todos.forEach((todo) => {
    const li = createTodoItem(todo);
    list.append(li);
  });
  //   list.append(deleteAllBtn);
};
// add new todo-item
export const addTodo = () => {
  const input = el("#todo-input");
  const name = input.value;

  if (!name.trim()) return;

  const newTodo = {
    id: Date.now().toString(),
    todo: name,
  };

  todos.push(newTodo);

  const li = createTodoItem(newTodo);
  el("#todo-List").append(li);

  input.value = "";
};

// create checklist
function createChecklistItem(cheklistObj) {
  const li = create("li");
  const text = create("span");
  text.innerText = cheklistObj.checklist;

  const checkBtn = create("input");
  checkBtn.type = "checkbox";
  checkBtn.addEventListener("change", () => {
    text.classList.toggle("completed");
  });

  li.append(text, checkBtn);
  el("#packing-List").append(li);
}

// initial render Cheklist
export const renderChecklist = () => {
  const list = el("#packing-List");
  list.innerHTML = "";

  checklists.forEach((checklist) => {
    const li = createChecklistItem(checklist);
    // list.append(li);
  });
};
