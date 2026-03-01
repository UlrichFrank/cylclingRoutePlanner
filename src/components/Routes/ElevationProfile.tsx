/**
 * Elevation Profile Component
 * Displays elevation chart for route using Recharts
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useRouteStore } from '../../store/routeStore';
import { useTheme } from '../Layout/ThemeContext';

interface ElevationPoint {
  distance: number; // km
  elevation: number; // meters
}

interface ElevationProfileProps {
  compact?: boolean;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  compact = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRoute } = useRouteStore();

  const colors = {
    bg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    grid: isDark ? 'hsl(217.2, 32.6%, 25%)' : 'hsl(210, 40%, 90%)',
  };

  const geometry = currentRoute?.geometry;

  // Get elevation data from geometry
  const elevationData = useMemo(() => {
    if (!geometry?.geometry || geometry.geometry.length === 0) return [];
    
    // Calculate distance along route for each point
    const data: ElevationPoint[] = geometry.geometry.map((coord, idx) => {
      let distance = 0;
      for (let i = 0; i < idx && i < geometry.geometry.length - 1; i++) {
        const lat1 = geometry.geometry[i].lat;
        const lng1 = geometry.geometry[i].lng;
        const lat2 = geometry.geometry[i + 1].lat;
        const lng2 = geometry.geometry[i + 1].lng;
        
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
        elevation: 0, // Placeholder - will be populated from elevation API if available
      };
    });

    return data;
  }, [geometry]);

  // Generate chart data
  const chartData = useMemo(() => {
    if (elevationData.length === 0) return [];
    
    let data = elevationData;
    if (data.length > (compact ? 50 : 100)) {
      const step = Math.floor(data.length / (compact ? 50 : 100));
      data = data.filter((_, idx) => idx % step === 0);
    }
    return data;
  }, [elevationData, compact]);

  // Generate empty state
  if (!geometry || geometry.geometry.length === 0) {
    return (
      <div
        style={{
          padding: compact ? '8px' : '16px',
          color: colors.text,
          fontSize: compact ? '12px' : '14px',
          textAlign: 'center',
          opacity: 0.6,
        }}
      >
        {compact ? '📈' : 'Route berechnen um Höhenprofil zu sehen'}
      </div>
    );
  }

  // Compact mode for header
  if (compact) {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="elevationGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
          <XAxis dataKey="distance" stroke={colors.text} style={{ fontSize: '10px' }} hide />
          <YAxis stroke={colors.text} style={{ fontSize: '10px' }} hide />
          <Tooltip
            contentStyle={{
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              borderRadius: '4px',
              color: colors.text,
              fontSize: '11px',
              padding: '4px 8px',
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
    );
  }

  // Full mode for details panel
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
          ⬆️ Höhe max: <strong>{geometry?.maxElevation || '-'}m</strong>
        </div>
        <div style={{ color: colors.text, opacity: 0.7 }}>
          ⬇️ Höhe min: <strong>{geometry?.minElevation || '-'}m</strong>
        </div>
      </div>
    </div>
  );
};
