import { useRef, useCallback } from 'react'

export const useGodBoundary = (worldSize) => {
  const boundaryRef = useRef({
    center: { x: worldSize.width / 2, y: worldSize.height / 2 },
    radius: 300,
    strength: 1.0,
    temples: []
  })

  const updateBoundary = useCallback((temples) => {
    const boundary = boundaryRef.current
    
    // Find primary temple (largest)
    const primaryTemple = temples.find(building => building.type === 'temple')
    
    if (primaryTemple) {
      boundary.center = {
        x: primaryTemple.x + primaryTemple.width / 2,
        y: primaryTemple.y + primaryTemple.height / 2
      }
      
      // Boundary radius based on temple level and nearby buildings
      const nearbyBuildings = temples.filter(building => {
        const distance = Math.sqrt(
          (building.x - boundary.center.x) ** 2 + 
          (building.y - boundary.center.y) ** 2
        )
        return distance <= 400 && building.type === 'house'
      })
      
      boundary.radius = Math.max(250, 250 + nearbyBuildings.length * 20)
      boundary.strength = Math.min(2.0, 1.0 + nearbyBuildings.length * 0.1)
    }
  }, [])

  const isWithinBoundary = useCallback((x, y) => {
    const boundary = boundaryRef.current
    const distance = Math.sqrt(
      (x - boundary.center.x) ** 2 + 
      (y - boundary.center.y) ** 2
    )
    return distance <= boundary.radius
  }, [])

  const getBoundaryStrengthAt = useCallback((x, y) => {
    const boundary = boundaryRef.current
    const distance = Math.sqrt(
      (x - boundary.center.x) ** 2 + 
      (y - boundary.center.y) ** 2
    )
    
    if (distance <= boundary.radius) {
      // Stronger near center, weaker at edges
      const normalizedDistance = distance / boundary.radius
      return boundary.strength * (1 - normalizedDistance * 0.5)
    }
    return 0
  }, [])

  const canUsePowerAt = useCallback((x, y, powerType) => {
    const strength = getBoundaryStrengthAt(x, y)
    
    // Different powers have different requirements
    const powerRequirements = {
      heal: 0.3,
      food: 0.2,
      storm: 0.8,
      build: 0.5
    }
    
    return strength >= (powerRequirements[powerType] || 0.5)
  }, [getBoundaryStrengthAt])

  const renderBoundary = useCallback((ctx) => {
    const boundary = boundaryRef.current
    
    // Draw boundary circle with gradient
    const gradient = ctx.createRadialGradient(
      boundary.center.x, boundary.center.y, 0,
      boundary.center.x, boundary.center.y, boundary.radius
    )
    gradient.addColorStop(0, 'rgba(255, 215, 0, 0.15)')
    gradient.addColorStop(0.7, 'rgba(255, 215, 0, 0.08)')
    gradient.addColorStop(1, 'rgba(255, 215, 0, 0.02)')
    
    ctx.fillStyle = gradient
    ctx.beginPath()
    ctx.arc(boundary.center.x, boundary.center.y, boundary.radius, 0, Math.PI * 2)
    ctx.fill()
    
    // Draw boundary ring
    ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)'
    ctx.lineWidth = 2
    ctx.setLineDash([10, 5])
    ctx.beginPath()
    ctx.arc(boundary.center.x, boundary.center.y, boundary.radius, 0, Math.PI * 2)
    ctx.stroke()
    ctx.setLineDash([])
    
    // Draw divine energy particles around boundary
    const time = Date.now() * 0.001
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2 + time * 0.5
      const x = boundary.center.x + Math.cos(angle) * boundary.radius
      const y = boundary.center.y + Math.sin(angle) * boundary.radius
      
      ctx.fillStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(time * 3 + i) * 0.2})`
      ctx.beginPath()
      ctx.arc(x, y, 2, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [])

  return {
    updateBoundary,
    isWithinBoundary,
    getBoundaryStrengthAt,
    canUsePowerAt,
    renderBoundary,
    center: boundaryRef.current.center,
    radius: boundaryRef.current.radius
  }
}