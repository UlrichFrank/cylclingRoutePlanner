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
  setPOIs: (pois: POI[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveType: (type: string) => void;
  setRadius: (radius: number) => void;
  clearPOIs: () => void;
}

export const usePOIStore = create<POIStore>((set) => ({
  pois: [],
  loading: false,
  error: null,
  activeType: 'restaurant',
  radius: 1000,
  setPOIs: (pois: POI[]) => set({ pois }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setActiveType: (type: string) => set({ activeType: type }),
  setRadius: (radius: number) => set({ radius }),
  clearPOIs: () => set({ pois: [] }),
}));
