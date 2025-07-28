/**
 * Gesture Recognition System
 * Based on the $1 Unistroke Recognizer algorithm
 * Recognizes mouse gestures for miracle casting
 */

export class GestureRecognizer {
  constructor() {
    // Configuration
    this.numPoints = 64 // Number of points to resample to
    this.squareSize = 250 // Size of bounding box
    this.threshold = 0.8 // Recognition threshold (0-1)
    this.angleRange = Math.PI / 4 // 45 degrees
    
    // Gesture templates
    this.templates = this.initializeTemplates()
    
    // Recording state
    this.isRecording = false
    this.recordedPoints = []
    this.startTime = 0
    this.maxRecordTime = 2000 // 2 seconds
    this.minPointDistance = 5
    
    // Visual feedback
    this.gestureTrail = []
    this.lastRecognition = null
  }

  initializeTemplates() {
    return {
      // Circle (clockwise)
      circle: {
        name: 'circle',
        points: this.generateCirclePoints(true),
        threshold: 0.35
      },
      
      // Vertical line (down)
      verticalLine: {
        name: 'verticalLine',
        points: this.generateLinePoints(0, -1, 0, 1),
        threshold: 0.4
      },
      
      // Horizontal zigzag
      zigzag: {
        name: 'zigzag',
        points: this.generateZigzagPoints('horizontal'),
        threshold: 0.3
      },
      
      // Tree shape (^)
      tree: {
        name: 'tree',
        points: this.generateTreePoints(),
        threshold: 0.35
      },
      
      // S-curve
      sCurve: {
        name: 'sCurve',
        points: this.generateSCurvePoints(),
        threshold: 0.3
      },
      
      // Lightning (Z)
      lightning: {
        name: 'lightning',
        points: this.generateLightningPoints(),
        threshold: 0.35
      },
      
      // Square
      square: {
        name: 'square',
        points: this.generateSquarePoints(),
        threshold: 0.3
      },
      
      // Star (5 points)
      star: {
        name: 'star',
        points: this.generateStarPoints(5),
        threshold: 0.25
      },
      
      // Spiral
      spiral: {
        name: 'spiral',
        points: this.generateSpiralPoints(),
        threshold: 0.25
      },
      
      // Infinity
      infinity: {
        name: 'infinity',
        points: this.generateInfinityPoints(),
        threshold: 0.2
      },
      
      // Cross
      cross: {
        name: 'cross',
        points: this.generateCrossPoints(),
        threshold: 0.35
      }
    }
  }

  // Template generation methods
  generateCirclePoints(clockwise = true) {
    const points = []
    const numPoints = 32
    for (let i = 0; i < numPoints; i++) {
      const angle = (i / numPoints) * Math.PI * 2
      const x = Math.cos(angle) * 100
      const y = Math.sin(angle) * 100 * (clockwise ? 1 : -1)
      points.push({ x, y })
    }
    return this.resample(points, this.numPoints)
  }

  generateLinePoints(x1, y1, x2, y2) {
    const points = []
    for (let t = 0; t <= 1; t += 0.05) {
      points.push({
        x: x1 + (x2 - x1) * t * 100,
        y: y1 + (y2 - y1) * t * 100
      })
    }
    return this.resample(points, this.numPoints)
  }

  generateZigzagPoints(direction = 'horizontal') {
    const points = []
    const amplitude = 50
    const wavelength = 30
    
    if (direction === 'horizontal') {
      for (let x = -100; x <= 100; x += 10) {
        const y = (Math.floor(x / wavelength) % 2 === 0 ? 1 : -1) * amplitude
        points.push({ x, y })
      }
    }
    return this.resample(points, this.numPoints)
  }

  generateTreePoints() {
    const points = []
    // Left side of tree
    points.push({ x: -50, y: 50 })
    points.push({ x: 0, y: -50 })
    // Right side
    points.push({ x: 50, y: 50 })
    return this.resample(points, this.numPoints)
  }

  generateSCurvePoints() {
    const points = []
    for (let t = 0; t <= 1; t += 0.05) {
      const x = (t - 0.5) * 200
      const y = Math.sin(t * Math.PI * 2) * 50
      points.push({ x, y })
    }
    return this.resample(points, this.numPoints)
  }

  generateLightningPoints() {
    const points = []
    // Z-shape
    points.push({ x: -50, y: -50 })
    points.push({ x: 50, y: -50 })
    points.push({ x: -50, y: 50 })
    points.push({ x: 50, y: 50 })
    return this.resample(points, this.numPoints)
  }

  generateSquarePoints() {
    const points = []
    const size = 75
    // Clockwise from top-left
    const corners = [
      { x: -size, y: -size },
      { x: size, y: -size },
      { x: size, y: size },
      { x: -size, y: size },
      { x: -size, y: -size }
    ]
    
    for (let i = 0; i < corners.length - 1; i++) {
      const start = corners[i]
      const end = corners[i + 1]
      for (let t = 0; t <= 1; t += 0.1) {
        points.push({
          x: start.x + (end.x - start.x) * t,
          y: start.y + (end.y - start.y) * t
        })
      }
    }
    return this.resample(points, this.numPoints)
  }

  generateStarPoints(numPoints = 5) {
    const points = []
    const outerRadius = 100
    const innerRadius = 40
    
    for (let i = 0; i < numPoints * 2; i++) {
      const angle = (i / (numPoints * 2)) * Math.PI * 2 - Math.PI / 2
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      })
    }
    points.push(points[0]) // Close the star
    return this.resample(points, this.numPoints)
  }

  generateSpiralPoints() {
    const points = []
    const maxRadius = 100
    const rotations = 2
    
    for (let t = 0; t <= 1; t += 0.02) {
      const angle = t * Math.PI * 2 * rotations
      const radius = maxRadius * (1 - t)
      points.push({
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius
      })
    }
    return this.resample(points, this.numPoints)
  }

  generateInfinityPoints() {
    const points = []
    const scale = 100
    
    for (let t = 0; t <= 2 * Math.PI; t += 0.1) {
      const x = scale * Math.sin(t) / (1 + Math.cos(t) * Math.cos(t))
      const y = scale * Math.sin(t) * Math.cos(t) / (1 + Math.cos(t) * Math.cos(t))
      points.push({ x, y })
    }
    return this.resample(points, this.numPoints)
  }

  generateCrossPoints() {
    const points = []
    const size = 75
    
    // Vertical line
    for (let y = -size; y <= size; y += 10) {
      points.push({ x: 0, y })
    }
    
    // Horizontal line
    for (let x = -size; x <= size; x += 10) {
      points.push({ x, y: 0 })
    }
    
    return this.resample(points, this.numPoints)
  }

  // Start recording a gesture
  startRecording(x, y) {
    this.isRecording = true
    this.recordedPoints = [{ x, y, time: Date.now() }]
    this.startTime = Date.now()
    this.gestureTrail = [{ x, y }]
  }

  // Add a point to the current gesture
  addPoint(x, y) {
    if (!this.isRecording) return
    
    const currentTime = Date.now()
    
    // Check if gesture is taking too long
    if (currentTime - this.startTime > this.maxRecordTime) {
      this.stopRecording()
      return
    }
    
    // Check minimum distance from last point
    const lastPoint = this.recordedPoints[this.recordedPoints.length - 1]
    const distance = Math.sqrt(
      Math.pow(x - lastPoint.x, 2) + 
      Math.pow(y - lastPoint.y, 2)
    )
    
    if (distance >= this.minPointDistance) {
      this.recordedPoints.push({ x, y, time: currentTime })
      this.gestureTrail.push({ x, y })
    }
  }

  // Stop recording and recognize the gesture
  stopRecording() {
    if (!this.isRecording) return null
    
    this.isRecording = false
    
    // Need at least 3 points for a gesture
    if (this.recordedPoints.length < 3) {
      this.recordedPoints = []
      this.gestureTrail = []
      return null
    }
    
    // Recognize the gesture
    const result = this.recognize(this.recordedPoints)
    
    // Clear recorded points
    this.recordedPoints = []
    this.lastRecognition = result
    
    return result
  }

  // Main recognition algorithm
  recognize(points) {
    // Handle edge cases
    if (!points || points.length < 2) {
      return null
    }
    
    // Check if all points are the same
    const firstPoint = points[0]
    const allSame = points.every(p => p.x === firstPoint.x && p.y === firstPoint.y)
    if (allSame) {
      return null
    }
    
    // Resample to fixed number of points
    const resampledPoints = this.resample(points, this.numPoints)
    
    // Rotate to indicative angle
    const indicativeAngle = this.indicativeAngle(resampledPoints)
    const rotatedPoints = this.rotateBy(resampledPoints, -indicativeAngle)
    
    // Scale and translate to origin
    const scaledPoints = this.scaleToSquare(rotatedPoints, this.squareSize)
    const translatedPoints = this.translateToOrigin(scaledPoints)
    
    // Find best matching template
    let bestMatch = null
    let bestScore = -Infinity
    
    for (const [name, template] of Object.entries(this.templates)) {
      const score = this.compareGestures(translatedPoints, template.points)
      
      if (score > bestScore && score >= template.threshold) {
        bestScore = score
        bestMatch = {
          name: template.name,
          score: score,
          confidence: score
        }
      }
    }
    
    return bestMatch
  }

  // Resample points to have n equidistant points
  resample(points, n) {
    const interval = this.pathLength(points) / (n - 1)
    let distance = 0
    const newPoints = [points[0]]
    
    for (let i = 1; i < points.length; i++) {
      const currentDistance = this.distance(points[i - 1], points[i])
      
      if (distance + currentDistance >= interval) {
        const qx = points[i - 1].x + ((interval - distance) / currentDistance) * (points[i].x - points[i - 1].x)
        const qy = points[i - 1].y + ((interval - distance) / currentDistance) * (points[i].y - points[i - 1].y)
        const q = { x: qx, y: qy }
        newPoints.push(q)
        points.splice(i, 0, q)
        distance = 0
      } else {
        distance += currentDistance
      }
    }
    
    // Sometimes we fall short, so add the last point
    if (newPoints.length === n - 1) {
      newPoints.push(points[points.length - 1])
    }
    
    return newPoints
  }

  // Calculate total path length
  pathLength(points) {
    let length = 0
    for (let i = 1; i < points.length; i++) {
      length += this.distance(points[i - 1], points[i])
    }
    return length
  }

  // Calculate distance between two points
  distance(p1, p2) {
    return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
  }

  // Calculate indicative angle
  indicativeAngle(points) {
    const centroid = this.centroid(points)
    return Math.atan2(centroid.y - points[0].y, centroid.x - points[0].x)
  }

  // Calculate centroid of points
  centroid(points) {
    if (!points || points.length === 0) {
      return { x: 0, y: 0 }
    }
    
    let x = 0, y = 0
    points.forEach(p => {
      x += p.x
      y += p.y
    })
    return { x: x / points.length, y: y / points.length }
  }

  // Rotate points by angle
  rotateBy(points, angle) {
    const cos = Math.cos(angle)
    const sin = Math.sin(angle)
    return points.map(p => ({
      x: p.x * cos - p.y * sin,
      y: p.x * sin + p.y * cos
    }))
  }

  // Scale points to fit in square
  scaleToSquare(points, size) {
    const bounds = this.boundingBox(points)
    const scale = size / Math.max(bounds.width, bounds.height)
    
    return points.map(p => ({
      x: p.x * scale,
      y: p.y * scale
    }))
  }

  // Calculate bounding box
  boundingBox(points) {
    let minX = Infinity, minY = Infinity
    let maxX = -Infinity, maxY = -Infinity
    
    points.forEach(p => {
      minX = Math.min(minX, p.x)
      minY = Math.min(minY, p.y)
      maxX = Math.max(maxX, p.x)
      maxY = Math.max(maxY, p.y)
    })
    
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  // Translate points to origin
  translateToOrigin(points) {
    const centroid = this.centroid(points)
    return points.map(p => ({
      x: p.x - centroid.x,
      y: p.y - centroid.y
    }))
  }

  // Compare two gestures using optimal cosine distance
  compareGestures(points1, points2) {
    const distance = this.optimalCosineDistance(points1, points2)
    return 1 / (1 + distance) // Convert distance to similarity score (0-1)
  }

  // Calculate optimal cosine distance
  optimalCosineDistance(points1, points2) {
    let a = 0, b = 0, c = 0
    
    for (let i = 0; i < points1.length; i++) {
      a += points1[i].x * points2[i].x + points1[i].y * points2[i].y
      b += points1[i].x * points2[i].y - points1[i].y * points2[i].x
      c += points1[i].x * points1[i].x + points1[i].y * points1[i].y +
          points2[i].x * points2[i].x + points2[i].y * points2[i].y
    }
    
    const angle = Math.atan(b / a)
    const cosAngle = Math.cos(angle)
    const sinAngle = Math.sin(angle)
    const numerator = a * cosAngle + b * sinAngle
    
    // Avoid division by zero and acos domain errors
    if (c === 0) return Number.MAX_VALUE
    
    let ratio = numerator / c
    // Clamp ratio to valid acos domain [-1, 1]
    ratio = Math.max(-1, Math.min(1, ratio))
    
    const distance = Math.acos(ratio)
    
    return isNaN(distance) ? Number.MAX_VALUE : distance
  }

  // Get gesture trail for rendering
  getGestureTrail() {
    return this.gestureTrail
  }

  // Clear gesture trail
  clearTrail() {
    this.gestureTrail = []
  }
}

// Export singleton instance
export const gestureRecognizer = new GestureRecognizer()