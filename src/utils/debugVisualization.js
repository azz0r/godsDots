/**
 * Debug visualization to verify terrain and resource alignment
 */
export function renderDebugGrid(ctx, camera, worldSize) {
  ctx.save()
  
  // Draw grid lines to visualize tile boundaries
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
  ctx.lineWidth = 1
  
  const tileSize = 40
  const startX = Math.floor(camera.x / tileSize) * tileSize
  const startY = Math.floor(camera.y / tileSize) * tileSize
  const endX = Math.min(worldSize.width, camera.x + camera.width / camera.zoom)
  const endY = Math.min(worldSize.height, camera.y + camera.height / camera.zoom)
  
  // Vertical lines
  for (let x = startX; x <= endX; x += tileSize) {
    ctx.beginPath()
    ctx.moveTo(x, startY)
    ctx.lineTo(x, endY)
    ctx.stroke()
  }
  
  // Horizontal lines
  for (let y = startY; y <= endY; y += tileSize) {
    ctx.beginPath()
    ctx.moveTo(startX, y)
    ctx.lineTo(endX, y)
    ctx.stroke()
  }
  
  // Draw coordinate labels at tile corners
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.font = '10px monospace'
  
  for (let x = startX; x <= endX; x += tileSize * 4) {
    for (let y = startY; y <= endY; y += tileSize * 4) {
      ctx.fillText(`${x},${y}`, x + 2, y + 12)
    }
  }
  
  ctx.restore()
}

/**
 * Highlight resource positions to verify they align with terrain
 */
export function highlightResourcePositions(ctx, resources) {
  ctx.save()
  
  resources.forEach(resource => {
    // Draw a small cross at the exact resource position
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.8)'
    ctx.lineWidth = 2
    
    const x = resource.x
    const y = resource.y
    
    ctx.beginPath()
    ctx.moveTo(x - 5, y)
    ctx.lineTo(x + 5, y)
    ctx.moveTo(x, y - 5)
    ctx.lineTo(x, y + 5)
    ctx.stroke()
    
    // Draw the tile boundary this resource belongs to
    const tileX = Math.floor(x / 40) * 40
    const tileY = Math.floor(y / 40) * 40
    
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.3)'
    ctx.strokeRect(tileX, tileY, 40, 40)
  })
  
  ctx.restore()
}