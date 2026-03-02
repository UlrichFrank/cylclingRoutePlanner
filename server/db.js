/**
 * SQLite Database Initialization
 * Sets up database schema using sql.js (pure JavaScript SQLite)
 * For production, upgrade to proper SQLite library
 */

import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, 'travel_agent.db');

let SQL;
let db;

/**
 * Initialize database
 */
export async function initDatabase() {
  SQL = await initSqlJs();
  
  // Try to load existing database
  if (fs.existsSync(DB_PATH)) {
    const data = fs.readFileSync(DB_PATH);
    db = new SQL.Database(data);
    console.log('[DB] Loaded existing database');
  } else {
    db = new SQL.Database();
    console.log('[DB] Created new database');
  }

  initializeSchema();
  return db;
}

/**
 * Create schema if not exists
 */
function initializeSchema() {
  console.log('[DB] Initializing schema...');

  try {
    // Routes table
    db.run(`
      CREATE TABLE IF NOT EXISTS routes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        difficulty_level TEXT CHECK(difficulty_level IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
        profile TEXT CHECK(profile IN ('bicycle', 'ebike', 'pedestrian', 'bikeshare', 'scooter')) DEFAULT 'bicycle',
        distance_km REAL,
        elevation_gain REAL,
        elevation_loss REAL,
        duration_seconds INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Route Points (user-clicked waypoints)
    db.run(`
      CREATE TABLE IF NOT EXISTS route_points (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        order_index INTEGER NOT NULL,
        label TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Route Geometry (calculated polyline from Valhalla)
    db.run(`
      CREATE TABLE IF NOT EXISTS route_geometry (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL UNIQUE REFERENCES routes(id) ON DELETE CASCADE,
        geometry_json TEXT,
        elevation_profile_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Points of Interest
    db.run(`
      CREATE TABLE IF NOT EXISTS pois (
        id TEXT PRIMARY KEY,
        route_id TEXT NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('restaurant', 'cafe', 'bakery', 'hotel', 'other')),
        name TEXT NOT NULL,
        lat REAL NOT NULL,
        lon REAL NOT NULL,
        distance_from_route_km REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[DB] Schema initialized successfully');
  } catch (error) {
    console.error('[DB] Schema initialization error:', error.message);
  }
}

/**
 * Health check - verify database is working
 */
export function healthCheck() {
  try {
    const result = db.exec('SELECT 1 as ping');
    return result.length > 0;
  } catch (error) {
    console.error('[DB] Health check failed:', error.message);
    return false;
  }
}

/**
 * Clear all data (for testing)
 */
export function clearDatabase() {
  try {
    db.run('DELETE FROM pois');
    db.run('DELETE FROM route_geometry');
    db.run('DELETE FROM route_points');
    db.run('DELETE FROM routes');
    saveDatabase();
    console.log('[DB] Database cleared');
  } catch (error) {
    console.error('[DB] Clear failed:', error.message);
  }
}

/**
 * Save database to disk
 */
export function saveDatabase() {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (error) {
    console.error('[DB] Save failed:', error.message);
  }
}

/**
 * Get database instance
 */
export function getDb() {
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    console.log('[DB] Database connection closed');
  }
}

export default { initDatabase, healthCheck, clearDatabase, getDb, closeDatabase, saveDatabase };

