import React from 'react';
import { RouteMap } from './components/RouteMap';
import { LeftPanel } from './components/LeftPanel';
import { POIFilterButtons } from './components/POIFilterButtons';
import './App.css';

function App() {
  return (
    <div className="w-screen h-screen bg-gray-50 overflow-hidden">
      {/* Fullscreen Map */}
      <RouteMap />

      {/* Left Panel - Route Planning */}
      <LeftPanel />

      {/* Bottom Panel - POI Filters */}
      <POIFilterButtons />

      {/* Header */}
      <header className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 to-blue-800 text-white py-3 px-4 z-50 shadow-lg">
        <h1 className="text-2xl font-bold">🚴 Cycling Route Planner</h1>
        <p className="text-blue-100 text-sm">Entdecke Routen und finde Orte zum Essen</p>
      </header>
    </div>
  );
}

export default App;
