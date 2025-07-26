import React, { useCallback, useEffect } from 'react'
import styles from '../styles/GameCanvas.module.css'
import { usePixelPerfectMovement } from '../hooks/usePixelPerfectMovement'

const GameCanvas = ({ canvasRef, gameStateRef, selectedPower, usePower }) => {
  const pixelPerfect = usePixelPerfectMovement()
  const handleMouseDown = useCallback((e) => {
    const game = gameStateRef.current
    game.mouse.down = true
    game.mouse.lastX = e.clientX
    game.mouse.lastY = e.clientY
  }, [gameStateRef])

  const handleMouseUp = useCallback((e) => {
    const game = gameStateRef.current
    
    if (game.mouse.down && selectedPower) {
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const worldX = (e.clientX - rect.left) / game.camera.zoom + game.camera.x
      const worldY = (e.clientY - rect.top) / game.camera.zoom + game.camera.y
      usePower(worldX, worldY)
    }
    
    game.mouse.down = false
  }, [canvasRef, gameStateRef, selectedPower, usePower])

  const handleMouseMove = useCallback((e) => {
    const game = gameStateRef.current
    const rect = canvasRef.current.getBoundingClientRect()
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
      const canvas = canvasRef.current
      const maxCameraX = game.worldSize.width - canvas.width / game.camera.zoom
      const maxCameraY = game.worldSize.height - canvas.height / game.camera.zoom
      game.camera.x = pixelPerfect.alignToPixel(Math.max(0, Math.min(maxCameraX, game.camera.x)))
      game.camera.y = pixelPerfect.alignToPixel(Math.max(0, Math.min(maxCameraY, game.camera.y)))
    }
    
    game.mouse.lastX = e.clientX
    game.mouse.lastY = e.clientY
  }, [canvasRef, gameStateRef, selectedPower, pixelPerfect])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const game = gameStateRef.current
    const zoomDirection = e.deltaY > 0 ? -1 : 1
    pixelPerfect.setPixelPerfectZoom(game.camera, zoomDirection)
  }, [gameStateRef, pixelPerfect])

  // Set up canvas for pixel-perfect rendering
  useEffect(() => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      pixelPerfect.configureCanvasPixelPerfect(ctx)
    }
  }, [canvasRef, pixelPerfect])

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.gameCanvas} ${selectedPower ? styles.crosshair : styles.grab}`}
      width={1200}
      height={800}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      onWheel={handleWheel}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export default GameCanvas