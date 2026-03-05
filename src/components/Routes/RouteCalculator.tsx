/**
 * Route Calculator Component
 * Handles Valhalla route calculation with profile selection and loading states
 * Also triggers POI search after route geometry is calculated
 */

import React, { useState, useRef, useEffect } from 'react';
import { useRouteStore } from '../../store/routeStore';
import { usePOIStore } from '../../store/poiStore';
import { valhallaService } from '../../services/valhallaService';
import { searchPOIsNearRoute } from '../../services/overpassService';
import { useTheme } from '../Layout/ThemeContext';
import { renderIcon, NAV_ICONS } from '../../utils/iconRegistry';

type ValhallaProfile = 'mountain' | 'road' | 'gravel';

interface RouteCalculatorProps {
  onRouteCalculated?: () => void;
}

export const RouteCalculator: React.FC<RouteCalculatorProps> = ({ onRouteCalculated }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentRoute, setRoute } = useRouteStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const calcTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastWaypointsRef = useRef<string>('');
  const lastProfileRef = useRef<string>('');

  // Add spin animation style
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Use profile from currentRoute, fallback to 'road'
  const profile: ValhallaProfile = (currentRoute?.profile || 'road') as ValhallaProfile;

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

  // Route calculation is now manual-only (triggered by button click, not auto)

  const handleCalculateRoute = async () => {
    if (!currentRoute || currentRoute.waypoints.length < 2) {
      setError('Mindestens 2 Wegpunkte erforderlich');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Calculate route as segments: A→B, B→C, C→D, etc.
      const segments = [];
      const allGeometry: Array<{ lat: number; lng: number }> = [];
      const allElevation: number[] = [];
      
      let totalDistance = 0;
      let totalDuration = 0;
      let totalElevationGain = 0;
      let totalElevationLoss = 0;
      let maxElevation = -Infinity;
      let minElevation = Infinity;

      // Process each segment
      for (let i = 0; i < currentRoute.waypoints.length - 1; i++) {
        const segmentLocations = [
          {
            lat: currentRoute.waypoints[i].lat,
            lon: currentRoute.waypoints[i].lng,
          },
          {
            lat: currentRoute.waypoints[i + 1].lat,
            lon: currentRoute.waypoints[i + 1].lng,
          },
        ];

        console.log(`[RouteCalculator] Calculating segment ${i + 1}/${currentRoute.waypoints.length - 1}: Waypoint ${String.fromCharCode(65 + i)} → ${String.fromCharCode(65 + i + 1)}`);

        // Calculate this segment
        const segmentResult = await valhallaService.calculateRoute(segmentLocations, profile);
        const segmentStats = await valhallaService.getRouteStats(segmentLocations, profile);

        // Convert geometry for this segment
        const segmentGeometry = segmentResult.geometry.map((coord) => ({
          lat: coord[0],
          lng: coord[1],
        }));

        segments.push({
          from: String.fromCharCode(65 + i),
          to: String.fromCharCode(65 + i + 1),
          geometry: segmentGeometry,
          distance: segmentStats.distance,
          duration: segmentStats.duration,
          elevationGain: segmentStats.elevationGain,
          elevationLoss: segmentStats.elevationLoss,
        });

        // Add geometry, avoiding duplicate waypoint connections
        if (i === 0) {
          allGeometry.push(...segmentGeometry);
          allElevation.push(...(segmentStats.elevationArray || []));
        } else {
          // Skip first point to avoid duplicates at waypoint connections
          allGeometry.push(...segmentGeometry.slice(1));
          allElevation.push(...(segmentStats.elevationArray || []).slice(1));
        }

        // Aggregate stats
        totalDistance += segmentStats.distance;
        totalDuration += segmentStats.duration;
        totalElevationGain += segmentStats.elevationGain;
        totalElevationLoss += segmentStats.elevationLoss;
        maxElevation = Math.max(maxElevation, segmentStats.maxElevation);
        minElevation = Math.min(minElevation, segmentStats.minElevation);
      }

      // Calculate average grade for entire route
      const averageGrade = allGeometry.length > 0 
        ? ((totalElevationGain - totalElevationLoss) / (totalDistance * 1000)) * 100 
        : 0;

      console.log('[RouteCalculator] Route segments:', segments.length);
      console.log('[RouteCalculator] Total distance:', totalDistance.toFixed(2), 'meters');
      console.log('[RouteCalculator] Total elevation gain:', totalElevationGain.toFixed(2), 'meters');

      // Update route with aggregated data
      setRoute({
        ...currentRoute,
        profile,
        geometry: {
          geometry: allGeometry,
          elevation: allElevation,
          distance: totalDistance,
          duration: totalDuration,
          elevationGain: totalElevationGain,
          elevationLoss: totalElevationLoss,
          maxElevation: maxElevation === -Infinity ? 0 : maxElevation,
          minElevation: minElevation === Infinity ? 0 : minElevation,
          averageGrade,
        },
        difficultyLevel: totalElevationGain > 1000 ? 'hard' : totalElevationGain > 500 ? 'medium' : 'easy',
      });

      // Search for POIs near the calculated route
      console.log('[RouteCalculator] Searching for POIs near route...');
      try {
        const pois = await searchPOIsNearRoute(allGeometry);
        console.log('[RouteCalculator] Found', pois.length, 'POIs');
        usePOIStore.setState({ pois });
      } catch (poiError) {
        console.warn('[RouteCalculator] POI search failed, continuing without POIs:', poiError);
      }

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        {isLoading ? (
          <>
            {renderIcon('loaderDots', { style: { animation: 'spin 1s linear infinite' } })}
            Berechne Route...
          </>
        ) : (
          <>
            {renderIcon('location')}
            Route berechnen
          </>
        )}
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
