# Copilot Instructions for travelAgent

## Project Overview
A web application for planning cycling tours. Users can create, save, and share routes with difficulty levels, view routes on an interactive map, and discover points of interest, restaurants, cafés, bakeries, and hotels along the way.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Radix UI
- **State Management**: Zustand
- **Routing**: React Router
- **Map Integration**: Leaflet
- **Backend**: Node.js + Express (for API endpoints)
- **Database**: SQLite
- **Testing**: Jest + React Testing Library (frontend), Mocha + Chai (backend)

## Project Structure (Expected)
```
src/
├── components/        # React components
├── hooks/            # Custom React hooks
├── store/            # Zustand state management
├── pages/            # Page-level components (React Router)
├── services/         # API calls, external integrations
├── types/            # TypeScript type definitions
└── utils/            # Helper functions

docs/
├── requirements.md   # Traceable requirements
├── design.md         # Architecture & design decisions
└── implementation.md # Step-by-step implementation plan
```

## Build & Development Commands
(Update these once project is initialized with npm/yarn setup)

Expected commands:
```bash
npm install              # Install dependencies
npm run dev              # Start development server
npm run build            # Build for production
npm run test             # Run all tests
npm run test -- --watch  # Run tests in watch mode
npm run lint             # Run linter
npm run type-check       # Type checking (tsc)
```

## Code Conventions

### TypeScript
- Enable strict mode in tsconfig.json
- Use explicit type annotations for function parameters and return types
- Avoid `any` - use `unknown` if needed, then narrow the type

### React Components
- Use functional components with hooks
- Keep components small and focused (single responsibility)
- Extract complex logic into custom hooks
- Use Tailwind for styling; avoid inline styles

### State Management (Zustand)
- Create separate stores for different domains (e.g., `routeStore`, `mapStore`, `userStore`)
- Use selectors to avoid unnecessary re-renders
- Keep state as flat as possible

### File Naming
- Components: PascalCase (e.g., `RouteMap.tsx`)
- Utilities/Helpers: camelCase (e.g., `calculateDistance.ts`)
- Stores: camelCase with "Store" suffix (e.g., `routeStore.ts`)

### Testing
- Test-driven development (TDD) is the standard: write tests before implementation
- Test files collocated with source: `Component.tsx` → `Component.test.tsx`
- Prefer integration tests over unit tests for components
- Use meaningful test descriptions; avoid "should work" or vague names

## Development Workflow

### Before Writing Code
All features must follow this sequence:
1. **Requirements Document** (`docs/requirements.md`)
   - Traceable requirements with unique IDs
   - Success criteria for each requirement
   
2. **Design Document** (`docs/design.md`)
   - Architecture diagrams or descriptions
   - Data models and API contracts
   - Traceability to requirements

3. **Implementation Plan** (`docs/implementation.md`)
   - Ordered steps for implementation
   - Each step must be verifiable and testable
   - Traceability to design decisions

4. **Write Tests** (TDD)
   - Tests pass as implementation progresses

5. **Implementation**

6. **Documentation**
   - Update README.md or component documentation as needed
   - Update architecture docs if design changed

### Security
- Never commit API keys or sensitive data
- Use `.env` files for configuration; `.env.local` is git-ignored
- Store environment variable templates in `.env.example`

## Map Integration (Leaflet)
- Initialize map in a custom hook for reusability
- Use React-Leaflet for React integration (not raw Leaflet API)
- Markers and layers should be managed through Zustand state for consistency

## Points of Interest & Venues
- Design data model first (location, type, rating, distance from route)
- Plan API integration points for fetching venues (restaurants, hotels, etc.)
- Consider caching strategy to avoid excessive API calls

## Key Dependencies (When Initialized)
- `react-leaflet`: React wrapper for Leaflet
- `zustand`: Lightweight state management
- `react-router-dom`: Client-side routing
- `tailwindcss`: Utility-first CSS
- `radix-ui`: Headless UI components
- `typescript`: Type checking
- `jest`: Testing framework

## Questions for Implementation
When starting a feature, clarify:
1. Is this feature part of the MVP?
2. What data needs to persist (database schema)?
3. Which state goes in Zustand vs. local component state?
4. Are there API endpoints needed, or is this client-only?

## Useful Resources (When Available)
- Design documents in `docs/` directory
- Type definitions in `src/types/`
- Store patterns in `src/store/`

## Copilot Workflow Standards

### Documentation & Reference Files
- Always consult `docs/requirements.md`, `docs/design.md`, and `docs/implementation.md` before implementing features
- `.github/copilot-instructions.md` contains project-specific conventions and standards
- Update documentation when design decisions change or new patterns are established

### Destructive Actions
Copilot will **request explicit confirmation** before executing any destructive operations:
- Deleting or modifying files/directories
- Removing or overwriting existing code
- Git operations (rebase, force-push, deleting branches)
- Database operations (drop, truncate, delete)
- Major refactorings affecting existing code
- Any irreversible changes

Confirmation is requested via the ask_user tool before proceeding.

## Remember
This project follows **Test-Driven Development** strictly. Tests are written before implementation and serve as executable specifications.
