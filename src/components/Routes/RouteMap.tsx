import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet.markercluster';
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
  nearbyWaypointIndex?: number; // Index of nearby waypoint if exists
}

export const RouteMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const routeLayerGroup = useRef<L.LayerGroup | null>(null);
  const poiLayerGroup = useRef<L.LayerGroup | null>(null);
  const elevationPositionMarkerRef = useRef<L.Marker | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuPosition | null>(null);
  const contextMenuRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);
  const contextMenuTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingContextMenuRef = useRef<ContextMenuPosition | null>(null);
  const clickPositionRef = useRef<{ x: number; y: number } | null>(null);
  const allowNewContextMenuRef = useRef(true);

  const currentRoute = useRouteStore((state: any) => state.currentRoute);
  const elevationProfilePosition = useRouteStore((state: any) => state.elevationProfilePosition);
  const pois = usePOIStore((state: any) => state.pois);
  const activeFilters = usePOIStore((state: any) => state.activeFilters);

  useEffect(() => {
    console.log('[Map Init] useEffect called, mapContainer.current:', !!mapContainer.current);
    if (!mapContainer.current) {
      console.error('[Map Init] Map container not found');
      return;
    }

    // Initialize map only once
    if (!mapInstance.current) {
      console.log('[Map Init] Creating map instance');
      
      // Check if map was already created in this container
      const existingMap = (mapContainer.current as any)._leaflet_map;
      if (existingMap) {
        console.log('[Map Init] Map already exists, using existing instance');
        mapInstance.current = existingMap;
      } else {
        try {
          // Try to get user's location, fallback to Berlin
          const initializeMap = (lat: number, lng: number) => {
            if (!mapContainer.current || mapInstance.current) return;
            
            mapInstance.current = L.map(mapContainer.current, {
              center: [lat, lng],
              zoom: 13,
              zoomControl: false,
            });
            console.log('[Map Init] Map instance created at:', [lat, lng]);

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
            // Ignore type error since markerClusterGroup is added by leaflet.markercluster plugin
            // @ts-ignore
            poiLayerGroup.current = L.markerClusterGroup({
              showCoverageOnHover: false,
              maxClusterRadius: 40,
              spiderfyOnMaxZoom: true,
              zoomToBoundsOnClick: true,
            }).addTo(mapInstance.current);

            // Track drag state properly
            mapInstance.current.on('dragstart', () => {
              console.log('[Map] dragstart');
              isDraggingRef.current = true;
              setContextMenu(null);
              // Cancel pending context menu
              if (contextMenuTimeoutRef.current) {
                clearTimeout(contextMenuTimeoutRef.current);
                contextMenuTimeoutRef.current = null;
              }
              pendingContextMenuRef.current = null;
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
              // Handle context menu with 0.5s delay
              if (!isDraggingRef.current && e.originalEvent.button === 0) {
                // If a context menu is already open, just close it (don't open new)
                if (contextMenu) {
                  console.log('[Map] Context menu already open, closing without opening new');
                  setContextMenu(null);
                  allowNewContextMenuRef.current = false;
                  // Clear any pending timeout
                  if (contextMenuTimeoutRef.current) {
                    clearTimeout(contextMenuTimeoutRef.current);
                    contextMenuTimeoutRef.current = null;
                  }
                  pendingContextMenuRef.current = null;
                  clickPositionRef.current = null;
                } else {
                  // Store click position and allow new menu
                  clickPositionRef.current = {
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                  };
                  allowNewContextMenuRef.current = true;
                  
                  console.log('[Map] Click registered, waiting for stillness...');
                  
                  pendingContextMenuRef.current = {
                    lat: e.latlng.lat,
                    lng: e.latlng.lng,
                    x: e.originalEvent.clientX,
                    y: e.originalEvent.clientY,
                  };
                  
                  contextMenuTimeoutRef.current = setTimeout(() => {
                    // Check if mouse is still in same position
                    if (pendingContextMenuRef.current && allowNewContextMenuRef.current) {
                      console.log('[Map] Showing delayed context menu after 0.5s');
                       const nearbyIndex = findNearbyWaypoint(pendingContextMenuRef.current.lat, pendingContextMenuRef.current.lng);
                       setContextMenu({
                         ...pendingContextMenuRef.current,
                         nearbyWaypointIndex: nearbyIndex,
                       });
                      contextMenuTimeoutRef.current = null;
                    }
                  }, 500);
                }
              }
            });
            
            console.log('[Map] Click event listener registered on map instance');
          };

          // Request user's location with timeout
          if ('geolocation' in navigator) {
            console.log('[Map Init] Requesting user geolocation...');
            navigator.geolocation.getCurrentPosition(
              (position) => {
                console.log('[Map Init] Got user location:', position.coords.latitude, position.coords.longitude);
                initializeMap(position.coords.latitude, position.coords.longitude);
              },
              (error) => {
                console.log('[Map Init] Geolocation error:', error.message, 'Using fallback');
                // Fallback to Berlin
                initializeMap(52.52, 13.4);
              },
              { timeout: 5000 } // 5 second timeout
            );
          } else {
            // Fallback if geolocation not available
            initializeMap(52.52, 13.4);
          }
        } catch (error) {
          console.error('Error initializing map:', error);
        }
      }
    }

    // Update route visualization
    if (mapInstance.current && currentRoute) {
      routeLayerGroup.current?.clearLayers();

      // Render Valhalla geometry if available, otherwise use waypoints
      const geometryToRender = currentRoute.geometry?.geometry || currentRoute.waypoints;

      if (geometryToRender.length > 1) {
        console.log('[RouteMap] Rendering geometry sample:', 
          geometryToRender.slice(0, 3).map((c: any) => `[${c.lat?.toFixed(4)}, ${c.lng?.toFixed(4)}]`));
        
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
      
      const visiblePOIs = pois.filter((poi: any) => activeFilters[poi.type]);
      console.log(`[RouteMap] Rendering POIs. Total: ${pois.length}, Visible: ${visiblePOIs.length}`);

      visiblePOIs.forEach((poi: any) => {
        // console.log('[RouteMap] Adding POI marker:', poi.name, poi.type, poi.lat, poi.lng);
        // Get icon based on POI type, fallback to default
        const icon = poiMarkerIcons[poi.type] || defaultMarkerIcon;
        const marker = L.marker([poi.lat, poi.lng], { icon });
        
        let popupContent = `
          <div style="font-family: system-ui, sans-serif; min-width: 150px;">
            <strong style="display: block; font-size: 14px; margin-bottom: 4px;">${poi.name}</strong>
            <span style="display: inline-block; padding: 2px 6px; background-color: var(--gray-3); border-radius: 4px; font-size: 11px; text-transform: capitalize;">${poi.type}</span>
        `;
        
        if (poi.address) {
          popupContent += `<div style="margin-top: 8px; font-size: 12px;">📍 ${poi.address}</div>`;
        }
        
        if (poi.website) {
          popupContent += `<div style="margin-top: 4px; font-size: 12px;">🌐 <a href="${poi.website.startsWith('http') ? poi.website : 'https://' + poi.website}" target="_blank" rel="noopener noreferrer">${poi.website}</a></div>`;
        }
        
        if (poi.phone) {
          popupContent += `<div style="margin-top: 4px; font-size: 12px;">📞 <a href="tel:${poi.phone}">${poi.phone}</a></div>`;
        }
        
        popupContent += `</div>`;
        
        marker.bindPopup(popupContent);
        poiLayerGroup.current?.addLayer(marker);
      });
      console.log('[RouteMap] POIs rendered. Total visible:', visiblePOIs.length);
    }
  }, [currentRoute, pois, activeFilters]);

  // Handle elevation profile position marker
  useEffect(() => {
    if (!mapInstance.current || !currentRoute?.geometry?.geometry) return;

    // Remove old marker if exists
    if (elevationPositionMarkerRef.current) {
      mapInstance.current.removeLayer(elevationPositionMarkerRef.current);
      elevationPositionMarkerRef.current = null;
    }

    // Add new marker at elevation position
    if (elevationProfilePosition !== null && elevationProfilePosition < currentRoute.geometry.geometry.length) {
      const coord = currentRoute.geometry.geometry[elevationProfilePosition];
      
      // Create a custom circle icon
      const circleIcon = L.icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
          <svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <circle cx="10" cy="10" r="8" fill="#ff6b6b" opacity="0.9" stroke="white" stroke-width="2"/>
          </svg>
        `)}`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        popupAnchor: [0, -10],
      });
      
      const positionMarker = L.marker([coord.lat, coord.lng], { icon: circleIcon });
      positionMarker.bindPopup(`Position: ${(elevationProfilePosition / (currentRoute.geometry.geometry.length - 1) * 100).toFixed(1)}%`);
      positionMarker.addTo(mapInstance.current);
      elevationPositionMarkerRef.current = positionMarker;
    }
  }, [elevationProfilePosition, currentRoute]);

  // Helper: Find nearby waypoint (within ~50 meters)
  const findNearbyWaypoint = (lat: number, lng: number): number | undefined => {
    if (!currentRoute?.waypoints) return undefined;
    
    const PROXIMITY_THRESHOLD = 0.0005; // ~50 meters at equator
    
    for (let i = 0; i < currentRoute.waypoints.length; i++) {
      const wp = currentRoute.waypoints[i];
      const distance = Math.abs(wp.lat - lat) + Math.abs(wp.lng - lng);
      if (distance < PROXIMITY_THRESHOLD) {
        return i;
      }
    }
    return undefined;
  };

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
          
          // If a context menu is already open, just close it (don't open new)
          if (contextMenu) {
            console.log('[MapClick] Context menu already open, closing without opening new');
            setContextMenu(null);
            allowNewContextMenuRef.current = false;
            if (contextMenuTimeoutRef.current) {
              clearTimeout(contextMenuTimeoutRef.current);
              contextMenuTimeoutRef.current = null;
            }
            pendingContextMenuRef.current = null;
            clickPositionRef.current = null;
          } else {
            // Store click position and allow new menu
            clickPositionRef.current = {
              x: e.clientX,
              y: e.clientY,
            };
            allowNewContextMenuRef.current = true;
            
            console.log('[MapClick] Click registered, waiting for stillness...');
            
            pendingContextMenuRef.current = {
              lat: latlng.lat,
              lng: latlng.lng,
              x: e.clientX,
              y: e.clientY,
            };
            
            contextMenuTimeoutRef.current = setTimeout(() => {
              // Check if mouse is still in same position
              if (pendingContextMenuRef.current && allowNewContextMenuRef.current) {
                console.log('[MapClick] Showing delayed context menu after 0.5s');
                const nearbyIndex = findNearbyWaypoint(pendingContextMenuRef.current.lat, pendingContextMenuRef.current.lng);
                setContextMenu({
                  ...pendingContextMenuRef.current,
                  nearbyWaypointIndex: nearbyIndex,
                });
                contextMenuTimeoutRef.current = null;
              }
            }, 500);
          }
        }
      }
    };

    // Register listener in capture phase so it fires before Leaflet handles it
    mapEl.addEventListener('click', handleMapClick, true);
    console.log('[Events] Click listener registered on map container');

    // Handle mouse move to cancel pending context menu if mouse moved
    const handleMouseMove = (e: MouseEvent) => {
      if (clickPositionRef.current) {
        const dx = Math.abs(e.clientX - clickPositionRef.current.x);
        const dy = Math.abs(e.clientY - clickPositionRef.current.y);
        const threshold = 5; // pixels
        
        // If mouse moved more than threshold, cancel pending menu
        if (dx > threshold || dy > threshold) {
          console.log('[Map] Mouse moved, canceling pending context menu');
          allowNewContextMenuRef.current = false;
          if (contextMenuTimeoutRef.current) {
            clearTimeout(contextMenuTimeoutRef.current);
            contextMenuTimeoutRef.current = null;
          }
          pendingContextMenuRef.current = null;
          clickPositionRef.current = null;
        }
      }
    };

    mapEl.addEventListener('mousemove', handleMouseMove);
    console.log('[Events] Mouse move listener registered on map container');

    // Handle clicks outside context menu
    const handleClickOutside = (e: MouseEvent) => {
      // Don't close menu if clicking on the map itself or the menu
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node) && 
          !(e.target as Node).contains?.(mapEl) && !mapEl.contains(e.target as Node)) {
        setContextMenu(null);
        // Cancel pending context menu
        if (contextMenuTimeoutRef.current) {
          clearTimeout(contextMenuTimeoutRef.current);
          contextMenuTimeoutRef.current = null;
        }
        pendingContextMenuRef.current = null;
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

    // Handle Escape key to close context menu
    const handleEscapeKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setContextMenu(null);
        // Cancel pending context menu
        if (contextMenuTimeoutRef.current) {
          clearTimeout(contextMenuTimeoutRef.current);
          contextMenuTimeoutRef.current = null;
        }
        pendingContextMenuRef.current = null;
      }
    };

    document.addEventListener('click', handleClickOutside);
    window.addEventListener('navigateToWaypoint', handleNavigateToWaypoint);
    document.addEventListener('keydown', handleEscapeKey);
    
    return () => {
      mapEl.removeEventListener('click', handleMapClick, true);
      mapEl.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClickOutside);
      window.removeEventListener('navigateToWaypoint', handleNavigateToWaypoint);
      document.removeEventListener('keydown', handleEscapeKey);
      // Clean up any pending timeout
      if (contextMenuTimeoutRef.current) {
        clearTimeout(contextMenuTimeoutRef.current);
      }
    };
  }, [contextMenu]);

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
            top: `${Math.max(50, contextMenu.y)}px`,
            left: `${Math.max(10, Math.min(contextMenu.x, window.innerWidth - 250))}px`,
            backgroundColor: 'white',
            border: '2px solid #0ea5e9',
            borderRadius: '6px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 10000,
            minWidth: '220px',
            padding: '4px',
            maxHeight: '400px',
            overflowY: 'auto',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu?.nearbyWaypointIndex !== undefined ? (
            // Delete waypoint if clicked on one
            <button
              onClick={() => {
                const newWaypoints = currentRoute.waypoints.filter(
                  (_: any, i: number) => i !== contextMenu.nearbyWaypointIndex
                );
                useRouteStore.setState({
                  currentRoute: { ...currentRoute, waypoints: newWaypoints }
                });
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
                fontSize: '13px',
                color: '#dc2626',
                fontWeight: '600',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#fee2e2';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              🗑️ Wegpunkt löschen
            </button>
          ) : (
            // Add waypoint if not on one
            <button
              onClick={() => {
                const newWaypoints = [...(currentRoute?.waypoints || []), { lat: contextMenu.lat, lng: contextMenu.lng }];
                useRouteStore.setState({
                  currentRoute: { ...currentRoute, waypoints: newWaypoints }
                });
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
                fontSize: '13px',
                color: '#16a34a',
                fontWeight: '600',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dcfce7';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ➕ Wegpunkt hinzufügen
            </button>
          )}
        </div>
      )}
    </div>
  );
};
