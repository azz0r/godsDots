import React, { createContext, useContext, useRef, useCallback, useState } from 'react'

const GameLoopContext = createContext(null)

/**
 * GameLoopContext manages the main game loop, timing, and FPS tracking
 * Separates timing concerns from game logic
 */
export const GameLoopProvider = ({ children }) => {
  const animationFrameRef = useRef(null)
  const gameTimeRef = useRef(0)
  const lastFrameTimeRef = useRef(0)
  const fpsRef = useRef({ frames: 0, lastTime: 0, current: 60 })

  const [isRunning, setIsRunning] = useState(false)
  const [fps, setFps] = useState(60)

  // Callback registries
  const updateCallbacksRef = useRef(new Set())
  const renderCallbacksRef = useRef(new Set())

  /**
   * Register an update callback
   * Returns unregister function
   */
  const registerUpdateCallback = useCallback((callback) => {
    updateCallbacksRef.current.add(callback)
    return () => updateCallbacksRef.current.delete(callback)
  }, [])

  /**
   * Register a render callback
   * Returns unregister function
   */
  const registerRenderCallback = useCallback((callback) => {
    renderCallbacksRef.current.add(callback)
    return () => renderCallbacksRef.current.delete(callback)
  }, [])

  /**
   * Main game loop
   */
  const gameLoop = useCallback((currentTime) => {
    const deltaTime = currentTime - lastFrameTimeRef.current
    lastFrameTimeRef.current = currentTime

    // Update FPS counter
    fpsRef.current.frames++
    if (currentTime - fpsRef.current.lastTime > 1000) {
      const newFps = fpsRef.current.frames
      fpsRef.current.current = newFps
      fpsRef.current.frames = 0
      fpsRef.current.lastTime = currentTime
      setFps(newFps)
    }

    // Increment game time
    gameTimeRef.current++

    // Call all update callbacks
    updateCallbacksRef.current.forEach(callback => {
      try {
        callback(currentTime, deltaTime, gameTimeRef.current)
      } catch (error) {
        console.error('Error in update callback:', error)
      }
    })

    // Call all render callbacks
    renderCallbacksRef.current.forEach(callback => {
      try {
        callback(currentTime, deltaTime, gameTimeRef.current)
      } catch (error) {
        console.error('Error in render callback:', error)
      }
    })

    // Schedule next frame
    if (isRunning) {
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isRunning])

  /**
   * Start the game loop
   */
  const start = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true)
      lastFrameTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isRunning, gameLoop])

  /**
   * Stop the game loop
   */
  const stop = useCallback(() => {
    setIsRunning(false)
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  /**
   * Pause the game loop
   */
  const pause = useCallback(() => {
    setIsRunning(false)
  }, [])

  /**
   * Resume the game loop
   */
  const resume = useCallback(() => {
    if (!isRunning) {
      setIsRunning(true)
      lastFrameTimeRef.current = performance.now()
      animationFrameRef.current = requestAnimationFrame(gameLoop)
    }
  }, [isRunning, gameLoop])

  /**
   * Reset game time
   */
  const resetTime = useCallback(() => {
    gameTimeRef.current = 0
  }, [])

  /**
   * Get current FPS
   */
  const getFPS = useCallback(() => {
    return fpsRef.current.current
  }, [])

  /**
   * Get current game time
   */
  const getGameTime = useCallback(() => {
    return gameTimeRef.current
  }, [])

  const value = {
    isRunning,
    fps,
    start,
    stop,
    pause,
    resume,
    resetTime,
    getFPS,
    getGameTime,
    registerUpdateCallback,
    registerRenderCallback,
    gameTimeRef,
    fpsRef
  }

  return (
    <GameLoopContext.Provider value={value}>
      {children}
    </GameLoopContext.Provider>
  )
}

export const useGameLoop = () => {
  const context = useContext(GameLoopContext)
  if (!context) {
    throw new Error('useGameLoop must be used within a GameLoopProvider')
  }
  return context
}
