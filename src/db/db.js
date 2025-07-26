import Dexie from 'dexie'
import { version, name, stores } from './schema.js'

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

export default db