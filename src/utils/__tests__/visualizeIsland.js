import { TerrainGenerator } from '../mapGeneration/TerrainGenerator.js'

// Create ASCII visualization of the terrain
function visualizeTerrain(worldSize) {
  const generator = new TerrainGenerator(Math.random())
  const { terrain } = generator.generateTerrain(worldSize)
  
  const tileSize = generator.tileSize
  const width = Math.ceil(worldSize.width / tileSize)
  const height = Math.ceil(worldSize.height / tileSize)
  
  // Create 2D array for visualization
  const map = Array(height).fill(null).map(() => Array(width).fill(' '))
  
  // Define terrain symbols
  const terrainSymbols = {
    deepWater: '~',
    water: '≈',
    sand: '.',
    river: '=',
    grassland: ',',
    forest: '♣',
    tropicalForest: '♠',
    rainforest: '♦',
    jungle: '♥',
    savanna: ';',
    desert: '°',
    tundra: '_',
    taiga: '↑',
    snowyForest: '↟',
    hills: '^',
    rockyHills: '▲',
    mountain: '▲',
    snow: '❄'
  }
  
  // Fill the map
  terrain.forEach(tile => {
    const x = tile.x / tileSize
    const y = tile.y / tileSize
    map[y][x] = terrainSymbols[tile.type] || '?'
  })
  
  // Print the map
  console.log('\nTerrain Visualization:')
  console.log('=' .repeat(width + 2))
  map.forEach(row => {
    console.log('|' + row.join('') + '|')
  })
  console.log('=' .repeat(width + 2))
  
  // Print legend
  console.log('\nLegend:')
  console.log('~ = Deep Water    ≈ = Water       . = Beach/Sand')
  console.log(', = Grassland     ♣ = Forest      ^ = Hills')
  console.log('▲ = Mountain      ❄ = Snow        ° = Desert')
  console.log('Other symbols represent various biomes')
}

// Generate and visualize a medium-sized island
console.log('Generating island terrain...')
visualizeTerrain({ width: 800, height: 600 })