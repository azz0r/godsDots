import React, { useCallback, useEffect, useRef } from 'react'
import styles from '../styles/GameCanvas.module.css'
import { usePixelPerfectMovement } from '../hooks/usePixelPerfectMovement'

const GameCanvas = ({ canvasRef, gameStateRef, selectedPower, usePower, onVillagerSelect, onVillagerCommand, showPaths, showLandBorders, hoveredEntity, gestureRecognizer, miracleSystem, onGestureStart, onGestureUpdate, onGestureComplete }) => {
  const pixelPerfect = usePixelPerfectMovement()
  const eventHandlersRef = useRef({})
  const lastClickTimeRef = useRef(0)
  const DOUBLE_CLICK_DELAY = 300 // milliseconds
  const gestureStartRef = useRef(null)

  // Create event handlers that will be attached natively
  useEffect(() => {
    eventHandlersRef.current.handleMouseDown = (e) => {
      const game = gameStateRef.current
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top
      
      // Convert to world coordinates
      const worldX = clickX / game.camera.zoom + game.camera.x
      const worldY = clickY / game.camera.zoom + game.camera.y
      
      // Check for gesture mode (Ctrl + left click)
      if (e.ctrlKey && e.button === 0 && gestureRecognizer && miracleSystem) {
        gestureStartRef.current = { x: worldX, y: worldY }
        gestureRecognizer.startRecording(worldX, worldY)
        miracleSystem.startCasting(null, worldX, worldY)
        if (onGestureStart) {
          onGestureStart(worldX, worldY)
        }
        return
      }
      
      // Check for double-click
      const currentTime = Date.now()
      if (currentTime - lastClickTimeRef.current < DOUBLE_CLICK_DELAY) {
        // Double-click detected - zoom to clicked point
        const worldSize = game.worldSize || { width: 1600, height: 1600 } // 50 * 32
        pixelPerfect.handleDoubleClickZoom(
          game.camera,
          clickX,
          clickY,
          canvas.width,
          canvas.height,
          worldSize.width,
          worldSize.height
        )
        lastClickTimeRef.current = 0 // Reset to prevent triple-click
        return
      }
      lastClickTimeRef.current = currentTime
      
      // Store selection start position
      game.mouse.selectionStart = {
        x: clickX,
        y: clickY
      }
      
      game.mouse.down = true
      game.mouse.lastX = e.clientX
      game.mouse.lastY = e.clientY
    }

    eventHandlersRef.current.handleMouseUp = (e) => {
      const game = gameStateRef.current
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Convert to world coordinates
      const worldX = mouseX / game.camera.zoom + game.camera.x
      const worldY = mouseY / game.camera.zoom + game.camera.y
      
      // Check if we were drawing a gesture
      if (gestureStartRef.current && gestureRecognizer) {
        const gestureResult = gestureRecognizer.stopRecording()
        if (gestureResult && miracleSystem) {
          if (onGestureComplete) {
            onGestureComplete(gestureResult, worldX, worldY)
          }
        }
        gestureStartRef.current = null
        return
      }
      
      if (game.mouse.down) {
        // Check if this was a click or drag
        const dragDistance = Math.sqrt(
          Math.pow(mouseX - game.mouse.selectionStart.x, 2) +
          Math.pow(mouseY - game.mouse.selectionStart.y, 2)
        )
        
        if (selectedPower) {
          // Use power
          usePower(worldX, worldY)
        } else if (dragDistance < 5) {
          // Click - check for villager selection or command
          if (e.button === 0) { // Left click
            if (onVillagerSelect) {
              onVillagerSelect(worldX, worldY, e.shiftKey)
            }
          } else if (e.button === 2) { // Right click
            if (onVillagerCommand) {
              onVillagerCommand(worldX, worldY)
            }
          }
        } else {
          // Drag selection
          if (onVillagerSelect && !selectedPower) {
            const startWorldX = game.mouse.selectionStart.x / game.camera.zoom + game.camera.x
            const startWorldY = game.mouse.selectionStart.y / game.camera.zoom + game.camera.y
            onVillagerSelect(startWorldX, startWorldY, worldX, worldY, true)
          }
        }
      }
      
      game.mouse.down = false
      game.mouse.selectionBox = null
    }

    eventHandlersRef.current.handleMouseMove = (e) => {
      const game = gameStateRef.current
      const canvas = canvasRef.current
      if (!canvas) return
      
      const rect = canvas.getBoundingClientRect()
      game.mouse.x = e.clientX - rect.left
      game.mouse.y = e.clientY - rect.top
      
      // Convert to world coordinates
      const worldX = game.mouse.x / game.camera.zoom + game.camera.x
      const worldY = game.mouse.y / game.camera.zoom + game.camera.y
      
      // If drawing a gesture, record the point
      if (gestureStartRef.current && gestureRecognizer) {
        gestureRecognizer.recordPoint(worldX, worldY)
        if (miracleSystem) {
          miracleSystem.updateCasting(worldX, worldY)
        }
        if (onGestureUpdate) {
          onGestureUpdate(worldX, worldY)
        }
        return
      }
      
      if (game.mouse.down && !selectedPower) {
        const dragDistance = Math.sqrt(
          Math.pow(game.mouse.x - game.mouse.selectionStart.x, 2) +
          Math.pow(game.mouse.y - game.mouse.selectionStart.y, 2)
        )
        
        if (dragDistance > 5) {
          // Update selection box
          game.mouse.selectionBox = {
            startX: game.mouse.selectionStart.x,
            startY: game.mouse.selectionStart.y,
            endX: game.mouse.x,
            endY: game.mouse.y
          }
        } else {
          // Camera panning
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
      }
      
      game.mouse.lastX = e.clientX
      game.mouse.lastY = e.clientY
    }

    eventHandlersRef.current.handleWheel = (e) => {
      e.preventDefault()
      const game = gameStateRef.current
      const canvas = canvasRef.current
      const rect = canvas.getBoundingClientRect()
      
      // Get mouse position relative to canvas
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      // Normalize wheel delta for consistent zoom speed across browsers/devices
      const delta = e.deltaY || e.wheelDelta || -e.detail
      const zoomDirection = delta > 0 ? -1 : 1
      
      pixelPerfect.setPixelPerfectZoom(
        game.camera, 
        zoomDirection, 
        mouseX, 
        mouseY, 
        canvas.width, 
        canvas.height,
        Math.abs(delta)
      )
    }
    
    eventHandlersRef.current.handleKeyDown = (e) => {
      const game = gameStateRef.current
      const canvas = canvasRef.current
      
      // Zoom with + and - keys (including numpad)
      if (e.key === '+' || e.key === '=' || e.key === 'Add') {
        e.preventDefault()
        pixelPerfect.setPixelPerfectZoom(
          game.camera,
          1,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width,
          canvas.height,
          100
        )
      } else if (e.key === '-' || e.key === '_' || e.key === 'Subtract') {
        e.preventDefault()
        pixelPerfect.setPixelPerfectZoom(
          game.camera,
          -1,
          canvas.width / 2,
          canvas.height / 2,
          canvas.width,
          canvas.height,
          100
        )
      }
    }
    
    eventHandlersRef.current.handleContextMenu = (e) => {
      e.preventDefault() // Prevent context menu
    }
  }, [canvasRef, gameStateRef, selectedPower, usePower, pixelPerfect, onVillagerSelect, onVillagerCommand])

  // Set up canvas and event listeners
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    // Store display settings on canvas for render functions to access
    canvas.showPaths = showPaths
    canvas.showLandBorders = showLandBorders

    // Configure pixel-perfect rendering
    const ctx = canvas.getContext('2d')
    pixelPerfect.configureCanvasPixelPerfect(ctx)

    // Add event listeners with proper options
    canvas.addEventListener('mousedown', eventHandlersRef.current.handleMouseDown)
    canvas.addEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
    canvas.addEventListener('mousemove', eventHandlersRef.current.handleMouseMove)
    canvas.addEventListener('wheel', eventHandlersRef.current.handleWheel, { passive: false })
    canvas.addEventListener('contextmenu', eventHandlersRef.current.handleContextMenu)

    // Also add global mouseup to handle when mouse is released outside canvas
    document.addEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
    
    // Add keyboard controls
    document.addEventListener('keydown', eventHandlersRef.current.handleKeyDown)

    // Cleanup
    return () => {
      canvas.removeEventListener('mousedown', eventHandlersRef.current.handleMouseDown)
      canvas.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
      canvas.removeEventListener('mousemove', eventHandlersRef.current.handleMouseMove)
      canvas.removeEventListener('wheel', eventHandlersRef.current.handleWheel)
      canvas.removeEventListener('contextmenu', eventHandlersRef.current.handleContextMenu)
      document.removeEventListener('mouseup', eventHandlersRef.current.handleMouseUp)
      document.removeEventListener('keydown', eventHandlersRef.current.handleKeyDown)
    }
  }, [canvasRef, pixelPerfect, showPaths, showLandBorders])

  // Determine cursor style
  let cursorClass = styles.grab
  if (selectedPower) {
    cursorClass = styles.crosshair
  } else if (hoveredEntity) {
    cursorClass = styles.pointer
  }
  
  return (
    <canvas
      ref={canvasRef}
      className={`${styles.gameCanvas} ${cursorClass}`}
      width={1200}
      height={800}
      style={{ imageRendering: 'pixelated' }}
    />
  )
}

export default GameCanvas