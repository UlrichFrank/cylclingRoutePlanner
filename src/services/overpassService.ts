import axios from 'axios';
import { POI } from '../store/poiStore';
import { RouteCoordinate } from '../store/routeStore';

const OVERPASS_API = 'https://overpass-api.de/api/interpreter';

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

