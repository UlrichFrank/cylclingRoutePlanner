/**
 * Route Model - Core data structure for cycling routes
 * Supports REQ-001, REQ-003, REQ-007 from requirements.md
 */

export interface RouteCoordinate {
  lat: number;
  lng: number;
  address?: string;
  isLocked?: boolean;
}

export interface RoutePoint extends RouteCoordinate {
  id: string;
  order: number;
  label?: string; // e.g., "Start", "Café at km 15"
}

export type DifficultyLevel = 'easy' | 'medium' | 'hard';
export type ValhallaProfile = 'mountain' | 'road' | 'gravel';

export interface RouteGeometry {
  geometry: RouteCoordinate[]; // Full route polyline from Valhalla
  elevation: number[]; // Elevation values for each coordinate in geometry
  distance: number; // km
  duration: number; // seconds
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  averageGrade: number; // percentage
}

export interface RouteStats {
  distance: number; // km
  duration: number; // seconds
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  averageGrade: number; // percentage
  difficulty: string; // 'Easy' | 'Moderate' | 'Hard' | 'Expert'
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  waypoints: RouteCoordinate[]; // User-selected points (start, mid, end)
  geometry?: RouteGeometry; // Calculated route from Valhalla
  stats?: RouteStats; // Route statistics (distance, elevation, difficulty)
  profile: ValhallaProfile;
  difficultyLevel: DifficultyLevel;
  createdAt: number;
  updatedAt: number;
  metadata?: {
    distanceKm?: number;
    estimatedDurationHours?: number;
    tags?: string[];
  };
}

export interface StorageData {
  version: string;
  routes: Route[];
  lastUpdated: number;
}
