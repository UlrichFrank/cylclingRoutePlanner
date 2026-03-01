import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useRouteStore } from '../../store/routeStore';
import { usePOIStore } from '../../store/poiStore';
import { POI_COLORS } from '../../types/poi';
import 'leaflet/dist/leaflet.css';

// Fix for default markers
const defaultMarkerIcon = L.icon({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  shadowSize: [41, 41],
  iconAnchor: [12, 41],
  shadowAnchor: [12, 41],
  popupAnchor: [1, -34],
});

// POI marker icons with different colors - create as circles with emoji
const createPOIMarkerIcon = (color: string): L.Icon => {
  const svg = `
    <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="18" fill="${color}" opacity="0.9" stroke="white" stroke-width="2"/>
    </svg>
  `;
  
  return L.icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(svg)}`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const poiMarkerIcons: Record<string, L.Icon> = {
  restaurant: createPOIMarkerIcon(POI_COLORS.restaurant.hex),
  cafe: createPOIMarkerIcon(POI_COLORS.cafe.hex),
  bakery: createPOIMarkerIcon(POI_COLORS.bakery.hex),
  hotel: createPOIMarkerIcon(POI_COLORS.hotel.hex),
  attraction: createPOIMarkerIcon(POI_COLORS.attraction.hex),
};

L.Marker.prototype.setIcon(defaultMarkerIcon);

interface ContextMenuPosition {
  lat: number;
  lng: number;
  x: number;
  y: number;
}

export const RouteMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerGroup = useRef<L.LayerGroup | null>(null);
  const poiLayerGroup = useRef<L.LayerGroup | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const currentRoute = useRouteStore((state: any) => state.currentRoute);
  const pois = usePOIStore((state: any) => state.pois);

  useEffect(() => {
    console.log('[Map Init] useEffect called, mapContainer.current:', !!mapContainer.current);
    if (!mapContainer.current) {
      console.error('[Map Init] Map container not found');
      return;
    }

    // Initialize map only once
    if (!mapInstance.current) {
      console.log('[Map Init] Creating map instance');
      try {
        mapInstance.current = L.map(mapContainer.current, {
          center: [52.52, 13.4],
          zoom: 11,
          zoomControl: false,
        });
        console.log('[Map Init] Map instance created:', !!mapInstance.current);

        // Add zoom control to bottom right
        L.control.zoom({ position: 'bottomright' }).addTo(mapInstance.current);

        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
          maxZoom: 19,
          minZoom: 2,
        }).addTo(mapInstance.current);

        // Add scale control (bottom right)
        L.control.scale({ position: 'bottomright' }).addTo(mapInstance.current);

        // Create layer groups
        routeLayerGroup.current = L.layerGroup().addTo(mapInstance.current);
        poiLayerGroup.current = L.layerGroup().addTo(mapInstance.current);

        // Track drag state properly
        mapInstance.current.on('dragstart', () => {
          console.log('[Map] dragstart');
          isDraggingRef.current = true;
        });

        mapInstance.current.on('dragend', () => {
          console.log('[Map] dragend');
          isDraggingRef.current = false;
        });

        mapInstance.current.on('click', (e: L.LeafletMouseEvent) => {
          console.log('[Map] click event fired!', {
            isDragging: isDraggingRef.current,
            button: e.originalEvent.button,
            latlng: e.latlng,
          });
          // Show context menu on left-click if not dragging
          if (!isDraggingRef.current && e.originalEvent.button === 0) {
            console.log('[Map] Setting context menu');
            setContextMenu({
              lat: e.latlng.lat,
              lng: e.latlng.lng,
              x: e.originalEvent.clientX,
              y: e.originalEvent.clientY,
            });
          }
        });
        
        console.log('[Map] Click event listener registered on map instance');
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    }

    // Update route visualization
    if (mapInstance.current && currentRoute) {
      routeLayerGroup.current?.clearLayers();

      // Render Valhalla geometry if available, otherwise use waypoints
      const geometryToRender = currentRoute.geometry?.geometry || currentRoute.waypoints;

      if (geometryToRender.length > 1) {
        const latlngs = geometryToRender.map((coord: any) => [coord.lat, coord.lng] as [number, number]);
        
        // Color based on difficulty
        let routeColor = '#0ea5e9'; // blue - easy
        if (currentRoute.geometry) {
          if (currentRoute.difficultyLevel === 'hard') routeColor = '#dc2626'; // red
          else if (currentRoute.difficultyLevel === 'medium') routeColor = '#f59e0b'; // orange
          else routeColor = '#16a34a'; // green
        }

        const polyline = L.polyline(latlngs, {
          color: routeColor,
          weight: 4,
          opacity: 0.85,
          dashArray: currentRoute.geometry ? undefined : '5, 5', // dashed if waypoints only
        });
        routeLayerGroup.current?.addLayer(polyline);

        // Fit map to route bounds
        const group = new L.FeatureGroup([polyline]);
        mapInstance.current.fitBounds(group.getBounds(), { padding: [50, 50] });
      }

      // Add markers for waypoints with letter labels and flag icon
      const waypointLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
      currentRoute.waypoints.forEach((coord: any, idx: number) => {
        // Create a custom icon with flag emoji
        const flagIcon = L.icon({
          iconUrl: `data:image/svg+xml;base64,${btoa(`
            <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 0L2 8L2 20C2 28 16 40 16 40C16 40 30 28 30 20L30 8L16 0Z" fill="#FF4444" stroke="white" stroke-width="1.5"/>
              <text x="16" y="22" font-size="14" font-weight="bold" text-anchor="middle" fill="white">${waypointLabels[idx]}</text>
            </svg>
          `)}`,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -40],
        });

        const marker = L.marker([coord.lat, coord.lng], { icon: flagIcon });
        marker.bindPopup(`Wegpunkt ${waypointLabels[idx]}`);
        routeLayerGroup.current?.addLayer(marker);
      });
    }

    // Update POI markers
    if (mapInstance.current) {
      poiLayerGroup.current?.clearLayers();

      pois.forEach((poi: any) => {
        // Get icon based on POI type, fallback to default
        const icon = poiMarkerIcons[poi.type] || defaultMarkerIcon;
        const marker = L.marker([poi.lat, poi.lng], { icon });
        marker.bindPopup(`<b>${poi.name}</b><br/>${poi.type}`);
        poiLayerGroup.current?.addLayer(marker);
      });
    }
  }, [currentRoute, pois]);

  // Separate useEffect for event listeners on map container
  useEffect(() => {
    const mapEl = mapContainer.current;
    if (!mapEl) {
      console.log('[Events] Map container not available');
      return;
    }

    const handleMapClick = (e: MouseEvent) => {
      console.log('[MapClick] Event fired, button:', e.button, 'target:', e.target);
      if (e.button === 0) { // left click
        console.log('[MapClick] Processing left click');
        
        if (mapInstance.current && mapEl) {
          const rect = mapEl.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          
          const point = L.point(x, y);
          const latlng = mapInstance.current.unproject(point, mapInstance.current.getZoom());
          
          console.log('[MapClick] Setting context menu at:', latlng);
          setContextMenu({
            lat: latlng.lat,
            lng: latlng.lng,
            x: e.clientX,
            y: e.clientY,
          });
        }
      }
    };

    // Register listener in capture phase so it fires before Leaflet handles it
    mapEl.addEventListener('click', handleMapClick, true);
    console.log('[Events] Click listener registered on map container');

    // Handle clicks outside context menu
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };

    // Handle navigation to waypoint
    const handleNavigateToWaypoint = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { lat, lng } = customEvent.detail;
      if (mapInstance.current) {
        mapInstance.current.setView([lat, lng], 15, { animate: true });
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('navigateToWaypoint', handleNavigateToWaypoint);
    
    return () => {
      mapEl.removeEventListener('click', handleMapClick, true);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('navigateToWaypoint', handleNavigateToWaypoint);
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div
        ref={mapContainer}
        style={{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      />

      {/* Context Menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          style={{
            position: 'fixed',
            top: `${contextMenu.y}px`,
            left: `${contextMenu.x}px`,
            backgroundColor: 'white',
            border: '1px solid #ccc',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: 1000,
            minWidth: '180px',
          }}
        >
          <button
            onClick={() => {
              // Event zum Setzen eines Wegepunkts an dieser Position
              window.dispatchEvent(
                new CustomEvent('setWaypoint', {
                  detail: { lat: contextMenu.lat, lng: contextMenu.lng },
                })
              );
              setContextMenu(null);
            }}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              background: 'none',
              textAlign: 'left',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f0f0f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Wegepunkt setzen
          </button>
        </div>
      )}
    </div>
  );
};
