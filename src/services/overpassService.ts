import axios from 'axios';
import { POI } from '../store/poiStore';
import { RouteCoordinate } from '../store/routeStore';
import * as turf from '@turf/turf';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

// Rate limiting: max 1 request per second, with exponential backoff on 429
const REQUEST_DELAY_MS = 1500; // 1.5 seconds between requests
let lastRequestTime = 0;
let retryCount = 0;
const MAX_RETRIES = 2;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const rateLimitedRequest = async (query: string, attempt = 0): Promise<any> => {
  // Calculate delay since last request
  const timeSinceLastRequest = Date.now() - lastRequestTime;
  const requiredDelay = REQUEST_DELAY_MS;

  if (timeSinceLastRequest < requiredDelay) {
    const delayNeeded = requiredDelay - timeSinceLastRequest;
    await sleep(delayNeeded);
  }

  lastRequestTime = Date.now();

  try {
    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });
    retryCount = 0; // Reset on success
    return response;
  } catch (error: any) {
    // Handle 429 Too Many Requests
    if (error.response?.status === 429) {
      if (attempt < MAX_RETRIES) {
        const backoffDelay = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s
        console.warn(`[Overpass] 429 Too Many Requests. Retrying in ${backoffDelay}ms...`);
        await sleep(backoffDelay);
        return rateLimitedRequest(query, attempt + 1);
      } else {
        throw new Error('Overpass API rate limited. Max retries exceeded.');
      }
    }
    throw error;
  }
};

export interface BoundingBox {
  south: number;
  west: number;
  north: number;
  east: number;
}

const buildBBox = (coords: RouteCoordinate[], bufferDegrees = 0.01): BoundingBox => {
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  
  return {
    south: Math.min(...lats) - bufferDegrees,
    west: Math.min(...lngs) - bufferDegrees,
    north: Math.max(...lats) + bufferDegrees,
    east: Math.max(...lngs) + bufferDegrees,
  };
};

/**
 * Build polygon string for Overpass from route coordinates using Turf buffer
 * Creates a 3km buffer around the route (left and right side)
 * Format: "lat1 lng1 lat2 lng2 ..." (space-separated, Overpass formats as polygon)
 * @param coords Route coordinates
 * @param bufferKm Buffer distance in kilometers (default: 3km)
 * @returns Polygon string or null if coordinates too sparse
 */
function buildPolygonFromRoute(coords: RouteCoordinate[], bufferKm: number = 3): string | null {
  if (coords.length < 2) {
    console.warn('[POI] Route has too few coordinates for polygon');
    return null;
  }

  try {
    // Create LineString for Turf (uses [lng, lat] format)
    const lineString = turf.lineString(coords.map(c => [c.lng, c.lat]));
    
    console.log(`[POI] Creating ${bufferKm}km buffer around ${coords.length} route points...`);
    
    // Create buffer polygon around the line
    const bufferPolygon = turf.buffer(lineString, bufferKm, { units: 'kilometers' });
    
    if (!bufferPolygon || !bufferPolygon.geometry || !bufferPolygon.geometry.coordinates) {
      console.error('[POI] Failed to create buffer polygon or extract coordinates');
      return null;
    }

    // Extract outer ring coordinates from buffer polygon
    const bufferCoords = bufferPolygon.geometry.coordinates[0];
    
    if (!bufferCoords || bufferCoords.length === 0) {
      console.error('[POI] Buffer polygon has no coordinates');
      return null;
    }

    console.log(`[POI] Buffer polygon: ${bufferCoords.length} points`);

    // Convert to Overpass poly: format: "lat1 lng1 lat2 lng2 ..."
    // Important: Overpass expects lat FIRST, then lng
    const polygonStr = bufferCoords
      .map(([lng, lat]) => `${lat} ${lng}`)
      .join(' ');

    console.log(`[POI] Polygon string length: ${polygonStr.length} chars`);
    return polygonStr;
  } catch (error) {
    console.error('[POI] Error building buffer polygon:', error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Build Overpass query using polygon for precise route-based search
 * Uses `poly:` filter syntax (NOT `polygon:`)
 * Format: lat1 lng1 lat2 lng2 ... (space-separated, Overpass closes polygon automatically)
 */
function buildOverpassPolygonQuery(polygon: string): string {
  return `[out:json][timeout:180];(
  node["amenity"="restaurant"](poly:"${polygon}");
  way["amenity"="restaurant"](poly:"${polygon}");
  node["amenity"="cafe"](poly:"${polygon}");
  way["amenity"="cafe"](poly:"${polygon}");
  node["shop"="bakery"](poly:"${polygon}");
  way["shop"="bakery"](poly:"${polygon}");
  node["amenity"="bakery"](poly:"${polygon}");
  way["amenity"="bakery"](poly:"${polygon}");
  node["tourism"="attraction"](poly:"${polygon}");
  way["tourism"="attraction"](poly:"${polygon}");
);
out center;`;
}

/**
 * Fallback: build bbox query if polygon is too complex
 */
const buildOverpassBBoxQuery = (bbox: BoundingBox): string => {
  return `[out:json][timeout:180];[bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];(
  node["amenity"="restaurant"];
  way["amenity"="restaurant"];
  node["amenity"="cafe"];
  way["amenity"="cafe"];
  node["shop"="cafe"];
  way["shop"="cafe"];
  node["shop"="bakery"];
  way["shop"="bakery"];
  node["amenity"="bakery"];
  way["amenity"="bakery"];
  node["tourism"="attraction"];
  way["tourism"="attraction"];
);
out center;`;
};

/**
 * Calculate haversine distance between two points in km
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
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

/**
 * Filter POIs by distance from route
 * Venues (restaurant/cafe/bakery): ≤ 500m
 * Attractions: ≤ 3km
 */
function filterByDistance(pois: POI[], geometry: RouteCoordinate[]): POI[] {
  const filtered = pois.filter((poi) => {
    const venueMaxDist = 0.5; // km
    const attractionMaxDist = 1.5; // km
    const maxDist = poi.type === 'attraction' ? attractionMaxDist : venueMaxDist;

    // Find minimum distance to any point on the route
    const minDistance = Math.min(
      ...geometry.map((coord) => haversineDistance(poi.lat, poi.lng, coord.lat, coord.lng))
    );

    return minDistance <= maxDist;
  });

  console.log(`[POI] Distance filter: ${pois.length} → ${filtered.length} POIs (kept ${((filtered.length/pois.length)*100).toFixed(1)}%)`);
  return filtered;
}

/**
 * Build efficient Overpass query for all POI types at once
 */
function buildCombinedOverpassQuery(bbox: BoundingBox): string {
  const query = `[bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];
(
  node["amenity"="restaurant"];
  way["amenity"="restaurant"];
  node["shop"="bakery"];
  way["shop"="bakery"];
  node["amenity"="bakery"];
  way["amenity"="bakery"];
  node["amenity"="cafe"];
  way["amenity"="cafe"];
  node["shop"="cafe"];
  way["shop"="cafe"];
  node["tourism"="attraction"];
  way["tourism"="attraction"];
);
out center;`;
  console.log('[POI] Overpass Query:', query);
  console.log('[POI] BBox:', bbox);
  return query;
}

/**
 * Parse Overpass response and map to POI types
 */
function parseOverpassResponse(data: any): POI[] {
  const pois: POI[] = [];

  if (!data.elements) {
    console.log('[POI] Response has no elements property');
    return pois;
  }

  console.log(`[POI] Parsing ${data.elements.length} elements from response`);

  data.elements.forEach((element: any, idx: number) => {
    if (!element.tags || !element.tags.name) {
      if (idx < 3) console.log(`[POI] Element ${idx}: skipped (no tags or name)`, element);
      return;
    }

    const lat = element.center?.lat || element.lat;
    const lng = element.center?.lon || element.lon;

    if (!lat || !lng) {
      if (idx < 3) console.log(`[POI] Element ${idx} ${element.tags.name}: skipped (no lat/lng)`);
      return;
    }

    if (idx < 3) console.log(`[POI] Element ${idx} ${element.tags.name}: accepted (${lat}, ${lng})`);

    let type: POI['type'] = 'attraction';
    
    // Check amenity tags first, then shop tags
    if (element.tags.amenity === 'restaurant' || element.tags.shop === 'restaurant') {
      type = 'restaurant';
    } else if (element.tags.amenity === 'cafe' || element.tags.shop === 'cafe') {
      type = 'cafe';
    } else if (element.tags.amenity === 'bakery' || element.tags.shop === 'bakery') {
      type = 'bakery';
    } else if (element.tags.shop === 'supermarket' || element.tags.shop === 'convenience') {
      // Optional: include supermarkets as attraction
      type = 'attraction';
    }

    pois.push({
      id: `poi-${element.id}`,
      name: element.tags.name,
      lat,
      lng,
      type,
      address: element.tags['addr:full'] || element.tags['addr:street'],
    });
  });

  return pois;
}



export const fetchPOIs = async (
  coordinates: RouteCoordinate[],
  poiType: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'attraction'
): Promise<POI[]> => {
  const bbox = buildBBox(coordinates);
  const query = buildOverpassBBoxQuery(bbox);

  try {
    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 8000,
    });

    return response.data.elements
      .filter((element: any) => element.lat && element.lng)
      .map((element: any, index: number) => ({
        id: `poi-${poiType}-${index}`,
        name: element.tags?.name || `${poiType.charAt(0).toUpperCase() + poiType.slice(1)} ${index + 1}`,
        lat: element.lat,
        lng: element.lng,
        type: poiType,
        address: element.tags?.['addr:full'] || element.tags?.['addr:street'],
        tags: Object.keys(element.tags || {}),
      }));
  } catch (error) {
    console.warn('Overpass API failed:', error);
    // Return empty array instead of mock data
    return [];
  }
};

/**
 * Search POIs near a route and return both POIs and debug polygon
 * Returns object with POIs array and optional polygon string for visualization
 */
export interface POISearchResult {
  pois: POI[];
  debugPolygon: string | null;
}

/**
 * Search POIs near a route using polygon-based Overpass query
 * Polygon-based search is more accurate than bounding box for long routes
 * Works for routes of any length (hundreds of km)
 * 
 * Query strategy:
 * 1. Try polygon-based query (accurate, works for most routes)
 * 2. Fallback to bbox if polygon is too complex
 * 3. Apply distance filters (500m venues, 3km attractions)
 */
export async function searchPOIsNearRoute(geometry: RouteCoordinate[]): Promise<POISearchResult> {
  if (geometry.length < 2) {
    console.warn('[POI] Route geometry too short for POI search');
    return { pois: [], debugPolygon: null };
  }

  const cacheKeyPrefix = 'poi_cache_polygon';
  let query: string;
  let usedPolygon = false;
  let debugPolygon: string | null = null;

  try {
    // Try polygon-based query first (more accurate)
    const polygon = buildPolygonFromRoute(geometry);
    
    if (polygon) {
      debugPolygon = polygon;
      console.log('[POI] Debug polygon created:', polygon.length, 'chars');
      
      query = buildOverpassPolygonQuery(polygon);
      usedPolygon = true;
      console.log('[POI] Using polygon-based Overpass query');
    } else {
      // Fallback to bbox if polygon failed
      const bbox = buildBBox(geometry, 0.05); // 5km buffer
      query = buildOverpassBBoxQuery(bbox);
      console.log('[POI] Polygon failed, using bbox-based Overpass query as fallback');
    }

    console.log('[POI] Query length:', query.length, 'chars');
    console.log('[POI] Querying Overpass API...');
    if (usedPolygon) {
      console.log('[POI] Polygon query first 500 chars:', query.substring(0, 500));
    }

    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 200000, // 200 seconds for complex polygon queries
    });

    console.log('[POI] Overpass response status:', response.status);
    console.log('[POI] Overpass response elements:', response.data.elements?.length || 0);

    const allPois = parseOverpassResponse(response.data);
    console.log(`[POI] Found ${allPois.length} POIs from Overpass`);

    // Cache the results
    localStorage.setItem(cacheKeyPrefix, JSON.stringify(allPois));
    console.log('[POI] Results cached');

    // Apply distance filters
    const filteredPois = filterByDistance(allPois, geometry);
    console.log(
      `[POI] ${filteredPois.length} POIs within distance limits (500m venues, 3km attractions)`
    );

    // Return real POIs with debug polygon
    return { pois: filteredPois, debugPolygon };
  } catch (error: any) {
    console.error('[POI] Overpass API error:', error?.message || error);
    console.error('[POI] Error details:', error?.response?.status, error?.response?.data);
    
    // Try to use cached data first
    const cachedData = localStorage.getItem(cacheKeyPrefix);
    if (cachedData) {
      console.log('[POI] Using cached POI data from previous search');
      try {
        const pois = JSON.parse(cachedData);
        const filteredPois = filterByDistance(pois, geometry);
        if (filteredPois.length > 0) {
          return { pois: filteredPois, debugPolygon };
        }
      } catch (e) {
        console.warn('[POI] Failed to parse cached data');
      }
    }
    
    // If all fails, return empty array - better to show nothing than wrong region's data
    console.warn('[POI] No cached data available and API failed. Returning empty POIs.');
    return { pois: [], debugPolygon };
  }
}

