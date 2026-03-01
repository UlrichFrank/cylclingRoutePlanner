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

const EMPTY_ROUTE: Route = {
  id: 'new-route',
  name: 'Neue Route',
  description: '',
  difficulty: 'easy',
  distance: 0,
  duration: 0,
  coordinates: [],
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  currentRoute: EMPTY_ROUTE,
  setRoute: (route: Route) => set({ currentRoute: route }),
  getRoute: () => get().currentRoute,
}));
