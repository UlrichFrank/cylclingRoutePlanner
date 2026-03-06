import React, { useState, useEffect, useRef } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { renderIcon, POI_ICONS } from '../../utils/iconRegistry';
import { useRouteStore, RouteCoordinate } from '../../store/routeStore';
import { usePOIStore } from '../../store/poiStore';
import { useTheme } from '../Layout/ThemeContext';
import { POI_COLORS } from '../../types/poi';
import { fetchPOIs } from '../../services/overpassService';
import { RouteCalculator } from './RouteCalculator';

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
    bg: isDark ? 'hsla(222.2, 84%, 4.9%, 0.85)' : 'hsla(0, 0%, 100%, 0.85)',
    border: isDark ? 'hsla(217.2, 32.6%, 17.5%, 0.5)' : 'hsla(214.3, 31.8%, 91.4%, 0.7)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    mutedBg: isDark ? 'hsla(217.2, 32.6%, 17.5%, 0.5)' : 'hsla(210, 40%, 96%, 0.8)',
    inputBg: isDark ? 'hsla(217.2, 32.6%, 17.5%, 0.8)' : 'hsla(0, 0%, 100%, 0.8)',
    inputBorder: isDark ? 'hsla(217.2, 32.6%, 25%, 0.5)' : 'hsla(214.3, 31.8%, 91.4%, 0.7)',
  };

  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { label: 'A', placeholder: '', lat: 0, lng: 0, isLocked: false },
  ]);

  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<any[]>([]);
  const [autocompleteLoading, setAutocompleteLoading] = useState(false);
  const [activeWaypointIndex, setActiveWaypointIndex] = useState<number | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [fetchFailed, setFetchFailed] = useState(false);
  const { setRoute, currentRoute, routes: savedRoutes, loadRoute } = useRouteStore();
  const { pois: allPOIs, activeFilters, toggleFilter } = usePOIStore();
  
  const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFetchedCoordinatesRef = useRef<string>('');

  const poiFilters: Array<{ key: POIType; icon: React.ReactNode; label: string }> = [
    { key: 'restaurant', icon: renderIcon('restaurant'), label: 'Restaurants' },
    { key: 'cafe', icon: renderIcon('cafe'), label: 'Cafés' },
    { key: 'bakery', icon: renderIcon('bakery'), label: 'Bäckereien' },
    { key: 'hotel', icon: renderIcon('hotel'), label: 'Hotels' },
    { key: 'attraction', icon: renderIcon('attraction'), label: 'Sehenswürdigkeiten' },
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
      !currentRoute.waypoints ||
      currentRoute.waypoints.length !== coordinates.length ||
      currentRoute.waypoints.some((coord: any, idx: number) => 
        coord.lat !== coordinates[idx].lat || coord.lng !== coordinates[idx].lng
      );

    if (coordsChanged) {
      setRoute({
        ...currentRoute,
        waypoints: coordinates,
      });
    }
  }, [waypoints]);

  // Sync routeStore waypoints (from map context menu) to local state
  useEffect(() => {
    if (!currentRoute?.waypoints || currentRoute.waypoints.length === 0) return;

    const storeWaypoints = currentRoute.waypoints;
    const newLocalWaypoints: Waypoint[] = storeWaypoints.map((wp: any, idx: number) => ({
      label: waypointLabels[idx] || `${idx + 1}`,
      placeholder: '',
      lat: wp.lat,
      lng: wp.lng,
      isLocked: false,
    }));

    // Only update if coordinates actually changed to avoid infinite loops
    const hasChanged = 
      waypoints.length !== newLocalWaypoints.length ||
      waypoints.some((wp, idx) => 
        wp.lat !== newLocalWaypoints[idx].lat || wp.lng !== newLocalWaypoints[idx].lng
      );

    if (hasChanged) {
      console.log('[LeftPanel] Syncing routeStore waypoints to local state:', newLocalWaypoints);
      setWaypoints(newLocalWaypoints);
    }
  }, [currentRoute?.waypoints]);

  // Helper: Auto-relabel waypoints A-Z
  const relabelWaypoints = (wps: Waypoint[]): Waypoint[] => {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    return wps.map((wp, idx) => ({
      ...wp,
      label: labels[idx] || `${idx + 1}`,
    }));
  };

  // Helper: Remove waypoint at index
  const removeWaypoint = (index: number) => {
    if (waypoints.length <= 2) return; // Keep at least 2 waypoints
    const newWaypoints = relabelWaypoints(
      waypoints.filter((_, i) => i !== index)
    );
    setWaypoints(newWaypoints);
  };

  // Helper: Insert new waypoint at index
  const insertWaypoint = (index: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints.splice(index, 0, {
      label: 'X', // Will be relabeled
      placeholder: '',
      lat: 0,
      lng: 0,
      isLocked: false,
    });
    setWaypoints(relabelWaypoints(newWaypoints));
  };

  // Helper: Reorder waypoint (move from fromIndex to toIndex)
  const moveWaypoint = (fromIndex: number, toIndex: number) => {
    const newWaypoints = [...waypoints];
    const [removed] = newWaypoints.splice(fromIndex, 1);
    newWaypoints.splice(toIndex, 0, removed);
    setWaypoints(relabelWaypoints(newWaypoints));
  };

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
        console.log('[Autocomplete] Search for:', value, 'Results:', data.length);
        
        // Filter for results with display_name (more lenient than requiring address object)
        const filtered = data
          .filter((item: any) => item.display_name)
          .map((item: any) => ({
            ...item,
            // Prioritize results with street/house number
            priority: (item.address?.house_number ? 1 : item.address?.road ? 2 : 3),
          }))
          .sort((a: any, b: any) => a.priority - b.priority)
          .slice(0, 5);
        
        console.log('[Autocomplete] Filtered results:', filtered.length);
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
    
    const suggestions = autocompleteSuggestions;
    
    // If there are suggestions, select the first one
    if (suggestions && suggestions.length > 0) {
      handleSelectSuggestion(index, suggestions[0]);
      return;
    }
    
    // Otherwise, do nothing (don't auto-navigate on Enter)
    // The user must explicitly click a suggestion to navigate
  };

  const handleUnlockWaypoint = (index: number) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].isLocked = false;
    newWaypoints[index].placeholder = '';
    setWaypoints(newWaypoints);
  };

  // Note: handleSelectLocation functionality moved to handleSelectSuggestion

  const handleAddWaypoint = () => {
    if (waypoints.length < 26) {
      setWaypoints(relabelWaypoints([
        ...waypoints,
        { label: 'X', placeholder: '', lat: 52.52, lng: 13.4, isLocked: false },
      ]));
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    removeWaypoint(index);
  };

  // Toggle filter - only change display, no fetching
  const handleFilterToggle = (filterType: POIType) => {
    console.log('[LeftPanel] Toggling filter:', filterType, 'Current state:', activeFilters[filterType]);
    toggleFilter(filterType);
  };

  // Drag-and-Drop handlers for waypoint reordering
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    e.preventDefault();
    if (draggedIndex !== null && draggedIndex !== toIndex) {
      moveWaypoint(draggedIndex, toIndex);
    }
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
          {/* Route Title with Profile Selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '0 16px',
              borderRadius: '20px',
              height: '52px',
              border: `1px solid ${colors.inputBorder}`,
              backgroundColor: colors.inputBg,
              flex: 1,
              boxSizing: 'border-box',
            }}
          >
            {/* Profile Selector Dropdown */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    color: colors.text,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '32px',
                    height: '32px',
                    minWidth: '32px',
                  }}
                  title="Fahrradtyp wechseln"
                >
                  {currentRoute?.profile === 'mountain' ? (
                    renderIcon('mountain')
                  ) : currentRoute?.profile === 'gravel' ? (
                    renderIcon('gravel')
                  ) : (
                    renderIcon('road')
                  )}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                style={{
                  minWidth: '80px',
                  backgroundColor: colors.bg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  padding: '4px',
                  color: colors.text,
                  zIndex: 1010,
                }}
              >
                <DropdownMenu.Item
                  onClick={() => {
                    if (currentRoute) {
                      setRoute({ ...currentRoute, profile: 'road' });
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '16px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                >
                  {renderIcon('road')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => {
                    if (currentRoute) {
                      setRoute({ ...currentRoute, profile: 'mountain' });
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '16px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                >
                  {renderIcon('mountain')}
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onClick={() => {
                    if (currentRoute) {
                      setRoute({ ...currentRoute, profile: 'gravel' });
                    }
                  }}
                  style={{ padding: '8px 12px', fontSize: '16px', cursor: 'pointer', textAlign: 'center', display: 'flex', justifyContent: 'center' }}
                >
                  {renderIcon('gravel')}
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            {/* Route Title Text */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', flex: 1, overflow: 'hidden' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: colors.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {currentRoute?.name || 'Route'}
                  </span>
                  <span style={{ fontSize: '12px', opacity: 0.5, marginLeft: '4px' }}>▼</span>
                </div>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content
                style={{
                  width: '300px',
                  maxHeight: '400px',
                  overflowY: 'auto',
                  backgroundColor: colors.bg,
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: `1px solid ${colors.border}`,
                  borderRadius: '12px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                  padding: '8px',
                  color: colors.text,
                  zIndex: 1010,
                }}
              >
                <div style={{ padding: '4px 8px 8px', fontSize: '12px', opacity: 0.6, fontWeight: 'bold' }}>Zuletzt berechnet</div>
                {savedRoutes.sort((a, b) => b.updatedAt - a.updatedAt).map(route => (
                  <DropdownMenu.Item
                    key={route.id}
                    onClick={() => {
                      loadRoute(route.id);
                    }}
                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '2px', backgroundColor: currentRoute?.id === route.id ? colors.mutedBg : 'transparent' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.mutedBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = currentRoute?.id === route.id ? colors.mutedBg : 'transparent'; }}
                  >
                    <div style={{ fontWeight: '500', fontSize: '14px' }}>{route.name}</div>
                    <div style={{ fontSize: '12px', opacity: 0.7, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {renderIcon(route.profile, { width: 14, height: 14 })}
                      </span>
                      {route.geometry ? <span>{(route.geometry.distance).toFixed(1)} km</span> : null}
                      <span>·</span>
                      <span>{new Date(route.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </DropdownMenu.Item>
                ))}
                {savedRoutes.length === 0 && (
                  <div style={{ padding: '16px 8px', fontSize: '14px', opacity: 0.5, textAlign: 'center' }}>Keine Routen gespeichert</div>
                )}
                <div style={{ height: '1px', backgroundColor: colors.border, margin: '8px 0' }} />
                <DropdownMenu.Item
                    onClick={() => {
                      setRoute({
                        id: 'new-route',
                        name: 'Neue Route',
                        description: '',
                        waypoints: [],
                        geometry: undefined,
                        profile: 'road',
                        difficultyLevel: 'easy',
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                    }}
                    style={{ padding: '10px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#0ea5e9', fontWeight: '500', fontSize: '14px' }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = colors.mutedBg; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                  >
                    {renderIcon('plus', { width: 16, height: 16 })}
                    Neue Route erstellen
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>

          {/* Settings Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button style={{ background: 'none', border: 'none', padding: '8px', cursor: 'pointer', color: colors.text }}>
                {renderIcon('menu')}
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
          {/* Waypoint Inputs */}
          <div style={{ marginBottom: '16px' }}>
            {waypoints.map((wp, idx) => (
              <div 
                key={idx} 
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px', 
                  marginBottom: '8px',
                  opacity: draggedIndex === idx ? 0.5 : 1,
                  backgroundColor: draggedIndex === null ? 'transparent' : (draggedIndex === idx ? colors.mutedBg : 'transparent'),
                  borderRadius: '20px',
                  padding: draggedIndex === null ? '0' : '4px',
                  transition: 'all 0.2s',
                  cursor: draggedIndex === idx ? 'grabbing' : 'grab',
                }}
              >
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
                        paddingRight: '40px',
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
                      {renderIcon('menuClose')}
                    </button>
                  )}
              </div>
            ))}
          </div>

          {/* Actions Row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
            {/* Add Waypoint Button */}
            {waypoints.length < waypointLabels.length && (
              <button
                onClick={handleAddWaypoint}
                style={{
                  width: '40px',
                  height: '40px',
                  backgroundColor: colors.mutedBg,
                  border: `1px solid ${colors.border}`,
                  borderRadius: '50%',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: colors.text,
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  boxSizing: 'border-box',
                }}
                title="Punkt hinzufügen"
              >
                {renderIcon('plus', { width: 20, height: 20 })}
              </button>
            )}

            {/* Route Calculator */}
            <div style={{ flex: 1 }}>
              <RouteCalculator />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom - POI Filter Buttons */}
      <div
        style={{
          flexShrink: 0,
          borderTop: `1px solid ${colors.border}`,
          backgroundColor: 'transparent',
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
