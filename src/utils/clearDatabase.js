import Dexie from 'dexie'

/**
 * Utility to clear the old database with invalid schema
 * This should be run once to clean up the old database before using the new schema
 */
export async function clearOldDatabase() {
  try {
    // Delete the old database entirely
    await Dexie.delete('GodDots001')
    console.log('Old database cleared successfully')
    return true
  } catch (error) {
    console.error('Failed to clear old database:', error)
    // If deletion fails, try to open and clear tables
    try {
      const tempDb = new Dexie('GodDots001')
      tempDb.version(1).stores({}) // Empty schema
      await tempDb.open()
      await tempDb.delete()
      console.log('Old database cleared using alternative method')
      return true
    } catch (altError) {
      console.error('Alternative clear method also failed:', altError)
      return false
    }
  }
}

// Check if we need to clear the database
export async function checkAndClearIfNeeded() {
  const CLEARED_FLAG_KEY = 'godDots_db_v3_cleared'
  
  // Check if we've already cleared for v3
  if (localStorage.getItem(CLEARED_FLAG_KEY) === 'true') {
    return
  }
  
  // Try to clear the old database
  const success = await clearOldDatabase()
  
  if (success) {
    // Set flag so we don't try again
    localStorage.setItem(CLEARED_FLAG_KEY, 'true')
    console.log('Database migration completed')
  } else {
    console.warn('Database migration failed, may encounter issues')
  }
}