import React, { useMemo } from 'react';
import { useRouteStore } from '../../store/routeStore';
import { routeService } from '../../services/routeService';
import { ElevationProfile } from './ElevationProfile';
import { useTheme } from '../Layout/ThemeContext';

export const RouteInfo: React.FC = () => {
  const currentRoute = useRouteStore((state: any) => state.currentRoute);

  if (!currentRoute) {
    return <div className="text-gray-600">No route loaded</div>;
  }

  const stats = useMemo(() => {
    return routeService.getRouteStats(currentRoute);
  }, [currentRoute]);

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
    <div>
      <div className="p-4 bg-white rounded-lg shadow-md dark:bg-slate-900 dark:text-white">
        <h2 className="text-xl font-bold mb-4">{currentRoute.name}</h2>

        <div className="space-y-4">
          <p className="text-gray-700 text-sm dark:text-gray-300">{currentRoute.description || 'No description'}</p>

          {/* Route Statistics */}
          {currentRoute.geometry && (
            <div className="border-t pt-3 dark:border-gray-700">
              <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-3">Route-Statistiken</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Distanz</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {currentRoute.geometry.distance.toFixed(1)} km
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Dauer</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {Math.round(currentRoute.geometry.duration / 60)} Min
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Aufstieg</span>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    ⬆️ {currentRoute.geometry.elevationGain} m
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Abstieg</span>
                  <p className="font-semibold text-blue-600 dark:text-blue-400">
                    ⬇️ {currentRoute.geometry.elevationLoss} m
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Max Höhe</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {currentRoute.geometry.maxElevation} m
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400">Steigung</span>
                  <p className="font-semibold text-gray-700 dark:text-gray-200">
                    {currentRoute.geometry.averageGrade.toFixed(1)} %
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="border-t pt-3 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">Wegpunkte</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {currentRoute.waypoints.map((coord: any, index: number) => (
                <div
                  key={index}
                  className="text-xs text-gray-600 dark:text-gray-400 flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded"
                >
                  <span className="font-bold text-blue-600 dark:text-blue-400 min-w-fit">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span className="text-gray-500 dark:text-gray-400">
                    {coord.lat.toFixed(4)}°N, {coord.lng.toFixed(4)}°E
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Elevation Profile */}
      <div className="mt-4 bg-white rounded-lg shadow-md dark:bg-slate-900 dark:text-white overflow-hidden">
        <ElevationProfile />
      </div>
    </div>
  );
};
