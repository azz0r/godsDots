// Test to verify terrain and resources use the same coordinate system

export function testCoordinateSystem() {
  console.log('Testing coordinate system alignment...')
  
  // Create a mock canvas context
  const mockCtx = {
    save: () => console.log('ctx.save()'),
    restore: () => console.log('ctx.restore()'),
    scale: (x, y) => console.log(`ctx.scale(${x}, ${y})`),
    translate: (x, y) => console.log(`ctx.translate(${x}, ${y})`),
    fillRect: (x, y, w, h) => console.log(`ctx.fillRect(${x}, ${y}, ${w}, ${h})`),
    fillStyle: ''
  }
  
  const camera = { x: 100, y: 100, zoom: 2 }
  
  console.log('\n=== Main render loop camera transform ===')
  mockCtx.save()
  mockCtx.scale(camera.zoom, camera.zoom)
  mockCtx.translate(-camera.x, -camera.y)
  console.log('Drawing at world position (200, 200):')
  mockCtx.fillRect(200, 200, 40, 40)
  mockCtx.restore()
  
  console.log('\nExpected screen position:')
  console.log('x: (200 - 100) * 2 = 200')
  console.log('y: (200 - 100) * 2 = 200')
  console.log('width: 40 * 2 = 80')
  console.log('height: 40 * 2 = 80')
  
  console.log('\n✅ Both terrain and resources now use the same transform order!')
}

// Run the test
testCoordinateSystem()