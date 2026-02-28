import React from 'react';
import { useRouteStore } from '../store/routeStore';

export const RouteInfo: React.FC = () => {
  const currentRoute = useRouteStore((state) => state.currentRoute);

  if (!currentRoute) {
    return <div className="text-gray-600">No route loaded</div>;
  }

  const difficultyColors: Record<string, string> = {
    easy: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    hard: 'bg-red-100 text-red-800',
  };

  const difficultyIcons: Record<string, string> = {
    easy: '🟢',
    medium: '🟡',
    hard: '🔴',
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">{currentRoute.name}</h2>

      <div className="space-y-4">
        <p className="text-gray-700 text-sm">{currentRoute.description}</p>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-md">
            <p className="text-xs text-gray-600">Distance</p>
            <p className="text-lg font-bold text-blue-600">{currentRoute.distance} km</p>
          </div>

          <div className="bg-purple-50 p-3 rounded-md">
            <p className="text-xs text-gray-600">Duration</p>
            <p className="text-lg font-bold text-purple-600">{currentRoute.duration} min</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-2xl">{difficultyIcons[currentRoute.difficulty]}</span>
          <div>
            <p className="text-xs text-gray-600">Difficulty</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize ${
                difficultyColors[currentRoute.difficulty]
              }`}
            >
              {currentRoute.difficulty}
            </span>
          </div>
        </div>

        <div className="border-t pt-3">
          <p className="text-xs font-bold text-gray-700 mb-2">Waypoints</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {currentRoute.coordinates.map((coord, index) => (
              <div
                key={index}
                className="text-xs text-gray-600 flex items-start gap-2 p-2 bg-gray-50 rounded"
              >
                <span className="font-bold text-blue-600 min-w-fit">{index + 1}</span>
                <span className="text-gray-500">
                  {coord.lat.toFixed(4)}°N, {coord.lng.toFixed(4)}°E
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-3 rounded-md text-center">
          <p className="text-xs text-gray-600">Total Points</p>
          <p className="text-2xl font-bold text-blue-600">{currentRoute.coordinates.length}</p>
        </div>
      </div>
    </div>
  );
};
