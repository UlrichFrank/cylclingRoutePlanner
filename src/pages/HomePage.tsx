import React, { useState, useEffect } from 'react';
import { useRouteStore, Route } from '../store/routeStore';
import { routeService } from '../services/routeService';
import { storageService } from '../services/storageService';

export const HomePage: React.FC = () => {
  const { routes, currentRoute, loadRoute, saveRoute, deleteRoute, loadRoutes } = useRouteStore();
  const [newRouteName, setNewRouteName] = useState('');
  const [newRouteDifficulty, setNewRouteDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');

  // Load routes from localStorage on mount
  useEffect(() => {
    const saved = storageService.loadRoutes();
    loadRoutes(saved);
  }, []);

  const handleCreateRoute = () => {
    if (!newRouteName.trim()) return;
    
    const route = routeService.createRoute(newRouteName, newRouteDifficulty);
    saveRoute(route);
    setNewRouteName('');
    setNewRouteDifficulty('medium');
  };

  const handleDeleteRoute = (id: string) => {
    if (confirm('Delete this route?')) {
      deleteRoute(id);
    }
  };

  const handleLoadRoute = (route: Route) => {
    loadRoute(route.id);
  };

  if (routes.length === 0 && !currentRoute) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-2">🚴 Cycling Route Planner</h1>
          <p className="text-gray-600 text-center mb-8">Create your first cycling route</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
              <input
                type="text"
                value={newRouteName}
                onChange={(e) => setNewRouteName(e.target.value)}
                placeholder="e.g., Berlin to Munich"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateRoute()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={newRouteDifficulty}
                onChange={(e) => setNewRouteDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="easy">Easy 🟢</option>
                <option value="medium">Medium 🟡</option>
                <option value="hard">Hard 🔴</option>
              </select>
            </div>

            <button
              onClick={handleCreateRoute}
              className="w-full bg-blue-500 text-white py-2 rounded-md font-medium hover:bg-blue-600 transition"
            >
              Create Route
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show route list
  return (
    <div className="bg-white rounded-lg shadow-md p-4">
      <h3 className="font-bold text-lg mb-4">Saved Routes ({routes.length})</h3>

      {routes.length === 0 ? (
        <p className="text-gray-500 text-sm">No routes saved yet</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {routes.map((route) => (
            <div
              key={route.id}
              className={`p-3 border rounded-md cursor-pointer transition ${
                currentRoute?.id === route.id
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-gray-50 border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleLoadRoute(route)}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-sm">{route.name}</p>
                  <p className="text-xs text-gray-500">
                    {route.waypoints.length} points • {route.difficultyLevel}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteRoute(route.id);
                  }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <hr className="my-4" />

      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Create New Route</p>
        <div>
          <input
            type="text"
            value={newRouteName}
            onChange={(e) => setNewRouteName(e.target.value)}
            placeholder="Route name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyPress={(e) => e.key === 'Enter' && handleCreateRoute()}
          />
        </div>

        <div>
          <select
            value={newRouteDifficulty}
            onChange={(e) => setNewRouteDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="easy">Easy 🟢</option>
            <option value="medium">Medium 🟡</option>
            <option value="hard">Hard 🔴</option>
          </select>
        </div>

        <button
          onClick={handleCreateRoute}
          className="w-full bg-blue-500 text-white py-2 rounded-md text-sm font-medium hover:bg-blue-600 transition"
        >
          Create New Route
        </button>
      </div>
    </div>
  );
};
