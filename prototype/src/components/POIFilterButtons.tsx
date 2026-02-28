import React, { useState } from 'react';
import { usePOIStore } from '../store/poiStore';
import { useRouteStore } from '../store/routeStore';
import { fetchPOIs } from '../services/overpassService';

type POIType = 'restaurant' | 'cafe' | 'bakery' | 'hotel' | 'attraction';

interface POIFilterState {
  restaurant: boolean;
  cafe: boolean;
  bakery: boolean;
  hotel: boolean;
  attraction: boolean;
}

// Haversine formula to calculate distance between two points (in km)
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Calculate minimum distance from POI to route (simplified: distance to closest waypoint)
const calculateDistanceToRoute = (poiLat: number, poiLng: number, routeCoordinates: any[]): number => {
  if (routeCoordinates.length === 0) return Infinity;
  return Math.min(
    ...routeCoordinates.map((coord) => calculateDistance(poiLat, poiLng, coord.lat, coord.lng))
  );
};

export const POIFilterButtons: React.FC = () => {
  // Note: POI filter buttons have been moved to LeftPanel for better layout
  // This component is kept for backwards compatibility but is not rendered in the main app
  const [activeFilters, setActiveFilters] = useState<POIFilterState>({
    restaurant: false,
    cafe: false,
    bakery: false,
    hotel: false,
    attraction: false,
  });

  const [loading, setLoading] = useState(false);
  const { setPOIs, pois } = usePOIStore();
  const currentRoute = useRouteStore((state) => state.currentRoute);

  const filters: Array<{ key: POIType; label: string; emoji: string; color: string }> = [
    { key: 'restaurant', label: 'Restaurants', emoji: '🍽️', color: 'bg-red-500 hover:bg-red-600' },
    { key: 'cafe', label: 'Cafés', emoji: '☕', color: 'bg-orange-500 hover:bg-orange-600' },
    { key: 'bakery', label: 'Bäckereien', emoji: '🥐', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { key: 'hotel', label: 'Hotels', emoji: '🏨', color: 'bg-blue-500 hover:bg-blue-600' },
    { key: 'attraction', label: 'Sehenswürdigkeiten', emoji: '🎯', color: 'bg-purple-500 hover:bg-purple-600' },
  ];

  const handleFilterToggle = async (filterType: POIType) => {
    const isActive = activeFilters[filterType];

    if (!isActive && currentRoute) {
      setLoading(true);
      try {
        let results = await fetchPOIs(currentRoute.coordinates, filterType as any);
        
        // Filter POIs to only include those within 1km of route
        results = results.filter((poi) => {
          const distance = calculateDistanceToRoute(poi.lat, poi.lng, currentRoute.coordinates);
          return distance <= 1.0; // 1 km
        });
        
        setPOIs(results);
        setActiveFilters({ ...activeFilters, [filterType]: true });
      } catch (error) {
        console.error('Error fetching POIs:', error);
      } finally {
        setLoading(false);
      }
    } else if (isActive) {
      // Deactivate filter
      const newFilters = { ...activeFilters, [filterType]: false };
      setActiveFilters(newFilters);

      // Keep only POIs from still-active filters
      const activePOITypes = Object.entries(newFilters)
        .filter(([_, active]) => active)
        .map(([type]) => type);

      const filteredPOIs = pois.filter((poi) => activePOITypes.includes(poi.type));
      setPOIs(filteredPOIs);
    }
  };

  return null;
};
