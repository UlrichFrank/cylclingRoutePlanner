/**
 * Elevation Profile Component
 * Displays elevation chart for route using Recharts
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Area,
  AreaChart,
} from 'recharts';
import { useRouteStore } from '../../store/routeStore';
import { useTheme } from '../Layout/ThemeContext';

interface ElevationPoint {
  distance: number; // km
  elevation: number; // meters
}

export const ElevationProfile: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRoute } = useRouteStore();

  const colors = {
    bg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    grid: isDark ? 'hsl(217.2, 32.6%, 25%)' : 'hsl(210, 40%, 90%)',
  };

  // Generate elevation data points from geometry
  if (!currentRoute?.geometry?.geometry || currentRoute.geometry.geometry.length === 0) {
    return (
      <div
        style={{
          padding: '16px',
          color: colors.text,
          fontSize: '14px',
          textAlign: 'center',
          opacity: 0.6,
        }}
      >
        Route berechnen um Höhenprofil zu sehen
      </div>
    );
  }

  const geometryCoords = currentRoute.geometry.geometry;
  
  // Calculate distance along route for each point
  const elevationData: ElevationPoint[] = geometryCoords.map((coord, idx) => {
    let distance = 0;
    for (let i = 0; i < idx && i < geometryCoords.length - 1; i++) {
      const lat1 = geometryCoords[i].lat;
      const lng1 = geometryCoords[i].lng;
      const lat2 = geometryCoords[i + 1].lat;
      const lng2 = geometryCoords[i + 1].lng;
      
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      distance += R * c;
    }
    
    return {
      distance: Math.round(distance * 10) / 10, // km
      elevation: 0, // Placeholder - elevation data from Valhalla would be used here
    };
  });

  // Downsample data if too many points
  let chartData = elevationData;
  if (elevationData.length > 100) {
    const step = Math.floor(elevationData.length / 100);
    chartData = elevationData.filter((_, idx) => idx % step === 0);
  }

  // Calculate stats
  const elevations = geometryCoords.map(() => 0); // Placeholder
  const maxElev = Math.max(...elevations);
  const minElev = Math.min(...elevations);

  return (
    <div
      style={{
        padding: '16px',
        borderTop: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
      }}
    >
      <div style={{ marginBottom: '12px', fontSize: '14px', fontWeight: '600', color: colors.text }}>
        📈 Höhenprofil
      </div>

      {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={colors.grid}
              vertical={false}
            />
            <XAxis
              dataKey="distance"
              stroke={colors.text}
              style={{ fontSize: '12px' }}
              label={{ value: 'km', position: 'right', offset: -10, fill: colors.text }}
            />
            <YAxis
              stroke={colors.text}
              style={{ fontSize: '12px' }}
              label={{ value: 'm', angle: -90, position: 'insideLeft', fill: colors.text }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: '6px',
                color: colors.text,
              }}
              formatter={(value) => [`${value}m`, 'Höhe']}
              labelFormatter={(label) => `${label}km`}
            />
            <Area
              type="monotone"
              dataKey="elevation"
              stroke="#0ea5e9"
              fill="url(#elevationGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div style={{ color: colors.text, fontSize: '12px', opacity: 0.6, textAlign: 'center', padding: '20px' }}>
          Keine Höhendaten verfügbar
        </div>
      )}

      {/* Stats */}
      <div style={{ marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
        <div style={{ color: colors.text, opacity: 0.7 }}>
          ⬆️ Höhe max: <strong>{currentRoute.geometry?.maxElevation || '-'}m</strong>
        </div>
        <div style={{ color: colors.text, opacity: 0.7 }}>
          ⬇️ Höhe min: <strong>{currentRoute.geometry?.minElevation || '-'}m</strong>
        </div>
      </div>
    </div>
  );
};
