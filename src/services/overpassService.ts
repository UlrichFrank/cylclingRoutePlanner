import axios from 'axios';
import { POI } from '../store/poiStore';
import { RouteCoordinate } from '../store/routeStore';

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
        throw new Error('Overpass API rate limited. Using mock data instead.');
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

const buildOverpassQuery = (bbox: BoundingBox, amenityType: string): string => {
  return `[bbox:${bbox.south},${bbox.west},${bbox.north},${bbox.east}];(node["amenity"="${amenityType}"];way["amenity"="${amenityType}"];relation["amenity"="${amenityType}"];);out center;`;
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
  return pois.filter((poi) => {
    const venueMaxDist = 0.5; // km
    const attractionMaxDist = 3; // km
    const maxDist = poi.type === 'attraction' ? attractionMaxDist : venueMaxDist;

    // Find minimum distance to any point on the route
    const minDistance = Math.min(
      ...geometry.map((coord) => haversineDistance(poi.lat, poi.lng, coord.lat, coord.lng))
    );

    return minDistance <= maxDist;
  });
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

  if (!data.elements) return pois;

  data.elements.forEach((element: any) => {
    if (!element.tags || !element.tags.name) return;

    const lat = element.center?.lat || element.lat;
    const lng = element.center?.lon || element.lon;

    if (!lat || !lng) return;

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

// Mock data for Berlin restaurants, cafes, hotels, bakeries, and attractions
const MOCK_DATA: Record<string, POI[]> = {
  restaurant: [
    { id: 'r1', name: 'Restaurant Zur Post', lat: 52.52, lng: 13.405, type: 'restaurant', address: 'Alexanderplatz' },
    { id: 'r2', name: 'Currywurst Stand', lat: 52.515, lng: 13.415, type: 'restaurant', address: 'Near Reichstag' },
    { id: 'r3', name: 'Italian Trattoria', lat: 52.525, lng: 13.395, type: 'restaurant', address: 'Tiergarten' },
    { id: 'r4', name: 'Berlin Burger House', lat: 52.505, lng: 13.425, type: 'restaurant', address: 'Mitte' },
    { id: 'r5', name: 'Vietnamese Pho', lat: 52.53, lng: 13.410, type: 'restaurant', address: 'Prenzlauer Berg' },
  ],
  cafe: [
    { id: 'c1', name: 'Espresso Corner', lat: 52.518, lng: 13.408, type: 'cafe', address: 'Brandenburger Tor' },
    { id: 'c2', name: 'Coffee Lovers Café', lat: 52.524, lng: 13.400, type: 'cafe', address: 'Tiergarten' },
    { id: 'c3', name: 'Vintage Kaffee', lat: 52.510, lng: 13.420, type: 'cafe', address: 'Museum Island' },
    { id: 'c4', name: 'Breakfast Spot', lat: 52.528, lng: 13.412, type: 'cafe', address: 'Charlottenburg' },
  ],
  hotel: [
    { id: 'h1', name: 'Hotel Berlin Central', lat: 52.520, lng: 13.410, type: 'hotel', address: 'Mitte' },
    { id: 'h2', name: 'Luxury Tower Hotel', lat: 52.508, lng: 13.430, type: 'hotel', address: 'Alexanderplatz' },
    { id: 'h3', name: 'Budget Hostel', lat: 52.532, lng: 13.408, type: 'hotel', address: 'Prenzlauer Berg' },
    { id: 'h4', name: 'Modern Business Hotel', lat: 52.515, lng: 13.395, type: 'hotel', address: 'Tiergarten' },
  ],
  bakery: [
    { id: 'b1', name: 'Bäckerei Schmidt', lat: 52.516, lng: 13.412, type: 'bakery', address: 'Unter den Linden' },
    { id: 'b2', name: 'Bio Backhaus', lat: 52.525, lng: 13.408, type: 'bakery', address: 'Charlottenburg' },
    { id: 'b3', name: 'Traditional Bakery', lat: 52.510, lng: 13.410, type: 'bakery', address: 'Mitte' },
    { id: 'b4', name: 'Modern Bread Shop', lat: 52.530, lng: 13.415, type: 'bakery', address: 'Prenzlauer Berg' },
  ],
  attraction: [
    { id: 'a1', name: 'Brandenburger Tor', lat: 52.516, lng: 13.378, type: 'attraction', address: 'Gate of Brandenburg' },
    { id: 'a2', name: 'Reichstag', lat: 52.519, lng: 13.376, type: 'attraction', address: 'Parliament Building' },
    { id: 'a3', name: 'Museum Island', lat: 52.517, lng: 13.399, type: 'attraction', address: 'Museums' },
    { id: 'a4', name: 'Alexander Platz', lat: 52.520, lng: 13.415, type: 'attraction', address: 'Plaza' },
    { id: 'a5', name: 'Berlin Wall Memorial', lat: 52.541, lng: 13.438, type: 'attraction', address: 'Wall' },
  ],
};

export const fetchPOIs = async (
  coordinates: RouteCoordinate[],
  poiType: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'attraction'
): Promise<POI[]> => {
  const amenityMap: Record<string, string> = {
    restaurant: 'restaurant',
    cafe: 'cafe',
    hotel: 'hotel',
    bakery: 'bakery',
    attraction: 'tourism',
  };

  const bbox = buildBBox(coordinates);
  const query = buildOverpassQuery(bbox, amenityMap[poiType]);

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
    console.warn('Overpass API failed, using mock data instead:', error);
    // Return mock data as fallback
    return MOCK_DATA[poiType] || [];
  }
};

/**
 * Search POIs near a route with automatic distance filtering
 * Single efficient Overpass query for all POI types
 * Filters: 500m for venues, 3km for attractions
 */
export async function searchPOIsNearRoute(geometry: RouteCoordinate[]): Promise<POI[]> {
  if (geometry.length < 2) {
    console.warn('[POI] Route geometry too short for POI search');
    return [];
  }

  // Build bbox with buffer (5km for initial query to be safe) - needs to be outside try for error handler
  const bufferDegrees = 5 / 111; // ~5km in degrees
  const lats = geometry.map((c) => c.lat);
  const lngs = geometry.map((c) => c.lng);

  const bbox: BoundingBox = {
    south: Math.min(...lats) - bufferDegrees,
    west: Math.min(...lngs) - bufferDegrees,
    north: Math.max(...lats) + bufferDegrees,
    east: Math.max(...lngs) + bufferDegrees,
  };

  try {
    const query = buildCombinedOverpassQuery(bbox);

    console.log('[POI] Querying Overpass API for all POI types...');

    const response = await axios.post(OVERPASS_API, query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });

    console.log('[POI] Overpass response status:', response.status);
    console.log('[POI] Overpass response elements count:', response.data.elements?.length || 0);
    if (response.data.elements?.length > 0) {
      console.log('[POI] First element sample:', response.data.elements[0]);
    }

    const allPois = parseOverpassResponse(response.data);
    console.log(`[POI] Found ${allPois.length} POIs total`);

    // Cache the results in localStorage
    const cacheKey = `poi_cache_${bbox.south}_${bbox.west}_${bbox.north}_${bbox.east}`;
    localStorage.setItem(cacheKey, JSON.stringify(allPois));
    console.log('[POI] Cached results in localStorage');

    // Apply distance filters
    const filteredPois = filterByDistance(allPois, geometry);
    console.log(
      `[POI] ${filteredPois.length} POIs within distance limits (500m venues, 3km attractions)`
    );

    // Fallback to mock data if Overpass returns 0 results (likely area has no data)
    if (filteredPois.length === 0) {
      console.log('[POI] No real POIs found - falling back to mock data for demo');
      const mockData = [...MOCK_DATA.restaurant, ...MOCK_DATA.cafe, ...MOCK_DATA.bakery, ...MOCK_DATA.attraction];
      console.log('[POI] Mock data count:', mockData.length);
      return mockData;
    }

    return filteredPois;
  } catch (error: any) {
    console.error('[POI] Error querying Overpass API:', error?.message || error);
    
    // Try to use cached data first
    const cacheKey = `poi_cache_${bbox.south}_${bbox.west}_${bbox.north}_${bbox.east}`;
    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
      console.log('[POI] Using cached POI data');
      try {
        const pois = JSON.parse(cachedData);
        const filteredPois = filterByDistance(pois, geometry);
        if (filteredPois.length > 0) {
          return filteredPois;
        }
      } catch (e) {
        console.warn('[POI] Failed to parse cached data');
      }
    }
    
    console.log('[POI] No cache found, falling back to mock data...');
    const mockData = [...MOCK_DATA.restaurant, ...MOCK_DATA.cafe, ...MOCK_DATA.bakery, ...MOCK_DATA.attraction];
    console.log('[POI] Mock data count:', mockData.length, 'items');
    return mockData;
  }
}

