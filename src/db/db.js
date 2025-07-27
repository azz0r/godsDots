import Dexie from 'dexie'
import { version, name, stores } from './schema.js'
import { checkAndClearIfNeeded } from '../utils/clearDatabase.js'

// Check and clear old database if needed
checkAndClearIfNeeded()

// Create database instance
const db = new Dexie(name)

// Define database schema
db.version(version).stores(stores)

// Enable debug mode in development
if (import.meta.env?.DEV) {
  db.debug = true
}

// Simple database initialization check
console.log('Database initialized:', name, 'version:', version)

// Error handling for schema changes
db.on('blocked', () => {
  console.warn('Database upgrade blocked - another tab might have the database open')
})

db.on('versionchange', (event) => {
  console.log('Database version changed, reloading may be required')
  // Close the database to allow the upgrade in another tab
  db.close()
  // Optionally reload the page
  if (event.newVersion === null) {
    // Database is being deleted
    window.location.reload()
  }
})

export default db