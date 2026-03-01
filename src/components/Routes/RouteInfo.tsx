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

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 p-3 rounded-md dark:bg-blue-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">Entfernung</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {currentRoute.geometry?.distance.toFixed(1) || stats.distance} km
              </p>
            </div>

            <div className="bg-purple-50 p-3 rounded-md dark:bg-purple-900/20">
              <p className="text-xs text-gray-600 dark:text-gray-400">Höhenmeter</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                +{currentRoute.geometry?.elevationGain || 0} m
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-2xl">
              {currentRoute.difficultyLevel === 'easy'
                ? '🟢'
                : currentRoute.difficultyLevel === 'medium'
                  ? '🟡'
                  : '🔴'}
            </span>
            <div>
              <p className="text-xs text-gray-600 dark:text-gray-400">Schwierigkeit</p>
              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold capitalize bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                {currentRoute.difficultyLevel === 'easy'
                  ? 'Leicht'
                  : currentRoute.difficultyLevel === 'medium'
                    ? 'Mittel'
                    : 'Schwer'}
              </span>
            </div>
          </div>

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
