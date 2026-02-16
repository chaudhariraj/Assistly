import { pool } from './connection';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Simple migration - execute SQL file directly
 */
export async function runMigrations(): Promise<void> {
  try {
    console.log('Running database migrations...');
    
    // Get schema file path
    let schemaPath: string;
    try {
      schemaPath = join(__dirname, 'schema.sql');
      readFileSync(schemaPath, 'utf-8');
    } catch {
      schemaPath = join(__dirname, '..', 'db', 'schema.sql');
    }
    
    const schema = readFileSync(schemaPath, 'utf-8');
    console.log(`Schema file loaded: ${schema.length} characters`);
    
    // Check if tables already exist
    const tablesCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'oauth_tokens', 'chat_logs', 'usage_metrics');
    `);
    
    if (tablesCheck.rows.length === 4) {
      console.log('Database tables already exist, skipping migration');
      return;
    }
    
    console.log(`Found ${tablesCheck.rows.length}/4 tables. Creating missing tables...`);
    
    // Execute the entire schema as one query (PostgreSQL supports this)
    try {
      await pool.query(schema);
      console.log('Schema executed successfully');
    } catch (error: any) {
      // If that fails, try executing statements one by one
      console.log('Bulk execution failed, trying individual statements...');
      
      // Split by semicolon and execute each
      const statements = schema
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        // Skip empty or comment-only statements
        if (stmt.length === 0 || stmt.split('\n').every(line => line.trim().startsWith('--') || line.trim().length === 0)) {
          continue;
        }
        
        try {
          await pool.query(stmt);
          if (stmt.toUpperCase().includes('CREATE TABLE')) {
            const tableName = stmt.match(/CREATE TABLE.*?(\w+)/i)?.[1] || 'unknown';
            console.log(`✅ Created table: ${tableName}`);
          }
        } catch (err: any) {
          // Ignore "already exists" errors
          if (!err.message.includes('already exists') && 
              !err.message.includes('duplicate') &&
              !err.code?.startsWith('42')) {
            console.error(`Statement ${i + 1} failed:`, err.message.substring(0, 100));
          }
        }
      }
    }
    
    // Verify tables were created
    const finalCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('users', 'oauth_tokens', 'chat_logs', 'usage_metrics');
    `);
    
    if (finalCheck.rows.length === 4) {
      console.log(`Database migrations completed successfully`);
      console.log(`   Tables: ${finalCheck.rows.map(r => r.table_name).join(', ')}`);
    } else {
      console.error(`Migration incomplete: Expected 4 tables, found ${finalCheck.rows.length}`);
      if (finalCheck.rows.length > 0) {
        console.error(`   Tables found: ${finalCheck.rows.map(r => r.table_name).join(', ')}`);
      }
      throw new Error('Migration failed - not all tables were created');
    }
  } catch (error) {
    console.error('Migration error:', error);
    throw error;
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('Migrations completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}


