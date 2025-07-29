import { version, name, stores, Groups } from '../schema.js'

describe('Database Schema', () => {

  test('should have valid Dexie schema syntax', () => {
    // Check that stores object has valid syntax
    Object.entries(stores).forEach(([tableName, schema]) => {
      // Check for invalid foreign key syntax
      expect(schema).not.toMatch(/->/)
      
      // Check that schema is a string
      expect(typeof schema).toBe('string')
      
      // Check that schema doesn't include complex object fields
      const invalidFields = ['position', 'velocity', 'size', 'settings', 'worldSize', 
                           'objectives', 'statistics', 'data', 'reward', 'gameState', 
                           'influencePoints', 'nodes', 'effects', 'affectedEntities']
      invalidFields.forEach(field => {
        expect(schema).not.toMatch(new RegExp(`\\b${field}\\b`))
      })
    })
  })

  test('should have valid version number', () => {
    expect(version).toBe(3)
    expect(typeof version).toBe('number')
  })

  test('should have valid database name', () => {
    expect(name).toBe('GodDots001')
    expect(typeof name).toBe('string')
  })

  test('should have matching Groups and stores', () => {
    // Verify that each Group has a corresponding store entry
    Groups.forEach(group => {
      expect(stores[group.group]).toBeDefined()
      expect(typeof stores[group.group]).toBe('string')
    })
    
    // Verify stores count matches Groups count
    expect(Object.keys(stores).length).toBe(Groups.length)
  })

  test('should only index primitive fields', () => {
    // Check each schema for only primitive field types
    Object.entries(stores).forEach(([tableName, schema]) => {
      // Split schema into individual field definitions
      const fields = schema.split(',').map(f => f.trim())
      
      fields.forEach(field => {
        // Remove operators like ++, &, *, []
        const cleanField = field.replace(/^[+&*\[\]]+/, '').trim()
        
        // Should not contain nested property access (dots)
        if (cleanField && !cleanField.includes('[')) {
          expect(cleanField).not.toMatch(/\.\w+/)
        }
      })
    })
  })

  test('should maintain all table definitions from Groups', () => {
    const expectedTables = [
      'Game', 'Level', 'Player', 'AIPersonality', 'Territory',
      'Villager', 'Building', 'Resource', 'TerrainTile', 'Path',
      'Miracle', 'Effect', 'Event', 'Objective', 'PlayerResources',
      'SaveGame', 'Achievement', 'Interaction'
    ]
    
    expectedTables.forEach(table => {
      expect(stores[table]).toBeDefined()
    })
  })
})