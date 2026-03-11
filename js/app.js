import { searchCity, showMap, toDoList } from "../module/main.js";
import { el } from "../module/lib.js";

showMap();
el("#todo-btn").addEventListener("click", toDoList);

const input = el("#search-input");
const suggestions = el("#suggestions");

const API_KEY = "618da3fb696e4cc89e1440c269d6577d";

el("#search-btn").addEventListener("click", () => {
  const city = input.value;
  searchCity(city);
});

input.addEventListener("input", debounce(getCitySuggestions, 500));

async function getCitySuggestions() {
  const text = input.value;

  if (text.length < 2) {
    suggestions.innerHTML = "";
    return;
  }

  const url = `https://api.geoapify.com/v1/geocode/autocomplete?text=${text}&type=city&limit=5&apiKey=${API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  suggestions.innerHTML = "";

  data.features.forEach((city) => {
    const name = city.properties.formatted;

    const div = document.createElement("div");
    div.classList.add("suggestion");
    div.textContent = name;

    div.addEventListener("click", () => {
      input.value = name;
      suggestions.innerHTML = "";
      searchCity(name);
    });

    suggestions.appendChild(div);
  });
}

function debounce(func, delay) {
  let timeout;

  return function (...args) {
    clearTimeout(timeout);

    timeout = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
}
