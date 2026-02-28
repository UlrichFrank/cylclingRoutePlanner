import React, { useState } from 'react';
import { usePOIStore } from '../store/poiStore';
import { useRouteStore } from '../store/routeStore';
import { fetchPOIs } from '../services/overpassService';

export const POISearch: React.FC = () => {
  const { setLoading, setError, setPOIs, activeType, setActiveType, radius, setRadius } = usePOIStore();
  const currentRoute = useRouteStore((state) => state.currentRoute);
  const loading = usePOIStore((state) => state.loading);
  const error = usePOIStore((state) => state.error);

  const [localError, setLocalError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!currentRoute) {
      setLocalError('No route selected');
      return;
    }

    setLoading(true);
    setLocalError(null);
    setError(null);

    try {
      const results = await fetchPOIs(
        currentRoute.coordinates,
        activeType as 'restaurant' | 'cafe' | 'hotel' | 'bakery'
      );
      setPOIs(results);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error occurred';
      setLocalError(message);
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">Search POIs Along Route</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">POI Type</label>
          <select
            value={activeType}
            onChange={(e) => setActiveType(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="restaurant">🍽️ Restaurant</option>
            <option value="cafe">☕ Café</option>
            <option value="hotel">🏨 Hotel</option>
            <option value="bakery">🥐 Bakery</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Search Radius: {radius}m
          </label>
          <input
            type="range"
            min="100"
            max="2000"
            step="100"
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <button
          onClick={handleSearch}
          disabled={loading}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition font-medium"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>

        {localError && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
            {localError}
          </div>
        )}
      </div>
    </div>
  );
};
