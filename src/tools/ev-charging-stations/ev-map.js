(function () {
  const $ = (id) => document.getElementById(id);
  const map = L.map("map").setView([28.2, 84.0], 7);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
  const group = L.layerGroup().addTo(map);
  let stations = [];

  function setStatus(t) { $("status").textContent = t; }

  function point(el) {
    if (el.type === "node") return [el.lat, el.lon];
    if (el.center) return [el.center.lat, el.center.lon];
    return null;
  }

  function render(list) {
    group.clearLayers();
    const ul = $("list");
    ul.innerHTML = "";
    list.forEach((s) => {
      const marker = L.circleMarker(s.ll, { radius: 7, color: "#075866", fillColor: "#0b7285", fillOpacity: 0.9, weight: 1 });
      const bits = [s.name || "EV charger"];
      if (s.operator) bits.push(s.operator);
      if (s.socket) bits.push(s.socket);
      marker.bindPopup("<strong>" + bits[0] + "</strong><br>" + bits.slice(1).join("<br>"));
      marker.addTo(group);
      const li = document.createElement("li");
      li.textContent = bits.join(" · ");
      li.onclick = () => { map.setView(s.ll, 14); marker.openPopup(); };
      ul.appendChild(li);
    });
    setStatus(list.length + " station" + (list.length === 1 ? "" : "s") + " shown");
  }

  function filter() {
    const q = $("q").value.trim().toLowerCase();
    if (!q) return render(stations);
    render(stations.filter((s) => (s.name + " " + s.operator + " " + s.socket).toLowerCase().includes(q)));
  }

  async function load() {
    setStatus("Loading stations from OpenStreetMap…");
    const query = `[out:json][timeout:25];area["name"="Nepal"]["admin_level"="2"]->.a;(node["amenity"="charging_station"](area.a);way["amenity"="charging_station"](area.a););out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
      headers: { "Content-Type": "text/plain" }
    });
    if (!res.ok) throw new Error("Map data service is busy. Try Reload.");
    const json = await res.json();
    stations = (json.elements || []).map((el) => {
      const ll = point(el);
      if (!ll) return null;
      const tags = el.tags || {};
      const sockets = Object.keys(tags).filter((k) => k.startsWith("socket:")).map((k) => k.slice(7) + (tags[k] ? " ×" + tags[k] : ""));
      return { ll, name: tags.name || "", operator: tags.operator || "", socket: sockets.join(", ") };
    }).filter(Boolean);
    if (!stations.length) setStatus("No public chargers tagged yet. Try Reload later.");
    filter();
    if (stations.length) map.fitBounds(L.latLngBounds(stations.map((s) => s.ll)).pad(0.2));
  }

  $("reload").onclick = () => load().catch((e) => setStatus(e.message));
  $("q").addEventListener("input", filter);
  $("near").onclick = () => {
    if (!navigator.geolocation) { setStatus("Location is not available in this browser."); return; }
    setStatus("Finding your location…");
    navigator.geolocation.getCurrentPosition((pos) => {
      const here = [pos.coords.latitude, pos.coords.longitude];
      map.setView(here, 12);
      L.circleMarker(here, { radius: 6, color: "#b45309", fillColor: "#f59e0b", fillOpacity: 1 }).addTo(map).bindPopup("You");
      stations.sort((a, b) => map.distance(here, a.ll) - map.distance(here, b.ll));
      filter();
    }, () => setStatus("Location permission was denied."));
  };
  const yr = document.getElementById("yr");
  if (yr) yr.textContent = new Date().getFullYear();
  load().catch((e) => setStatus(e.message));
})();
