/**
 * Icon Registry
 * Zentrale Verwaltung aller Icons im Projekt
 * - Bessere Wartbarkeit
 * - Konsistente Nutzung
 * - TypeScript-Sicherheit
 * - Einfache Theme-Integration
 */

import React from 'react';
import {
  Menu,
  Plus,
  MenuClose,
  Mountain,
  Cycling,
  PizzaAlt,
  CupHot,
  BedAlt,
  Baguette,
  Sun,
  Moon,
  Location,
  LoaderDots,
  Arch,
  Road,
} from '@boxicons/react';

// ============================================================================
// TYPES
// ============================================================================

export type IconName = keyof typeof iconRegistry;

export type IconCategory = 
  | 'navigation'
  | 'route'
  | 'theme'
  | 'poi'
  | 'utility';

export interface IconDefinition {
  component: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  category: IconCategory;
  label: string;
  description?: string;
}

// ============================================================================
// ICON REGISTRY
// ============================================================================

export const iconRegistry = {
  // Navigation & UI
  menu: {
    component: Menu,
    category: 'navigation' as const,
    label: 'Menü',
    description: 'Dropdown Menü öffnen',
  },
  plus: {
    component: Plus,
    category: 'navigation' as const,
    label: 'Hinzufügen',
    description: 'Neuer Waypoint',
  },
  menuClose: {
    component: MenuClose,
    category: 'navigation' as const,
    label: 'Schließen',
    description: 'Menü schließen',
  },
  location: {
    component: Location,
    category: 'navigation' as const,
    label: 'Standort',
    description: 'Aktuelle Position',
  },
  loaderDots: {
    component: LoaderDots,
    category: 'utility' as const,
    label: 'Lädt...',
    description: 'Ladeindikator',
  },

  // Route & Elevation
  mountain: {
    component: Mountain,
    category: 'route' as const,
    label: 'Bergprofil',
    description: 'Route-Informationen & Höhenprofil',
  },
  road: {
    component: Road,
    category: 'route' as const,
    label: 'Straßenprofil',
    description: 'Route-Informationen & Straßenprofil',
  },
  gravel: {
    component: Cycling,
    category: 'route' as const,
    label: 'Gravelprofil',
    description: 'Route-Informationen & Gravelprofil',
  },

  // Theme Toggle
  sun: {
    component: Sun,
    category: 'theme' as const,
    label: 'Hellmodus',
    description: 'Zu Hellmodus wechseln',
  },
  moon: {
    component: Moon,
    category: 'theme' as const,
    label: 'Dunkelmodus',
    description: 'Zu Dunkelmodus wechseln',
  },

  // POI Categories
  restaurant: {
    component: PizzaAlt,
    category: 'poi' as const,
    label: 'Restaurants',
    description: 'Gastronomie-Einrichtungen',
  },
  cafe: {
    component: CupHot,
    category: 'poi' as const,
    label: 'Cafés',
    description: 'Cafés und Kaffeeläden',
  },
  bakery: {
    component: Baguette,
    category: 'poi' as const,
    label: 'Bäckereien',
    description: 'Bäckereien und Konditoreien',
  },
  hotel: {
    component: BedAlt,
    category: 'poi' as const,
    label: 'Hotels',
    description: 'Unterkünfte',
  },
  attraction: {
    component: Arch,
    category: 'poi' as const,
    label: 'Sehenswürdigkeiten',
    description: 'Touristisch interessante Orte',
  },
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Holt eine Icon-Komponente aus der Registry
 * Type-safe bei korrektem Icon-Namen
 */
export const getIcon = (name: IconName): IconDefinition => {
  return iconRegistry[name];
};

/**
 * Rendert ein Icon mit optionalen Props
 */
export const renderIcon = (
  name: IconName,
  props?: React.SVGProps<SVGSVGElement>
): React.ReactNode => {
  const icon = getIcon(name);
  return React.createElement(icon.component, {
    ...props,
    key: name,
  });
};

/**
 * Holt alle Icons einer bestimmten Kategorie
 */
export const getIconsByCategory = (
  category: IconCategory
): Array<[IconName, IconDefinition]> => {
  return Object.entries(iconRegistry).filter(
    ([, icon]) => icon.category === category
  ) as Array<[IconName, IconDefinition]>;
};

// ============================================================================
// ICON COMPONENTS (Für häufige Nutzungsmuster)
// ============================================================================

/**
 * POI Filter Icons - für die Darstellung in Filterlisten
 */
export const POI_ICONS = {
  restaurant: iconRegistry.restaurant,
  cafe: iconRegistry.cafe,
  bakery: iconRegistry.bakery,
  hotel: iconRegistry.hotel,
  attraction: iconRegistry.attraction,
} as const;

export type POIIconType = keyof typeof POI_ICONS;

/**
 * Theme Toggle Icons
 */
export const THEME_ICONS = {
  light: iconRegistry.sun,
  dark: iconRegistry.moon,
} as const;

/**
 * Navigation Icons
 */
export const NAV_ICONS = {
  menu: iconRegistry.menu,
  plus: iconRegistry.plus,
  close: iconRegistry.menuClose,
  location: iconRegistry.location,
  loading: iconRegistry.loaderDots,
} as const;

/**
 * Route Icons
 */
export const ROUTE_ICONS = {
  mountain: iconRegistry.mountain,
  road: iconRegistry.road,
  gravel: iconRegistry.gravel,
} as const;

// ============================================================================
// ICON COMPONENT WRAPPER (Optional)
// ============================================================================

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  className?: string;
  title?: string;
  ariaLabel?: string;
}

/**
 * Reusable Icon Component
 * Nutzen: <Icon name="menu" size="lg" />
 */
export const Icon: React.FC<IconProps> = ({
  name,
  size = 'md',
  className = '',
  ariaLabel,
  ...props
}) => {
  const icon = getIcon(name);
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };
  
  const pixelSize = typeof size === 'number' ? size : sizeMap[size];
  
  return React.createElement(icon.component, {
    width: pixelSize,
    height: pixelSize,
    className,
    ...props,
    'aria-label': ariaLabel || icon.label,
  });
};

export default iconRegistry;
