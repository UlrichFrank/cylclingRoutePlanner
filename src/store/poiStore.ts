import { create } from 'zustand';

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'attraction';
  address?: string;
  distance?: number;
  tags?: string[];
}

interface POIStore {
  pois: POI[];
  loading: boolean;
  error: string | null;
  activeType: string;
  radius: number;
  debugPolygon: string | null; // Optional: polygon string for debugging
  showDebugPolygon: boolean; // Toggle to show/hide debug polygon on map
  setPOIs: (pois: POI[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveType: (type: string) => void;
  setRadius: (radius: number) => void;
  setDebugPolygon: (polygon: string | null) => void;
  setShowDebugPolygon: (show: boolean) => void;
  clearPOIs: () => void;
}

export const usePOIStore = create<POIStore>((set) => ({
  pois: [],
  loading: false,
  error: null,
  activeType: 'restaurant',
  radius: 1000,
  debugPolygon: null,
  showDebugPolygon: true, // Always show debug polygon
  setPOIs: (pois: POI[]) => set({ pois }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setActiveType: (type: string) => set({ activeType: type }),
  setRadius: (radius: number) => set({ radius }),
  setDebugPolygon: (polygon: string | null) => set({ debugPolygon: polygon }),
  setShowDebugPolygon: (show: boolean) => set({ showDebugPolygon: show }),
  clearPOIs: () => set({ pois: [] }),
}));
