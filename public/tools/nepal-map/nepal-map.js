(function () {
  const $ = (id) => document.getElementById(id);
  const status = $("status");
  const map = L.map("map", { scrollWheelZoom: true }).setView([28.3, 84.1], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 16,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  const layers = { province: null, district: null, local: null };
  const data = {};
  const colors = ["#e6f4f6", "#9fd3dc", "#4ea8b8", "#0b7285", "#075866"];
  let joined = null;

  function setStatus(t) { status.textContent = t || ""; }

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
    const extra = joined && joined.values.get(norm(p.name)) != null ? `<br>Value: ${joined.values.get(norm(p.name))}` : "";
    const ne = p.name_ne ? ` (${p.name_ne})` : "";
    const type = p.type ? `<br>${p.type}` : "";
    const dist = p.district ? `<br>${p.district}` : "";
    layer.bindPopup(`<strong>${p.name || "Area"}${ne}</strong>${type}${dist}${p.province ? "<br>" + p.province : ""}${extra}`);
  }

  function draw(key) {
    if (layers[key]) { map.removeLayer(layers[key]); layers[key] = null; }
    if (!data[key]) return;
    layers[key] = L.geoJSON(data[key], { style: styleFor, onEachFeature: onEach }).addTo(map);
  }

  async function load(key, file, box) {
    if (!box.checked) {
      if (layers[key]) { map.removeLayer(layers[key]); layers[key] = null; }
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

  function norm(s) {
    return String(s || "").toLowerCase().replace(/[^a-z0-9\u0900-\u097f]+/g, "");
  }

  function activeFeatures() {
    const out = [];
    ["province", "district", "local"].forEach((k) => {
      const box = $("ly-" + k);
      if (box.checked && data[k]) data[k].features.forEach((f) => out.push({ key: k, f }));
    });
    return out;
  }

  function search() {
    const q = norm($("q").value);
    const ul = $("results");
    ul.innerHTML = "";
    if (q.length < 2) return;
    const hits = activeFeatures().filter((x) => norm(x.f.properties.name).includes(q) || norm(x.f.properties.name_ne).includes(q)).slice(0, 12);
    hits.forEach((h) => {
      const li = document.createElement("li");
      li.textContent = h.f.properties.name + (h.f.properties.name_ne ? " · " + h.f.properties.name_ne : "") + " · " + h.key;
      li.onclick = () => {
        const layer = L.geoJSON(h.f);
        map.fitBounds(layer.getBounds(), { maxZoom: 11 });
        setStatus(h.f.properties.name);
      };
      ul.appendChild(li);
    });
    if (!hits.length) setStatus("No match in the layers that are on. Turn a layer on, then search.");
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
    if (!values.size) { setStatus("No numeric rows found. Use name,value."); return; }
    const nums = [...values.values()];
    joined = { values, min: Math.min(...nums), max: Math.max(...nums) };
    ["province", "district", "local"].forEach((k) => { if (layers[k]) draw(k); });
    const names = new Set();
    activeFeatures().forEach((x) => names.add(norm(x.f.properties.name)));
    let matched = 0, miss = [];
    values.forEach((v, k) => { if (names.has(k)) matched++; else miss.push(k); });
    const legend = $("legend");
    legend.hidden = false;
    legend.innerHTML = colors.map((c) => `<span class="swatch" style="background:${c}"></span>`).join("") + `<span>${joined.min} – ${joined.max}</span>`;
    setStatus(`Joined ${matched} of ${values.size} rows` + (miss.length ? ". Unmatched: " + miss.slice(0, 5).join(", ") : ""));
  }

  $("ly-province").onchange = sync;
  $("ly-district").onchange = sync;
  $("ly-local").onchange = sync;
  $("q").addEventListener("input", search);
  $("join").onclick = applyJoin;
  $("sample").onclick = () => {
    $("csv").value = "name,value\nKoshi,42\nMadhesh,55\nBagmati,80\nGandaki,36\nLumbini,48\nKarnali,22\nSudurpashchim,30";
    $("ly-province").checked = true;
    sync().then(applyJoin);
  };
  $("clear-join").onclick = () => {
    joined = null;
    $("csv").value = "";
    $("legend").hidden = true;
    ["province", "district", "local"].forEach((k) => { if (layers[k]) draw(k); });
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
  sync();
})();
