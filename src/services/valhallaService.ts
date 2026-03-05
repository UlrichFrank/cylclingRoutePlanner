/**
 * Valhalla Routing Service
 * Handles route calculation, elevation, and route statistics
 */

/// <reference types="vite/client" />

import {
  ValhallaProfile,
  LatLng,
  ValhallRouteRequest,
  ValhallRouteResponse,
  RouteStats,
  ElevationPoint,
  ValhallError,
} from '../types/valhalla';

const VALHALLA_API_URL = import.meta.env.VITE_VALHALLA_API_URL || 'https://valhalla1.openstreetmap.de';
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:3001/api';
const DEBUG = (import.meta.env.VITE_DEBUG_LOGGING as string | undefined) === 'true';

/**
 * Decode Google Polyline Format (used by Valhalla with 1e6 precision)
 * Input: encoded polyline string
 * Output: array of [lat, lng] coordinates
 * NOTE: Valhalla uses 1e6 precision, not standard Google Maps 1e5
 */
function decodePolyline(encoded: string): [number, number][] {
  const poly: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  const PRECISION_FACTOR = 1e6; // Valhalla uses 1e6, not 1e5

  while (index < encoded.length) {
    // Decode latitude
    let result = 0;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    // Decode longitude
    result = 0;
    shift = 0;

    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const dlng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    // Push as [lat, lng] (Leaflet format) with correct Valhalla precision
    poly.push([lat / PRECISION_FACTOR, lng / PRECISION_FACTOR]);
  }

  return poly;
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculate difficulty based on distance, duration and elevation
 */
function calculateDifficulty(stats: {
  distance: number;
  duration: number;
  elevationGain: number;
}): 'easy' | 'medium' | 'hard' {
  // Difficulty score based on distance (km), time (minutes), and elevation (m)
  const distanceScore = stats.distance / 10; // 10km = 1 point
  const durationMinutes = stats.duration / 60;
  const timeScore = durationMinutes / 30; // 30 min = 1 point
  const elevationScore = stats.elevationGain / 100; // 100m = 1 point

  const totalScore = distanceScore + timeScore + elevationScore;

  if (totalScore < 3) return 'easy';
  if (totalScore < 7) return 'medium';
  return 'hard';
}

export interface ValhallaRouteResult {
  geometry: [number, number][]; // [lat, lng] coordinates
  polyline: string; // Encoded polyline from Valhalla (for elevation API)
  distance: number; // km
  duration: number; // seconds
  maneuvers: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

export interface RouteStatsWithElevation extends RouteStats {
  elevationArray: number[]; // Full elevation array for charting
}

export interface ValhallaServiceConfig {
  baseUrl: string;
  timeout?: number;
  retries?: number;
}

class ValhallaService {
  private baseUrl: string;
  private timeout: number;
  private retries: number;

  constructor(config: ValhallaServiceConfig = { baseUrl: VALHALLA_API_URL }) {
    this.baseUrl = config.baseUrl;
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 2;
  }

  /**
   * Main function: Calculate route between waypoints
   */
  async calculateRoute(
    waypoints: LatLng[],
    profile: ValhallaProfile = 'road'
  ): Promise<ValhallaRouteResult> {
    if (waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required');
    }

    const request: ValhallRouteRequest = {
      locations: waypoints,
      costing: this.getValhallaCostingType(profile),
      costing_options: this.getCoastingOptions(profile),
      units: 'kilometers',
    };

    try {
      // Use backend proxy for route calculation (CORS-safe)
      const response = await this.fetchWithRetry(`${BACKEND_API_URL}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });

      const response_data = await response.json();

      if (!response.ok) {
        const errorMsg = response_data.error || response_data.message || 'Unknown error';
        throw new Error(`Valhalla error: ${errorMsg}`);
      }

      // Backend wraps response in { success, data, ... }
      const data: ValhallRouteResponse = response_data.data || response_data;
      const leg = data.trip.legs[0];
      const geometry = decodePolyline(leg.shape);

      console.log('[Valhalla] Raw geometry sample (first 3):', geometry.slice(0, 3));
      console.log('[Valhalla] Geometry format check:', 
        geometry.length > 0 ? `First coord: [${geometry[0][0]}, ${geometry[0][1]}]` : 'empty');

      if (DEBUG) {
        console.log('[Valhalla] Route calculated:', {
          distance: leg.summary.length,
          duration: leg.summary.time,
          coordinates: geometry.length,
        });
      }

      return {
        geometry,
        polyline: leg.shape, // Keep the encoded polyline for elevation API
        distance: leg.summary.length,
        duration: leg.summary.time,
        maneuvers: leg.maneuvers.map((m) => ({
          instruction: m.instruction,
          distance: m.length,
          duration: m.time,
        })),
      };
    } catch (error) {
      if (DEBUG) console.error('[Valhalla] Route calculation failed:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Get elevation profile for a route
   * Pass the polyline from Valhalla response
   * Returns both elevation array AND pre-calculated gain/loss from backend
   */
  async getElevationProfile(polylineShape: string): Promise<ElevationPoint[]> {
    if (!polylineShape || typeof polylineShape !== 'string') return [];

    try {
      console.log('[Elevation] Requesting elevation for polyline');
      
      const elevationPayload = { polyline: polylineShape };
      
      // Use backend proxy endpoint to decode polyline and fetch elevations
      const response = await this.fetchWithRetry(`${BACKEND_API_URL}/elevation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(elevationPayload),
      });

      const response_data = await response.json();
      
      // Backend wraps response in { success, data, ... }
      const data = response_data.data || response_data;
      
      console.log('[Elevation] Elevation response:', {
        ok: response.ok,
        elevationCount: (data.elevation as number[])?.length,
        sampledPoints: data.sampled_points,
        gain: data.elevation_gain,
        loss: data.elevation_loss,
      });

      if (!response.ok) {
        const errorMsg = (data as unknown as any).error || (data as unknown as any).message || 'Unknown error';
        throw new Error(`Elevation API error: ${errorMsg}`);
      }

      // Return elevation array (simple numbers) - will be used by route display
      const elevations = (data.elevation as number[]) || [];
      
      console.log('[Elevation] Raw elevations length:', elevations.length);
      console.log('[Elevation] Sample elevations:', elevations.slice(0, 5), '...', elevations.slice(-5));
      
      // Store pre-calculated stats in a special property for route stats
      console.log('[Elevation] Starting to map elevations...');
      const result = elevations.map((elevation) => ({
        distance: 0, // Not needed for new elevation approach
        elevation: elevation !== undefined ? elevation : 0,
        lat: 0,
        lon: 0,
      })) as any;
      
      console.log('[Elevation] Mapped result length:', result.length);
      console.log('[Elevation] About to attach stats...');
      
      // Attach backend-calculated stats to the array for getRouteStats() to use
      result._stats = {
        elevation_gain: data.elevation_gain || 0,
        elevation_loss: data.elevation_loss || 0,
        min_elevation: data.min_elevation || 0,
        max_elevation: data.max_elevation || 0,
      };
      
      return result;
    } catch (error) {
      console.error('[Elevation] Error:', error);
      return [];
    }
  }

  /**
   * Calculate distance along route up to a specific point
   */
  private calculateDistanceAlongRoute(geometry: [number, number][], index: number): number {
    let distance = 0;
    for (let i = 0; i < index && i < geometry.length - 1; i++) {
      distance += haversineDistance(
        geometry[i][1],
        geometry[i][0],
        geometry[i + 1][1],
        geometry[i + 1][0]
      );
    }
    return distance;
  }

  /**
   * Calculate comprehensive route statistics including elevation array
   */
  async getRouteStats(
    waypoints: LatLng[],
    profile: ValhallaProfile = 'road'
  ): Promise<RouteStatsWithElevation> {
    const routeResult = await this.calculateRoute(waypoints, profile);
    // Pass the polyline (encoded) to elevation service
    const elevationProfile = await this.getElevationProfile(routeResult.polyline);
    const elevationArray = elevationProfile.map(p => p.elevation);

    // Use backend-calculated stats if available
    const backendStats = (elevationProfile as any)?._stats;
    
    if (backendStats && backendStats.elevation_gain !== undefined) {
      // Backend already calculated these accurately
      const stats: RouteStatsWithElevation = {
        distance: routeResult.distance,
        duration: routeResult.duration,
        elevationGain: backendStats.elevation_gain,
        elevationLoss: backendStats.elevation_loss,
        maxElevation: backendStats.max_elevation,
        minElevation: backendStats.min_elevation,
        averageGrade: routeResult.distance > 0 ? 
          (backendStats.elevation_gain / (routeResult.distance * 1000)) * 100 : 0,
        difficulty: calculateDifficulty({
          distance: routeResult.distance,
          duration: routeResult.duration,
          elevationGain: backendStats.elevation_gain,
        }),
        elevationArray,
      };

      if (DEBUG) {
        console.log('[Valhalla] Route stats (from backend):', stats);
      }

      return stats;
    }

    // Fallback: calculate locally if backend stats not available
    const elevations = elevationArray.filter((e) => e > 0);
    const minElevation = elevations.length > 0 ? Math.min(...elevations) : 0;
    const maxElevation = elevations.length > 0 ? Math.max(...elevations) : 0;

    // Calculate elevation gain/loss
    let elevationGain = 0;
    let elevationLoss = 0;
    for (let i = 1; i < elevationProfile.length; i++) {
      const diff = elevationProfile[i].elevation - elevationProfile[i - 1].elevation;
      if (diff > 0) elevationGain += diff;
      else elevationLoss += Math.abs(diff);
    }

    const avgGrade =
      routeResult.distance > 0 ? (elevationGain / (routeResult.distance * 1000)) * 100 : 0;

    const stats: RouteStatsWithElevation = {
      distance: routeResult.distance,
      duration: routeResult.duration,
      elevationGain: Math.round(elevationGain),
      elevationLoss: Math.round(elevationLoss),
      maxElevation: Math.round(maxElevation),
      minElevation: Math.round(minElevation),
      averageGrade: Math.round(avgGrade * 10) / 10,
      difficulty: calculateDifficulty({
        distance: routeResult.distance,
        duration: routeResult.duration,
        elevationGain,
      }),
      elevationArray,
    };

    if (DEBUG) {
      console.log('[Valhalla] Route stats (calculated locally):', stats);
    }

    return stats;
  }

  private getCoastingOptions(profile: ValhallaProfile) {
    switch (profile) {
      case 'mountain':
        return {
          bicycle: {
            use_roads: 0.05,  // Prefer trails
            avoid_bad_surfaces: false,  // OK with rough terrain
          },
        };
      case 'road':
        return {
          bicycle: {
            use_roads: 0.95,  // Prefer paved roads
            avoid_bad_surfaces: true,
          },
        };
      case 'gravel':
        return {
          bicycle: {
            use_roads: 0.3,  // Mix of roads and gravel paths
            avoid_bad_surfaces: false,  // OK with some rough terrain
          },
        };
      default:
        return {};
    }
  }

  /**
   * Map user profile to Valhalla costing type
   */
  private getValhallaCostingType(profile: ValhallaProfile): 'bicycle' | 'car' | 'pedestrian' {
    // All bicycle types use 'bicycle' as Valhalla costing
    return 'bicycle';
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    init: RequestInit = {},
    attempt = 0
  ): Promise<Response> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      if (attempt < this.retries) {
        if (DEBUG) console.log(`[Valhalla] Retrying (attempt ${attempt + 1}/${this.retries})`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
        return this.fetchWithRetry(url, init, attempt + 1);
      }
      throw error;
    }
  }

  /**
   * Error handling with fallback suggestions
   */
  private handleError(error: unknown): Error {
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      return new Error(
        'Valhalla service unavailable. Make sure Docker is running: docker-compose up'
      );
    }

    if (error instanceof Error) {
      return error;
    }

    return new Error('Unknown error in Valhalla service');
  }

  /**
   * Health check - verify Valhalla is running
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/status`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const valhallaService = new ValhallaService();

// Also export class for testing with custom config
export default ValhallaService;
