import { useState, useEffect } from 'react';
import "./App.css";
import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Papa from "papaparse";

// Fix Leaflet default icon paths (prevents broken marker icons with many bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png",
});

// Child component that gets the map instance via useMap and flies to coords
function FlyToLocation({ coords, zoom = 17 }) {
  const map = useMap();

  useEffect(() => {
    if (!coords || !map) return;
    try {
      map.flyTo([coords.lat, coords.lon], zoom, { duration: 1.2 });
      console.log("flyTo called on map with", coords.lat, coords.lon);
    } catch (err) {
      console.error("FlyTo error:", err);
      try { map.setView([coords.lat, coords.lon], zoom); } catch (e) { console.error(e); }
    }
  }, [coords, map, zoom]);

  return null;
}

function App() {
  const [coords, setCoords] = useState(null);
  const [students , setStudents] = useState([]);

  // default center (lat, lon) - KMM
  const defaultCenter = [2.3311595377493672, 102.08833464867534];

  // load location markers from KMM_Masterfile.csv
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}KMM_Masterfile.csv`)
      .then((r) => r.text())
      .then((txt) => {
        Papa.parse(txt, {
          header: true,
          skipEmptyLines: true,
          complete: (res) => {
            const parsed = res.data
              .map((row, i) => ({
                id: row["Bil"] ?? String(i),
                name: row["Nama"] ?? "Tanpa Nama",
                matrik: row["No Matrik"] ?? "",
                lat: parseFloat(row["Latitude"]),
                lon: parseFloat(row["Longitude"]),
                alamat: row["Alamat"] ?? "",
                tel1: row["Telefon 1"]?.trim() || "N/A",
                tel2: row["Telefon 2"]?.trim() || "N/A",
                jurusan: row["Jurusan"] ?? "",
                sds: row["SDS / SES"] ?? "",
              }))
              .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lon));
            setStudents(parsed);
            console.log("Loaded students:", parsed.length);
          },
          error: (err) => {
            console.error("CSV parse error:", err);
          },
        });
      })
      .catch((err) => {
        console.error("Failed to fetch locations.csv:", err);
      });
  }, []);

  // request geolocation once on mount
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      console.error("Geolocation not supported by this browser");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setCoords({ lat: latitude, lon: longitude, accuracy: pos.coords.accuracy });
        console.log("User coordinates:", latitude, longitude, "accuracy:", pos.coords.accuracy);
      },
      (err) => {
        console.error("Geolocation error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return (
    <MapContainer
      center={defaultCenter}
      zoom={17}
      className="leaflet-container"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* attach the FlyToLocation child only when we have coords */}
      {coords && <FlyToLocation coords={coords} zoom={17} />}

      {/* Markers from CSV */}
          {students.map((loc) => (
            <Marker key={loc.id} position={[loc.lat, loc.lon]}>
              <Popup>
                <strong>{loc.name}</strong>
                <div style={{ marginTop: 6 }}>{loc.description}</div>
                <p style={{ margin: "4px 0" }}>Matrik ID: {loc.matrik}</p>
                <p style={{ margin: "4px 0" }}>Course: {loc.sds} {loc.jurusan}</p>
                <p style={{ margin: "4px 0", fontStyle: "italic" }}>{loc.alamat}</p>
                <div style={{ display: "flex", flexDirection: "row", justifyContent: "flex-start", alignItems: "left", gap: "1em"}}>
                  <p style={{ margin: 0, fontStyle: "italic",}}>Tel 1: {loc.tel1}</p>
                  <p style={{ margin: 0, fontStyle: "italic",}}>Tel 2: {loc.tel2}</p>
                </div>
              </Popup>
            </Marker>
          ))}
    </MapContainer>
  );
}

export default App;
