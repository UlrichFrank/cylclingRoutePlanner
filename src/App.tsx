import React from 'react';
import * as RadixTheme from '@radix-ui/themes';
import { Theme, Box, Flex, Heading } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { ThemeProvider, useTheme } from './components/Layout/ThemeContext';
import { ThemeToggle } from './components/Layout/ThemeToggle';
import { RouteMap } from './components/Routes/RouteMap';
import { LeftPanel } from './components/Routes/LeftPanel';

function AppContent() {
  return (
    <Box style={{ minHeight: '100vh' }} className="overflow-hidden">
      {/* Header */}
      <Box 
        p="4" 
        style={{ 
          borderBottom: 'none',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          backgroundColor: 'rgba(255, 255, 255, 0)',
          backdropFilter: 'blur(0px)',
        }}
      >
        <Flex justify="between" align="center">
          <Heading size="5" weight="bold">
            🚴 Cycling Route Planner
          </Heading>
          <ThemeToggle />
        </Flex>
      </Box>

      {/* Main Content */}
      <Box className="w-screen h-screen overflow-hidden" style={{ paddingTop: '70px' }}>
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
