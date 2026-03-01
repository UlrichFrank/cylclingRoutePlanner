import React, { useState } from 'react';
import { useRouteStore, RouteCoordinate } from '../../store/routeStore';

export const WaypointInput: React.FC = () => {
  const [waypoints, setWaypoints] = useState<RouteCoordinate[]>([
    { lat: 52.5200, lng: 13.4050 },
    { lat: 52.5235, lng: 13.4115 },
  ]);

  const { setRoute, currentRoute } = useRouteStore();

  const handleWaypointChange = (index: number, field: 'lat' | 'lng', value: string) => {
    const newWaypoints = [...waypoints];
    newWaypoints[index] = {
      ...newWaypoints[index],
      [field]: parseFloat(value) || 0,
    };
    setWaypoints(newWaypoints);
  };

  const handleAddWaypoint = () => {
    setWaypoints([
      ...waypoints,
      { lat: 52.52, lng: 13.4 },
    ]);
  };

  const handleRemoveWaypoint = (index: number) => {
    if (waypoints.length > 2) {
      setWaypoints(waypoints.filter((_, i) => i !== index));
    }
  };

  const handleApplyRoute = () => {
    if (currentRoute) {
      setRoute({
        ...currentRoute,
        waypoints: waypoints,
      });
    }
  };

  const handleLoadGPS = () => {
    const gpsInput = prompt('Geben Sie GPS-Koordinaten im Format ein (lat,lng;lat,lng;...)');
    if (gpsInput) {
      try {
        const coords = gpsInput.split(';').map((pair) => {
          const [lat, lng] = pair.trim().split(',').map((s) => parseFloat(s.trim()));
          if (isNaN(lat) || isNaN(lng)) throw new Error('Invalid waypoints');
          return { lat, lng };
        });
        setWaypoints(coords);
      } catch (error) {
        alert('Ungültige Koordinaten. Bitte verwenden Sie das Format: 52.52,13.4;52.53,13.41;...');
      }
    }
  };

  return (
    <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 max-w-sm z-40 max-h-96 overflow-y-auto">
      <h3 className="text-lg font-bold mb-3">🗺️ Wegpunkte</h3>

      <div className="space-y-2 mb-4">
        {waypoints.map((wp, idx) => (
          <div key={idx} className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-xs text-gray-600">Lat</label>
              <input
                type="number"
                step="0.0001"
                value={wp.lat}
                onChange={(e) => handleWaypointChange(idx, 'lat', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Latitude"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-gray-600">Lng</label>
              <input
                type="number"
                step="0.0001"
                value={wp.lng}
                onChange={(e) => handleWaypointChange(idx, 'lng', e.target.value)}
                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Longitude"
              />
            </div>
            {waypoints.length > 2 && (
              <button
                onClick={() => handleRemoveWaypoint(idx)}
                className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <button
          onClick={handleAddWaypoint}
          className="w-full py-2 px-3 bg-blue-500 text-white rounded font-semibold hover:bg-blue-600 text-sm flex items-center justify-center gap-1"
        >
          ➕ Punkt hinzufügen
        </button>

        <button
          onClick={handleLoadGPS}
          className="w-full py-2 px-3 bg-green-500 text-white rounded font-semibold hover:bg-green-600 text-sm"
        >
          📍 GPS laden
        </button>

        <button
          onClick={handleApplyRoute}
          className="w-full py-2 px-3 bg-purple-600 text-white rounded font-semibold hover:bg-purple-700 text-sm"
        >
          ✓ Route übernehmen
        </button>
      </div>
    </div>
  );
};
