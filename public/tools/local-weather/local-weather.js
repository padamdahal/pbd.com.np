(() => {
  "use strict";

  const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
  const WX_URL = "https://api.open-meteo.com/v1/forecast";

  const els = {
    q: document.getElementById("city-q"),
    suggestions: document.getElementById("suggestions"),
    btnSearch: document.getElementById("btn-search"),
    btnLocate: document.getElementById("btn-locate"),
    status: document.getElementById("status"),
    results: document.getElementById("wx-results"),
    place: document.getElementById("wx-place"),
    icon: document.getElementById("wx-icon"),
    temp: document.getElementById("wx-temp"),
    cond: document.getElementById("wx-cond"),
    feels: document.getElementById("wx-feels"),
    stats: document.getElementById("wx-stats"),
    hourly: document.getElementById("hourly"),
    daily: document.getElementById("daily"),
    unitC: document.getElementById("unit-c"),
    unitF: document.getElementById("unit-f"),
  };

  let unit = "c";
  let lastPayload = null;
  let suggestTimer = null;
  let activeSuggest = -1;
  let suggestItems = [];

  const WMO = {
    0: ["Clear sky", "☀️"],
    1: ["Mainly clear", "🌤️"],
    2: ["Partly cloudy", "⛅"],
    3: ["Overcast", "☁️"],
    45: ["Fog", "🌫️"],
    48: ["Depositing rime fog", "🌫️"],
    51: ["Light drizzle", "🌦️"],
    53: ["Drizzle", "🌦️"],
    55: ["Dense drizzle", "🌧️"],
    56: ["Light freezing drizzle", "🌧️"],
    57: ["Dense freezing drizzle", "🌧️"],
    61: ["Slight rain", "🌧️"],
    63: ["Rain", "🌧️"],
    65: ["Heavy rain", "🌧️"],
    66: ["Light freezing rain", "🌧️"],
    67: ["Heavy freezing rain", "🌧️"],
    71: ["Slight snow", "🌨️"],
    73: ["Snow", "🌨️"],
    75: ["Heavy snow", "❄️"],
    77: ["Snow grains", "🌨️"],
    80: ["Slight rain showers", "🌦️"],
    81: ["Rain showers", "🌧️"],
    82: ["Violent rain showers", "⛈️"],
    85: ["Slight snow showers", "🌨️"],
    86: ["Heavy snow showers", "❄️"],
    95: ["Thunderstorm", "⛈️"],
    96: ["Thunderstorm with slight hail", "⛈️"],
    99: ["Thunderstorm with heavy hail", "⛈️"],
  };

  function wmo(code) {
    return WMO[code] || ["—", "🌡️"];
  }

  function toF(c) {
    return (c * 9) / 5 + 32;
  }

  function fmtTemp(c) {
    if (c == null || Number.isNaN(c)) return "—";
    const v = unit === "f" ? toF(c) : c;
    return `${Math.round(v)}°`;
  }

  function windDir(deg) {
    if (deg == null) return "";
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }

  function setStatus(msg, type) {
    els.status.textContent = "";
    els.status.className = "status" + (type ? " " + type : "");
    if (type === "loading") {
      const spin = document.createElement("span");
      spin.className = "spinner";
      spin.setAttribute("aria-hidden", "true");
      els.status.appendChild(spin);
    }
    els.status.appendChild(document.createTextNode(msg));
    els.status.hidden = !msg;
  }

  function closeSuggestions() {
    els.suggestions.classList.remove("open");
    els.suggestions.innerHTML = "";
    els.q.setAttribute("aria-expanded", "false");
    activeSuggest = -1;
    suggestItems = [];
  }

  function renderSuggestions(results) {
    suggestItems = results || [];
    els.suggestions.innerHTML = "";
    if (!suggestItems.length) {
      closeSuggestions();
      return;
    }
    suggestItems.forEach((r, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", "false");
      const parts = [r.name];
      if (r.admin1) parts.push(r.admin1);
      if (r.country) parts.push(r.country);
      btn.innerHTML = `<strong>${escapeHtml(r.name)}</strong> <span class="sub">${escapeHtml(parts.slice(1).join(", "))}</span>`;
      btn.addEventListener("click", () => {
        closeSuggestions();
        loadWeather({
          lat: r.latitude,
          lon: r.longitude,
          name: formatPlace(r),
          tz: r.timezone,
        });
      });
      els.suggestions.appendChild(btn);
    });
    els.suggestions.classList.add("open");
    els.q.setAttribute("aria-expanded", "true");
    activeSuggest = -1;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&")
      .replace(/</g, "<")
      .replace(/>/g, ">")
      .replace(/"/g, """);
  }

  function formatPlace(r) {
    const parts = [r.name];
    if (r.admin1 && r.admin1 !== r.name) parts.push(r.admin1);
    if (r.country) parts.push(r.country);
    return parts.join(", ");
  }

  async function searchPlaces(query) {
    const url =
      GEO_URL +
      "?name=" +
      encodeURIComponent(query) +
      "&count=6&language=en&format=json";
    const res = await fetch(url);
    if (!res.ok) throw new Error("Place search failed");
    const data = await res.json();
    return data.results || [];
  }

  async function fetchWeather(lat, lon, tz) {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lon),
      current: [
        "temperature_2m",
        "relative_humidity_2m",
        "apparent_temperature",
        "is_day",
        "precipitation",
        "weather_code",
        "cloud_cover",
        "pressure_msl",
        "wind_speed_10m",
        "wind_direction_10m",
        "wind_gusts_10m",
      ].join(","),
      hourly: [
        "temperature_2m",
        "precipitation_probability",
        "weather_code",
        "is_day",
      ].join(","),
      daily: [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "precipitation_probability_max",
        "wind_speed_10m_max",
      ].join(","),
      timezone: tz || "auto",
      forecast_days: "7",
    });
    const res = await fetch(WX_URL + "?" + params.toString());
    if (!res.ok) throw new Error("Weather request failed");
    return res.json();
  }

  async function loadWeather({ lat, lon, name, tz }) {
    setStatus("Loading forecast…", "loading");
    els.results.classList.remove("show");
    try {
      const wx = await fetchWeather(lat, lon, tz);
      lastPayload = { place: name, lat, lon, wx };
      renderAll();
      setStatus("");
      els.results.classList.add("show");
      highlightChip(lat, lon);
    } catch (err) {
      console.error(err);
      setStatus("Could not load weather. Check your connection and try again.", "error");
    }
  }

  function highlightChip(lat, lon) {
    document.querySelectorAll(".chip").forEach((c) => {
      const clat = parseFloat(c.dataset.lat);
      const clon = parseFloat(c.dataset.lon);
      const active =
        Math.abs(clat - lat) < 0.05 && Math.abs(clon - lon) < 0.05;
      c.classList.toggle("active", active);
    });
  }

  function renderAll() {
    if (!lastPayload) return;
    const { place, wx } = lastPayload;
    const cur = wx.current;
    const [label, emoji] = wmo(cur.weather_code);

    els.place.textContent = place;
    els.icon.textContent = emoji;
    els.temp.textContent = fmtTemp(cur.temperature_2m);
    els.cond.textContent = label;
    els.feels.textContent =
      "Feels like " +
      fmtTemp(cur.apparent_temperature) +
      (cur.time
        ? " · Updated " +
          new Date(cur.time).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })
        : "");

    const stats = [
      ["Humidity", (cur.relative_humidity_2m ?? "—") + "%"],
      [
        "Wind",
        cur.wind_speed_10m != null
          ? Math.round(cur.wind_speed_10m) +
            " km/h " +
            windDir(cur.wind_direction_10m)
          : "—",
      ],
      [
        "Gusts",
        cur.wind_gusts_10m != null
          ? Math.round(cur.wind_gusts_10m) + " km/h"
          : "—",
      ],
      [
        "Rain",
        cur.precipitation != null ? cur.precipitation + " mm" : "—",
      ],
      [
        "Clouds",
        cur.cloud_cover != null ? cur.cloud_cover + "%" : "—",
      ],
      [
        "Pressure",
        cur.pressure_msl != null
          ? Math.round(cur.pressure_msl) + " hPa"
          : "—",
      ],
    ];
    els.stats.innerHTML = stats
      .map(
        ([k, v]) =>
          `<div class="stat"><strong>${escapeHtml(String(v))}</strong><span>${escapeHtml(k)}</span></div>`
      )
      .join("");

    renderHourly(wx);
    renderDaily(wx);
  }

  function renderHourly(wx) {
    const h = wx.hourly;
    if (!h || !h.time) {
      els.hourly.innerHTML = "";
      return;
    }
    const now = Date.now();
    let start = 0;
    for (let i = 0; i < h.time.length; i++) {
      if (new Date(h.time[i]).getTime() >= now - 30 * 60 * 1000) {
        start = i;
        break;
      }
    }
    const end = Math.min(start + 24, h.time.length);
    const frag = document.createDocumentFragment();
    for (let i = start; i < end; i++) {
      const [, emoji] = wmo(h.weather_code[i]);
      const t = new Date(h.time[i]);
      const hourLabel = t.toLocaleTimeString(undefined, {
        hour: "numeric",
      });
      const pop = h.precipitation_probability?.[i];
      const card = document.createElement("div");
      card.className = "hour-card";
      card.innerHTML = `
        <div class="h">${escapeHtml(hourLabel)}</div>
        <div class="ico" aria-hidden="true">${emoji}</div>
        <div class="t">${fmtTemp(h.temperature_2m[i])}</div>
        <div class="p">${pop != null && pop > 0 ? pop + "%" : ""}</div>`;
      frag.appendChild(card);
    }
    els.hourly.innerHTML = "";
    els.hourly.appendChild(frag);
  }

  function renderDaily(wx) {
    const d = wx.daily;
    if (!d || !d.time) {
      els.daily.innerHTML = "";
      return;
    }
    const frag = document.createDocumentFragment();
    for (let i = 0; i < d.time.length; i++) {
      const date = new Date(d.time[i] + "T12:00:00");
      const name =
        i === 0
          ? "Today"
          : date.toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
            });
      const [label, emoji] = wmo(d.weather_code[i]);
      const pop = d.precipitation_probability_max?.[i];
      const rain = d.precipitation_sum?.[i];
      const row = document.createElement("div");
      row.className = "day-row";
      row.innerHTML = `
        <div class="name">${escapeHtml(name)}</div>
        <div class="ico" title="${escapeHtml(label)}" aria-label="${escapeHtml(label)}">${emoji}</div>
        <div class="range">${fmtTemp(d.temperature_2m_max[i])} / ${fmtTemp(d.temperature_2m_min[i])}</div>
        <div class="meta hide-sm">${
          pop != null ? pop + "% rain" : rain != null ? rain + " mm" : ""
        }</div>`;
      frag.appendChild(row);
    }
    els.daily.innerHTML = "";
    els.daily.appendChild(frag);
  }

  els.btnSearch.addEventListener("click", async () => {
    const q = els.q.value.trim();
    if (!q) {
      setStatus("Type a city name, or use Near me.", "error");
      return;
    }
    setStatus("Searching…", "loading");
    try {
      const results = await searchPlaces(q);
      if (!results.length) {
        setStatus("No places found. Try another name.", "error");
        closeSuggestions();
        return;
      }
      const r = results[0];
      closeSuggestions();
      await loadWeather({
        lat: r.latitude,
        lon: r.longitude,
        name: formatPlace(r),
        tz: r.timezone,
      });
    } catch (err) {
      console.error(err);
      setStatus("Search failed. Try again.", "error");
    }
  });

  els.q.addEventListener("input", () => {
    const q = els.q.value.trim();
    clearTimeout(suggestTimer);
    if (q.length < 2) {
      closeSuggestions();
      return;
    }
    suggestTimer = setTimeout(async () => {
      try {
        const results = await searchPlaces(q);
        renderSuggestions(results);
      } catch {
        closeSuggestions();
      }
    }, 280);
  });

  els.q.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (activeSuggest >= 0 && suggestItems[activeSuggest]) {
        const r = suggestItems[activeSuggest];
        closeSuggestions();
        loadWeather({
          lat: r.latitude,
          lon: r.longitude,
          name: formatPlace(r),
          tz: r.timezone,
        });
      } else {
        els.btnSearch.click();
      }
      return;
    }
    if (!suggestItems.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSuggest = (activeSuggest + 1) % suggestItems.length;
      updateSuggestHighlight();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSuggest =
        (activeSuggest - 1 + suggestItems.length) % suggestItems.length;
      updateSuggestHighlight();
    } else if (e.key === "Escape") {
      closeSuggestions();
    }
  });

  function updateSuggestHighlight() {
    const buttons = els.suggestions.querySelectorAll("button");
    buttons.forEach((b, i) => {
      b.setAttribute("aria-selected", i === activeSuggest ? "true" : "false");
    });
  }

  document.addEventListener("click", (e) => {
    if (!els.suggestions.contains(e.target) && e.target !== els.q) {
      closeSuggestions();
    }
  });

  els.btnLocate.addEventListener("click", () => {
    if (!navigator.geolocation) {
      setStatus("Geolocation is not supported in this browser.", "error");
      return;
    }
    setStatus("Getting your location…", "loading");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await loadWeather({
          lat: latitude,
          lon: longitude,
          name: "Your location (" + latitude.toFixed(2) + ", " + longitude.toFixed(2) + ")",
          tz: "auto",
        });
      },
      (err) => {
        let msg = "Could not get your location.";
        if (err.code === 1) msg = "Location permission denied. Search for a city instead.";
        else if (err.code === 2) msg = "Location unavailable. Search for a city instead.";
        else if (err.code === 3) msg = "Location request timed out. Try again or search.";
        setStatus(msg, "error");
      },
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 300000 }
    );
  });

  document.querySelectorAll(".chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      loadWeather({
        lat: parseFloat(chip.dataset.lat),
        lon: parseFloat(chip.dataset.lon),
        name: chip.dataset.name,
        tz: "auto",
      });
    });
  });

  function setUnit(next) {
    unit = next;
    els.unitC.classList.toggle("active", unit === "c");
    els.unitF.classList.toggle("active", unit === "f");
    els.unitC.setAttribute("aria-pressed", unit === "c" ? "true" : "false");
    els.unitF.setAttribute("aria-pressed", unit === "f" ? "true" : "false");
    if (lastPayload) renderAll();
  }
  els.unitC.addEventListener("click", () => setUnit("c"));
  els.unitF.addEventListener("click", () => setUnit("f"));

  loadWeather({
    lat: 27.7172,
    lon: 85.324,
    name: "Kathmandu, Nepal",
    tz: "Asia/Kathmandu",
  });
})();
