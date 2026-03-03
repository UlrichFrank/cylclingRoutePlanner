import React from 'react';
import * as RadixTheme from '@radix-ui/themes';
import { Theme, Box } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { ThemeProvider, useTheme } from './components/Layout/ThemeContext';
import { ThemeToggle } from './components/Layout/ThemeToggle';
import { RouteMap } from './components/Routes/RouteMap';
import { LeftPanel } from './components/Routes/LeftPanel';
import { RouteHeader } from './components/Layout/RouteHeader';

function AppContent() {
  return (
    <Box style={{ minHeight: '100vh' }} className="overflow-hidden">
      {/* Header with Route Stats & Elevation */}
      <RouteHeader />
      
      {/* Main Content */}
      <Box className="w-screen h-screen overflow-hidden" style={  { position: 'relative' } }>
        {/* Fullscreen Map */}
        <RouteMap />

        {/* Left Panel - Route Planning */}
        <LeftPanel />
      </Box>
    </Box>
  );
}

function AppWithTheme() {
  const { theme } = useTheme();

  return (
    <Theme appearance={theme} accentColor="blue" grayColor="slate" radius="medium">
      <AppContent />
    </Theme>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppWithTheme />
    </ThemeProvider>
  );
}

export default App;
