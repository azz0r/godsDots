import React, { useCallback, useEffect, useRef } from 'react'
import styles from '../styles/GameCanvas.module.css'
import { usePixelPerfectMovement } from '../hooks/usePixelPerfectMovement'

const GameCanvas = ({ canvasRef, gameStateRef, selectedPower, usePower }) => {
  const pixelPerfect = usePixelPerfectMovement()
  const eventHandlersRef = useRef({})

  // Create event handlers that will be attached natively
  useEffect(() => {
    eventHandlersRef.current.handleMouseDown = (e) => {
      const game = gameStateRef.current
      game.mouse.down = true
      game.mouse.lastX = e.clientX
      game.mouse.lastY = e.clientY
    }

    eventHandlersRef.current.handleMouseUp = (e) => {
      const game = gameStateRef.current
      
      if (game.mouse.down && selectedPower) {
        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const worldX = (e.clientX - rect.left) / game.camera.zoom + game.camera.x
        const worldY = (e.clientY - rect.top) / game.camera.zoom + game.camera.y
        usePower(worldX, worldY)
      }
      
      game.mouse.down = false
    }

    eventHandlersRef.current.handleMouseMove = (e) => {
      const game = gameStateRef.current
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      game.mouse.x = e.clientX - rect.left
      game.mouse.y = e.clientY - rect.top
      
      if (game.mouse.down && !selectedPower) {
        const deltaX = e.clientX - game.mouse.lastX
        const deltaY = e.clientY - game.mouse.lastY
        
        // Pixel-perfect camera movement
        const sensitivity = 1.0
        const cameraDeltaX = (deltaX / game.camera.zoom) * sensitivity
        const cameraDeltaY = (deltaY / game.camera.zoom) * sensitivity
        
        // Align camera movement to pixels
        game.camera.x = pixelPerfect.alignToPixel(game.camera.x - cameraDeltaX)
        game.camera.y = pixelPerfect.alignToPixel(game.camera.y - cameraDeltaY)
        
        // Constrain camera with pixel alignment
        const maxCameraX = game.worldSize.width - canvas.width / game.camera.zoom
        const maxCameraY = game.worldSize.height - canvas.height / game.camera.zoom
        game.camera.x = pixelPerfect.alignToPixel(Math.max(0, Math.min(maxCameraX, game.camera.x)))
        game.camera.y = pixelPerfect.alignToPixel(Math.max(0, Math.min(maxCameraY, game.camera.y)))
      }
      
      game.mouse.lastX = e.clientX
      game.mouse.lastY = e.clientY
    }

    eventHandlersRef.current.handleWheel = (e) => {
      e.preventDefault()
      const game = gameStateRef.current
      const zoomDirection = e.deltaY > 0 ? -1 : 1
      pixelPerfect.setPixelPerfectZoom(game.camera, zoomDirection)
    }
  }, [canvasRef, gameStateRef, selectedPower, usePower, pixelPerfect])

  // Set up canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Configure pixel-perfect rendering
    const ctx = canvas.getContext('2d')
    pixelPerfect.configureCanvasPixelPerfect(ctx)

    // Add event listeners with proper options
    canvas.addEventListener('mousedown', eventHandlersRef.current.handleMouseDown)
    canvas.addEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
    canvas.addEventListener('mousemove', eventHandlersRef.current.handleMouseMove)
    canvas.addEventListener('wheel', eventHandlersRef.current.handleWheel, { passive: false })

    // Also add global mouseup to handle when mouse is released outside canvas
    document.addEventListener('mouseup', eventHandlersRef.current.handleMouseUp)

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', eventHandlersRef.current.handleMouseDown)
      canvas.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
      canvas.removeEventListener('mousemove', eventHandlersRef.current.handleMouseMove)
      canvas.removeEventListener('wheel', eventHandlersRef.current.handleWheel)
      document.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
    }
  }, [canvasRef, pixelPerfect])

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.gameCanvas} ${selectedPower ? styles.crosshair : styles.grab}`}
      width={1200}
      height={800}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export default GameCanvas