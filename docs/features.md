# Features

## Terrain Generation

### Biome System
The game uses multi-layered noise functions to create realistic terrain:

```javascript
// Height map - creates island shape
height = simplexNoise(x, y) * islandMask(x, y)

// Moisture map - determines vegetation
moisture = simplexNoise(x * 2, y * 2)

// Temperature map - varies by latitude
temperature = 1 - (distanceFromEquator * 0.7) + noise

// Biome selection
if (height < 0.15) return 'deepWater'
if (height < 0.25) return 'water'
if (height < 0.3) return 'sand'
// ... etc
```

### Biome Types
- **Water**: deepWater, water, river
- **Coastal**: sand, beach
- **Plains**: grassland, savanna, prairie
- **Forest**: forest, taiga, rainforest, jungle
- **Mountain**: hills, rockyHills, mountain, snow
- **Desert**: desert, dunes
- **Cold**: tundra, snowyForest

### River Generation
Rivers flow from high elevation to water:
1. Find high elevation points
2. Follow downhill gradient
3. Carve river tiles
4. Widen near ocean

## Pathfinding System

### A* Algorithm
Optimized A* with terrain costs:

```javascript
// Movement costs by terrain
costs = {
  grassland: 1.0,
  forest: 1.5,
  hills: 2.0,
  mountain: 3.0,
  water: Infinity
}

// Heuristic function
h = manhattan(current, goal) * 1.1 // 10% weight

// Path caching
cache.set(key, smoothPath(path))
```

### Dynamic Obstacles
- Other villagers
- Temporary buildings
- Combat zones
- Player-placed barriers

### Path Smoothing
1. Remove redundant nodes
2. Add bezier curves
3. Adjust for terrain flow

## Building System

### Building Types

#### Temple
- **Purpose**: Generate belief points
- **Cost**: 50 stone, 20 gold
- **Workers**: 3 priests
- **Special**: Area of influence

#### House
- **Purpose**: Population capacity
- **Cost**: 20 wood, 10 stone
- **Capacity**: 4 villagers
- **Special**: Happiness bonus

#### Farm
- **Purpose**: Food production
- **Cost**: 15 wood
- **Workers**: 2 farmers
- **Special**: Requires fertile land

#### Storage
- **Purpose**: Resource capacity
- **Cost**: 30 wood, 20 stone
- **Capacity**: 500 units
- **Special**: Decay prevention

### Construction Process
1. **Planning**: Check valid placement
2. **Foundation**: Clear terrain
3. **Building**: Progress over time
4. **Completion**: Activate functionality

## Resource System

### Resource Types

#### Gatherable
- **Trees**: Wood for construction
- **Stone**: Durable building material
- **Berries**: Quick food source
- **Gold**: Rare, valuable resource

#### Produced
- **Food**: From farms
- **Belief**: From temples
- **Tools**: From workshops

### Regeneration
Resources slowly regenerate:
```javascript
if (resource.amount < resource.maxAmount) {
  resource.amount += resource.regenRate * deltaTime
}
```

## Land Management

### Plot System
- World divided into 10x10 tile plots
- Each plot has terrain-based value
- Purchase with belief points
- Ownership enables building

### Plot Valuation
```javascript
value = baseCost * 
  terrainMultiplier * 
  resourceBonus * 
  proximityModifier
```

### Territory Expansion
1. Purchase adjacent plots
2. Connect to existing territory
3. Extend influence radius
4. Unlock new resources

## Combat System

### Divine Powers

#### Lightning Strike
- **Damage**: 100 instant
- **Area**: Single target
- **Cost**: 50 belief
- **Cooldown**: 10s

#### Earthquake
- **Damage**: 50 area
- **Area**: 200 radius
- **Cost**: 100 belief
- **Special**: Damages buildings

#### Heal
- **Effect**: Restore 50 HP
- **Area**: 100 radius
- **Cost**: 20 belief
- **Special**: Happiness boost

### Conversion
- Unhappy villagers susceptible
- Territory influence matters
- Priests boost resistance
- Cultural buildings help

## Visual Effects

### Particle System
- Explosions
- Smoke
- Sparkles
- Weather effects
- Damage numbers

### Optimizations
- Object pooling
- Batch rendering
- Distance culling
- Quality settings

## Save System

### Auto-save
Every 30 seconds:
1. Serialize game state
2. Compress with LZ-string
3. Store in IndexedDB
4. Rotate old saves

### Manual Save
- Quick save (F5)
- Save slots (5 max)
- Cloud sync (future)

### Save Contents
- Map seed
- All entities
- Resources
- Player progress
- Settings