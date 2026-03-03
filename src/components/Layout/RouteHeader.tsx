import React from 'react';
import { Box, Flex, Heading, Text } from '@radix-ui/themes';
import { useRouteStore } from '../../store/routeStore';
import { ElevationProfile } from '../Routes/ElevationProfile';
import { ThemeToggle } from './ThemeToggle';

/**
 * Route Header Component
 * Displays current route statistics and elevation profile in a compact layout
 */
export function RouteHeader() {
  const currentRoute = useRouteStore((state) => state.currentRoute);
  const geometry = currentRoute?.geometry;

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
          borderRadius: '8px',
          padding: '8px 12px',
          backgroundColor: 'var(--color-background)',
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
                <Text size="2">
                  <strong>{geometry.distance.toFixed(1)} km</strong>
                </Text>
                <Text size="2">
                  ⬆️ <strong>{geometry.elevationGain} m</strong>
                </Text>
                <Text size="2">
                  ⬇️ <strong>{geometry.elevationLoss} m</strong>
                </Text>
                <Text size="2">
                  🏔️ <strong>{geometry.maxElevation} m</strong>
                </Text>
                <Text size="2">
                  Schwierigkeit: <strong color={getDifficultyColor(currentRoute.difficultyLevel)}>
                    {getDifficultyLabel(currentRoute.difficultyLevel)}
                  </strong>
                </Text>
              </Flex>
            )}
          </Flex>

          {/* Elevation Profile */}
          {geometry && (
            <Box style={{ width: '220px', height: '60px', flexShrink: 0 }}>
              <ElevationProfile compact={true} />
            </Box>
          )}

          {/* Theme Toggle */}
          <Box style={{ flexShrink: 0 }}>
            <ThemeToggle />
          </Box>
        </Flex>
      </Box>
  );
}
