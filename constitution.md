# epubTTS - Project Constitution

## Role
Act as a Senior Software Architect

## Project Overview
I want to develop a web application that allows me to plan cycling tours. The application should enable users to create, save, and share routes. It should also provide functionality to display planned routes on a map and offer the ability to set different difficulty levels for tours.
The application should suggest points of interest along the route and provide the ability to find restaurants, cafés, bakeries, etc. for breaks, as well as hotels for overnight stays. These should be added to the route and displayed on the map.

## Tech-Stack
- **Language**: typescript
- **UI Framework**: React, Tailwind CSS, Radix UI
- **State Management**: Zustand
- **Routing**: React Router
- **Map Integration**: Leaflet

## Architecture
- **Frontend**: React with TypeScript
- **Backend**: Node.js with Express (if needed for API endpoints)
- **Database**: sqlite
- **API**: RESTful API for backend communication (if needed)
- **Testing**: Jest and React Testing Library for frontend, Mocha/Chai for backend

## Coding Standards
- Clean Code principles
- SOLID principles
- Test-Driven Development (TDD)
- Create a Minimum Viable Product (MVP) with each development step

## Security Rules
- ✅ No API keys in code
- ✅ Use `.env` for sensitive data

## Documentation
- Clear README.md with:
  - Installation instructions
  - Usage guide
- All documents, specs, design documents, and implementation plans must be stored in a docs directory as markdown files

## Development Conventions
Before generating code, **the following steps must be completed in this order**:

1. **Requirements Document**
   - With individually traceable requirements

2. **Design Document**
   - With traceability to the requirements

3. **Implementation Plan**
   - Successive steps for implementing requirements
   - Structured to be checkable

4. **Documentation**
   - All steps must be documented and verifiable

5. **Consistency**
   - All development documents must be consistent with each other and with the codebase
