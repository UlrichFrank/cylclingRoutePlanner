import React from 'react';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useRouteStore } from '../../store/routeStore';
import { ElevationProfile } from '../Routes/ElevationProfile';

/**
 * Route Header Component
 * Displays current route statistics and elevation profile
 */
export function RouteHeader() {
  const currentRoute = useRouteStore((state) => state.currentRoute);
  const geometry = currentRoute?.geometry;

  // Helper to get difficulty color
  const getDifficultyColor = (difficulty: string): 'green' | 'yellow' | 'orange' | 'red' => {
    switch (difficulty) {
      case 'Easy':
        return 'green';
      case 'Moderate':
        return 'yellow';
      case 'Hard':
        return 'orange';
      case 'Expert':
        return 'red';
      default:
        return 'green';
    }
  };

  // Helper to translate difficulty
  const getDifficultyLabel = (difficulty: string): string => {
    const labels: Record<string, string> = {
      Easy: 'Leicht',
      Moderate: 'Mittel',
      Hard: 'Schwer',
      Expert: 'Experte',
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <Box 
      style={{ 
        borderBottom: '1px solid var(--gray-6)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'var(--color-background)',
        backdropFilter: 'blur(8px)',
        padding: '8px 16px',
      }}
    >
      <Flex justify="between" align="center" gap="4">
        {/* Title and Stats on Left */}
        <Flex direction="column" gap="1" style={{ flex: 1 }}>
          <Heading size="4" weight="bold" style={{ margin: 0 }}>
            🚴 Cycling Route Planner
          </Heading>
          
          {/* Stats Row - Compact */}
          {geometry && (
            <Flex gap="4" align="center" wrap="wrap" style={{ fontSize: '12px' }}>
              {/* Distance */}
              <Text size="2">
                <strong>{geometry.distance.toFixed(1)} km</strong>
              </Text>

              {/* Elevation Gain */}
              <Text size="2">
                ⬆️ <strong>{geometry.elevationGain} m</strong>
              </Text>

              {/* Elevation Loss */}
              <Text size="2">
                ⬇️ <strong>{geometry.elevationLoss} m</strong>
              </Text>

              {/* Max Elevation */}
              <Text size="2">
                🏔️ <strong>{geometry.maxElevation} m</strong>
              </Text>

              {/* Difficulty */}
              <Text size="2">
                Schwierigkeit: <strong color={getDifficultyColor(currentRoute.difficultyLevel)}>
                  {getDifficultyLabel(currentRoute.difficultyLevel)}
                </strong>
              </Text>
            </Flex>
          )}
        </Flex>

        {/* Mini Elevation Chart on Right - Narrower */}
        {geometry && (
          <Box style={{ width: '180px', height: '50px', flexShrink: 0 }}>
            <ElevationProfile 
              compact={true}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
