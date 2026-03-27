import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon
const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface LoginLocation {
  lat: number;
  lon: number;
  city: string;
  country: string;
  ip: string;
  timestamp: string;
}

// Subcomponent to trigger map re-centering when data arrives
function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

export default function LoginMap() {
  const [locations, setLocations] = useState<LoginLocation[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get('/security/login-locations');
        setLocations(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetch();
  }, []);

  const center: [number, number] = locations.length > 0
    ? [locations[0].lat, locations[0].lon]
    : [13.08, 80.27]; // Default: Chennai

  return (
    <MapContainer
      center={center}
      zoom={4}
      scrollWheelZoom={true}
      style={{ height: '100%', width: '100%', borderRadius: '12px' }}
    >
      <ChangeView center={center} zoom={4} />
      <TileLayer
        attribution='&copy; <a href="https://carto.com">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      {locations.map((loc, i) => (
        <Marker key={i} position={[loc.lat, loc.lon]} icon={defaultIcon}>
          <Popup>
            <div style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: 12 }}>
              <strong>{loc.city}, {loc.country}</strong><br />
              IP: {loc.ip}<br />
              {new Date(loc.timestamp).toLocaleString()}
            </div>
          </Popup>
        </Marker>
      ))}
      {locations.length > 0 && (
        <Circle
          center={[locations[0].lat, locations[0].lon]}
          radius={50000}
          pathOptions={{
            color: '#6366f1',
            fillColor: '#6366f1',
            fillOpacity: 0.1,
          }}
        />
      )}
    </MapContainer>
  );
}
