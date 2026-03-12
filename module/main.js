import "../leaflet/leaflet.js";
import { el, create } from "./lib.js";
import { checklists, todos, defaultPlace } from "../data/db.js";
import { get, set } from "./idb.js";

let map;
let editing = false;
let input; //edit input
const wikiCache = {};

document.addEventListener("DOMContentLoaded", () => {
  showAttractionDetails(defaultPlace);
});

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

  const categories = "building.historic,leisure.park,tourism.sights";
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

      if (categories.some((c) => c.includes("tourism.sights"))) {
        icon = museumIcon;
      } else if (categories.some((c) => c.includes("park"))) {
        icon = parkIcon;
      } else if (categories.some((c) => c.includes("historic"))) {
        icon = monumentIcon;
      }

      const marker = L.marker([pLat, pLon], { icon })
        .addTo(attractionsLayer)
        .bindPopup(name);

      marker.on("click", () => {
        showAttractionDetails(place);
      });
    });
  } catch (err) {
    console.error("Netzwerkfehler:", err);
  }
}

// die Sehenwürdigkeitensinfos zeigen
async function showAttractionDetails(place) {
  const details = el("#attraction-details");

  const name = place.properties.name || "Unknown place";
  const address = place.properties.formatted || "";
  const city = place.properties.city || "";

  const wiki = await getWikipediaInfo(name);

  const photo = wiki.image || "https://picsum.photos/600/400";

  details.innerHTML = "";

  const card = document.createElement("div");
  card.className = "place-card";

  const img = document.createElement("img");
  img.src = photo;
  img.className = "place-img";

  const info = document.createElement("div");
  info.className = "place-info";

  const title = document.createElement("h3");
  title.textContent = name;

  const addressEl = document.createElement("p");
  addressEl.textContent = `📍 ${address}`;
  addressEl.className = "title";

  const desc = document.createElement("p");
  desc.textContent = wiki.description;
  desc.className = "place-description";

  info.append(title, addressEl, desc);

  if (wiki.wikiLink) {
    const link = document.createElement("a");
    link.href = wiki.wikiLink;
    link.target = "_blank";
    link.textContent = "Read more on Wikipedia";
    info.append(link);
  }

  card.append(img, info);
  details.append(card);
}

// Infos der Plätze
async function getWikipediaInfo(placeName) {
  if (wikiCache[placeName]) {
    return wikiCache[placeName];
  }

  try {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      placeName,
    )}`;

    const res = await fetch(url);
    const data = await res.json();

    const result = {
      description: data.extract || "",
      image: data.thumbnail?.source || null,
      wikiLink: data.content_urls?.desktop?.page || "",
    };

    // in Cache speichern
    wikiCache[placeName] = result;

    return result;
  } catch (error) {
    console.error("Wikipedia error:", error);
    return {};
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
  checkBtn.checked = todoObj.completed || false;

  if (todoObj.completed) {
    text.classList.add("completed");
  }

  checkBtn.addEventListener("change", async () => {
    text.classList.toggle("completed");
    todoObj.completed = checkBtn.checked;
    await saveTodos();
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
        saveTodos();
      }

      li.replaceChild(text, input);
      editBtn.innerText = "✏️";
      editing = false;
    }
  });

  const deleteBtn = create("button");
  deleteBtn.innerText = "🗑";

  deleteBtn.addEventListener("click", async () => {
    li.remove();
    const index = todos.findIndex((todo) => todo.id === todoObj.id);
    todos.splice(index, 1);

    await saveTodos();
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

  todos.forEach((todo) => {
    const li = createTodoItem(todo);
    list.append(li);
  });
};

// add new todo-item
export const addTodo = async () => {
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

  await saveTodos(); //speichen

  input.value = "";
};

// create checklist
function createChecklistItem(cheklistObj) {
  const li = create("li");

  const text = create("span");
  text.innerText = cheklistObj.checklist;

  const checkBtn = create("input");
  checkBtn.type = "checkbox";

  // gespeicherten Status setzen
  checkBtn.checked = cheklistObj.completed || false;

  if (cheklistObj.completed) {
    text.classList.add("completed");
  }

  checkBtn.addEventListener("change", async () => {
    text.classList.toggle("completed");

    cheklistObj.completed = checkBtn.checked;

    await saveChecklists();
  });

  const deleteBtn = create("button");
  deleteBtn.innerText = "✗";
  deleteBtn.className = "delete-btn";

  deleteBtn.addEventListener("click", async () => {
    li.remove();
    const index = checklists.findIndex(
      (checklist) => checklist.id === cheklistObj.id,
    );
    checklists.splice(index, 1);
    await saveChecklists();
  });

  const actions = create("div");
  actions.append(checkBtn, deleteBtn);

  li.append(text, actions);
  return li;
}

// input für packing-checklist
export const showChecklistInput = () => {
  const list = el("#packing-List");

  // prüfen ob schon eine Input existiert
  if (el(".new-checklist-input")) return;

  el("#add-item-btn").disabled = true;

  const li = create("li");

  const input = create("input");
  input.type = "text";
  input.classList.add("new-checklist-input");

  const saveBtn = create("button");
  saveBtn.innerText = "Add";

  saveBtn.addEventListener("click", () => {
    const value = input.value.trim();

    if (!value) return;

    const newItem = {
      id: Date.now().toString(),
      checklist: value,
    };

    checklists.push(newItem);

    renderChecklist();

    el("#add-item-btn").disabled = false;
  });

  li.append(input, saveBtn);
  list.append(li);

  input.focus();
};

// initial render Cheklist
export const renderChecklist = () => {
  const list = el("#packing-List");
  list.innerHTML = "";

  checklists.forEach((checklist) => {
    const li = createChecklistItem(checklist);
    list.append(li);
    saveChecklists();
  });
};

// die Daten laden
export const loadTodos = async () => {
  const storedTodos = await get("todos");

  if (storedTodos) {
    todos.length = 0;
    todos.push(...storedTodos);
  }

  renderTodos();
};

export const loadChecklist = async () => {
  const storedChecklists = await get("checklists");

  if (storedChecklists) {
    checklists.length = 0;
    checklists.push(...storedChecklists);
  }
  renderChecklist();
};

// die Daten speichern
async function saveTodos() {
  await set("todos", todos);
}

async function saveChecklists() {
  await set("checklists", checklists);
}
