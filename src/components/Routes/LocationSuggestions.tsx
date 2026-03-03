import React, { useState, useEffect, useRef } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';

export interface LocationSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
  icon: string;
  description?: string;
}

interface LocationSuggestionsProps {
  onSelectLocation: (suggestion: LocationSuggestion) => void;
  isOpen: boolean;
  onClose: () => void;
  currentLat?: number;
  currentLng?: number;
}

/**
 * Location Suggestions Component
 * Shows recent locations, current position, and home
 */
export const LocationSuggestions: React.FC<LocationSuggestionsProps> = ({
  onSelectLocation,
  isOpen,
  onClose,
  currentLat,
  currentLng,
}) => {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const newSuggestions: LocationSuggestion[] = [];

    // Add current position if available
    if (currentLat !== undefined && currentLng !== undefined) {
      newSuggestions.push({
        id: 'current',
        label: 'Aktuelle Position',
        lat: currentLat,
        lng: currentLng,
        icon: '📍',
        description: `${currentLat.toFixed(4)}, ${currentLng.toFixed(4)}`,
      });
    }

    // Try to add home location from localStorage
    try {
      const homeLocation = localStorage.getItem('homeLocation');
      if (homeLocation) {
        const { lat, lng } = JSON.parse(homeLocation);
        newSuggestions.push({
          id: 'home',
          label: 'Zuhause',
          lat,
          lng,
          icon: '🏠',
          description: `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
        });
      }
    } catch (error) {
      console.warn('[LocationSuggestions] Error loading home location:', error);
    }

    // Load recent locations from localStorage
    try {
      const recentLocations = localStorage.getItem('recentLocations');
      if (recentLocations) {
        const recent: Array<{ label: string; lat: number; lng: number }> =
          JSON.parse(recentLocations);
        recent.slice(0, 3).forEach((loc, index) => {
          newSuggestions.push({
            id: `recent-${index}`,
            label: loc.label,
            lat: loc.lat,
            lng: loc.lng,
            icon: '🕐',
            description: `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`,
          });
        });
      }
    } catch (error) {
      console.warn('[LocationSuggestions] Error loading recent locations:', error);
    }

    setSuggestions(newSuggestions);
  }, [isOpen, currentLat, currentLng]);

  const handleSelectSuggestion = (suggestion: LocationSuggestion) => {
    onSelectLocation(suggestion);

    // Save to recent locations
    try {
      const recentLocations = localStorage.getItem('recentLocations');
      let recent: Array<{ label: string; lat: number; lng: number }> = [];

      if (recentLocations) {
        recent = JSON.parse(recentLocations);
      }

      // Add to beginning and remove duplicates
      recent = [
        { label: suggestion.label, lat: suggestion.lat, lng: suggestion.lng },
        ...recent.filter((loc) => loc.label !== suggestion.label),
      ].slice(0, 5); // Keep only 5 recent

      localStorage.setItem('recentLocations', JSON.stringify(recent));
    } catch (error) {
      console.warn('[LocationSuggestions] Error saving recent location:', error);
    }

    onClose();
  };

  if (!isOpen || suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: '4px',
        backgroundColor: 'white',
        border: '1px solid #e0e7ff',
        borderRadius: '6px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        zIndex: 50,
        maxHeight: '300px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          onClick={() => handleSelectSuggestion(suggestion)}
          style={{
            display: 'block',
            width: '100%',
            padding: '10px 12px',
            border: 'none',
            background: 'none',
            textAlign: 'left',
            cursor: 'pointer',
            fontSize: '13px',
            color: '#0f172a',
            borderBottom: '1px solid #f1f5f9',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = '#f8fafc';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
          }}
        >
          <Flex gap="2" align="center">
            <Text style={{ fontSize: '16px' }}>{suggestion.icon}</Text>
            <Flex direction="column" gap="1">
              <Text weight="medium" size="2">
                {suggestion.label}
              </Text>
              {suggestion.description && (
                <Text size="1" style={{ color: '#64748b' }}>
                  {suggestion.description}
                </Text>
              )}
            </Flex>
          </Flex>
        </button>
      ))}
    </div>
  );
};
