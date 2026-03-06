import { create } from 'zustand';

export interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'restaurant' | 'cafe' | 'hotel' | 'bakery' | 'attraction';
  address?: string;
  website?: string;
  phone?: string;
  distance?: number;
  tags?: Record<string, string>;
}

interface POIStore {
  pois: POI[];
  loading: boolean;
  error: string | null;
  activeType: string;
  radius: number;
  activeFilters: Record<string, boolean>;
  setPOIs: (pois: POI[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setActiveType: (type: string) => void;
  setRadius: (radius: number) => void;
  setActiveFilters: (filters: Record<string, boolean>) => void;
  toggleFilter: (type: string) => void;
  clearPOIs: () => void;
}

export const usePOIStore = create<POIStore>((set) => ({
  pois: [],
  loading: false,
  error: null,
  activeType: 'restaurant',
  radius: 1000,
  activeFilters: {
    restaurant: false,
    cafe: false,
    bakery: false,
    hotel: false,
    attraction: false,
  },
  setPOIs: (pois: POI[]) => set({ pois }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setActiveType: (type: string) => set({ activeType: type }),
  setRadius: (radius: number) => set({ radius }),
  setActiveFilters: (filters: Record<string, boolean>) => set({ activeFilters: filters }),
  toggleFilter: (type: string) => set((state) => ({
    activeFilters: { ...state.activeFilters, [type]: !state.activeFilters[type] }
  })),
  clearPOIs: () => set({ pois: [] }),
}));
