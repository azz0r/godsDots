# God Dots Roadmap - Black & White Web Game Parity

## Current Status: Layer 6 Complete
- ✅ Phaser 3 migration (Layers 1-5)
- ✅ Terrain generation with biomes
- ✅ Pathfinding system
- ✅ Villager system with batch rendering
- ✅ Camera controls (pan, zoom, drag)
- ✅ Belief system core mechanics
- ✅ Multi-player system (human + AI)
- ✅ Temple and villager spawning
- ✅ Performance optimizations (RenderTexture, batch rendering)

## Next 20 Stories to Black & White Parity (No Creature)

### Phase 1: Core UI & Visuals (Stories 1-5)

#### Story 1: Fix Temple Rendering Visibility
**Priority: CRITICAL**
- **Issue**: Temples not visible on screen despite being spawned
- **Tasks**:
  - Debug temple rendering depth and position
  - Verify TempleSystem.update() is being called
  - Ensure temples are within camera bounds on spawn
  - Add debug overlay to show temple positions
  - Verify playerColor is being applied correctly
- **Acceptance**: Temples visible as 8x8 colored squares with cross markers
- **Estimate**: 2 hours

#### Story 2: Start Screen / Main Menu
**Priority: HIGH**
- **Tasks**:
  - Create MainMenu component with game options
  - New Game button (setup players, difficulty)
  - Continue/Load Game button
  - Settings button (volume, graphics quality)
  - Credits/About section
  - Smooth transition to game scene
- **Acceptance**: Professional start screen with working menu options
- **Estimate**: 4 hours

#### Story 3: Pause Menu System
**Priority: HIGH**
- **Tasks**:
  - ESC key to pause/unpause game
  - Pause overlay with dimmed background
  - Resume, Save, Settings, Quit to Menu buttons
  - Pause stops all game logic (villagers, belief, AI)
  - Settings panel (volume, graphics, controls)
  - Save game state to IndexedDB
- **Acceptance**: Fully functional pause menu with save/load
- **Estimate**: 6 hours

#### Story 4: Top UI Status Bar
**Priority: HIGH**
- **Tasks**:
  - Top bar showing: Belief Points, Population, Temple Level
  - Player alignment indicator (Good ← → Evil)
  - Opponent player stats (visible/hidden toggle)
  - Resource counters (food, wood when implemented)
  - Animated BP gain/loss feedback
  - Tooltips on hover
- **Acceptance**: Always-visible status bar with live updates
- **Estimate**: 4 hours

#### Story 5: Minimap Navigation
**Priority: MEDIUM**
- **Tasks**:
  - Bottom-right corner minimap (150x150px)
  - Show terrain, temples, villager clusters
  - Click minimap to pan camera
  - Show camera viewport rectangle
  - Toggle expand/collapse
  - Player territory colors overlay
- **Acceptance**: Functional minimap for quick navigation
- **Estimate**: 6 hours

---

### Phase 2: Villager Life Simulation (Stories 6-10)

#### Story 6: Villager Stamina & Rest System
**Priority: HIGH**
- **Tasks**:
  - Add stamina property (0-100) to Villager entity
  - Stamina drains during movement and work
  - Stamina regenerates during rest/sleep
  - Villagers seek rest when stamina < 20
  - Sitting/resting animation state
  - Visual indicator (health bar above villager)
- **Acceptance**: Villagers rest when tired, stamina visible
- **Estimate**: 5 hours

#### Story 7: Villager Social Interactions
**Priority: MEDIUM**
- **Tasks**:
  - Proximity detection for nearby villagers
  - "Chat" state when 2-3 villagers near each other
  - Small speech bubble icons during chat
  - Social interaction affects happiness
  - Villagers prefer to chat with same-player villagers
  - Duration and cooldown timers
- **Acceptance**: Villagers group up and chat with visual feedback
- **Estimate**: 6 hours

#### Story 8: Villager Needs System (Hunger)
**Priority: HIGH**
- **Tasks**:
  - Add hunger property (0-100) to Villager entity
  - Hunger increases over time
  - Villagers seek food when hunger > 70
  - Death if hunger reaches 100
  - Visual hunger indicator
  - Food consumption reduces hunger
- **Acceptance**: Villagers have hunger cycle, seek food to survive
- **Estimate**: 5 hours

#### Story 9: Villager Jobs & Roles
**Priority: MEDIUM**
- **Tasks**:
  - Job types: Idle, Farmer, Builder, Breeder, Worshipper
  - Job assignment algorithm (auto or manual)
  - Job-specific behaviors and destinations
  - Visual differentiation (color tint, icon)
  - Job efficiency based on belief strength
  - Job switching based on needs
- **Acceptance**: Villagers assigned jobs with specific behaviors
- **Estimate**: 8 hours

#### Story 10: Villager Reproduction System
**Priority: MEDIUM**
- **Tasks**:
  - Breeder villagers seek mates
  - Pregnancy state (duration: 2 minutes)
  - Birth spawns new villager near temple
  - Population cap per temple (20 villagers per temple level)
  - Population growth affects belief generation
  - Birth celebrations (villagers gather)
- **Acceptance**: Villagers reproduce, population grows organically
- **Estimate**: 6 hours

---

### Phase 3: Belief & Conversion Mechanics (Stories 11-15)

#### Story 11: Integrate BeliefSystem with Game Loop
**Priority: CRITICAL**
- **Tasks**:
  - Connect BeliefSystem to villager worshippers
  - Calculate worship generation per frame
  - Update player belief points in real-time
  - Display belief changes in UI
  - Save/load belief data from DB
  - Test belief decay and modifiers
- **Acceptance**: Villagers generate belief, UI updates correctly
- **Estimate**: 4 hours

#### Story 12: Prayer Animation & Behavior
**Priority: HIGH**
- **Tasks**:
  - Worshipper villagers walk to temple
  - Prayer animation state (hands up)
  - Prayer circle visual at temple
  - Belief points float up from praying villagers
  - Prayer duration and cooldown
  - More devoted = more frequent prayers
- **Acceptance**: Visual prayer system generating belief points
- **Estimate**: 6 hours

#### Story 13: Miracles & Spell Casting
**Priority: HIGH**
- **Tasks**:
  - Spell selection UI panel (bottom-left)
  - Spells: Heal, Lightning, Food Rain, Shield
  - BP cost for each spell
  - Target selection (click location)
  - Spell visual effects (particles, animations)
  - Villagers witness miracles → belief change
  - Spell cooldowns
- **Acceptance**: 4 working miracles with visual feedback
- **Estimate**: 12 hours

#### Story 14: Miracle Witnessing & Conversion
**Priority: HIGH**
- **Tasks**:
  - Witness radius for each miracle type
  - Calculate belief change based on proximity
  - Conversion threshold checks (20% influenced, 80% devoted)
  - Villager color changes when converted
  - Conversion events logged to DB
  - Conversion notifications in UI
  - Enemy villagers can be converted
- **Acceptance**: Miracles convert nearby villagers, visible in game
- **Estimate**: 8 hours

#### Story 15: Territory & Influence Visualization
**Priority: MEDIUM**
- **Tasks**:
  - Calculate influence radius per temple
  - Colored overlay showing territory control
  - Gradient from center (strong) to edge (weak)
  - Real-time updates as villagers convert
  - Toggle territory view on/off (T key)
  - Territory affects miracle effectiveness
- **Acceptance**: Visual territory system showing player control
- **Estimate**: 7 hours

---

### Phase 4: World Environment (Stories 16-20)

#### Story 16: Trees & Forests
**Priority: MEDIUM**
- **Tasks**:
  - Tree entity class with position and health
  - Procedural forest generation on grassland
  - Trees render as small sprites/circles
  - Trees block movement (update pathfinding)
  - Trees can be destroyed (lightning, fire)
  - Harvesting trees gives wood resource
- **Acceptance**: Forests on map, trees block movement
- **Estimate**: 6 hours

#### Story 17: Animals (Pigs, Chickens)
**Priority: MEDIUM**
- **Tasks**:
  - Animal entity base class
  - Pig entity: slow, provides food when sacrificed
  - Chicken entity: fast, lays eggs (food)
  - Animal wandering AI (simpler than villagers)
  - Animals spawn near grassland
  - Animals can be herded by villagers
  - Animal rendering (batch system)
- **Acceptance**: Pigs and chickens roam the map
- **Estimate**: 8 hours

#### Story 18: Predators (Wolves & Wolf Packs)
**Priority: LOW
- **Tasks**:
  - Wolf entity: hostile to villagers and animals
  - Pack behavior (2-4 wolves move together)
  - Chase and attack villagers
  - Wolves can be killed by lightning miracle
  - Wolf attacks reduce villager population
  - Wolves spawn in mountains/forests
  - Defense mechanics
- **Acceptance**: Wolf packs threaten villagers, can be defeated
- **Estimate**: 10 hours

#### Story 19: Food System & Storage
**Priority: HIGH**
- **Tasks**:
  - Food resource property per temple
  - Food sources: animals, crops (future), miracles
  - Storage building near temple
  - Farmers gather food
  - Food consumption per villager per day
  - Starvation if food runs out
  - Food display in UI
- **Acceptance**: Complete food economy, villagers don't starve
- **Estimate**: 8 hours

#### Story 20: Water Shader & Visual Effects
**Priority: LOW**
- **Tasks**:
  - Water tiles use shader for animated waves
  - Reflection effect (shimmer)
  - Foam at water edges
  - Different water depths (light to dark blue)
  - Performance testing with shader
  - Fallback to static water if FPS drops
- **Acceptance**: Beautiful animated water, maintains 60fps
- **Estimate**: 6 hours

---

## Summary

**Total Estimate**: ~127 hours (3-4 weeks full-time)

**Critical Path**:
1. Fix temple rendering (Story 1)
2. Integrate belief system (Story 11)
3. Villager stamina & needs (Stories 6, 8)
4. Miracles & conversion (Stories 13, 14)
5. Food system (Story 19)

**MVP Features** (Stories 1-14):
- Working temple/villager visibility
- UI (menus, status bar)
- Villager life simulation
- Belief and conversion mechanics
- Basic miracle casting

**Polish Features** (Stories 15-20):
- Territory visualization
- Environmental elements (trees, animals)
- Advanced effects (water shader)

---

## Post-Story Backlog (Future)

### Creature System
- Creature entity (ape creature like B&W)
- Creature AI and learning
- Creature miracles and actions
- Creature leash mechanic
- Creature teaching system

### Buildings
- House construction
- Workshop buildings
- Wonder structures
- Building upgrade system

### Advanced Gameplay
- AI opponent decision-making
- Multiplayer sync
- Campaign/story mode
- Achievements system
- Sound & music

### Performance
- Web Worker for AI calculations
- Level of detail (LOD) system
- Occlusion culling
- Memory optimization

---

## Branch Strategy

- **Layer 6** (current): Belief & ownership core
- **Layer 7**: UI systems (Stories 1-5)
- **Layer 8**: Villager simulation (Stories 6-10)
- **Layer 9**: Belief mechanics (Stories 11-15)
- **Layer 10**: World environment (Stories 16-20)

Each layer merges to main when complete and stable.
