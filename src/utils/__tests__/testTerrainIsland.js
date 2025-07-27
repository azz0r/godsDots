import { TerrainGenerator } from '../mapGeneration/TerrainGenerator.js'

// Test function to verify island generation
function testIslandGeneration() {
  console.log('Testing island generation...\n')
  
  const worldSizes = [
    { width: 800, height: 600 },
    { width: 1200, height: 1000 },
    { width: 1600, height: 1200 }
  ]
  
  worldSizes.forEach((worldSize, index) => {
    console.log(`Test ${index + 1}: World size ${worldSize.width}x${worldSize.height}`)
    
    // Generate terrain with random seed
    const generator = new TerrainGenerator(Math.random())
    const { terrain, terrainMap } = generator.generateTerrain(worldSize)
    
    // Check all edges for water
    const tileSize = generator.tileSize
    const maxX = worldSize.width - tileSize
    const maxY = worldSize.height - tileSize
    
    let edgeWaterCount = 0
    let totalEdgeTiles = 0
    let landTilesAtEdge = []
    
    terrain.forEach(tile => {
      // Check if tile is at any edge
      const isAtEdge = (
        tile.x === 0 || 
        tile.x === maxX || 
        tile.y === 0 || 
        tile.y === maxY
      )
      
      if (isAtEdge) {
        totalEdgeTiles++
        if (tile.type === 'water' || tile.type === 'deepWater') {
          edgeWaterCount++
        } else {
          landTilesAtEdge.push({
            x: tile.x,
            y: tile.y,
            type: tile.type,
            elevation: tile.elevation
          })
        }
      }
    })
    
    // Calculate statistics
    const waterPercentage = (edgeWaterCount / totalEdgeTiles) * 100
    console.log(`  - Edge tiles: ${totalEdgeTiles}`)
    console.log(`  - Water tiles at edges: ${edgeWaterCount} (${waterPercentage.toFixed(1)}%)`)
    console.log(`  - Land tiles at edges: ${landTilesAtEdge.length}`)
    
    if (landTilesAtEdge.length > 0) {
      console.log('  - WARNING: Found land tiles at map edges:')
      landTilesAtEdge.slice(0, 5).forEach(tile => {
        console.log(`    Position (${tile.x}, ${tile.y}): ${tile.type} (elevation: ${tile.elevation.toFixed(3)})`)
      })
      if (landTilesAtEdge.length > 5) {
        console.log(`    ... and ${landTilesAtEdge.length - 5} more`)
      }
    } else {
      console.log('  - SUCCESS: All edge tiles are water!')
    }
    
    // Check for proper beach transitions
    let beachCount = 0
    let landCount = 0
    let waterCount = 0
    
    terrain.forEach(tile => {
      if (tile.type === 'sand') beachCount++
      else if (tile.type === 'water' || tile.type === 'deepWater') waterCount++
      else landCount++
    })
    
    console.log(`  - Terrain composition:`)
    console.log(`    Water: ${waterCount} tiles (${(waterCount / terrain.length * 100).toFixed(1)}%)`)
    console.log(`    Beach: ${beachCount} tiles (${(beachCount / terrain.length * 100).toFixed(1)}%)`)
    console.log(`    Land: ${landCount} tiles (${(landCount / terrain.length * 100).toFixed(1)}%)`)
    
    console.log('')
  })
  
  // Test multiple seeds to ensure consistency
  console.log('Testing consistency across different seeds...')
  let allSuccess = true
  
  for (let i = 0; i < 10; i++) {
    const generator = new TerrainGenerator(Math.random())
    const { terrain } = generator.generateTerrain({ width: 1000, height: 800 })
    
    const edgeLandTiles = terrain.filter(tile => {
      const isAtEdge = (
        tile.x === 0 || 
        tile.x === 1000 - generator.tileSize || 
        tile.y === 0 || 
        tile.y === 800 - generator.tileSize
      )
      return isAtEdge && tile.type !== 'water' && tile.type !== 'deepWater'
    })
    
    if (edgeLandTiles.length > 0) {
      console.log(`  Seed ${i + 1}: FAILED - ${edgeLandTiles.length} land tiles at edges`)
      allSuccess = false
    }
  }
  
  if (allSuccess) {
    console.log('  All seeds: SUCCESS - All generated proper islands!')
  }
}

// Run the test
testIslandGeneration()