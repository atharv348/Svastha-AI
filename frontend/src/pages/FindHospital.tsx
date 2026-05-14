import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MapPin, Navigation, Loader2, Phone, ExternalLink, Stethoscope, RefreshCcw, Search } from 'lucide-react';

interface Hospital {
  id: number;
  name: string;
  lat: number;
  lon: number;
  address: string;
  type: string;
  phone: string | null;
  website: string | null;
}

const FindHospital: React.FC = () => {
  const mapRef = useRef<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [locating, setLocating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);

  const getApproxLocationByIP = useCallback(async (): Promise<[number, number] | null> => {
    const sources = [
      'https://ipapi.co/json/',
      'https://ipwho.is/',
      'https://ipinfo.io/json',
    ];

    for (const source of sources) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(source, { signal: controller.signal });
        clearTimeout(timeout);
        if (!response.ok) continue;

        const data = await response.json();

        let lat: number | null = null;
        let lon: number | null = null;

        if (typeof data.latitude === 'number' && typeof data.longitude === 'number') {
          lat = data.latitude;
          lon = data.longitude;
        } else if (typeof data.lat === 'number' && typeof data.lon === 'number') {
          lat = data.lat;
          lon = data.lon;
        } else if (typeof data.loc === 'string' && data.loc.includes(',')) {
          const [latRaw, lonRaw] = data.loc.split(',');
          lat = Number(latRaw);
          lon = Number(lonRaw);
        }

        if (lat !== null && lon !== null && Number.isFinite(lat) && Number.isFinite(lon)) {
          return [lat, lon];
        }
      } catch {
        // continue to next provider
      }
    }

    return null;
  }, []);

  // ── Overpass query with multiple fallback endpoints ──────────────────────
  const fetchNearbyHospitals = useCallback(async (loc: [number, number]) => {
    setLoading(true);
    setError(null);

    const query = `
      [out:json][timeout:30];
      (
        node["amenity"="hospital"](around:10000,${loc[0]},${loc[1]});
        way["amenity"="hospital"](around:10000,${loc[0]},${loc[1]});
        node["amenity"="clinic"](around:10000,${loc[0]},${loc[1]});
        way["amenity"="clinic"](around:10000,${loc[0]},${loc[1]});
        node["amenity"="doctors"](around:10000,${loc[0]},${loc[1]});
      );
      out center;
    `;

    // Multiple endpoints — try each in order
    const endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter',
      'https://overpass.openstreetmap.ru/api/interpreter',
    ];

    let lastError: any = null;

    for (const endpoint of endpoints) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `data=${encodeURIComponent(query)}`,
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429) {
          // Rate-limited — try next endpoint
          lastError = new Error('Rate limited');
          continue;
        }

        if (!response.ok) {
          lastError = new Error(`HTTP ${response.status}`);
          continue;
        }

        const data = await response.json();

        const results: Hospital[] = (data.elements || []).map((el: any) => ({
          id: el.id,
          name: el.tags?.name || 'Unnamed Medical Centre',
          lat: el.lat ?? el.center?.lat,
          lon: el.lon ?? el.center?.lon,
          address:
            el.tags?.['addr:full'] ||
            [el.tags?.['addr:housenumber'], el.tags?.['addr:street'], el.tags?.['addr:city']]
              .filter(Boolean)
              .join(', ') ||
            'Address not available',
          type: el.tags?.amenity || 'hospital',
          phone: el.tags?.phone || el.tags?.['contact:phone'] || null,
          website: el.tags?.website || el.tags?.['contact:website'] || null,
        })).filter((h: Hospital) => h.lat && h.lon); // drop entries without coordinates

        setHospitals(results);
        setLoading(false);
        return; // success — exit loop
      } catch (err: any) {
        lastError = err;
        // continue to next endpoint
      }
    }

    // All endpoints failed
    console.error('All Overpass endpoints failed:', lastError);
    setError(
      'Could not reach the medical database. Please check your internet connection and try again.'
    );
    setLoading(false);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}`
      );
      const data = await response.json();

      if (data && data.length > 0) {
        const { lat, lon } = data[0];
        const nextLoc: [number, number] = [parseFloat(lat), parseFloat(lon)];
        setUserLocation(nextLoc);

        if (mapRef.current?.map) {
          const { map, userMarker } = mapRef.current;
          if (userMarker) {
            userMarker.setLatLng(nextLoc);
          }
          map.setView(nextLoc, 14, { animate: true });
        }

        fetchNearbyHospitals(nextLoc);
      } else {
        setError('Location not found. Please try a different search term.');
      }
    } catch (err) {
      setError('Failed to search for location. Please try again.');
    } finally {
      setSearching(false);
    }
  };

  // ── Initialise Leaflet map imperatively (avoids MapContainer context bug) ─
  const initMap = useCallback(
    async (loc: [number, number]) => {
      if (!mapContainerRef.current || mapRef.current) return;

      // Dynamically import Leaflet to avoid SSR / strict-mode issues
      const L = (await import('leaflet')).default;
      await import('leaflet/dist/leaflet.css');

      // Fix default marker icons (webpack asset path issue)
      // @ts-ignore
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      });

      const map = L.map(mapContainerRef.current, {
        center: loc,
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // User location marker
      const userIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 3px rgba(37,99,235,0.3);"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });
      const userMarker = L.marker(loc, { icon: userIcon })
        .addTo(map)
        .bindPopup('<b>Your location</b>');

      mapRef.current = { map, L, userMarker, userIcon };
      setMapReady(true);

      // Fix tile loading after container mount
      setTimeout(() => map.invalidateSize(), 300);
    },
    []
  );

  const refreshCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocating(true);
      // Fallback to Nave Pargaon, Kolhapur if geolocation not available
      const fallback: [number, number] = [16.862112, 74.233478];
      setUserLocation(fallback);
      if (mapRef.current?.map) {
        const { map, userMarker } = mapRef.current;
        if (userMarker) {
          userMarker.setLatLng(fallback);
        }
        map.setView(fallback, 13, { animate: true });
      }
      setError('Geolocation not supported. Showing Nave Pargaon, Kolhapur as default.');
      fetchNearbyHospitals(fallback);
      setLocating(false);
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const nextLoc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(nextLoc);

        if (mapRef.current?.map) {
          const { map, L, userMarker, userIcon } = mapRef.current;
          if (userMarker) {
            userMarker.setLatLng(nextLoc);
          } else {
            mapRef.current.userMarker = L.marker(nextLoc, { icon: userIcon })
              .addTo(map)
              .bindPopup('<b>Your location</b>');
          }
          map.setView(nextLoc, 15, { animate: true });
        }

        fetchNearbyHospitals(nextLoc);
        setLocating(false);
      },
      async () => {
        // Fallback to Nave Pargaon, Kolhapur
        const fallback: [number, number] = [16.862112, 74.233478];
        setUserLocation(fallback);
        if (mapRef.current?.map) {
          const { map, userMarker } = mapRef.current;
          if (userMarker) {
            userMarker.setLatLng(fallback);
          }
          map.setView(fallback, 13, { animate: true });
        }
        fetchNearbyHospitals(fallback);
        setError('GPS unavailable. Showing Nave Pargaon, Kolhapur as default.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [fetchNearbyHospitals]);

  // ── Add hospital markers once both map + data are ready ──────────────────
  useEffect(() => {
    if (!mapReady || !mapRef.current || hospitals.length === 0) return;
    const { map, L } = mapRef.current;

    // Remove old hospital markers
    map.eachLayer((layer: any) => {
      if (layer._isHospitalMarker) map.removeLayer(layer);
    });

    const hospitalIcon = L.divIcon({
      html: `<div style="width:28px;height:28px;border-radius:50%;background:#eff6ff;border:2px solid #2563eb;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(37,99,235,0.25);font-size:14px;">+</div>`,
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 14],
    });

    hospitals.forEach((h) => {
      const marker = L.marker([h.lat, h.lon], { icon: hospitalIcon }).addTo(map);
      (marker as any)._isHospitalMarker = true;
      marker.bindPopup(
        `<div style="font-family:system-ui;min-width:160px;">
          <b style="font-size:13px;">${h.name}</b>
          <p style="font-size:11px;color:#64748b;margin:4px 0;">${h.address}</p>
          ${h.phone ? `<a href="tel:${h.phone}" style="font-size:11px;color:#2563eb;">📞 ${h.phone}</a>` : ''}
        </div>`
      );
    });
  }, [mapReady, hospitals]);

  // ── Pan map to selected hospital ──────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedHospital) return;
    const { map } = mapRef.current;
    map.setView([selectedHospital.lat, selectedHospital.lon], 16, { animate: true });
  }, [selectedHospital]);

  // ── Geolocation + bootstrap ───────────────────────────────────────────────
  useEffect(() => {
    // Default/fallback location: Nave Pargaon, Kolhapur, Maharashtra, India
    const defaultLocation: [number, number] = [16.862112, 74.233478];
    let watchId: number | null = null;

    const onLocationSuccess = (pos: GeolocationPosition) => {
      const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
      console.log("Got current position (success):", loc);
      setUserLocation(loc);
      initMap(loc);
      fetchNearbyHospitals(loc);
    };

    const onLocationError = (err: GeolocationPositionError) => {
      console.log("getCurrentPosition error:", err);
      // Fallback to Nave Pargaon, Kolhapur if GPS fails
      setError('GPS unavailable. Showing Nave Pargaon, Kolhapur as default.');
      setUserLocation(defaultLocation);
      initMap(defaultLocation);
      fetchNearbyHospitals(defaultLocation);
    };

    console.log("Requesting geolocation permission...");
    if (navigator.geolocation) {
      // First, try to get current position with high accuracy
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        onLocationError,
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );

      // Also set up a watch to get more accurate location once available
      watchId = navigator.geolocation.watchPosition(
        (updatedPos) => {
          const refinedLoc: [number, number] = [updatedPos.coords.latitude, updatedPos.coords.longitude];
          console.log("Got refined position:", refinedLoc);
          setUserLocation(refinedLoc);
          if (mapRef.current?.map && mapRef.current?.userMarker) {
            mapRef.current.userMarker.setLatLng(refinedLoc);
            mapRef.current.map.setView(refinedLoc, 15, { animate: true });
          }
          fetchNearbyHospitals(refinedLoc);
        },
        null,
        { enableHighAccuracy: true, maximumAge: 0 }
      );
    } else {
      console.log("navigator.geolocation not available");
      setError('Device location unavailable. Showing Nave Pargaon, Kolhapur as default.');
      setUserLocation(defaultLocation);
      initMap(defaultLocation);
      fetchNearbyHospitals(defaultLocation);
    }

    // Cleanup on unmount
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (mapRef.current?.map) {
        mapRef.current.map.remove();
        mapRef.current = null;
      }
    };
  }, [initMap, fetchNearbyHospitals]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#f8fafc', fontFamily: 'Syne, system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '24px 24px 16px', background: 'white', borderBottom: '1px solid #e2e8f0' }}>
        <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
          <Stethoscope size={22} style={{ color: '#2563eb' }} />
          Nearby Hospitals & Clinics
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {loading ? 'Searching within 10km of your location...' : `Found ${hospitals.length} medical facilities nearby`}
          </p>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Search city or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  padding: '8px 12px 8px 32px',
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  fontSize: 13,
                  width: 240,
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
            </div>
            <button
              type="submit"
              disabled={searching || !searchQuery.trim()}
              style={{
                padding: '8px 16px',
                background: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                opacity: searching || !searchQuery.trim() ? 0.6 : 1
              }}
            >
              {searching ? 'Searching...' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 500 }}>
        {/* Map */}
        <div style={{ flex: 1, position: 'relative', background: '#e2e8f0' }}>
          <div ref={mapContainerRef} style={{ width: '100%', height: '100%', minHeight: 500 }} />

          {/* Loading overlay */}
          {!mapReady && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', zIndex: 999 }}>
              <div style={{ textAlign: 'center' }}>
                <Loader2 size={36} style={{ color: '#2563eb', animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Initializing map...</p>
              </div>
            </div>
          )}

          {/* Scanning badge */}
          {loading && mapReady && (
            <div style={{ position: 'absolute', top: 12, right: 12, zIndex: 1000, background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)', padding: '6px 14px', borderRadius: 99, display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '1px solid #dbeafe' }}>
              <Loader2 size={14} style={{ color: '#2563eb', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#1e3a8a', letterSpacing: '0.08em' }}>SCANNING</span>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: 360, background: 'white', overflowY: 'auto', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
          {/* Sidebar header */}
          <div style={{ padding: '12px 16px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#64748b' }}>
              {hospitals.length} centres · 10km radius
            </span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button
                onClick={() => userLocation && fetchNearbyHospitals(userLocation)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#2563eb', display: 'flex', alignItems: 'center' }}
                title="Refresh"
              >
                <RefreshCcw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
              </button>
              <button
                onClick={refreshCurrentLocation}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, color: '#2563eb', display: 'flex', alignItems: 'center' }}
                title="Use current location"
              >
                {locating ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Navigation size={14} />}
              </button>
              <span style={{ fontSize: 10, background: '#2563eb', color: 'white', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>10KM</span>
            </div>
          </div>

          {/* Error state */}
          {error && (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ width: 48, height: 48, background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <RefreshCcw size={22} style={{ color: '#2563eb' }} />
              </div>
              <p style={{ fontSize: 13, color: '#475569', marginBottom: 16, lineHeight: 1.6 }}>{error}</p>
              <button
                onClick={() => userLocation && fetchNearbyHospitals(userLocation)}
                style={{ padding: '10px 24px', background: '#2563eb', color: 'white', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Retry Search
              </button>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && !error && (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} style={{ background: '#f1f5f9', borderRadius: 12, padding: 16, animation: 'pulse 1.5s ease-in-out infinite' }}>
                  <div style={{ height: 14, background: '#e2e8f0', borderRadius: 6, width: '70%', marginBottom: 8 }} />
                  <div style={{ height: 11, background: '#e2e8f0', borderRadius: 6, width: '90%', marginBottom: 12 }} />
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1, height: 32, background: '#e2e8f0', borderRadius: 8 }} />
                    <div style={{ flex: 1, height: 32, background: '#e2e8f0', borderRadius: 8 }} />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Hospital list */}
          {!loading && !error && hospitals.length === 0 && (
            <div style={{ padding: 48, textAlign: 'center' }}>
              <Stethoscope size={40} style={{ color: '#e2e8f0', margin: '0 auto 12px', display: 'block' }} />
              <p style={{ fontSize: 14, color: '#94a3b8', fontWeight: 600 }}>No facilities found nearby</p>
              <p style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>Try expanding the search radius</p>
            </div>
          )}

          {!loading && hospitals.map((hospital) => (
            <div
              key={hospital.id}
              onClick={() => setSelectedHospital(hospital)}
              style={{
                padding: '16px',
                borderBottom: '1px solid #f1f5f9',
                cursor: 'pointer',
                background: selectedHospital?.id === hospital.id ? '#eff6ff' : 'white',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (selectedHospital?.id !== hospital.id) (e.currentTarget as HTMLDivElement).style.background = '#f8fafc'; }}
              onMouseLeave={e => { if (selectedHospital?.id !== hospital.id) (e.currentTarget as HTMLDivElement).style.background = 'white'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <h4 style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a', margin: 0, lineHeight: 1.4, flex: 1, paddingRight: 8 }}>
                  {hospital.name}
                </h4>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  padding: '2px 7px',
                  borderRadius: 99,
                  textTransform: 'uppercase',
                  flexShrink: 0,
                  background: hospital.type === 'hospital' ? '#eff6ff' : '#f0fdf4',
                  color: hospital.type === 'hospital' ? '#1d4ed8' : '#15803d',
                }}>
                  {hospital.type}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 10 }}>
                <MapPin size={12} style={{ color: '#94a3b8', marginTop: 1, flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>{hospital.address}</span>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {hospital.phone && (
                  <a
                    href={`tel:${hospital.phone}`}
                    onClick={e => e.stopPropagation()}
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', background: '#eff6ff', color: '#1d4ed8', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none', border: '1px solid #dbeafe' }}
                  >
                    <Phone size={11} /> Call
                  </a>
                )}
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${hospital.lat},${hospital.lon}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '7px 0', background: '#0f172a', color: 'white', borderRadius: 8, fontSize: 11, fontWeight: 700, textDecoration: 'none' }}
                >
                  <ExternalLink size={11} /> Directions
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:0.5; } }
        .leaflet-container { font-family: system-ui, sans-serif; }
      `}</style>
    </div>
  );
};

export default FindHospital;
