# GodDots Documentation

Welcome to the GodDots game documentation. This guide covers the technical architecture, game systems, and implementation details.

## Table of Contents

1. [Game Overview](./game-overview.md)
2. [Architecture](./architecture.md)
3. [Game Loop](./game-loop.md)
4. [Core Systems](./core-systems.md)
5. [Features](./features.md)
6. [AI Systems](./ai-systems.md)
7. [Performance](./performance.md)
8. [Testing](./testing.md)

## Quick Start

GodDots is a god simulation game where players control divine powers to guide their civilization. The game features:

- **Procedural terrain generation** with realistic biomes
- **A* pathfinding** with terrain-based movement costs
- **Land management** system with plot ownership
- **Villager AI** with individual behaviors and needs
- **Resource management** and gathering
- **Building placement** with construction mechanics
- **Multiplayer AI opponents** with different strategies

## Technology Stack

- **React 18** - UI framework
- **Canvas 2D API** - Rendering engine
- **Dexie.js** - IndexedDB wrapper for save games
- **Simplex Noise** - Procedural terrain generation
- **Jest** - Testing framework

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Key Concepts

### Pixel-Perfect Movement
All entities move on a pixel grid with fixed timestep updates for consistent gameplay across different frame rates.

### Island Generation
Maps are always generated as islands using a distance-based mask to ensure water surrounds the playable area.

### Zoom System
Double-click to zoom 2x to the clicked point. Smooth zoom with mouse wheel for precise control.

### Performance Optimizations
- Simplified terrain rendering for better FPS
- Reduced particle effects
- Efficient pathfinding with caching
- Batch rendering for similar entities