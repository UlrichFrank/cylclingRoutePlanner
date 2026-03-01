/**
 * Valhalla API Types
 * Type definitions for Valhalla routing API responses
 */

export type ValhallaProfile = 'bicycle' | 'ebike' | 'pedestrian' | 'bikeshare' | 'scooter';

export interface LatLng {
  lat: number;
  lon: number;
}

export interface ValhallRouteRequest {
  locations: LatLng[];
  costing: ValhallaProfile;
  costing_options?: {
    bicycle?: {
      use_roads?: number;
      avoid_bad_surfaces?: boolean;
    };
    ebike?: {
      use_roads?: number;
      avoid_bad_surfaces?: boolean;
    };
  };
  shape_match?: 'edge_walk' | 'map_snap' | 'walk_or_snap';
  filters?: {
    attributes: string[];
    action: 'include' | 'exclude';
  };
  units?: 'kilometers' | 'miles';
}

export interface ValhallRouteResponse {
  trip: {
    legs: ValhallLeg[];
    summary: RouteSummary;
    units: 'kilometers' | 'miles';
  };
  matched_points?: MatchedPoint[];
  confidence_score?: number;
}

export interface ValhallLeg {
  shape: string; // Encoded polyline
  maneuvers: Maneuver[];
  summary: RouteSummary;
}

export interface RouteSummary {
  length: number; // Distance in km/miles
  time: number; // Time in seconds
  cost?: number;
}

export interface Maneuver {
  type: number;
  instruction: string;
  verbal_instruction?: string;
  verb?: string;
  verbal_succinct_instruction?: string;
  street_names?: string[];
  time: number;
  length: number;
  cost?: number;
  begin_shape_index: number;
  end_shape_index: number;
  toll?: boolean;
  unpaved?: boolean;
  sign?: Sign;
  travel_mode?: string;
  travel_type?: string;
}

export interface Sign {
  exit_number?: string | number;
  exit_branch?: string;
  exit_toward?: string;
  text_code?: string;
  direction?: string;
}

export interface MatchedPoint {
  lat: number;
  lon: number;
  type: string;
}

export interface ElevationPoint {
  distance: number; // Distance along route (km)
  elevation: number; // Height (meters)
  lat: number;
  lon: number;
}

export interface ElevationResponse {
  shape: string;
  elevation: number[];
  range?: {
    min: number;
    max: number;
  };
}

export interface RouteGeometry {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'LineString';
      coordinates: [number, number][]; // [lng, lat]
    };
    properties: {
      shape: string;
      distance: number;
      duration: number;
    };
  }>;
}

export interface RouteStats {
  distance: number; // km
  duration: number; // seconds
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  averageGrade: number; // percentage
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface DistanceMatrixRequest {
  sources: LatLng[];
  targets: LatLng[];
  costing: ValhallaProfile;
}

export interface DistanceMatrixResponse {
  sources: LatLng[];
  targets: LatLng[];
  units: string;
  matrix: {
    distance: number[];
    time: number[];
  }[];
}

export interface ValhallError {
  status_code: number;
  status: string;
  message?: string;
}
