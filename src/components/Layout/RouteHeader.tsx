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
      p="4" 
      style={{ 
        borderBottom: '1px solid var(--gray-6)',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'var(--color-background)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Flex justify="between" align="center" gap="4">
        {/* Title and Stats */}
        <Flex direction="column" gap="2" style={{ flex: 1 }}>
          <Heading size="5" weight="bold">
            🚴 Cycling Route Planner
          </Heading>
          
          {/* Stats Row */}
          {geometry && (
            <Flex gap="6" align="center" wrap="wrap">
              {/* Distance */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Entfernung
                </Text>
                <Text size="3" weight="bold">
                  {geometry.distance.toFixed(1)} km
                </Text>
              </Flex>

              {/* Elevation Gain */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  ⬆️ Aufstieg
                </Text>
                <Text size="3" weight="bold">
                  {geometry.elevationGain} m
                </Text>
              </Flex>

              {/* Elevation Loss */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  ⬇️ Abstieg
                </Text>
                <Text size="3" weight="bold">
                  {geometry.elevationLoss} m
                </Text>
              </Flex>

              {/* Max Elevation */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Max Höhe
                </Text>
                <Text size="3" weight="bold">
                  {geometry.maxElevation} m
                </Text>
              </Flex>

              {/* Difficulty */}
              <Flex direction="column" gap="1">
                <Text size="1" color="gray">
                  Schwierigkeit
                </Text>
                <Text size="3" weight="bold" color={getDifficultyColor(currentRoute.difficultyLevel)}>
                  {getDifficultyLabel(currentRoute.difficultyLevel)}
                </Text>
              </Flex>
            </Flex>
          )}
        </Flex>

        {/* Mini Elevation Chart - only show if route has geometry */}
        {geometry && (
          <Box style={{ width: '300px', height: '60px', flexShrink: 0 }}>
            <ElevationProfile 
              compact={true}
            />
          </Box>
        )}
      </Flex>
    </Box>
  );
}
