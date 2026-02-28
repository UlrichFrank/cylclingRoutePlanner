import React, { useState } from 'react';
import * as Slider from '@radix-ui/react-slider';
import { useRouteStore, RouteCoordinate } from '../store/routeStore';
import { usePOIStore } from '../store/poiStore';
import { fetchPOIs } from '../services/overpassService';

interface Waypoint {
  name: string;
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

export const LeftPanel: React.FC = () => {
  const [waypoints, setWaypoints] = useState<Waypoint[]>([
    { name: 'Startpunkt', lat: 52.5200, lng: 13.4050 },
    { name: 'Ziel', lat: 52.5235, lng: 13.4115 },
  ]);

  const [activeFilters, setActiveFilters] = useState<POIFilterState>({
    restaurant: false,
    cafe: false,
    bakery: false,
    hotel: false,
    attraction: false,
  });

  const [loading, setLoading] = useState(false);
  const { setRoute, currentRoute } = useRouteStore();
  const { setPOIs, pois } = usePOIStore();

  const poiFilters: Array<{ key: POIType; emoji: string; label: string; color: string }> = [
    { key: 'restaurant', emoji: '🍽️', label: 'Restaurants', color: 'bg-red-500 hover:bg-red-600 active:bg-red-700' },
    { key: 'cafe', emoji: '☕', label: 'Cafés', color: 'bg-orange-500 hover:bg-orange-600 active:bg-orange-700' },
    { key: 'bakery', emoji: '🥐', label: 'Bäckereien', color: 'bg-yellow-600 hover:bg-yellow-700 active:bg-yellow-800' },
    { key: 'hotel', emoji: '🏨', label: 'Hotels', color: 'bg-blue-500 hover:bg-blue-600 active:bg-blue-700' },
    { key: 'attraction', emoji: '🎯', label: 'Sehenswürdigkeiten', color: 'bg-purple-500 hover:bg-purple-600 active:bg-purple-700' },
  ];

  const handleWaypointNameChange = (index: number, value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index].name = value;
    setWaypoints(newWaypoints);
  };

  const handleAddWaypoint = () => {
    setWaypoints([
      ...waypoints,
      { name: `Punkt ${waypoints.length}`, lat: 52.52, lng: 13.4 },
    ]);
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleApplyRoute = () => {
    if (currentRoute) {
      const coordinates: RouteCoordinate[] = waypoints.map(wp => ({
        lat: wp.lat,
        lng: wp.lng
      }));
      setRoute({
        ...currentRoute,
        coordinates,
      });
    }
  };

  const handleFilterToggle = async (filterType: POIType) => {
    const isActive = activeFilters[filterType];

    if (!isActive && currentRoute) {
      setLoading(true);
      try {
        let results = await fetchPOIs(currentRoute.coordinates, filterType as any);
        
        results = results.filter((poi) => {
          const distance = calculateDistanceToRoute(poi.lat, poi.lng, currentRoute.coordinates);
          return distance <= 1.0;
        });
        
        setPOIs(results);
        setActiveFilters({ ...activeFilters, [filterType]: true });
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
    <div className="fixed top-[5%] left-[2%] bottom-[5%] w-96 bg-white rounded-3xl shadow-2xl z-40 flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 flex-shrink-0">
        <h2 className="text-3xl font-bold">Meine Route</h2>
        <p className="text-blue-100 text-sm mt-1">Planen und entdecken</p>
      </div>

      {/* Divider */}
      <div className="h-1 bg-gradient-to-r from-blue-500 to-purple-500"></div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {/* Waypoints Section */}
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Wegpunkte</h3>
          <div className="space-y-3">
            {waypoints.map((wp, idx) => (
              <div key={idx} className="relative">
                <input
                  type="text"
                  value={wp.name}
                  onChange={(e) => handleWaypointNameChange(idx, e.target.value)}
                  placeholder={`Punkt ${idx + 1}`}
                  className="w-full px-5 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                />
                {waypoints.length > 2 && (
                  <button
                    onClick={() => handleRemoveWaypoint(idx)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700 text-2xl font-bold transition-colors"
                    title="Punkt entfernen"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add Waypoint Button */}
          <button
            onClick={handleAddWaypoint}
            className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-xl transition-all transform hover:scale-105 active:scale-95"
            title="Punkt hinzufügen"
          >
            ➕ Punkt hinzufügen
          </button>
        </div>
      </div>

      {/* Apply Route Button */}
      <div className="flex-shrink-0 px-6 py-4 bg-gray-50">
        <button
          onClick={handleApplyRoute}
          className="w-full py-5 px-6 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-2xl font-bold text-xl transition-all transform hover:scale-105 active:scale-95 shadow-lg"
        >
          ✓ Route anwenden
        </button>
      </div>

      {/* POI Filter Buttons */}
      <div className="flex-shrink-0 bg-gray-100 px-6 py-6 border-t border-gray-200">
        <p className="text-sm font-semibold text-gray-700 text-center mb-4">Sehenswürdigkeiten (1km)</p>
        <div className="grid grid-cols-5 gap-3">
          {poiFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => handleFilterToggle(filter.key)}
              disabled={loading}
              className={`aspect-square rounded-full text-4xl flex items-center justify-center transition-all transform hover:scale-110 active:scale-95 ${
                activeFilters[filter.key]
                  ? `${filter.color} ring-4 ring-offset-2 ring-gray-800 shadow-lg`
                  : 'bg-gray-300 hover:bg-gray-400'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
              title={filter.label}
            >
              {filter.emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
