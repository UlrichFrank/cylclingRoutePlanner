import React, { useState, useEffect, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { DotsHorizontalIcon, PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useRouteStore, RouteCoordinate } from '../store/routeStore';
import { usePOIStore } from '../store/poiStore';
import { useTheme } from '../contexts/ThemeContext';
import { POI_COLORS } from '../types/poi';
import { fetchPOIs } from '../services/overpassService';

interface Waypoint {
  label: string;
  placeholder: string;
  lat: number;
  lng: number;
  isLocked: boolean; // true wenn gültiger Wegepunkt gesetzt
}

type POIType = 'restaurant' | 'cafe' | 'bakery' | 'hotel' | 'attraction';

interface POIFilterState {
  restaurant: boolean;
  cafe: boolean;
  bakery: boolean;
  hotel: boolean;
  attraction: boolean;
}

const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const calculateDistanceToRoute = (poiLat: number, poiLng: number, routeCoordinates: any[]): number => {
  if (routeCoordinates.length === 0) return Infinity;
  return Math.min(
    ...routeCoordinates.map((coord) => calculateDistance(poiLat, poiLng, coord.lat, coord.lng))
  );
};

const waypointLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const waypointColors: Record<string, string> = {
  A: '#16a34a',
  B: '#ea580c',
  C: '#0ea5e9',
  D: '#8b5cf6',
  E: '#ec4899',
  F: '#f59e0b',
  G: '#06b6d4',
};

export const LeftPanel: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Color theme
  const colors = {
    bg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    mutedBg: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(210, 40%, 96%)',
    inputBg: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(0, 0%, 100%)',
    inputBorder: isDark ? 'hsl(217.2, 32.6%, 25%)' : 'hsl(214.3, 31.8%, 91.4%)',
  };

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { label: 'A', placeholder: 'Gib einen Startpunkt ein', lat: 0, lng: 0, isLocked: false },
    { label: 'B', placeholder: 'Wo solls hingehen?', lat: 0, lng: 0, isLocked: false },
  ]);

  const [activeFilters, setActiveFilters] = useState<POIFilterState>({
    restaurant: false,
    cafe: false,
    bakery: false,
    hotel: false,
    attraction: false,
  });

  const [fetchedPOIs, setFetchedPOIs] = useState<Record<POIType, any[]>>({
    restaurant: [],
    cafe: [],
    bakery: [],
    hotel: [],
    attraction: [],
  });

  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const { setRoute, currentRoute } = useRouteStore();
  const { setPOIs } = usePOIStore();
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedCoordinatesRef = useRef<string>('');

  const poiFilters: Array<{ key: POIType; icon: string; label: string }> = [
    { key: 'restaurant', icon: '🍽️', label: 'Restaurants' },
    { key: 'cafe', icon: '☕', label: 'Cafés' },
    { key: 'bakery', icon: '🥐', label: 'Bäckereien' },
    { key: 'hotel', icon: '🏨', label: 'Hotels' },
    { key: 'attraction', icon: '⭐', label: 'Sehenswürdigkeiten' },
  ];

  // Auto-update route coordinates when waypoints change
  useEffect(() => {
    if (!currentRoute || waypoints.length === 0) return;
    
    const coordinates: RouteCoordinate[] = waypoints.map(wp => ({
      lat: wp.lat,
      lng: wp.lng
    }));

    // Only update if coordinates actually changed
    const coordsChanged = 
      !currentRoute.coordinates ||
      currentRoute.coordinates.length !== coordinates.length ||
      currentRoute.coordinates.some((coord, idx) => 
        coord.lat !== coordinates[idx].lat || coord.lng !== coordinates[idx].lng
      );

    if (coordsChanged) {
      setRoute({
        ...currentRoute,
        coordinates,
      });
    }
  }, [waypoints]);

  // Fetch POIs asynchronously when waypoints change (with debouncing)
  useEffect(() => {
    // Clear existing timeout to debounce rapid waypoint changes
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    const currentCoordinatesStr = JSON.stringify(currentRoute?.coordinates);
    
    // Skip fetch if coordinates haven't changed or fetch already failed
    if (currentCoordinatesStr === lastFetchedCoordinatesRef.current || fetchFailed) {
      return;
    }

    const fetchAllPOIs = async () => {
      if (!currentRoute || !currentRoute.coordinates || currentRoute.coordinates.length === 0) return;

      setLoading(true);
      setFetchFailed(false);
      
      try {
        const newFetchedPOIs: Record<POIType, any[]> = {
          restaurant: [],
          cafe: [],
          bakery: [],
          hotel: [],
          attraction: [],
        };

        let hasFetchErrors = false;

        // Fetch for all types sequentially with small delays to avoid rate limiting
        for (let i = 0; i < poiFilters.length; i++) {
          const filter = poiFilters[i];
          try {
            const results = await fetchPOIs(currentRoute.coordinates, filter.key as any);
            const filtered = results.filter((poi) => {
              const distance = calculateDistanceToRoute(poi.lat, poi.lng, currentRoute.coordinates);
              return distance <= 1.0;
            });
            newFetchedPOIs[filter.key] = filtered;
            
            // Small delay between requests to avoid rate limiting
            if (i < poiFilters.length - 1) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          } catch (error) {
            console.error(`Error fetching ${filter.key}:`, error);
            hasFetchErrors = true;
            newFetchedPOIs[filter.key] = [];
          }
        }

        if (!hasFetchErrors) {
          setFetchedPOIs(newFetchedPOIs);
          lastFetchedCoordinatesRef.current = currentCoordinatesStr;

          // Update display with currently active filters
          const activePOITypes: POIType[] = Object.entries(activeFilters)
            .filter(([_, active]) => active)
            .map(([type]) => type as POIType);

          const allActivePOIs = activePOITypes.flatMap(type => newFetchedPOIs[type] || []);
          setPOIs(allActivePOIs);
        } else {
          setFetchFailed(true);
          console.warn('Fetch failed - will retry only on new waypoint changes');
        }
      } catch (error) {
        console.error('Unexpected error during POI fetch:', error);
        setFetchFailed(true);
      } finally {
        setLoading(false);
      }
    };

    // Debounce: wait 500ms after waypoint change before fetching
    fetchTimeoutRef.current = setTimeout(fetchAllPOIs, 500);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [currentRoute?.coordinates?.length]);

  // Listen for waypoint set from context menu
  useEffect(() => {
    const handleSetWaypoint = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { lat, lng } = customEvent.detail;

      // Set the first unset waypoint, or replace the last one
      const newWaypoints = [...waypoints];
      const firstUnsetIndex = newWaypoints.findIndex(wp => !wp.isLocked);
      
      if (firstUnsetIndex !== -1) {
        newWaypoints[firstUnsetIndex].lat = lat;
        newWaypoints[firstUnsetIndex].lng = lng;
        newWaypoints[firstUnsetIndex].isLocked = true;
        newWaypoints[firstUnsetIndex].placeholder = '';
      } else if (newWaypoints.length > 1) {
        newWaypoints[newWaypoints.length - 1].lat = lat;
        newWaypoints[newWaypoints.length - 1].lng = lng;
        newWaypoints[newWaypoints.length - 1].isLocked = true;
        newWaypoints[newWaypoints.length - 1].placeholder = '';
      }

      setWaypoints(newWaypoints);
    };

    window.addEventListener('setWaypoint', handleSetWaypoint);
    return () => {
      window.removeEventListener('setWaypoint', handleSetWaypoint);
    };
  }, [waypoints]);

  const handleWaypointChange = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].placeholder = value;
    setWaypoints(newWaypoints);
    setActiveWaypointIndex(index);

    // Clear existing timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    if (value.trim().length < 2) {
      setAutocompleteSuggestions([]);
      return;
    }

    // Fetch autocomplete suggestions with delay
    setAutocompleteLoading(true);
    autocompleteTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=8&addressdetails=1`
        );
        const data = await response.json();
        // Filter for results with address details and better filtering
        const filtered = data
          .filter((item: any) => item.address && item.display_name)
          .map((item: any) => ({
            ...item,
            // Prioritize results with street/house number
            priority: (item.address?.house_number ? 1 : item.address?.road ? 2 : 3),
          }))
          .sort((a: any, b: any) => a.priority - b.priority)
          .slice(0, 5);
        setAutocompleteSuggestions(filtered);
      } catch (error) {
        console.error('Autocomplete error:', error);
        setAutocompleteSuggestions([]);
      } finally {
        setAutocompleteLoading(false);
      }
    }, 300); // 300ms delay
  };

  const handleSelectSuggestion = (index: number, suggestion: any) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].lat = parseFloat(suggestion.lat);
    newWaypoints[index].lng = parseFloat(suggestion.lon);
    newWaypoints[index].isLocked = true;
    newWaypoints[index].placeholder = suggestion.display_name || suggestion.name || '';
    setWaypoints(newWaypoints);
    setAutocompleteSuggestions([]);
    setActiveWaypointIndex(null);

    // Dispatch event to navigate map to this location
    window.dispatchEvent(
      new CustomEvent('navigateToWaypoint', {
        detail: {
          lat: parseFloat(suggestion.lat),
          lng: parseFloat(suggestion.lon),
          label: newWaypoints[index].label,
        },
      })
    );
  };

  const geocodeAddress = async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    }
    return null;
  };

  const handleWaypointKeyPress = async (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    
    const value = waypoints[index].placeholder.trim();
    if (!value) return;

    const newWaypoints = [...waypoints];
    
    // Try to parse as coordinates (lat,lng)
    const coordMatch = value.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);
    if (coordMatch) {
      const lat = parseFloat(coordMatch[1]);
      const lng = parseFloat(coordMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        newWaypoints[index].lat = lat;
        newWaypoints[index].lng = lng;
        newWaypoints[index].isLocked = true;
        setWaypoints(newWaypoints);
        return;
      }
    }

    // Try geocoding
    const coords = await geocodeAddress(value);
    if (coords) {
      newWaypoints[index].lat = coords.lat;
      newWaypoints[index].lng = coords.lng;
      newWaypoints[index].isLocked = true;
      setWaypoints(newWaypoints);
    }
  };

  const handleUnlockWaypoint = (index: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].isLocked = false;
    newWaypoints[index].placeholder = '';
    setWaypoints(newWaypoints);
  };

  const handleAddWaypoint = () => {
    if (waypoints.length < waypointLabels.length) {
      setWaypoints([
        ...waypoints,
        { label: waypointLabels[waypoints.length], placeholder: '', lat: 52.52, lng: 13.4, isLocked: false },
      ]);
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  // Toggle filter - only change display, no fetching
  const handleFilterToggle = (filterType: POIType) => {
    const newFilters = { ...activeFilters, [filterType]: !activeFilters[filterType] };
    setActiveFilters(newFilters);

    // Combine POIs from active filters
    const activePOITypes: POIType[] = Object.entries(newFilters)
      .filter(([_, active]) => active)
      .map(([type]) => type as POIType);

    const allActivePOIs = activePOITypes.flatMap(type => fetchedPOIs[type] || []);
    setPOIs(allActivePOIs);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(70px + 5%)',
        left: '2%',
        bottom: '5%',
        width: '384px',
        backgroundColor: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: '32px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        zIndex: 1001,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: colors.text,
      }}
    >
      {/* Header */}
      <div
        style={{
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>Deine Route</div>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: colors.text }}>
                <DotsHorizontalIcon width={24} height={24} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content 
              style={{
                minWidth: '150px',
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                padding: '4px',
                color: colors.text,
              }}
            >
              <DropdownMenu.Item style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}>
                Einstellungen
              </DropdownMenu.Item>
              <DropdownMenu.Item style={{ padding: '8px 12px', fontSize: '14px', cursor: 'pointer' }}>
                Löschen
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {/* Waypoints Section */}
        <div
          style={{
            padding: '16px',
            borderBottom: `1px solid ${colors.border}`,
          }}
        >
          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>Wegpunkte</div>
          </div>

          {/* Waypoint Inputs */}
          <div style={{ marginBottom: '16px' }}>
            {waypoints.map((wp, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <input
                    type="text"
                    placeholder={wp.isLocked ? `${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}` : 'Adresse oder Koordinaten (lat,lng) eingeben...'}
                    value={wp.placeholder}
                    onChange={(e) => handleWaypointChange(idx, e.target.value)}
                    onKeyPress={(e) => handleWaypointKeyPress(idx, e)}
                    disabled={wp.isLocked}
                    style={{
                      width: '100%',
                      borderRadius: '20px',
                      height: '52px',
                      paddingLeft: '50px',
                      paddingRight: '12px',
                      border: `1px solid ${colors.inputBorder}`,
                      backgroundColor: wp.isLocked ? colors.mutedBg : colors.inputBg,
                      color: colors.text,
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      opacity: wp.isLocked ? 0.6 : 1,
                      cursor: wp.isLocked ? 'not-allowed' : 'text',
                    }}
                  />
                  
                  {/* Autocomplete Dropdown */}
                  {activeWaypointIndex === idx && autocompleteSuggestions.length > 0 && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: colors.inputBg,
                        border: `1px solid ${colors.inputBorder}`,
                        borderTop: 'none',
                        borderRadius: '0 0 12px 12px',
                        maxHeight: '200px',
                        overflowY: 'auto',
                        zIndex: 10,
                      }}
                    >
                      {autocompleteSuggestions.map((suggestion, sugIdx) => (
                        <div
                          key={sugIdx}
                          onClick={() => handleSelectSuggestion(idx, suggestion)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer',
                            borderBottom: `1px solid ${colors.border}`,
                            fontSize: '13px',
                            color: colors.text,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = colors.mutedBg;
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          {suggestion.address?.house_number 
                            ? `${suggestion.address.road || ''} ${suggestion.address.house_number}, ${suggestion.address.postcode || ''} ${suggestion.address.city || suggestion.address.town || ''}`
                            : suggestion.address?.road 
                            ? `${suggestion.address.road}, ${suggestion.address.postcode || ''} ${suggestion.address.city || suggestion.address.town || ''}`
                            : suggestion.display_name?.split(',')[0] || suggestion.name
                          }
                        </div>
                      ))}
                    </div>
                  )}

                  <div
                    style={{
                      position: 'absolute',
                      left: '8px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: waypointColors[wp.label],
                      color: 'white',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: wp.isLocked ? 'pointer' : 'default',
                    }}
                    onClick={() => wp.isLocked && handleUnlockWaypoint(idx)}
                    title={wp.isLocked ? 'Klicken zum bearbeiten' : ''}
                  >
                    {wp.label}
                  </div>
                </div>
                {waypoints.length > 2 && (
                  <button
                    onClick={() => handleRemoveWaypoint(idx)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      padding: '8px',
                    }}
                  >
                    <Cross2Icon width={20} height={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Waypoint Button */}
          {waypoints.length < waypointLabels.length && (
            <button
              onClick={handleAddWaypoint}
              style={{
                width: '100%',
                padding: '12px',
                backgroundColor: colors.mutedBg,
                border: `1px solid ${colors.border}`,
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: colors.text,
              }}
            >
              <PlusIcon width={20} height={20} />
              <span>Punkt hinzufügen</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom - POI Filter Buttons */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: colors.bg,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '12px 16px 16px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {poiFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterToggle(filter.key)}
              disabled={loading}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                border: `2px solid ${activeFilters[filter.key] ? POI_COLORS[filter.key].hex : colors.border}`,
                backgroundColor: activeFilters[filter.key] ? POI_COLORS[filter.key].hex : colors.mutedBg,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1,
                transition: 'all 0.2s',
                flexShrink: 0,
              }}
              title={filter.label}
              aria-label={filter.label}
            >
              {filter.icon}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
