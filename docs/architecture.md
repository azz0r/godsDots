# Architecture

GodDots follows a modular React-based architecture with clear separation of concerns.

## Directory Structure

```
src/
├── components/          # React UI components
│   ├── GameCanvas.jsx   # Main game rendering canvas
│   ├── GameContainer.jsx # Game state coordinator
│   ├── TopBar.jsx       # Resource display
│   ├── PowerBar.jsx     # Divine power selection
│   └── ...
├── hooks/              # Custom React hooks for game logic
│   ├── useGameEngine.js # Core game loop and coordination
│   ├── useTerrainSystem.js # Terrain generation and rendering
│   ├── useVillagerSystem.js # Villager AI and management
│   ├── usePathSystem.js # A* pathfinding
│   └── ...
├── utils/              # Utility classes and helpers
│   ├── mapGeneration/  # Procedural generation
│   ├── pathfinding/    # A* algorithm implementation
│   ├── TerrainRenderer.js # Optimized terrain drawing
│   └── ...
├── classes/            # Core game classes
│   ├── LandManager.js  # Land plot management
│   ├── PathNode.js     # Pathfinding node
│   └── ...
├── db/                 # Database layer
│   ├── schema.js       # IndexedDB schema
│   └── database.js     # Save/load operations
└── config/            # Game configuration
    └── gameConfig.js   # Centralized settings
```

## Core Systems

### 1. Game Engine Hook
The `useGameEngine` hook orchestrates all game systems:

```javascript
const useGameEngine = (gameContext) => {
  // Initialize all subsystems
  const terrainSystem = useTerrainSystem(worldSize)
  const villagerSystem = useVillagerSystem(...)
  const pathSystem = usePathSystem(...)
  
  // Game loop
  useAnimationFrame(() => {
    updateGame(deltaTime)
    renderGame()
  })
}
```

### 2. Modular Hook System
Each major system is implemented as a React hook:

- **useTerrainSystem** - Terrain generation and rendering
- **useVillagerSystem** - Villager AI and behavior
- **useBuildingSystem** - Building placement and management
- **usePathSystem** - Pathfinding and movement
- **usePlayerSystem** - Player/AI management
- **useResourceSystem** - Resource spawning and gathering

### 3. Rendering Pipeline

```
Canvas Clear
    ↓
Terrain Render (with camera transform)
    ↓
Apply Camera Transform
    ↓
Resource Rendering
    ↓
Path Rendering (if enabled)
    ↓
Territory Borders
    ↓
Buildings
    ↓
Villagers
    ↓
Visual Effects
    ↓
UI Overlays (screen space)
```

### 4. State Management

#### Local State
- React hooks for component-specific state
- useRef for mutable game objects
- useState for reactive UI updates

#### Global State
- GameContext provides shared systems
- Direct prop passing for UI state
- Canvas ref for cross-component access

### 5. Save System

Uses IndexedDB via Dexie.js:

```javascript
// Schema
games: 'id, createdAt, updatedAt'
levels: 'id, gameId, seed, createdAt'
players: 'id, levelId, type, name'
villagers: 'id, playerId, x, y, [levelId+type]'
buildings: 'id, playerId, type, x, y, [levelId+type]'
resources: 'id, levelId, type, x, y, amount'
```

## Design Patterns

### 1. Composition over Inheritance
Systems are composed using hooks rather than class hierarchies.

### 2. Immutable Updates
State updates follow React patterns for predictable updates.

### 3. Entity-Component Pattern
Villagers and buildings are entities with component properties.

### 4. Observer Pattern
Event systems for user input and game events.

### 5. Singleton Services
Pathfinding grid and land manager as single instances.

## Performance Considerations

### 1. Render Optimization
- Dirty rectangle tracking
- Off-screen culling
- Batch rendering for similar entities

### 2. Pathfinding Cache
- LRU cache for common paths
- Grid-based node reuse
- Dynamic obstacle updates

### 3. Terrain Chunks
- Tile-based rendering
- Distance-based LOD
- Simplified distant terrain

### 4. Fixed Timestep
- Consistent 60 FPS logic updates
- Frame interpolation for smooth visuals
- Delta time accumulation