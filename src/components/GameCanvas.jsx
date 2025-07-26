import React, { useCallback } from 'react'
import styles from '../styles/GameCanvas.module.css'

const GameCanvas = ({ canvasRef, gameStateRef, selectedPower, usePower }) => {
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
      
      // Smooth camera movement
      const sensitivity = 1.0 // Adjust for responsiveness
      game.camera.x -= (deltaX / game.camera.zoom) * sensitivity
      game.camera.y -= (deltaY / game.camera.zoom) * sensitivity
      
      // Constrain camera - allow some padding when zoomed out
      const canvas = canvasRef.current
      const padding = 200 // Allow 200px padding around world edges
      const maxCameraX = game.worldSize.width - canvas.width / game.camera.zoom + padding
      const maxCameraY = game.worldSize.height - canvas.height / game.camera.zoom + padding
      game.camera.x = Math.max(-padding, Math.min(maxCameraX, game.camera.x))
      game.camera.y = Math.max(-padding, Math.min(maxCameraY, game.camera.y))
    }
    
    game.mouse.lastX = e.clientX
    game.mouse.lastY = e.clientY
  }, [canvasRef, gameStateRef, selectedPower])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const game = gameStateRef.current
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    game.camera.zoom = Math.max(0.1, Math.min(3, game.camera.zoom * zoomFactor))
  }, [gameStateRef])

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
    />
  )
}

export default GameCanvas