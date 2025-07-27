// Debug helper to verify villager movement
export function debugVillagerMovement(player, gameTime) {
  if (!player || !player.villagers || player.villagers.length === 0) {
    console.log('No villagers to debug')
    return
  }
  
  // Log first 3 villagers every 5 seconds
  if (gameTime % 300 === 0) {
    console.log('=== Villager Movement Debug ===')
    console.log(`Time: ${gameTime}, Player: ${player.id} (${player.type})`)
    console.log(`Total villagers: ${player.villagers.length}`)
    
    player.villagers.slice(0, 3).forEach((v, i) => {
      console.log(`Villager ${i} (ID: ${v.id}):`)
      console.log(`  State: ${v.state}`)
      console.log(`  Position: (${v.x.toFixed(1)}, ${v.y.toFixed(1)})`)
      console.log(`  Velocity: (${v.vx.toFixed(3)}, ${v.vy.toFixed(3)})`)
      console.log(`  Target: ${v.target ? `(${v.target.x.toFixed(1)}, ${v.target.y.toFixed(1)})` : 'null'}`)
      console.log(`  Path: ${v.path ? `${v.path.length} nodes, index ${v.pathIndex}` : 'null'}`)
      console.log(`  Movement:`, {
        isIdle: v.movement.isIdle,
        idleTime: v.movement.idleTime,
        idleDuration: v.movement.idleDuration
      })
      console.log(`  Pathfinding:`, {
        targetNode: v.pathfinding.targetNode ? `(${v.pathfinding.targetNode.x}, ${v.pathfinding.targetNode.y})` : 'null',
        stuck: v.pathfinding.stuck,
        lastPathUpdate: v.pathfinding.lastPathUpdate
      })
    })
    console.log('==============================\n')
  }
}