import { Route, StorageData } from '../types/route';

const STORAGE_KEY = 'travelAgent_routes';

export const storageService = {
  /**
   * Load all routes from localStorage
   */
  loadRoutes: (): Route[] => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      const parsed = JSON.parse(data) as StorageData;
      return parsed.routes || [];
    } catch (e) {
      console.error('Failed to load routes from localStorage:', e);
      return [];
    }
  },

  /**
   * Save routes to localStorage
   */
  saveRoutes: (routes: Route[]): void => {
    try {
      const data: StorageData = {
        version: '1.0',
        routes,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save routes to localStorage:', e);
    }
  },

  /**
   * Export a single route as JSON
   */
  exportRoute: (route: Route): string => {
    return JSON.stringify(route, null, 2);
  },

  /**
   * Import a route from JSON string
   */
  importRoute: (jsonString: string): Route | null => {
    try {
      const route = JSON.parse(jsonString) as Route;
      // Validate required fields
      if (!route.id || !route.waypoints || !Array.isArray(route.waypoints)) {
        throw new Error('Invalid route format');
      }
      return route;
    } catch (e) {
      console.error('Failed to import route:', e);
      return null;
    }
  },

  /**
   * Clear all routes from localStorage
   */
  clearStorage: (): void => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
    }
  },
};
