/**
 * Route Calculator Component
 * Handles Valhalla route calculation with profile selection and loading states
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouteStore } from '../../store/routeStore';
import { valhallaService } from '../../services/valhallaService';
import { useTheme } from '../Layout/ThemeContext';

type ValhallaProfile = 'mountain' | 'road' | 'gravel';

interface RouteCalculatorProps {
  onRouteCalculated?: () => void;
}

export const RouteCalculator: React.FC<RouteCalculatorProps> = ({ onRouteCalculated }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRoute, setRoute } = useRouteStore();
  const [profile, setProfile] = useState<ValhallaProfile>('road');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWaypointsRef = useRef<string>('');

  // Color theme
  const colors = {
    bg: isDark ? 'hsl(222.2, 84%, 4.9%)' : 'hsl(0, 0%, 100%)',
    border: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(214.3, 31.8%, 91.4%)',
    text: isDark ? 'hsl(210, 40%, 98%)' : 'hsl(222.2, 84%, 4.9%)',
    mutedBg: isDark ? 'hsl(217.2, 32.6%, 17.5%)' : 'hsl(210, 40%, 96%)',
    primary: '#0ea5e9',
    error: '#dc2626',
  };

  const profileLabels: Record<ValhallaProfile, string> = {
    mountain: '🏔️ Mountainbike',
    road: '🚴 Rennrad',
    gravel: '🛣️ Gravel',
  };

  // Auto-calculate route when waypoints change (with debounce)
  useEffect(() => {
    if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);

    const waypointsStr = JSON.stringify(currentRoute?.waypoints);
    if (waypointsStr === lastWaypointsRef.current) return;
    lastWaypointsRef.current = waypointsStr;

    if (currentRoute && currentRoute.waypoints.length >= 2 && currentRoute.geometry) {
      // Auto-recalculate with same profile if waypoints changed
      calcTimeoutRef.current = setTimeout(() => {
        handleCalculateRoute();
      }, 500);
    }

    return () => {
      if (calcTimeoutRef.current) clearTimeout(calcTimeoutRef.current);
    };
  }, [currentRoute?.waypoints]);

  const handleCalculateRoute = async () => {
    if (!currentRoute || currentRoute.waypoints.length < 2) {
      setError('Mindestens 2 Wegpunkte erforderlich');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convert waypoints to Valhalla format (lat/lon)
      const locations = currentRoute.waypoints.map((wp) => ({
        lat: wp.lat,
        lon: wp.lng,
      }));

      // Calculate route using Valhalla
      const routeResult = await valhallaService.calculateRoute(locations, profile);

      // Get full stats including elevation
      const stats = await valhallaService.getRouteStats(locations, profile);

      // Convert geometry back to our RouteCoordinate format
      // Valhalla polyline decoder now returns [lat, lng] format
      const geometry = routeResult.geometry.map((coord) => ({
        lat: coord[0],  // First element is now lat
        lng: coord[1],  // Second element is now lng
      }));
      
      console.log('[RouteCalculator] Converted geometry sample:', geometry.slice(0, 3));
      console.log('[RouteCalculator] Full geometry length:', geometry.length);

      // Update route with calculated geometry
      setRoute({
        ...currentRoute,
        profile,
        geometry: {
          geometry,
          elevation: stats.elevationArray || [],
          distance: stats.distance,
          duration: stats.duration,
          elevationGain: stats.elevationGain,
          elevationLoss: stats.elevationLoss,
          maxElevation: stats.maxElevation,
          minElevation: stats.minElevation,
          averageGrade: stats.averageGrade,
        },
        difficultyLevel: stats.difficulty,
      });

      onRouteCalculated?.();
    } catch (err) {
      // Improved error handling
      let message = 'Routenberechnung fehlgeschlagen';
      if (err instanceof Error) {
        if (err.message.includes('unavailable')) {
          message = '❌ Valhalla Service nicht erreichbar. Prüfe deine Internetverbindung.';
        } else if (err.message.includes('invalid')) {
          message = '❌ Ungültige Wegpunkte. Bitte überprüfe die Koordinaten.';
        } else {
          message = `❌ ${err.message}`;
        }
      }
      setError(message);
      console.error('Route calculation error:', err);

      // Fallback: Use straight line between waypoints if Valhalla fails
      if (currentRoute && currentRoute.waypoints.length >= 2) {
        const geometry = currentRoute.waypoints;
        const distance = currentRoute.waypoints.reduce((sum, wp, idx, arr) => {
          if (idx === 0) return sum;
          const prev = arr[idx - 1];
          const R = 6371;
          const dLat = ((wp.lat - prev.lat) * Math.PI) / 180;
          const dLng = ((wp.lng - prev.lng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((prev.lat * Math.PI) / 180) *
              Math.cos((wp.lat * Math.PI) / 180) *
              Math.sin(dLng / 2) *
              Math.sin(dLng / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return sum + R * c;
        }, 0);

        setRoute({
          ...currentRoute,
          profile,
          geometry: {
            geometry,
            elevation: [], // No elevation data in fallback
            distance,
            duration: (distance / 20) * 3600, // Estimate 20 km/h
            elevationGain: 0,
            elevationLoss: 0,
            maxElevation: 0,
            minElevation: 0,
            averageGrade: 0,
          },
          difficultyLevel: 'medium',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasValidWaypoints = currentRoute && currentRoute.waypoints.length >= 2;
  const hasGeometry = currentRoute?.geometry !== undefined;

  return (
    <div
      style={{
        padding: '16px',
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bg,
      }}
    >
      {/* Profile Selector - Combobox */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: colors.text }}>
          Fahrradtyp
        </label>
        <select
          value={profile}
          onChange={(e) => setProfile(e.target.value as ValhallaProfile)}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '6px',
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.mutedBg,
            color: colors.text,
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
          }}
        >
          {Object.entries(profileLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {/* Calculate Button */}
      <button
        onClick={handleCalculateRoute}
        disabled={!hasValidWaypoints || isLoading}
        style={{
          width: '100%',
          padding: '12px 16px',
          backgroundColor: hasValidWaypoints && !isLoading ? colors.primary : colors.mutedBg,
          border: 'none',
          borderRadius: '8px',
          color: hasValidWaypoints && !isLoading ? 'white' : colors.text,
          fontSize: '14px',
          fontWeight: '600',
          cursor: hasValidWaypoints && !isLoading ? 'pointer' : 'not-allowed',
          opacity: hasValidWaypoints && !isLoading ? 1 : 0.5,
          transition: 'all 0.2s',
        }}
      >
        {isLoading ? '🔄 Berechne Route...' : '📍 Route berechnen'}
      </button>

      {/* Error Message */}
      {error && (
        <div
          style={{
            marginTop: '12px',
            padding: '12px',
            backgroundColor: colors.error + '20',
            color: colors.error,
            borderRadius: '6px',
            fontSize: '12px',
          }}
        >
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
