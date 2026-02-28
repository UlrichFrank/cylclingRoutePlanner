import { create } from 'zustand';

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  name: string;
  description: string;
  coordinates: RouteCoordinate[];
  difficulty: 'easy' | 'medium' | 'hard';
  distance: number;
  duration: number;
}

interface RouteStore {
  currentRoute: Route | null;
  setRoute: (route: Route) => void;
  getRoute: () => Route | null;
}

const DEMO_ROUTE: Route = {
  id: 'route-1',
  name: 'Berlin City Tour',
  description: 'A scenic cycling tour through Berlin',
  difficulty: 'easy',
  distance: 25,
  duration: 90,
  coordinates: [
    { lat: 52.5200, lng: 13.4050 },
    { lat: 52.5235, lng: 13.4115 },
    { lat: 52.5286, lng: 13.4246 },
    { lat: 52.5265, lng: 13.3925 },
    { lat: 52.5135, lng: 13.3808 },
    { lat: 52.5000, lng: 13.4050 },
    { lat: 52.4750, lng: 13.4000 },
  ],
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  currentRoute: DEMO_ROUTE,
  setRoute: (route: Route) => set({ currentRoute: route }),
  getRoute: () => get().currentRoute,
}));
