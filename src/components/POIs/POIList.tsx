import React from 'react';
import { usePOIStore } from '../../store/poiStore';
import { renderIcon, POI_ICONS } from '../../utils/iconRegistry';

export const POIList: React.FC = () => {
  const pois = usePOIStore((state) => state.pois);
  const activeFilters = usePOIStore((state) => state.activeFilters);
  const loading = usePOIStore((state) => state.loading);

  const visiblePOIs = pois.filter((poi) => activeFilters[poi.type]);

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Loading POIs...</div>;
  }

  if (visiblePOIs.length === 0) {
    return (
      <div className="p-4 text-center text-gray-600">
        No POIs found. Search to begin!
      </div>
    );
  }

  const typeIcons: Record<string, React.ReactNode> = {
    restaurant: renderIcon('restaurant'),
    cafe: renderIcon('cafe'),
    hotel: renderIcon('hotel'),
    bakery: renderIcon('bakery'),
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">
        Found {visiblePOIs.length} POIs
      </h2>

      <div className="max-h-96 overflow-y-auto space-y-3">
        {visiblePOIs.map((poi) => (
          <div
            key={poi.id}
            className="p-3 border border-gray-200 rounded-md hover:bg-blue-50 transition cursor-pointer"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  {typeIcons[poi.type]} {poi.name}
                </h3>
                {poi.address && (
                  <p className="text-sm text-gray-600 mt-1">{poi.address}</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
