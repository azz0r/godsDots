/**
 * VillagerAnimationSystem.js - Manages animation states and smooth transitions
 */

export class VillagerAnimationSystem {
  constructor() {
    // Animation state definitions
    this.animationStates = {
      idle: {
        priority: 0,
        loop: true,
        transitions: ['walking', 'working', 'fleeing', 'celebrating'],
        blendTime: 200
      },
      walking: {
        priority: 1,
        loop: true,
        transitions: ['idle', 'running', 'working'],
        blendTime: 150
      },
      running: {
        priority: 2,
        loop: true,
        transitions: ['walking', 'idle'],
        blendTime: 100
      },
      working: {
        priority: 3,
        loop: true,
        transitions: ['idle', 'walking'],
        blendTime: 300
      },
      fleeing: {
        priority: 4,
        loop: true,
        transitions: ['running', 'walking', 'idle'],
        blendTime: 50
      },
      celebrating: {
        priority: 1,
        loop: false,
        duration: 2000,
        transitions: ['idle'],
        blendTime: 200
      },
      sleeping: {
        priority: 0,
        loop: true,
        transitions: ['idle'],
        blendTime: 500
      }
    }
    
    // Track animation states for each villager
    this.villagerStates = new Map()
    
    // Animation timing
    this.lastUpdateTime = 0
  }
  
  /**
   * Initialize or get animation state for a villager
   */
  getVillagerAnimationState(villagerId) {
    if (!this.villagerStates.has(villagerId)) {
      this.villagerStates.set(villagerId, {
        current: 'idle',
        previous: null,
        transitionProgress: 1,
        stateTime: 0,
        animationSpeed: 1,
        customData: {}
      })
    }
    return this.villagerStates.get(villagerId)
  }
  
  /**
   * Update animation state for a villager
   */
  updateVillagerAnimation(villager, deltaTime) {
    const state = this.getVillagerAnimationState(villager.id)
    
    // Update state time
    state.stateTime += deltaTime * state.animationSpeed
    
    // Determine desired animation based on villager state
    const desiredAnimation = this.determineAnimation(villager)
    
    // Handle state transitions
    if (desiredAnimation !== state.current) {
      this.transitionToState(villager.id, desiredAnimation)
    }
    
    // Update transition progress
    if (state.transitionProgress < 1) {
      const transitionSpeed = 1000 / this.animationStates[state.current].blendTime
      state.transitionProgress = Math.min(1, state.transitionProgress + deltaTime * transitionSpeed)
    }
    
    // Update animation-specific data
    this.updateAnimationData(villager, state, deltaTime)
    
    return state
  }
  
  /**
   * Determine which animation should be playing based on villager state
   */
  determineAnimation(villager) {
    // Fleeing takes priority
    if (villager.state === 'fleeing') {
      return 'fleeing'
    }
    
    // Working animation
    if (villager.state === 'working' && villager.task) {
      return 'working'
    }
    
    // Movement-based animations
    const speed = Math.sqrt(villager.vx * villager.vx + villager.vy * villager.vy)
    if (speed > 1.5) {
      return 'running'
    } else if (speed > 0.2) {
      return 'walking'
    }
    
    // Special states
    if (villager.happiness > 80 && Math.random() < 0.001) {
      return 'celebrating'
    }
    
    if (villager.energy !== undefined && villager.energy < 20) {
      return 'sleeping'
    }
    
    // Default to idle
    return 'idle'
  }
  
  /**
   * Transition to a new animation state
   */
  transitionToState(villagerId, newState) {
    const state = this.getVillagerAnimationState(villagerId)
    const currentDef = this.animationStates[state.current]
    
    // Check if transition is allowed
    if (!currentDef.transitions.includes(newState)) {
      // Force transition through idle if needed
      if (state.current !== 'idle') {
        this.transitionToState(villagerId, 'idle')
      }
      return
    }
    
    // Start transition
    state.previous = state.current
    state.current = newState
    state.transitionProgress = 0
    state.stateTime = 0
    
    // Adjust animation speed based on state
    switch (newState) {
      case 'running':
        state.animationSpeed = 1.5
        break
      case 'fleeing':
        state.animationSpeed = 2.0
        break
      case 'sleeping':
        state.animationSpeed = 0.5
        break
      default:
        state.animationSpeed = 1.0
    }
  }
  
  /**
   * Update animation-specific data
   */
  updateAnimationData(villager, state, deltaTime) {
    switch (state.current) {
      case 'idle':
        // Breathing cycle
        state.customData.breathPhase = (state.stateTime % 3000) / 3000
        
        // Occasional fidgeting
        if (Math.random() < 0.001) {
          state.customData.fidgetTime = 500
          state.customData.fidgetType = Math.random() < 0.5 ? 'shift' : 'scratch'
        }
        
        if (state.customData.fidgetTime > 0) {
          state.customData.fidgetTime -= deltaTime
        }
        break
        
      case 'walking':
      case 'running':
        // Gait cycle
        const cycleSpeed = state.current === 'running' ? 400 : 600
        state.customData.gaitPhase = (state.stateTime % cycleSpeed) / cycleSpeed
        
        // Bob amount based on speed
        const speed = Math.sqrt(villager.vx * villager.vx + villager.vy * villager.vy)
        state.customData.bobAmount = Math.min(2, speed * 0.5)
        break
        
      case 'working':
        // Work cycle with different phases
        const workCycle = 1200
        state.customData.workPhase = (state.stateTime % workCycle) / workCycle
        
        // Different work types
        if (!state.customData.workType) {
          state.customData.workType = this.determineWorkType(villager.task)
        }
        break
        
      case 'celebrating':
        // Jump and spin
        state.customData.jumpPhase = Math.sin(state.stateTime * 0.008) * 0.5 + 0.5
        state.customData.spinAngle = (state.stateTime * 0.3) % 360
        break
        
      case 'sleeping':
        // Gentle breathing
        state.customData.breathPhase = (state.stateTime % 4000) / 4000
        state.customData.zCount = Math.floor(state.stateTime / 1000) % 3 + 1
        break
    }
  }
  
  /**
   * Determine work animation type based on task
   */
  determineWorkType(task) {
    if (!task) return 'generic'
    
    if (task.includes('build') || task.includes('construct')) return 'hammering'
    if (task.includes('farm') || task.includes('harvest')) return 'farming'
    if (task.includes('mine') || task.includes('gather')) return 'mining'
    if (task.includes('pray') || task.includes('worship')) return 'praying'
    
    return 'generic'
  }
  
  /**
   * Get blended animation values for smooth transitions
   */
  getBlendedAnimationValues(villagerId) {
    const state = this.getVillagerAnimationState(villagerId)
    
    if (state.transitionProgress >= 1 || !state.previous) {
      return {
        state: state.current,
        stateData: state.customData,
        blend: 1
      }
    }
    
    // Return blend information for renderer
    return {
      currentState: state.current,
      previousState: state.previous,
      blend: state.transitionProgress,
      currentData: state.customData,
      previousData: {} // Could store previous state data if needed
    }
  }
  
  /**
   * Apply physics-based secondary animation
   */
  applySecondaryAnimation(villager, state, deltaTime) {
    // Hair/clothing physics
    if (!villager.physics) {
      villager.physics = {
        hairOffset: { x: 0, y: 0 },
        clothOffset: { x: 0, y: 0 }
      }
    }
    
    // Apply velocity-based offsets
    const dampening = 0.9
    villager.physics.hairOffset.x += villager.vx * 0.5
    villager.physics.hairOffset.y += villager.vy * 0.5
    villager.physics.hairOffset.x *= dampening
    villager.physics.hairOffset.y *= dampening
    
    // Limit offsets
    const maxOffset = 3
    villager.physics.hairOffset.x = Math.max(-maxOffset, Math.min(maxOffset, villager.physics.hairOffset.x))
    villager.physics.hairOffset.y = Math.max(-maxOffset, Math.min(maxOffset, villager.physics.hairOffset.y))
  }
  
  /**
   * Handle special animation events
   */
  handleAnimationEvents(villager, state) {
    // Trigger events at specific points in animations
    switch (state.current) {
      case 'working':
        // Tool impact on specific frames
        if (state.customData.workType === 'hammering') {
          const impactFrame = 0.6
          const previousPhase = (state.stateTime - 16) % 1200 / 1200
          const currentPhase = state.customData.workPhase
          
          if (previousPhase < impactFrame && currentPhase >= impactFrame) {
            // Trigger hammer impact effect
            if (villager.onWorkImpact) {
              villager.onWorkImpact('hammer')
            }
          }
        }
        break
        
      case 'celebrating':
        // Confetti at peak of jump
        if (state.customData.jumpPhase > 0.9 && !state.customData.confettiTriggered) {
          state.customData.confettiTriggered = true
          if (villager.onCelebrate) {
            villager.onCelebrate()
          }
        }
        break
    }
  }
  
  /**
   * Update all villagers in batch
   */
  updateAll(villagers, currentTime) {
    const deltaTime = currentTime - this.lastUpdateTime
    this.lastUpdateTime = currentTime
    
    villagers.forEach(villager => {
      const state = this.updateVillagerAnimation(villager, deltaTime)
      this.applySecondaryAnimation(villager, state, deltaTime)
      this.handleAnimationEvents(villager, state)
    })
  }
  
  /**
   * Get animation state for rendering
   */
  getAnimationRenderData(villager) {
    const state = this.getVillagerAnimationState(villager.id)
    const blended = this.getBlendedAnimationValues(villager.id)
    
    return {
      animation: state.current,
      animationTime: state.stateTime,
      animationSpeed: state.animationSpeed,
      customData: state.customData,
      physics: villager.physics || {},
      blendData: blended
    }
  }
  
  /**
   * Clean up animation state for removed villagers
   */
  cleanup(villagerIds) {
    const currentIds = new Set(villagerIds)
    
    // Remove states for villagers that no longer exist
    for (const [id] of this.villagerStates) {
      if (!currentIds.has(id)) {
        this.villagerStates.delete(id)
      }
    }
  }
}

// Export singleton instance
export const villagerAnimationSystem = new VillagerAnimationSystem()