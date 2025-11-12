# Phaser 3 Plugins & Extensions Research

## Summary
Research into popular Phaser 3 plugins, libraries, and extensions for potential use in God Dots.

## Currently NOT Using
We are currently running Phaser 3 with minimal plugins/extensions. We should consider adding:

---

## 🔥 Most Popular & Recommended

### 1. **RexRainbow Phaser 3 Plugins** ⭐⭐⭐⭐⭐
**Source**: https://github.com/rexrainbow/phaser3-rex-notes
**Docs**: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/

**The most comprehensive plugin collection for Phaser 3.**

**What We Should Use:**
- **UI Components**:
  - Dialog boxes (for game messages, confirmations)
  - Buttons (for power selection, menus)
  - Text boxes (for input, chat)
  - Color pickers (for customization)
  - Grid tables (for stats displays)
  - Drop-down lists (for settings)

- **BBCode Text**: Rich text formatting with `[b]bold[/b]`, `[color=red]colored[/color]` text
  - Perfect for: Miracle descriptions, tutorial text, flavor text

- **Board System**: Hexagonal/square grid board with chess-like pieces
  - Not needed (we have our own terrain/pathfinding)

- **Finite State Machines**: For AI and game state management
  - **RECOMMENDED**: Could simplify our AI opponent logic

- **Firebase Integration**: For multiplayer/leaderboards
  - **RECOMMENDED**: For future multiplayer features

**Installation**: `npm install phaser3-rex-plugins`

**Priority**: **HIGH** - Start with Dialog, Buttons, BBCode Text

---

### 2. **Phaser 3 NavMesh Plugin**
**Source**: https://github.com/mikewesthad/navmesh
**Last Updated**: Jan 8, 2025

**Advanced pathfinding using navigation meshes instead of A* grids.**

**What It Does:**
- Faster pathfinding than grid-based A*
- Smoother paths (not tile-locked)
- Better for complex terrain
- Handles dynamic obstacles

**Should We Use?**
- **NO** (for now) - Our current A* pathfinding works well for tile-based movement
- **MAYBE** (later) - If we add free-form movement or flying creatures

---

### 3. **Phaser 3 Input Text Plugin**
**Source**: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/ui-textbox/
**Last Updated**: Dec 28, 2024

**Native HTML input overlays on Phaser canvas.**

**What It Does:**
- Text input boxes that work on mobile
- Password fields
- Text area for multi-line input

**Should We Use?**
- **YES** - For player names, chat, naming villages
- Part of RexRainbow's UI plugins

**Priority**: **MEDIUM** - For Story 2 (Main Menu) and future features

---

### 4. **Phaser 3 Animated Tiles Plugin**
**Source**: https://github.com/nkholski/phaser-animated-tiles

**Adds support for animated tiles (water, lava, etc.).**

**What It Does:**
- Reads Tiled animation data
- Animates tilemap tiles automatically
- Perfect for water/lava effects

**Should We Use?**
- **YES** - For Story 20 (Water Shader & Visual Effects)
- Would make water tiles animated instead of static
- **LATER** - Not critical for MVP

**Priority**: **LOW** - Story 20 polish feature

---

### 5. **Phaser 3 NinePatch Plugin**
**Source**: https://github.com/orange-games/phaser3-ninepatch-plugin

**9-slice scaling for UI elements (scalable borders).**

**What It Does:**
- Scale UI panels without distorting corners
- Professional-looking windows/dialogs
- Essential for responsive UI

**Should We Use?**
- **YES** - For all UI panels (menus, dialogs, HUD)
- Industry standard for game UI

**Installation**: `npm install @orange-games/phaser3-ninepatch-plugin`

**Priority**: **HIGH** - For Story 2 (Main Menu)

---

### 6. **Phaser 3 Arcade Slopes Plugin**
**Source**: https://github.com/hexus/phaser-arcade-slopes
**Last Updated**: Nov 24, 2024

**Adds sloped collision to Arcade Physics.**

**Should We Use?**
- **NO** - We don't have slopes or platforming

---

### 7. **Phaser 3 Pathbuilder Plugin**
**Last Updated**: Nov 7, 2024

**Visual path editing at runtime (Bezier curves, splines).**

**Should We Use?**
- **NO** - Not needed for our tile-based movement

---

## 🎨 UI/UX Enhancements We Need

### From RexRainbow UI Plugins:

1. **Dialog System** - For:
   - Game start messages ("Divine Being awakens...")
   - Game end messages ("Victory! Your followers reign supreme")
   - Tutorial pop-ups
   - Confirmation dialogs ("Are you sure you want to restart?")

2. **Button Components** - For:
   - Main menu buttons
   - Power selection buttons
   - Settings buttons
   - Better than raw DOM elements

3. **BBCode Text** - For:
   - Rich tutorial text
   - Colored miracle descriptions
   - Formatted game messages

4. **Text Input** - For:
   - Player name entry
   - Save game naming
   - Multiplayer chat (future)

---

## 📦 Recommended Installation Order

### Phase 1: Core UI (Story 2 - Main Menu)
```bash
npm install phaser3-rex-plugins
npm install @orange-games/phaser3-ninepatch-plugin
```

**Use**:
- RexUI Dialog for main menu panels
- RexUI Buttons for menu buttons
- NinePatch for scalable UI backgrounds

### Phase 2: Rich Content (Story 11-14 - Miracles)
**Use**:
- RexUI BBCode Text for miracle descriptions
- RexUI Color picker for customization (later)

### Phase 3: Polish (Story 20 - Visual Effects)
```bash
npm install phaser-animated-tiles
```

**Use**:
- Animated tiles for water effects

---

## 🚫 Plugins We DON'T Need

1. **Physics Plugins** - Arcade physics built-in is sufficient
2. **Pathfinding Plugins** - Our A* implementation works well
3. **Tilemap Plugins** - We render terrain procedurally, not from Tiled
4. **Spine/DragonBones** - No animated characters yet
5. **Particle Plugins** - Phaser's built-in particles sufficient

---

## 📊 Plugin Priority Summary

| Plugin | Priority | Use Case | Install When |
|--------|----------|----------|--------------|
| RexUI (Dialog, Buttons) | **HIGH** | Main menu, game messages | Story 2 |
| RexUI (BBCode Text) | **MEDIUM** | Miracle descriptions | Story 13 |
| NinePatch | **HIGH** | Scalable UI panels | Story 2 |
| RexUI (Text Input) | **MEDIUM** | Player names, settings | Story 2 |
| RexUI (FSM) | **MEDIUM** | AI opponent logic | Layer 8 |
| Animated Tiles | **LOW** | Water effects | Story 20 |
| Firebase (Rex) | **LOW** | Multiplayer (future) | Post-MVP |

---

## 🎯 Immediate Next Steps

1. **Install RexRainbow UI Plugins** - For Story 2 (Main Menu)
2. **Install NinePatch Plugin** - For professional UI
3. **Create dialog system** - For game messages
4. **Replace DOM buttons with RexUI** - Better integration

---

## 📚 Resources

- **RexRainbow Docs**: https://rexrainbow.github.io/phaser3-rex-notes/docs/site/
- **RexRainbow Examples**: https://codepen.io/collection/XjppPN/
- **Phaser Plugins Directory**: https://phaserplugins.com/
- **Awesome Phaser List**: https://github.com/Raiper34/awesome-phaser

---

## 🔧 Integration Notes

**For RexUI:**
```javascript
import RexUIPlugin from 'phaser3-rex-plugins/templates/ui/ui-plugin.js';

// In gameConfig.js
plugins: {
  scene: [{
    key: 'rexUI',
    plugin: RexUIPlugin,
    mapping: 'rexUI'
  }]
}

// In scene
this.rexUI.add.dialog({
  title: 'Game Over',
  content: 'Victory! Your followers reign supreme.',
  buttons: ['Play Again', 'Main Menu']
});
```

**For NinePatch:**
```javascript
import NinePatchPlugin from '@orange-games/phaser3-ninepatch-plugin';

// Create scalable panel
const panel = this.add.ninePatch(x, y, 'panel', null, width, height);
```
