import { Route, RouteCoordinate } from '../types/route';

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
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
  return R * c;
}

export const routeService = {
  /**
   * Calculate total distance of a route using waypoints
   */
  calculateDistance: (waypoints: RouteCoordinate[]): number => {
    if (waypoints.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += haversineDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng
      );
    }
    return Math.round(total * 100) / 100; // Round to 2 decimals
  },

  /**
   * Calculate estimated duration (simple: 20 km/h average speed)
   */
  calculateDuration: (distanceKm: number): number => {
    const avgSpeed = 20; // km/h
    return Math.round((distanceKm / avgSpeed) * 100) / 100; // hours
  },

  /**
   * Get route stats from waypoints
   */
  getRouteStats: (route: Route) => {
    // Use Valhalla geometry if available, otherwise calculate from waypoints
    if (route.geometry) {
      return {
        distance: route.geometry.distance,
        duration: route.geometry.duration / 60 / 60, // Convert seconds to hours
        pointCount: route.waypoints.length,
        elevationGain: route.geometry.elevationGain,
        elevationLoss: route.geometry.elevationLoss,
      };
    }

    const distanceKm = routeService.calculateDistance(route.waypoints);
    const durationHours = routeService.calculateDuration(distanceKm);
    
    return {
      distance: distanceKm,
      duration: durationHours,
      pointCount: route.waypoints.length,
    };
  },

  /**
   * Create a new route with defaults
   */
  createRoute: (name: string, difficulty: 'easy' | 'medium' | 'hard' = 'medium'): Route => {
    return {
      id: `route-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: '',
      waypoints: [],
      geometry: undefined,
      profile: 'road',
      difficultyLevel: difficulty,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  },

  /**
   * Update route metadata
   */
  updateRoute: (route: Route, updates: Partial<Route>): Route => {
    return {
      ...route,
      ...updates,
      id: route.id, // Never change ID
      createdAt: route.createdAt, // Never change creation time
      updatedAt: Date.now(),
    };
  },
};
