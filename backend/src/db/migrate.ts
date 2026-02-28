import fs from 'fs';
import path from 'path';
import { pool } from './connection';

// Single migration entry point used by index.ts and npm run migrate
export async function runMigrations() {
  const client = await pool.connect();
  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('Database schema applied successfully.');
  } catch (error) {
    console.error('Error running migrations:', error);
    throw error;
  } finally {
    client.release();
  }
}

