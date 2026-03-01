import { create } from 'zustand';

export interface RouteCoordinate {
  lat: number;
  lng: number;
}

export interface RouteGeometry {
  geometry: RouteCoordinate[]; // Full route polyline from Valhalla
  distance: number; // km
  duration: number; // seconds
  elevationGain: number; // meters
  elevationLoss: number; // meters
  maxElevation: number; // meters
  minElevation: number; // meters
  averageGrade: number; // percentage
}

export interface Route {
  id: string;
  name: string;
  description?: string;
  waypoints: RouteCoordinate[]; // User-selected points (start, mid, end)
  geometry?: RouteGeometry; // Calculated route from Valhalla
  profile: 'mountain' | 'road' | 'gravel';
  difficultyLevel: 'easy' | 'medium' | 'hard';
  createdAt: number;
  updatedAt: number;
}

interface RouteStore {
  currentRoute: Route | null;
  routes: Route[]; // Saved routes
  setRoute: (route: Route) => void;
  getRoute: () => Route | null;
  saveRoute: (route: Route) => void; // Save to routes array
  loadRoute: (id: string) => void; // Load from routes array
  deleteRoute: (id: string) => void;
  loadRoutes: (routes: Route[]) => void; // Load from localStorage
}

const EMPTY_ROUTE: Route = {
  id: 'new-route',
  name: 'Neue Route',
  description: '',
  waypoints: [],
  geometry: undefined,
  profile: 'road',
  difficultyLevel: 'easy',
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

export const useRouteStore = create<RouteStore>((set, get) => ({
  currentRoute: EMPTY_ROUTE,
  routes: [],
  
  setRoute: (route: Route) => set({ currentRoute: route }),
  getRoute: () => get().currentRoute,
  
  saveRoute: (route: Route) => {
    const { routes, currentRoute } = get();
    const updated = routes.map(r => r.id === route.id ? route : r);
    const finalRoutes = updated.some(r => r.id === route.id) ? updated : [...routes, route];
    
    set({ routes: finalRoutes, currentRoute: route });
    
    // Persist to localStorage
    localStorage.setItem('travelAgent_routes', JSON.stringify(finalRoutes));
  },
  
  loadRoute: (id: string) => {
    const { routes } = get();
    const route = routes.find(r => r.id === id);
    if (route) {
      set({ currentRoute: route });
    }
  },
  
  deleteRoute: (id: string) => {
    const { routes, currentRoute } = get();
    const newRoutes = routes.filter(r => r.id !== id);
    set({ routes: newRoutes });
    
    // If we deleted the current route, reset it
    if (currentRoute?.id === id) {
      set({ currentRoute: EMPTY_ROUTE });
    }
    
    // Persist to localStorage
    localStorage.setItem('travelAgent_routes', JSON.stringify(newRoutes));
  },
  
  loadRoutes: (routes: Route[]) => {
    set({ routes });
  },
}));

// Load routes from localStorage on startup
const savedRoutes = localStorage.getItem('travelAgent_routes');
if (savedRoutes) {
  try {
    const routes = JSON.parse(savedRoutes);
    useRouteStore.getState().loadRoutes(routes);
  } catch (e) {
    console.error('Failed to load routes from localStorage:', e);
  }
}
