# Game Loop

The game loop is the heart of GodDots, coordinating all systems at 60 FPS.

## Main Loop Structure

```javascript
const gameLoop = (currentTime) => {
  // 1. Calculate delta time
  const deltaTime = currentTime - lastFrameTime
  
  // 2. Update phase
  updateGame(deltaTime)
  
  // 3. Render phase
  renderGame()
  
  // 4. Schedule next frame
  requestAnimationFrame(gameLoop)
}
```

## Update Phase

### 1. Fixed Timestep Updates (60 Hz)
```javascript
accumulator += deltaTime
while (accumulator >= FIXED_TIMESTEP) {
  // Physics and movement
  updateVillagerMovement()
  updateProjectiles()
  
  // AI decisions
  updateVillagerAI()
  updateAIPlayers()
  
  accumulator -= FIXED_TIMESTEP
}
```

### 2. Variable Rate Updates
```javascript
// Visual effects (every frame)
updateParticles(deltaTime)
updateAnimations(deltaTime)

// Resource regeneration (every 5 seconds)
if (gameTime % 300 === 0) {
  regenerateResources()
}

// Auto-save (every 30 seconds)
if (gameTime % 1800 === 0) {
  autoSaveGame()
}
```

### 3. Update Order

1. **Input Processing**
   - Mouse position
   - Keyboard state
   - Touch events

2. **Player Updates**
   - Resource generation
   - Territory calculation
   - Power cooldowns

3. **Villager Updates**
   - Movement interpolation
   - AI state machines
   - Task execution
   - Health/hunger

4. **Building Updates**
   - Construction progress
   - Resource production
   - Worker assignment

5. **Environment Updates**
   - Resource regeneration
   - Weather effects
   - Day/night cycle

6. **Combat Resolution**
   - Damage calculation
   - Death handling
   - Conversion checks

## Render Phase

### 1. Layer Ordering
```javascript
// Bottom to top rendering
1. Clear canvas
2. Terrain tiles
3. Territory borders
4. Resources
5. Paths (debug)
6. Buildings
7. Villagers
8. Particle effects
9. UI overlays
10. Selection boxes
```

### 2. Camera Transform
```javascript
ctx.save()
ctx.scale(camera.zoom, camera.zoom)
ctx.translate(-camera.x, -camera.y)
// Render world-space objects
ctx.restore()
// Render screen-space UI
```

### 3. Culling
Only render objects within view:
```javascript
const inView = (obj) => {
  return obj.x > camera.x - buffer &&
         obj.x < camera.x + screenWidth/zoom + buffer &&
         obj.y > camera.y - buffer &&
         obj.y < camera.y + screenHeight/zoom + buffer
}
```

## Performance Metrics

### Frame Timing
```javascript
const fps = 1000 / deltaTime
const updateTime = updateEnd - updateStart
const renderTime = renderEnd - renderStart
const idleTime = deltaTime - updateTime - renderTime
```

### Bottleneck Detection
- Update > 8ms: Reduce AI complexity
- Render > 8ms: Simplify visuals
- Total > 16.67ms: Frame drop

## Synchronization

### Animation Frames
- RequestAnimationFrame for smooth 60 FPS
- Fallback to setTimeout for background tabs
- Pause when window loses focus

### Network Sync (Future)
```javascript
// Deterministic simulation
const simTick = Math.floor(gameTime / TICK_RATE)
// Rollback on desync
if (serverTick !== simTick) {
  rollbackToTick(serverTick)
  replayInputs()
}
```

## State Interpolation

### Movement Smoothing
```javascript
// Store previous positions
villager.prevX = villager.x
villager.prevY = villager.y

// Update logical position
villager.x += villager.vx * dt
villager.y += villager.vy * dt

// Render interpolated position
const alpha = accumulator / FIXED_TIMESTEP
const renderX = lerp(villager.prevX, villager.x, alpha)
const renderY = lerp(villager.prevY, villager.y, alpha)
```

### Camera Smoothing
```javascript
// Smooth camera follow
camera.targetX = player.x - screenWidth/2
camera.targetY = player.y - screenHeight/2

camera.x += (camera.targetX - camera.x) * 0.1
camera.y += (camera.targetY - camera.y) * 0.1
```

## Debug Profiling

### Performance Marks
```javascript
performance.mark('update-start')
updateGame(deltaTime)
performance.mark('update-end')

performance.mark('render-start')
renderGame()
performance.mark('render-end')

// Measure
performance.measure('update', 'update-start', 'update-end')
performance.measure('render', 'render-start', 'render-end')
```

### Slow Frame Detection
```javascript
if (deltaTime > 33) { // 2x target frame time
  console.warn('Slow frame detected:', deltaTime + 'ms')
  // Log expensive operations
}
```