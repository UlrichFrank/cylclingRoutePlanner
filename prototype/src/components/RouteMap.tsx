import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useRouteStore } from '../store/routeStore';
import { usePOIStore } from '../store/poiStore';
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

L.Marker.prototype.setIcon(defaultMarkerIcon);

export const RouteMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerGroup = useRef<L.LayerGroup | null>(null);
  const poiLayerGroup = useRef<L.LayerGroup | null>(null);

  const currentRoute = useRouteStore((state) => state.currentRoute);
  const pois = usePOIStore((state) => state.pois);

  useEffect(() => {
    if (!mapContainer.current) {
      console.error('Map container not found');
      return;
    }

    // Initialize map only once
    if (!mapInstance.current) {
      try {
        mapInstance.current = L.map(mapContainer.current, {
          center: [52.52, 13.4],
          zoom: 11,
          zoomControl: true,
        });

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

        console.log('Map initialized successfully');
      } catch (error) {
        console.error('Failed to initialize map:', error);
        return;
      }
    }

    // Update route layer
    if (currentRoute && routeLayerGroup.current) {
      routeLayerGroup.current.clearLayers();

      const routeCoordinates: [number, number][] = currentRoute.coordinates.map((c) => [c.lat, c.lng]);

      // Add polyline
      L.polyline(routeCoordinates, {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.8,
        dashArray: '5, 5',
      }).addTo(routeLayerGroup.current);

      // Add markers
      currentRoute.coordinates.forEach((coord, index) => {
        L.marker([coord.lat, coord.lng], { icon: defaultMarkerIcon })
          .bindPopup(`<strong>${currentRoute.name}</strong><br/>Point ${index + 1}`)
          .addTo(routeLayerGroup.current!);
      });

      // Fit bounds
      const bounds = L.latLngBounds(routeCoordinates);
      mapInstance.current?.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [currentRoute]);

  useEffect(() => {
    if (!poiLayerGroup.current) return;

    poiLayerGroup.current.clearLayers();

    const poiColors: Record<string, string> = {
      restaurant: '#ef4444',
      cafe: '#f97316',
      hotel: '#3b82f6',
      bakery: '#eab308',
      attraction: '#a855f7',
    };

    pois.forEach((poi) => {
      const color = poiColors[poi.type] || '#6b7280';
      L.circleMarker([poi.lat, poi.lng], {
        radius: 7,
        fillColor: color,
        color: '#000',
        weight: 1,
        opacity: 0.8,
        fillOpacity: 0.8,
      })
        .bindPopup(`<strong>${poi.name}</strong><br/><small>${poi.type}</small>${poi.address ? `<br/>${poi.address}` : ''}`)
        .addTo(poiLayerGroup.current!);
    });
  }, [pois]);

  return (
    <div
      ref={mapContainer}
      className="w-screen h-screen bg-white"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
      }}
    />
  );
};
