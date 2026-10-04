(function () {
  const $ = (id) => document.getElementById(id);
  const status = $("status");
  const map = L.map("map", { scrollWheelZoom: true }).setView([28.3, 84.1], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 16,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  const layers = { province: null, district: null, local: null };
  const data = {};
  const colors = ["#e6f4f6", "#9fd3dc", "#4ea8b8", "#0b7285", "#075866"];
  let joined = null;

  const DAMAGE_COLORS = {
    destroyed: "#7f1d1d",
    "major-damage": "#b91c1c",
    "minor-damage": "#ea580c",
    "no-visible-damage": "#65a30d"
  };

  const FLOOD = [
    {
      id: "flood-extent",
      name: "Flood extent (27 Aug 2026)",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_flood_extent.geojson",
      color: "#1d4ed8",
      fillOpacity: 0.35,
      weight: 1.5,
      heavy: false
    },
    {
      id: "bridge-damage",
      name: "Bridge damage",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_bridge_damage.geojson",
      color: "#b45309",
      fillOpacity: 0.5,
      weight: 2,
      heavy: false
    },
    {
      id: "hydropower",
      name: "Exposed hydropower",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_exposed_hydropowers.geojson",
      color: "#6d28d9",
      fillOpacity: 0.55,
      weight: 2,
      heavy: false
    },
    {
      id: "aoi",
      name: "Flood area of interest",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/combined/hot_flood_npl_aoi.geojson",
      color: "#0e7490",
      fillOpacity: 0.08,
      weight: 1.5,
      heavy: false
    },
    {
      id: "buildings-ai",
      name: "Building damage (AI)",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/buildings/hot_flood_npl_buildings_damage.geojson",
      color: "#9f1239",
      fillOpacity: 0.45,
      weight: 0.8,
      heavy: true,
      styleBy: "damage"
    },
    {
      id: "buildings-manual",
      name: "Buildings (manual OSM)",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/buildings/hot_flood_npl_buildings_damage_manual_validated.geojson",
      color: "#be123c",
      fillOpacity: 0.5,
      weight: 0.8,
      heavy: true
    },
    {
      id: "destroyed-features",
      name: "Destroyed / damaged features",
      url: "https://production-raw-data-api.s3.amazonaws.com/ISO3/NPL/destroyed_features/hot_flood_npl_destroyed_features_osm.geojson",
      color: "#7f1d1d",
      fillOpacity: 0.4,
      weight: 1,
      heavy: true
    }
  ];

  const floodState = {};
  FLOOD.forEach((d) => {
    floodState[d.id] = { def: d, layer: null, loaded: false, loading: false };
  });

  function setStatus(t) {
    if (status) status.textContent = t || "";
  }

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\u0900-\u097f]+/g, "");
  }

  function styleFor(feature) {
    const base = { color: "#075866", weight: 1, fillOpacity: 0.45, fillColor: "#9fd3dc" };
    if (!joined) return base;
    const key = norm(feature.properties.name);
    const v = joined.values.get(key);
    if (v == null) return Object.assign(base, { fillColor: "#e8eef0", fillOpacity: 0.25 });
    const t = joined.max === joined.min ? 1 : (v - joined.min) / (joined.max - joined.min);
    const idx = Math.min(colors.length - 1, Math.floor(t * colors.length));
    return Object.assign(base, { fillColor: colors[idx], fillOpacity: 0.75 });
  }

  function onEach(feature, layer) {
    const p = feature.properties;
    const extra =
      joined && joined.values.get(norm(p.name)) != null
        ? `<br>Value: ${joined.values.get(norm(p.name))}`
        : "";
    const ne = p.name_ne ? ` (${p.name_ne})` : "";
    const type = p.type ? `<br>${p.type}` : "";
    const dist = p.district ? `<br>${p.district}` : "";
    layer.bindPopup(
      `<strong>${p.name || "Area"}${ne}</strong>${type}${dist}${p.province ? "<br>" + p.province : ""}${extra}`
    );
  }

  function draw(key) {
    if (layers[key]) {
      map.removeLayer(layers[key]);
      layers[key] = null;
    }
    if (!data[key]) return;
    layers[key] = L.geoJSON(data[key], { style: styleFor, onEachFeature: onEach }).addTo(map);
  }

  async function load(key, file, box) {
    if (!box.checked) {
      if (layers[key]) {
        map.removeLayer(layers[key]);
        layers[key] = null;
      }
      return;
    }
    if (!data[key]) {
      setStatus("Loading " + key + "…");
      const res = await fetch("data/" + file);
      if (!res.ok) throw new Error("Could not load " + file);
      data[key] = await res.json();
    }
    draw(key);
    setStatus("");
  }

  async function sync() {
    try {
      await load("province", "provinces.geojson", $("ly-province"));
      await load("district", "districts.geojson", $("ly-district"));
      await load("local", "local-levels.geojson", $("ly-local"));
    } catch (e) {
      setStatus(e.message);
    }
  }

  function popupFlood(props) {
    if (!props) return "";
    const prefer = ["damage", "status", "name", "Name", "bridge", "building", "highway", "osm_id"];
    const keys = Object.keys(props).filter((k) => props[k] != null && props[k] !== "" && typeof props[k] !== "object");
    const ordered = prefer
      .filter((k) => keys.indexOf(k) !== -1)
      .concat(keys.filter((k) => prefer.indexOf(k) === -1).slice(0, 10));
    if (!ordered.length) return "<em>No attributes</em>";
    return (
      "<table style='font-size:12px'>" +
      ordered
        .map(
          (k) =>
            "<tr><td style='padding-right:8px'><strong>" +
            String(k).replace(/</g, "&lt;") +
            "</strong></td><td>" +
            String(props[k]).replace(/</g, "&lt;") +
            "</td></tr>"
        )
        .join("") +
      "</table>"
    );
  }

  function floodStyle(def, feature) {
    const p = feature.properties || {};
    let color = def.color;
    if (def.styleBy === "damage" && p.damage) {
      color = DAMAGE_COLORS[String(p.damage).toLowerCase()] || def.color;
    } else if (p.status) {
      const st = String(p.status).toLowerCase();
      if (st.indexOf("destroy") !== -1) color = "#7f1d1d";
      else if (st.indexOf("damage") !== -1) color = "#ea580c";
    }
    return { color, weight: def.weight, opacity: 0.9, fillColor: color, fillOpacity: def.fillOpacity };
  }

  async function setFloodVisible(def, on) {
    const st = floodState[def.id];
    if (!on) {
      if (st.layer && map.hasLayer(st.layer)) map.removeLayer(st.layer);
      return;
    }
    if (st.loading) return;
    if (!st.loaded) {
      st.loading = true;
      setStatus(def.heavy ? "Loading " + def.name + " (large file)…" : "Loading " + def.name + "…");
      try {
        const res = await fetch(def.url, { mode: "cors" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const geojson = await res.json();
        st.layer = L.geoJSON(geojson, {
          style: (f) => floodStyle(def, f),
          pointToLayer: (f, ll) => {
            const p = f.properties || {};
            let color = def.color;
            if (def.styleBy === "damage" && p.damage) {
              color = DAMAGE_COLORS[String(p.damage).toLowerCase()] || def.color;
            }
            return L.circleMarker(ll, { radius: 5, color, weight: 1, fillColor: color, fillOpacity: 0.75 });
          },
          onEachFeature: (feature, layer) => {
            const html = popupFlood(feature.properties);
            if (html) layer.bindPopup(html, { maxWidth: 280 });
          }
        });
        st.loaded = true;
      } catch (err) {
        setStatus("Could not load " + def.name + ": " + err.message);
        const input = $("ly-" + def.id);
        if (input) input.checked = false;
        st.loading = false;
        return;
      }
      st.loading = false;
      setStatus("");
    }
    if (st.layer && !map.hasLayer(st.layer)) st.layer.addTo(map);
    try {
      const bounds = st.layer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28], maxZoom: 12 });
    } catch (e) {}
  }

  function fitFloodLayers() {
    const group = [];
    FLOOD.forEach((d) => {
      const st = floodState[d.id];
      if (st.layer && map.hasLayer(st.layer)) group.push(st.layer);
    });
    if (!group.length) {
      map.setView([28.12, 85.28], 10);
      return;
    }
    try {
      map.fitBounds(L.featureGroup(group).getBounds(), { padding: [28, 28], maxZoom: 12 });
    } catch (e) {}
  }

  function activeFeatures() {
    const out = [];
    ["province", "district", "local"].forEach((k) => {
      const box = $("ly-" + k);
      if (box && box.checked && data[k]) data[k].features.forEach((f) => out.push({ key: k, f }));
    });
    return out;
  }

  function search() {
    const q = norm($("q").value);
    const ul = $("results");
    ul.innerHTML = "";
    if (q.length < 2) return;
    const hits = activeFeatures()
      .filter((x) => norm(x.f.properties.name).includes(q) || norm(x.f.properties.name_ne).includes(q))
      .slice(0, 12);
    hits.forEach((h) => {
      const li = document.createElement("li");
      li.textContent =
        h.f.properties.name + (h.f.properties.name_ne ? " · " + h.f.properties.name_ne : "") + " · " + h.key;
      li.onclick = () => {
        const layer = L.geoJSON(h.f);
        map.fitBounds(layer.getBounds(), { maxZoom: 11 });
        setStatus(h.f.properties.name);
      };
      ul.appendChild(li);
    });
    if (!hits.length) setStatus("No match in the boundary layers that are on.");
  }

  function parseCsv(text) {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const values = new Map();
    lines.forEach((line, i) => {
      const parts = line.split(/[,;\t]/).map((s) => s.trim().replace(/^"|"$/g, ""));
      if (parts.length < 2) return;
      if (i === 0 && /name|district|province|palika/i.test(parts[0]) && /value|count|number/i.test(parts[1])) return;
      const n = Number(String(parts[1]).replace(/,/g, ""));
      if (!Number.isFinite(n)) return;
      values.set(norm(parts[0]), n);
    });
    return values;
  }

  function applyJoin() {
    const values = parseCsv($("csv").value);
    if (!values.size) {
      setStatus("No numeric rows found. Use name,value.");
      return;
    }
    const nums = [...values.values()];
    joined = { values, min: Math.min(...nums), max: Math.max(...nums) };
    ["province", "district", "local"].forEach((k) => {
      if (layers[k]) draw(k);
    });
    const names = new Set();
    activeFeatures().forEach((x) => names.add(norm(x.f.properties.name)));
    let matched = 0;
    const miss = [];
    values.forEach((v, k) => {
      if (names.has(k)) matched++;
      else miss.push(k);
    });
    const legend = $("legend");
    legend.hidden = false;
    legend.innerHTML =
      colors.map((c) => `<span class="swatch" style="background:${c}"></span>`).join("") +
      `<span>${joined.min} – ${joined.max}</span>`;
    setStatus(
      `Joined ${matched} of ${values.size} rows` + (miss.length ? ". Unmatched: " + miss.slice(0, 5).join(", ") : "")
    );
  }

  $("ly-province").onchange = sync;
  $("ly-district").onchange = sync;
  $("ly-local").onchange = sync;
  FLOOD.forEach((def) => {
    const input = $("ly-" + def.id);
    if (!input) return;
    input.addEventListener("change", () => setFloodVisible(def, input.checked));
  });
  const fitBtn = $("btn-fit-flood");
  if (fitBtn) fitBtn.addEventListener("click", fitFloodLayers);
  const clearFlood = $("btn-clear-flood");
  if (clearFlood) {
    clearFlood.addEventListener("click", () => {
      FLOOD.forEach((def) => {
        const input = $("ly-" + def.id);
        if (input && input.checked) {
          input.checked = false;
          setFloodVisible(def, false);
        }
      });
      setStatus("Flood layers hidden");
    });
  }

  $("q").addEventListener("input", search);
  $("join").onclick = applyJoin;
  $("sample").onclick = () => {
    $("csv").value =
      "name,value\nKoshi,42\nMadhesh,55\nBagmati,80\nGandaki,36\nLumbini,48\nKarnali,22\nSudurpashchim,30";
    $("ly-province").checked = true;
    sync().then(applyJoin);
  };
  $("clear-join").onclick = () => {
    joined = null;
    $("csv").value = "";
    $("legend").hidden = true;
    ["province", "district", "local"].forEach((k) => {
      if (layers[k]) draw(k);
    });
    setStatus("Join cleared");
  };
  $("file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    $("csv").value = await file.text();
    applyJoin();
  };
  $("geo").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const fc = JSON.parse(await file.text());
      const layer = L.geoJSON(fc, { style: { color: "#b45309", weight: 2, fillOpacity: 0.2 } }).addTo(map);
      map.fitBounds(layer.getBounds());
      setStatus("Overlay added: " + file.name);
    } catch (err) {
      setStatus("Could not read GeoJSON");
    }
  };

  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();

  const params = new URLSearchParams(location.search);
  const wantFlood =
    params.get("flood") === "1" ||
    params.get("layer") === "rasuwa" ||
    location.hash.toLowerCase().indexOf("rasuwa") !== -1 ||
    location.hash.toLowerCase().indexOf("flood") !== -1;
  if (wantFlood) {
    ["flood-extent", "bridge-damage", "hydropower"].forEach((id) => {
      const input = $("ly-" + id);
      if (input) {
        input.checked = true;
        const def = FLOOD.find((d) => d.id === id);
        if (def) setFloodVisible(def, true);
      }
    });
  }

  sync();
})();
