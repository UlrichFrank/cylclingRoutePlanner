import React, { useState, useEffect } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { Box, Flex, Text, Button, TextField } from '@radix-ui/themes';
import { ChevronDownIcon, MagnifyingGlassIcon, DotsHorizontalIcon, PlusIcon, Cross2Icon } from '@radix-ui/react-icons';
import { useRouteStore, RouteCoordinate } from '../store/routeStore';
import { usePOIStore } from '../store/poiStore';
import { fetchPOIs } from '../services/overpassService';

interface Waypoint {
  label: string;
  placeholder: string;
  lat: number;
  lng: number;
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
const waypointColors = {
  A: '#16a34a',
  B: '#ea580c',
  C: '#0ea5e9',
  D: '#8b5cf6',
  E: '#ec4899',
  F: '#f59e0b',
  G: '#06b6d4',
};

export const LeftPanel: React.FC = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { label: 'A', placeholder: 'Gib einen Startpunkt ein', lat: 52.5200, lng: 13.4050 },
    { label: 'B', placeholder: 'Wo solls hingehen?', lat: 52.5235, lng: 13.4115 },
  ]);

  const [activeFilters, setActiveFilters] = useState<POIFilterState>({
    restaurant: false,
    cafe: false,
    bakery: false,
    hotel: false,
    attraction: false,
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { setRoute, currentRoute } = useRouteStore();
  const { setPOIs, pois } = usePOIStore();

  const poiFilters: Array<{ key: POIType; emoji: string; label: string }> = [
    { key: 'restaurant', emoji: '🍽️', label: 'Restaurants' },
    { key: 'cafe', emoji: '☕', label: 'Cafés' },
    { key: 'bakery', emoji: '🥐', label: 'Bäckereien' },
    { key: 'hotel', emoji: '🏨', label: 'Hotels' },
    { key: 'attraction', emoji: '🎯', label: 'Sehenswürdigkeiten' },
  ];

  // Auto-update route when waypoints change
  useEffect(() => {
    if (currentRoute && waypoints.length > 0) {
      const coordinates: RouteCoordinate[] = waypoints.map(wp => ({
        lat: wp.lat,
        lng: wp.lng
      }));
      setRoute({
        ...currentRoute,
        coordinates,
      });
    }
  }, [waypoints]); // Only depend on waypoints to avoid infinite loops

  const handleWaypointChange = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].placeholder = value;
    setWaypoints(newWaypoints);
  };

  const handleAddWaypoint = () => {
    if (waypoints.length < waypointLabels.length) {
      setWaypoints([
        ...waypoints,
        { label: waypointLabels[waypoints.length], placeholder: '', lat: 52.52, lng: 13.4 },
      ]);
    }
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleFilterToggle = async (filterType: POIType) => {
    const isActive = activeFilters[filterType];

    if (!isActive && currentRoute && currentRoute.coordinates.length > 0) {
      setLoading(true);
      try {
        let results = await fetchPOIs(currentRoute.coordinates, filterType as any);
        
        results = results.filter((poi) => {
          const distance = calculateDistanceToRoute(poi.lat, poi.lng, currentRoute.coordinates);
          return distance <= 1.0;
        });
        
        const newFilters = { ...activeFilters, [filterType]: true };
        setActiveFilters(newFilters);
        
        // Only show POIs for active filters
        const activePOITypes = Object.entries(newFilters)
          .filter(([_, active]) => active)
          .map(([type]) => type);

        const allPOIs = results;
        const filteredPOIs = allPOIs.filter((poi) => activePOITypes.includes(poi.type));
        setPOIs(filteredPOIs);
      } catch (error) {
        console.error('Error fetching POIs:', error);
      } finally {
        setLoading(false);
      }
    } else if (isActive) {
      const newFilters = { ...activeFilters, [filterType]: false };
      setActiveFilters(newFilters);

      const activePOITypes = Object.entries(newFilters)
        .filter(([_, active]) => active)
        .map(([type]) => type);

      const filteredPOIs = pois.filter((poi) => activePOITypes.includes(poi.type));
      setPOIs(filteredPOIs);
    }
  };

  return (
    <Box
      className="fixed overflow-hidden flex flex-col"
      style={{
        top: '5%',
        left: '2%',
        bottom: '5%',
        width: '384px',
        backgroundColor: 'var(--color-background)',
        border: '1px solid var(--color-border)',
        borderRadius: 'calc(var(--radius) * 4)',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        zIndex: 40,
      }}
    >
      {/* Header */}
      <Box
        p="4"
        style={{
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        <Flex justify="between" align="center" gap="2">
          <Text as="div" size="4" weight="bold">Deine Route</Text>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button variant="ghost" size="2" className="p-2">
                <DotsHorizontalIcon width={24} height={24} />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content 
              className="bg-background border border-border rounded-md shadow-lg p-1"
              style={{ minWidth: '150px' }}
            >
              <DropdownMenu.Item className="px-3 py-2 text-sm cursor-pointer hover:bg-muted rounded">
                Einstellungen
              </DropdownMenu.Item>
              <DropdownMenu.Item className="px-3 py-2 text-sm cursor-pointer hover:bg-muted rounded">
                Löschen
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </Flex>
      </Box>

      {/* Scrollable Content */}
      <Box className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
        {/* Waypoints Section */}
        <Box
          p="4"
          style={{
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <Flex justify="between" align="center" mb="4">
            <Text size="3" weight="bold">Wegpunkte</Text>
          </Flex>

          {/* Waypoint Inputs */}
          <div className="space-y-2 mb-4">
            {waypoints.map((wp, idx) => (
              <Flex key={idx} align="center" gap="2">
                <TextField.Root
                  size="3"
                  placeholder={wp.placeholder}
                  value={wp.placeholder}
                  onChange={(e) => handleWaypointChange(idx, e.target.value)}
                  className="flex-1"
                  style={{ borderRadius: '20px', height: '52px' }}
                >
                  <TextField.Slot side="left">
                    <Box
                      className="w-8 h-8 rounded-full text-white font-bold text-xs flex-shrink-0"
                      style={{ 
                        backgroundColor: waypointColors[wp.label as keyof typeof waypointColors],
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: '1',
                      }}
                    >
                      {wp.label}
                    </Box>
                  </TextField.Slot>
                </TextField.Root>
                {waypoints.length > 2 && (
                  <Button
                    onClick={() => handleRemoveWaypoint(idx)}
                    variant="ghost"
                    size="2"
                    className="text-red-600 hover:text-red-700"
                  >
                    <Cross2Icon width={20} height={20} />
                  </Button>
                )}
              </Flex>
            ))}
          </div>

          {/* Add Waypoint Button */}
          {waypoints.length < waypointLabels.length && (
            <Button
              onClick={handleAddWaypoint}
              variant="soft"
              size="3"
              className="w-full"
            >
              <PlusIcon width={20} height={20} />
              <span>Punkt hinzufügen</span>
            </Button>
          )}
        </Box>
      </Box>

      {/* Spacer - pushes buttons to bottom */}
      <div style={{ flex: 1 }} />

      {/* Bottom - POI Filter Buttons */}
      <Box
        className="flex-shrink-0"
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-background)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '12px 16px 16px 16px',
        }}
      >
        <Flex gap="2" justify="center">
          {poiFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterToggle(filter.key)}
              disabled={loading}
              className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all flex-shrink-0 border-2 ${
                activeFilters[filter.key]
                  ? 'border-blue-500 bg-blue-100 shadow-lg'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={filter.label}
              aria-label={filter.label}
            >
              {filter.emoji}
            </button>
          ))}
        </Flex>
      </Box>
    </Box>
  );
};
