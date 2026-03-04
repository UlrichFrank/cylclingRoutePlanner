/**
 * Elevation Profile Component
 * Displays elevation chart for route using Recharts
 */

import React, { useMemo, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useRouteStore } from '../../store/routeStore';
import { useTheme } from '../Layout/ThemeContext';

interface ElevationPoint {
  distance: number; // km
  elevation: number; // meters
  index: number; // Index in full geometry array
}

interface ElevationProfileProps {
  compact?: boolean;
}

export const ElevationProfile: React.FC<ElevationProfileProps> = ({ 
  compact = false,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRoute, elevationProfilePosition, setElevationProfilePosition } = useRouteStore();
  const containerRef = useRef<HTMLDivElement>(null);

  const colors = {
    bg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    grid: isDark ? 'hsl(217.2, 32.6%, 25%)' : 'hsl(210, 40%, 90%)',
  };

  // Handle mouse movement over elevation profile to sync with map
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    
    if (percentage >= 0 && percentage <= 1) {
      // Find closest data point based on percentage
      const index = Math.round(percentage * (elevationData.length - 1));
      if (index >= 0 && index < elevationData.length) {
        setElevationProfilePosition(elevationData[index].index);
      }
    }
  };

  const handleMouseLeave = () => {
    setElevationProfilePosition(null);
  };

  const geometry = currentRoute?.geometry;

  // Get elevation data from geometry
  const elevationData = useMemo(() => {
    if (!geometry?.geometry || geometry.geometry.length === 0) return [];
    
    // Use stored elevation array if available
    const elevations = geometry.elevation || [];
    
    console.log('[ElevationProfile] Geometry length:', geometry.geometry.length, 'Elevation length:', elevations.length);
    
    // Calculate distance along route for each point (cumulative, O(n) instead of O(n²))
    const data: ElevationPoint[] = [];
    let cumulativeDistance = 0; // km
    
    for (let idx = 0; idx < geometry.geometry.length; idx++) {
      if (idx > 0) {
        const lat1 = geometry.geometry[idx - 1].lat;
        const lng1 = geometry.geometry[idx - 1].lng;
        const lat2 = geometry.geometry[idx].lat;
        const lng2 = geometry.geometry[idx].lng;
        
        const R = 6371; // Earth radius in km
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLng = ((lng2 - lng1) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const segmentDistance = R * c;
        cumulativeDistance += segmentDistance;
      }
      
      data.push({
        distance: Math.round(cumulativeDistance * 10) / 10, // km
        elevation: elevations[idx] !== undefined ? elevations[idx] : 0, // Handle 0 elevation correctly
        index: idx,
      });
    }

    if (data.length > 0) {
      console.log(`[ElevationProfile] Calculated ${data.length} elevation points`);
      console.log(`[ElevationProfile] Distance range: 0 - ${data[data.length - 1].distance} km`);
      console.log(`[ElevationProfile] Expected total: ${geometry.distance?.toFixed(1) || 'N/A'} km`);
      console.log(`[ElevationProfile] Last elevation values:`, data.slice(-5).map(d => `${d.distance}km: ${d.elevation}m`));
    }

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
      <div 
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ width: '100%', height: '100%' }}
      >
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
            {elevationProfilePosition !== null && (
              <ReferenceLine x={elevationData[elevationProfilePosition]?.distance} stroke="#ff6b6b" strokeDasharray="3 3" />
            )}
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
      </div>
    );
  }

  // Full mode for details panel
  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
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
            {elevationProfilePosition !== null && (
              <ReferenceLine x={elevationData[elevationProfilePosition]?.distance} stroke="#ff6b6b" strokeDasharray="3 3" />
            )}
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
